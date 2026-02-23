const express = require('express');
const { body, validationResult } = require('express-validator');
const Shipment = require('../models/Shipment');
const Document = require('../models/Document');
const Task = require('../models/Task');
const Invoice = require('../models/Invoice');
const Notification = require('../models/Notification');
const StatusHistory = require('../models/StatusHistory');
const User = require('../models/User');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// ── State Machine: valid transitions ────────────────────────────────
const VALID_TRANSITIONS = {
  created:          ['on_sea'],
  on_sea:           ['arrived_mombasa'],
  arrived_mombasa:  ['discharged'],
  discharged:       ['documents_ready'],
  documents_ready:  ['payment_pending'],
  payment_pending:  ['payment_received'],
  payment_received: ['cleared'],
  cleared:          ['in_transit'],
  in_transit:       ['at_warehouse'],
  at_warehouse:     ['delivered'],
  delivered:        ['completed'],
  completed:        [],
};

// ── Helper: auto-generate invoice number ────────────────────────────
const generateInvoiceNumber = async () => {
  const year = new Date().getFullYear();
  const count = await Invoice.countDocuments();
  return `INV-${year}-${String(count + 1).padStart(4, '0')}`;
};

// @route   GET /api/shipments
router.get('/', auth, async (req, res) => {
  try {
    const { status, search, page = 1, limit = 10, myShipments = false } = req.query;
    const query = { isActive: true };

    if (status) query.status = status;
    if (search) {
      query.$or = [
        { containerNumber: { $regex: search, $options: 'i' } },
        { blNumber: { $regex: search, $options: 'i' } }
      ];
    }
    if (req.user.role === 'client' || myShipments === 'true') {
      query.clients = req.user._id;
    }

    const shipments = await Shipment.find(query)
      .populate('clients', 'name company email')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await Shipment.countDocuments(query);

    res.json({
      success: true,
      data: {
        shipments,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        total: count
      }
    });
  } catch (error) {
    console.error('Get shipments error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   GET /api/shipments/stats/overview
router.get('/stats/overview', auth, async (req, res) => {
  try {
    const stats = await Shipment.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    const total = await Shipment.countDocuments({ isActive: true });
    const myShipments = req.user.role === 'client'
      ? await Shipment.countDocuments({ clients: req.user._id, isActive: true })
      : total;

    const statusCounts = {};
    stats.forEach(s => { statusCounts[s._id] = s.count; });

    res.json({
      success: true,
      data: {
        total, myShipments, byStatus: statusCounts,
        onSea: statusCounts['on_sea'] || 0,
        atMombasa: (statusCounts['arrived_mombasa'] || 0) + (statusCounts['discharged'] || 0),
        inTransit: statusCounts['in_transit'] || 0,
        completed: statusCounts['completed'] || 0
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   GET /api/shipments/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const shipment = await Shipment.findById(req.params.id)
      .populate('clients', 'name company email phone')
      .populate('createdBy', 'name email')
      .populate('assignedStaff', 'name email');

    if (!shipment) {
      return res.status(404).json({ success: false, message: 'Shipment not found' });
    }

    if (req.user.role === 'client') {
      const hasAccess = shipment.clients.some(c => c._id.toString() === req.user._id.toString());
      if (!hasAccess) return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const documents = await Document.find({ shipment: shipment._id })
      .populate('uploadedBy', 'name').populate('verifiedBy', 'name');
    const statusHistory = await StatusHistory.find({ shipment: shipment._id })
      .populate('changedBy', 'name').sort({ createdAt: -1 });
    const tasks = await Task.find({ shipment: shipment._id })
      .populate('assignedTo', 'name').populate('createdBy', 'name').sort({ createdAt: -1 });
    const invoices = await Invoice.find({ shipment: shipment._id })
      .populate('client', 'name company');

    res.json({
      success: true,
      data: { shipment, documents, statusHistory, tasks, invoices }
    });
  } catch (error) {
    console.error('Get shipment error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   POST /api/shipments
router.post('/', auth, authorize('staff', 'manager', 'admin'), [
  body('containerNumber').trim().notEmpty().withMessage('Container number is required'),
  body('shippingLine').notEmpty().withMessage('Shipping line is required'),
  body('etd').isISO8601().withMessage('Valid ETD is required'),
  body('eta').isISO8601().withMessage('Valid ETA is required'),
  body('origin').trim().notEmpty().withMessage('Origin is required'),
  body('destination').trim().notEmpty().withMessage('Destination is required'),
  validate
], async (req, res) => {
  try {
    const {
      containerNumber, blNumber, shippingLine, vesselName,
      etd, eta, origin, destination, shipmentType, containerType,
      weight, cargoDescription, clients, notes
    } = req.body;

    const existing = await Shipment.findOne({ containerNumber: containerNumber.toUpperCase() });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Shipment with this container number already exists' });
    }

    const shipment = new Shipment({
      containerNumber: containerNumber.toUpperCase(),
      blNumber, shippingLine, vesselName, etd, eta, origin, destination,
      shipmentType: shipmentType || 'FCL',
      containerType: containerType || '40ft_standard',
      weight, cargoDescription,
      clients: clients || [], notes,
      createdBy: req.user._id, status: 'created'
    });
    await shipment.save();

    await StatusHistory.create({
      shipment: shipment._id, fromStatus: 'none', toStatus: 'created',
      changedBy: req.user._id, notes: 'Shipment created'
    });

    // Rule 2: Auto-generate invoice tasks for each client
    if (clients && clients.length > 0) {
      for (const clientId of clients) {
        await Task.create({
          shipment: shipment._id, type: 'upload_invoice',
          title: 'Upload Commercial Invoice',
          description: `Please upload commercial invoice for container ${containerNumber}`,
          assignedTo: clientId, createdBy: req.user._id,
          priority: 'high',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        });
        await Notification.create({
          user: clientId, type: 'shipment_created',
          title: 'New Shipment Created',
          message: `Your shipment ${containerNumber} has been created. Please upload required documents.`,
          shipment: shipment._id
        });
      }
    }

    res.status(201).json({ success: true, message: 'Shipment created successfully', data: { shipment } });
  } catch (error) {
    console.error('Create shipment error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/shipments/:id/status
// Full state-machine enforcement with side-effects
router.put('/:id/status', auth, authorize('staff', 'manager', 'admin'), [
  body('status').isIn(Object.keys(VALID_TRANSITIONS)).withMessage('Invalid status'),
  validate
], async (req, res) => {
  try {
    const { status, notes } = req.body;

    const shipment = await Shipment.findById(req.params.id);
    if (!shipment) {
      return res.status(404).json({ success: false, message: 'Shipment not found' });
    }

    const oldStatus = shipment.status;

    // ── Rule: State machine validation ──
    const allowed = VALID_TRANSITIONS[oldStatus] || [];
    if (!allowed.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid transition: cannot go from "${oldStatus}" to "${status}". Allowed: [${allowed.join(', ')}]`
      });
    }

    // ── Rule 4: Container cannot clear without verified invoices ──
    if (status === 'cleared') {
      const verifiedInvoices = await Document.countDocuments({
        shipment: shipment._id,
        type: 'commercial_invoice',
        status: 'verified'
      });
      if (verifiedInvoices === 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot clear shipment: no verified commercial invoices found. All client invoices must be verified first.'
        });
      }
    }

    shipment.status = status;

    // ── Side-effect: Set actual arrival ──
    if (status === 'arrived_mombasa' && !shipment.actualArrival) {
      shipment.actualArrival = new Date();
    }

    await shipment.save();

    // ── Side-effect: arrived_mombasa → Lock documents + generate sea freight invoice ──
    if (status === 'arrived_mombasa') {
      await Document.updateMany(
        { shipment: shipment._id, type: { $in: ['bill_of_lading', 'packing_list', 'sea_freight_invoice'] } },
        { isLocked: true }
      );

      // Auto-generate sea freight invoice for each client
      for (const clientId of shipment.clients) {
        const invoiceNumber = await generateInvoiceNumber();
        await Invoice.create({
          invoiceNumber,
          shipment: shipment._id,
          client: clientId,
          type: 'sea_freight',
          items: [
            {
              description: `Sea freight - ${shipment.containerType.replace('_', ' ')} (${shipment.origin} to Mombasa)`,
              quantity: 1, unitPrice: 2800, total: 2800
            },
            { description: 'Port handling charges', quantity: 1, unitPrice: 350, total: 350 },
            { description: 'Documentation fee', quantity: 1, unitPrice: 150, total: 150 },
          ],
          subtotal: 3300, tax: 0, total: 3300, currency: 'USD',
          status: 'issued',
          issueDate: new Date(),
          dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          createdBy: req.user._id
        });

        await Notification.create({
          user: clientId, type: 'payment_required',
          title: 'Sea Freight Invoice Generated',
          message: `Sea freight invoice ${invoiceNumber} for container ${shipment.containerNumber} has been generated. Payment is required.`,
          shipment: shipment._id
        });
      }
    }

    // ── Side-effect: payment_received → Unlock documents ── (Rule 1)
    if (status === 'payment_received') {
      await Document.updateMany(
        { shipment: shipment._id, isLocked: true },
        { isLocked: false }
      );

      for (const clientId of shipment.clients) {
        await Notification.create({
          user: clientId, type: 'payment_received',
          title: 'Payment Confirmed - Documents Unlocked',
          message: `Payment for ${shipment.containerNumber} confirmed. BL, Packing List and other documents are now unlocked for download.`,
          shipment: shipment._id
        });
      }
    }

    // ── Side-effect: in_transit → Create transport task ──
    if (status === 'in_transit') {
      await Task.create({
        shipment: shipment._id, type: 'arrange_transport',
        title: `Transport ${shipment.containerNumber} to ${shipment.destination}`,
        description: `Container cleared. Arrange trucking from Mombasa to ${shipment.destination}.`,
        assignedTo: shipment.assignedStaff, createdBy: req.user._id,
        priority: 'high', status: 'in_progress',
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
      });
    }

    // ── Side-effect: completed → Prompt rating ──
    if (status === 'completed') {
      for (const clientId of shipment.clients) {
        await Notification.create({
          user: clientId, type: 'reminder',
          title: 'Service Completed - Rate Us!',
          message: `Your shipment ${shipment.containerNumber} has been completed. Please rate our service.`,
          shipment: shipment._id
        });
      }
    }

    // ── Rule 3: All status changes trigger notifications ──
    await StatusHistory.create({
      shipment: shipment._id, fromStatus: oldStatus, toStatus: status,
      changedBy: req.user._id, notes
    });

    for (const clientId of shipment.clients) {
      await Notification.create({
        user: clientId, type: 'status_changed',
        title: 'Shipment Status Updated',
        message: `Your shipment ${shipment.containerNumber} status changed to ${status.replace(/_/g, ' ').toUpperCase()}`,
        shipment: shipment._id
      });
    }

    const updated = await Shipment.findById(shipment._id)
      .populate('clients', 'name company email');

    res.json({ success: true, message: 'Status updated successfully', data: { shipment: updated } });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/shipments/:id
router.put('/:id', auth, authorize('staff', 'manager', 'admin'), async (req, res) => {
  try {
    const updates = {};
    const allowedFields = [
      'blNumber', 'vesselName', 'etd', 'eta', 'origin', 'destination',
      'shipmentType', 'containerType', 'weight', 'cargoDescription',
      'clients', 'notes', 'assignedStaff'
    ];
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const shipment = await Shipment.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true })
      .populate('clients', 'name company email');

    if (!shipment) return res.status(404).json({ success: false, message: 'Shipment not found' });

    res.json({ success: true, message: 'Shipment updated successfully', data: { shipment } });
  } catch (error) {
    console.error('Update shipment error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   DELETE /api/shipments/:id
router.delete('/:id', auth, authorize('manager', 'admin'), async (req, res) => {
  try {
    const shipment = await Shipment.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!shipment) return res.status(404).json({ success: false, message: 'Shipment not found' });
    res.json({ success: true, message: 'Shipment deleted successfully' });
  } catch (error) {
    console.error('Delete shipment error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

module.exports = router;
