const express = require('express');
const multer = require('multer');
const path = require('path');
const Document = require('../models/Document');
const Shipment = require('../models/Shipment');
const User = require('../models/User');
const Notification = require('../models/Notification');
const Task = require('../models/Task');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, JPG, PNG, and DOC files are allowed.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// @route   GET /api/documents
// @desc    Get all documents (with filters)
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { shipment, type, status, page = 1, limit = 20 } = req.query;

    const query = {};
    if (shipment) query.shipment = shipment;
    if (type) query.type = type;
    if (status) query.status = status;

    // For clients, only show documents from their shipments
    if (req.user.role === 'client') {
      const shipments = await Shipment.find({ clients: req.user._id }).select('_id');
      const shipmentIds = shipments.map(s => s._id);
      query.shipment = { $in: shipmentIds };
    }

    const documents = await Document.find(query)
      .populate('shipment', 'containerNumber')
      .populate('uploadedBy', 'name')
      .populate('verifiedBy', 'name')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await Document.countDocuments(query);

    res.json({
      success: true,
      data: {
        documents,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        total: count
      }
    });
  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/documents/:id
// @desc    Get single document
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const document = await Document.findById(req.params.id)
      .populate('shipment', 'containerNumber clients status')
      .populate('uploadedBy', 'name')
      .populate('verifiedBy', 'name');

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Check if client has access
    if (req.user.role === 'client') {
      const hasAccess = document.shipment.clients.some(
        client => client.toString() === req.user._id.toString()
      );
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }

    res.json({
      success: true,
      data: { document }
    });
  } catch (error) {
    console.error('Get document error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/documents/upload
// @desc    Upload a new document
// @access  Private
router.post('/upload', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const { shipmentId, type, notes } = req.body;

    // Verify shipment exists
    const shipment = await Shipment.findById(shipmentId);
    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: 'Shipment not found'
      });
    }

    // Check if client has access
    if (req.user.role === 'client') {
      const hasAccess = shipment.clients.some(
        client => client.toString() === req.user._id.toString()
      );
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }

    // Create document record
    const document = new Document({
      shipment: shipmentId,
      type: type || 'other',
      filename: req.file.filename,
      originalName: req.file.originalname,
      path: req.file.path,
      mimeType: req.file.mimetype,
      size: req.file.size,
      status: 'uploaded',
      isLocked: ['bill_of_lading', 'packing_list', 'sea_freight_invoice'].includes(type),
      uploadedBy: req.user._id,
      notes
    });

    await document.save();

    // Update related task if exists
    await Task.findOneAndUpdate(
      { shipment: shipmentId, type: 'upload_document', status: 'pending' },
      { status: 'completed', completedAt: new Date(), completedBy: req.user._id }
    );

    // Notify staff
    const staffUsers = await User.find({ role: { $in: ['staff', 'manager'] } });
    for (const staff of staffUsers) {
      await Notification.create({
        user: staff._id,
        type: 'document_required',
        title: 'New Document Uploaded',
        message: `New ${type} uploaded for container ${shipment.containerNumber}`,
        shipment: shipmentId,
        document: document._id
      });
    }

    res.status(201).json({
      success: true,
      message: 'Document uploaded successfully',
      data: { document }
    });
  } catch (error) {
    console.error('Upload document error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   PUT /api/documents/:id/verify
// @desc    Verify or reject a document
// @access  Private (Staff, Manager, Admin)
router.put('/:id/verify', auth, authorize('staff', 'manager', 'admin'), async (req, res) => {
  try {
    const { status, rejectionReason } = req.body;

    if (!['verified', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be verified or rejected'
      });
    }

    const document = await Document.findById(req.params.id)
      .populate('shipment', 'containerNumber clients');

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    document.status = status;
    document.verifiedBy = req.user._id;
    document.verifiedAt = new Date();
    
    if (status === 'rejected') {
      document.rejectionReason = rejectionReason;
    } else {
      // Unlock document if verified
      document.isLocked = false;
    }

    await document.save();

    // Notify clients
    const notificationType = status === 'verified' ? 'document_verified' : 'document_rejected';
    const notificationTitle = status === 'verified' ? 'Document Verified' : 'Document Rejected';
    const notificationMessage = status === 'verified' 
      ? `Your ${document.type} for container ${document.shipment.containerNumber} has been verified`
      : `Your ${document.type} for container ${document.shipment.containerNumber} was rejected. Reason: ${rejectionReason}`;

    for (const clientId of document.shipment.clients) {
      await Notification.create({
        user: clientId,
        type: notificationType,
        title: notificationTitle,
        message: notificationMessage,
        shipment: document.shipment._id,
        document: document._id
      });
    }

    res.json({
      success: true,
      message: `Document ${status} successfully`,
      data: { document }
    });
  } catch (error) {
    console.error('Verify document error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/documents/:id/download
// @desc    Download a document
// @access  Private
router.get('/:id/download', auth, async (req, res) => {
  try {
    const document = await Document.findById(req.params.id)
      .populate('shipment', 'containerNumber clients');

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Check if client has access
    if (req.user.role === 'client') {
      const hasAccess = document.shipment.clients.some(
        client => client.toString() === req.user._id.toString()
      );
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      // Check if document is locked for clients
      if (document.isLocked) {
        return res.status(403).json({
          success: false,
          message: 'Document is locked. Payment required to download.'
        });
      }
    }

    res.download(document.path, document.originalName);
  } catch (error) {
    console.error('Download document error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   DELETE /api/documents/:id
// @desc    Delete a document
// @access  Private (Staff, Manager, Admin)
router.delete('/:id', auth, authorize('staff', 'manager', 'admin'), async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found'
      });
    }

    // Delete file from filesystem
    const fs = require('fs');
    if (fs.existsSync(document.path)) {
      fs.unlinkSync(document.path);
    }

    await Document.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Document deleted successfully'
    });
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/documents/required/:shipmentId
// @desc    Get required documents for a shipment
// @access  Private
router.get('/required/:shipmentId', auth, async (req, res) => {
  try {
    const shipment = await Shipment.findById(req.params.shipmentId);

    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: 'Shipment not found'
      });
    }

    // Check access for clients
    if (req.user.role === 'client') {
      const hasAccess = shipment.clients.some(
        client => client.toString() === req.user._id.toString()
      );
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }

    // Get uploaded documents
    const uploadedDocs = await Document.find({ shipment: req.params.shipmentId });

    // Define required documents based on status
    const requiredTypes = [
      { type: 'commercial_invoice', label: 'Commercial Invoice', required: true },
      { type: 'packing_list', label: 'Packing List', required: true },
      { type: 'bill_of_lading', label: 'Bill of Lading', required: true },
      { type: 'import_permit', label: 'Import Permit', required: false }
    ];

    const documentStatus = requiredTypes.map(req => {
      const uploaded = uploadedDocs.find(d => d.type === req.type);
      return {
        ...req,
        status: uploaded ? uploaded.status : 'missing',
        documentId: uploaded ? uploaded._id : null,
        isLocked: uploaded ? uploaded.isLocked : false
      };
    });

    res.json({
      success: true,
      data: {
        requiredDocuments: documentStatus,
        totalRequired: requiredTypes.filter(r => r.required).length,
        uploaded: uploadedDocs.filter(d => d.status === 'verified').length,
        missing: documentStatus.filter(d => d.required && d.status === 'missing').length
      }
    });
  } catch (error) {
    console.error('Get required documents error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

module.exports = router;
