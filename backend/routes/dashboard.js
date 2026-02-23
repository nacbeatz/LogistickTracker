const express = require('express');
const Shipment = require('../models/Shipment');
const Document = require('../models/Document');
const Task = require('../models/Task');
const Invoice = require('../models/Invoice');
const User = require('../models/User');
const Rating = require('../models/Rating');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/dashboard/overview
// @desc    Get dashboard overview stats
// @access  Private (Staff, Manager, Admin)
router.get('/overview', auth, authorize('staff', 'manager', 'admin'), async (req, res) => {
  try {
    // Shipment stats
    const shipmentStats = await Shipment.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const totalShipments = await Shipment.countDocuments({ isActive: true });
    
    const statusMap = {};
    shipmentStats.forEach(s => statusMap[s._id] = s.count);

    // Document stats
    const documentStats = await Document.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const docStatusMap = {};
    documentStats.forEach(d => docStatusMap[d._id] = d.count);

    // Task stats
    const pendingTasks = await Task.countDocuments({ status: 'pending' });
    const inProgressTasks = await Task.countDocuments({ status: 'in_progress' });

    // Invoice stats
    const invoiceStats = await Invoice.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 }, total: { $sum: '$total' } } }
    ]);

    const invoiceMap = {};
    invoiceStats.forEach(i => invoiceMap[i._id] = { count: i.count, total: i.total });

    // Client count
    const totalClients = await User.countDocuments({ role: 'client', isActive: true });

    // Recent shipments
    const recentShipments = await Shipment.find({ isActive: true })
      .populate('clients', 'name company')
      .sort({ createdAt: -1 })
      .limit(5);

    // Shipments requiring attention
    const attentionShipments = await Shipment.find({
      isActive: true,
      $or: [
        { status: 'created', eta: { $lt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } },
        { status: 'payment_pending' }
      ]
    }).populate('clients', 'name company').limit(5);

    res.json({
      success: true,
      data: {
        shipments: {
          total: totalShipments,
          byStatus: statusMap,
          onSea: statusMap['on_sea'] || 0,
          atMombasa: (statusMap['arrived_mombasa'] || 0) + (statusMap['discharged'] || 0),
          inTransit: statusMap['in_transit'] || 0,
          completed: statusMap['completed'] || 0
        },
        documents: {
          byStatus: docStatusMap,
          pending: docStatusMap['pending'] || 0,
          verified: docStatusMap['verified'] || 0
        },
        tasks: {
          pending: pendingTasks,
          inProgress: inProgressTasks
        },
        invoices: {
          byStatus: invoiceMap,
          pending: invoiceMap['pending']?.count || 0,
          paid: invoiceMap['paid']?.count || 0,
          overdue: invoiceMap['overdue']?.count || 0
        },
        clients: {
          total: totalClients
        },
        recentShipments,
        attentionShipments
      }
    });
  } catch (error) {
    console.error('Dashboard overview error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/dashboard/invoice-collection
// @desc    Get invoice collection status
// @access  Private (Staff, Manager, Admin)
router.get('/invoice-collection', auth, authorize('staff', 'manager', 'admin'), async (req, res) => {
  try {
    // Get shipments with missing documents
    const shipments = await Shipment.find({ 
      isActive: true,
      status: { $in: ['on_sea', 'arrived_mombasa'] }
    }).populate('clients', 'name company');

    const collectionData = [];

    for (const shipment of shipments) {
      const documents = await Document.find({ 
        shipment: shipment._id,
        type: 'commercial_invoice'
      });

      const requiredCount = shipment.clients.length;
      const uploadedCount = documents.filter(d => d.status === 'verified').length;
      const missingCount = requiredCount - uploadedCount;

      if (missingCount > 0) {
        collectionData.push({
          containerNumber: shipment.containerNumber,
          clients: shipment.clients.length,
          required: requiredCount,
          uploaded: uploadedCount,
          missing: missingCount,
          eta: shipment.eta,
          daysRemaining: Math.ceil((new Date(shipment.eta) - new Date()) / (1000 * 60 * 60 * 24))
        });
      }
    }

    // Sort by days remaining (most urgent first)
    collectionData.sort((a, b) => a.daysRemaining - b.daysRemaining);

    const totalRequired = collectionData.reduce((sum, s) => sum + s.required, 0);
    const totalUploaded = collectionData.reduce((sum, s) => sum + s.uploaded, 0);

    res.json({
      success: true,
      data: {
        summary: {
          totalRequired,
          totalUploaded,
          totalMissing: totalRequired - totalUploaded,
          percentage: totalRequired > 0 ? Math.round((totalUploaded / totalRequired) * 100) : 0
        },
        shipments: collectionData
      }
    });
  } catch (error) {
    console.error('Invoice collection error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/dashboard/performance
// @desc    Get performance metrics
// @access  Private (Manager, Admin)
router.get('/performance', auth, authorize('manager', 'admin'), async (req, res) => {
  try {
    const { period = 'month' } = req.query;

    // Date range
    const now = new Date();
    let startDate;
    if (period === 'week') {
      startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
    } else if (period === 'month') {
      startDate = new Date(now - 30 * 24 * 60 * 60 * 1000);
    } else if (period === 'year') {
      startDate = new Date(now - 365 * 24 * 60 * 60 * 1000);
    }

    // Completed shipments in period
    const completedShipments = await Shipment.countDocuments({
      status: 'completed',
      updatedAt: { $gte: startDate }
    });

    // Average transit time
    const transitTimes = await Shipment.aggregate([
      { 
        $match: { 
          status: 'completed',
          etd: { $exists: true },
          actualArrival: { $exists: true }
        } 
      },
      {
        $project: {
          transitDays: {
            $divide: [
              { $subtract: ['$actualArrival', '$etd'] },
              1000 * 60 * 60 * 24
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          avgTransitDays: { $avg: '$transitDays' }
        }
      }
    ]);

    // Revenue
    const revenue = await Invoice.aggregate([
      {
        $match: {
          status: 'paid',
          paidAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$paidAmount' }
        }
      }
    ]);

    // Ratings
    const ratings = await Rating.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          avgRating: { $avg: '$rating' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Top clients
    const topClients = await Shipment.aggregate([
      {
        $match: {
          status: 'completed',
          updatedAt: { $gte: startDate }
        }
      },
      {
        $unwind: '$clients'
      },
      {
        $group: {
          _id: '$clients',
          shipmentCount: { $sum: 1 }
        }
      },
      {
        $sort: { shipmentCount: -1 }
      },
      {
        $limit: 5
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'client'
        }
      },
      {
        $unwind: '$client'
      },
      {
        $project: {
          name: '$client.name',
          company: '$client.company',
          shipmentCount: 1
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        period,
        completedShipments,
        avgTransitDays: transitTimes[0]?.avgTransitDays || 0,
        revenue: revenue[0]?.total || 0,
        ratings: {
          avg: ratings[0]?.avgRating || 0,
          count: ratings[0]?.count || 0
        },
        topClients
      }
    });
  } catch (error) {
    console.error('Performance error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/dashboard/client
// @desc    Get client dashboard data
// @access  Private (Client)
router.get('/client', auth, async (req, res) => {
  try {
    if (req.user.role !== 'client') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Client's shipments
    const shipments = await Shipment.find({
      clients: req.user._id,
      isActive: true
    }).sort({ createdAt: -1 });

    const statusMap = {};
    shipments.forEach(s => {
      statusMap[s.status] = (statusMap[s.status] || 0) + 1;
    });

    // Active shipments
    const activeShipments = shipments.filter(s => 
      !['completed', 'delivered'].includes(s.status)
    );

    // Recent documents
    const documents = await Document.find({
      shipment: { $in: shipments.map(s => s._id) }
    })
      .populate('shipment', 'containerNumber')
      .sort({ createdAt: -1 })
      .limit(5);

    // Pending tasks
    const tasks = await Task.find({
      shipment: { $in: shipments.map(s => s._id) },
      assignedTo: req.user._id,
      status: 'pending'
    }).populate('shipment', 'containerNumber');

    // Unread notifications
    const Notification = require('../models/Notification');
    const unreadNotifications = await Notification.countDocuments({
      user: req.user._id,
      isRead: false
    });

    res.json({
      success: true,
      data: {
        shipments: {
          total: shipments.length,
          byStatus: statusMap,
          active: activeShipments
        },
        recentDocuments: documents,
        pendingTasks: tasks,
        unreadNotifications
      }
    });
  } catch (error) {
    console.error('Client dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

module.exports = router;
