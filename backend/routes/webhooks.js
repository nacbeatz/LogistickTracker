const express = require('express');
const Shipment = require('../models/Shipment');
const Document = require('../models/Document');
const User = require('../models/User');
const Invoice = require('../models/Invoice');
const Task = require('../models/Task');
const Notification = require('../models/Notification');
const StatusHistory = require('../models/StatusHistory');
const { webhookAuth } = require('../middleware/webhookAuth');

const router = express.Router();

// All webhook routes require API key
router.use(webhookAuth);

// ─── n8n: Shipping Line Tracking Update ─────────────────────────
// n8n calls this when it scrapes/receives tracking data from shipping lines
// POST /api/webhooks/tracking-update
router.post('/tracking-update', async (req, res) => {
  try {
    const { containerNumber, status, location, vesselName, eta, notes, source } = req.body;

    if (!containerNumber) {
      return res.status(400).json({ success: false, message: 'containerNumber is required' });
    }

    const shipment = await Shipment.findOne({
      containerNumber: containerNumber.toUpperCase(),
      isActive: true
    });

    if (!shipment) {
      return res.status(404).json({ success: false, message: `Shipment ${containerNumber} not found` });
    }

    const updates = {};
    if (vesselName) updates.vesselName = vesselName;
    if (eta) updates.eta = new Date(eta);
    if (location) updates.notes = `${shipment.notes || ''}\n[${new Date().toISOString()}] Location: ${location} (via ${source || 'n8n'})`.trim();

    if (Object.keys(updates).length > 0) {
      await Shipment.findByIdAndUpdate(shipment._id, updates);
    }

    // Log as status history if relevant info
    await StatusHistory.create({
      shipment: shipment._id,
      fromStatus: shipment.status,
      toStatus: shipment.status,
      changedBy: shipment.createdBy,
      notes: `[Webhook] ${notes || `Tracking update from ${source || 'external'}: ${location || 'no location'}`}`
    });

    // Notify clients about tracking update
    if (location || eta) {
      for (const clientId of shipment.clients) {
        await Notification.create({
          user: clientId,
          type: 'status_changed',
          title: 'Tracking Update',
          message: `${shipment.containerNumber}: ${location ? `Location: ${location}` : ''}${eta ? ` | Updated ETA: ${new Date(eta).toLocaleDateString()}` : ''}`,
          shipment: shipment._id
        });
      }
    }

    res.json({
      success: true,
      message: 'Tracking update processed',
      data: { shipmentId: shipment._id, containerNumber: shipment.containerNumber, currentStatus: shipment.status }
    });
  } catch (error) {
    console.error('Webhook tracking-update error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// ─── n8n: Bulk Status Update ─────────────────────────────────────
// n8n calls this to update multiple shipments at once
// POST /api/webhooks/bulk-status-update
router.post('/bulk-status-update', async (req, res) => {
  try {
    const { updates } = req.body;
    // updates: [{ containerNumber, status, notes }]

    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ success: false, message: 'updates array is required' });
    }

    const VALID_TRANSITIONS = {
      created: ['on_sea'], on_sea: ['arrived_mombasa'],
      arrived_mombasa: ['discharged'], discharged: ['documents_ready'],
      documents_ready: ['payment_pending'], payment_pending: ['payment_received'],
      payment_received: ['cleared'], cleared: ['in_transit'],
      in_transit: ['at_warehouse'], at_warehouse: ['delivered'],
      delivered: ['completed'],
    };

    const results = [];

    for (const update of updates) {
      try {
        const shipment = await Shipment.findOne({
          containerNumber: update.containerNumber?.toUpperCase(),
          isActive: true
        });

        if (!shipment) {
          results.push({ containerNumber: update.containerNumber, success: false, message: 'Not found' });
          continue;
        }

        const allowed = VALID_TRANSITIONS[shipment.status] || [];
        if (!allowed.includes(update.status)) {
          results.push({
            containerNumber: update.containerNumber, success: false,
            message: `Invalid transition: ${shipment.status} → ${update.status}`
          });
          continue;
        }

        const oldStatus = shipment.status;
        shipment.status = update.status;
        if (update.status === 'arrived_mombasa' && !shipment.actualArrival) {
          shipment.actualArrival = new Date();
        }
        await shipment.save();

        await StatusHistory.create({
          shipment: shipment._id, fromStatus: oldStatus,
          toStatus: update.status, changedBy: shipment.createdBy,
          notes: update.notes || `Bulk update via webhook`
        });

        for (const clientId of shipment.clients) {
          await Notification.create({
            user: clientId, type: 'status_changed',
            title: 'Shipment Status Updated',
            message: `${shipment.containerNumber} → ${update.status.replace(/_/g, ' ').toUpperCase()}`,
            shipment: shipment._id
          });
        }

        results.push({ containerNumber: update.containerNumber, success: true, newStatus: update.status });
      } catch (err) {
        results.push({ containerNumber: update.containerNumber, success: false, message: err.message });
      }
    }

    const succeeded = results.filter(r => r.success).length;
    res.json({
      success: true,
      message: `Processed ${results.length} updates: ${succeeded} succeeded, ${results.length - succeeded} failed`,
      data: { results }
    });
  } catch (error) {
    console.error('Webhook bulk-status-update error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// ─── n8n: Client Auto-Onboarding ────────────────────────────────
// n8n calls this when a new client registers via external form/CRM
// POST /api/webhooks/onboard-client
router.post('/onboard-client', async (req, res) => {
  try {
    const { email, name, company, phone, language, businessType, serviceType } = req.body;

    if (!email || !name) {
      return res.status(400).json({ success: false, message: 'email and name are required' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Client already exists', data: { userId: existing._id } });
    }

    const tempPassword = `ML${Date.now().toString(36)}!`;

    const user = new User({
      email: email.toLowerCase(),
      password: tempPassword,
      name, company, phone,
      role: 'client',
      language: language || 'en',
      businessType: businessType || 'importer',
      serviceType: serviceType || 'sea_only',
      isActive: true
    });
    await user.save();

    res.status(201).json({
      success: true,
      message: 'Client onboarded successfully',
      data: {
        userId: user._id, email: user.email, name: user.name,
        tempPassword,
        note: 'Client should change password on first login'
      }
    });
  } catch (error) {
    console.error('Webhook onboard-client error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// ─── n8n: Alert / Notification Trigger ──────────────────────────
// n8n calls this to send alerts to users (e.g., ETA delays, weather alerts)
// POST /api/webhooks/send-alert
router.post('/send-alert', async (req, res) => {
  try {
    const { recipients, title, message, type, shipmentId, metadata } = req.body;

    if (!title || !message) {
      return res.status(400).json({ success: false, message: 'title and message are required' });
    }

    let userIds = [];

    if (recipients === 'all_clients') {
      const clients = await User.find({ role: 'client', isActive: true }).select('_id');
      userIds = clients.map(c => c._id);
    } else if (recipients === 'all_staff') {
      const staff = await User.find({ role: { $in: ['staff', 'manager', 'admin'] }, isActive: true }).select('_id');
      userIds = staff.map(s => s._id);
    } else if (recipients === 'shipment_clients' && shipmentId) {
      const shipment = await Shipment.findById(shipmentId);
      userIds = shipment ? shipment.clients : [];
    } else if (Array.isArray(recipients)) {
      userIds = recipients;
    } else {
      return res.status(400).json({
        success: false,
        message: 'recipients must be: "all_clients", "all_staff", "shipment_clients" (with shipmentId), or an array of user IDs'
      });
    }

    let count = 0;
    for (const userId of userIds) {
      await Notification.create({
        user: userId,
        type: type || 'alert',
        title, message,
        shipment: shipmentId || undefined,
        metadata: metadata || undefined
      });
      count++;
    }

    res.json({ success: true, message: `Alert sent to ${count} users`, data: { recipientCount: count } });
  } catch (error) {
    console.error('Webhook send-alert error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// ─── n8n: ETA Sync from Shipping Lines ──────────────────────────
// n8n calls this with scraped ETA data from shipping line websites
// POST /api/webhooks/eta-sync
router.post('/eta-sync', async (req, res) => {
  try {
    const { containers } = req.body;
    // containers: [{ containerNumber, eta, vesselName, location }]

    if (!Array.isArray(containers)) {
      return res.status(400).json({ success: false, message: 'containers array is required' });
    }

    const results = [];

    for (const c of containers) {
      const shipment = await Shipment.findOne({
        containerNumber: c.containerNumber?.toUpperCase(),
        isActive: true
      });

      if (!shipment) {
        results.push({ containerNumber: c.containerNumber, success: false, message: 'Not found' });
        continue;
      }

      const updates = {};
      let etaChanged = false;

      if (c.eta) {
        const newEta = new Date(c.eta);
        const oldEta = new Date(shipment.eta);
        const diffDays = Math.abs((newEta - oldEta) / (1000 * 60 * 60 * 24));
        if (diffDays > 0.5) {
          updates.eta = newEta;
          etaChanged = true;
        }
      }
      if (c.vesselName) updates.vesselName = c.vesselName;

      if (Object.keys(updates).length > 0) {
        await Shipment.findByIdAndUpdate(shipment._id, updates);
      }

      if (etaChanged) {
        for (const clientId of shipment.clients) {
          await Notification.create({
            user: clientId, type: 'alert',
            title: 'ETA Updated',
            message: `ETA for ${shipment.containerNumber} updated to ${new Date(c.eta).toLocaleDateString()}`,
            shipment: shipment._id
          });
        }
      }

      results.push({
        containerNumber: c.containerNumber, success: true,
        etaChanged, newEta: c.eta || null
      });
    }

    res.json({
      success: true,
      message: `Synced ${results.length} containers`,
      data: { results, updated: results.filter(r => r.etaChanged).length }
    });
  } catch (error) {
    console.error('Webhook eta-sync error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// ─── n8n: Invoice Generation Trigger ────────────────────────────
// n8n calls this to auto-generate invoices for shipments
// POST /api/webhooks/generate-invoice
router.post('/generate-invoice', async (req, res) => {
  try {
    const { containerNumber, clientEmail, type, items, dueInDays, currency, notes } = req.body;

    if (!containerNumber || !clientEmail || !items) {
      return res.status(400).json({ success: false, message: 'containerNumber, clientEmail, and items are required' });
    }

    const shipment = await Shipment.findOne({ containerNumber: containerNumber.toUpperCase(), isActive: true });
    if (!shipment) return res.status(404).json({ success: false, message: 'Shipment not found' });

    const client = await User.findOne({ email: clientEmail.toLowerCase() });
    if (!client) return res.status(404).json({ success: false, message: 'Client not found' });

    const subtotal = items.reduce((sum, i) => sum + (i.quantity * i.unitPrice), 0);
    const itemsWithTotal = items.map(i => ({ ...i, total: i.quantity * i.unitPrice }));

    const year = new Date().getFullYear();
    const count = await Invoice.countDocuments();
    const invoiceNumber = `INV-${year}-${String(count + 1).padStart(4, '0')}`;

    const invoice = await Invoice.create({
      invoiceNumber, shipment: shipment._id, client: client._id,
      type: type || 'other',
      items: itemsWithTotal, subtotal, tax: 0, total: subtotal,
      currency: currency || 'USD', status: 'issued',
      issueDate: new Date(),
      dueDate: new Date(Date.now() + (dueInDays || 14) * 24 * 60 * 60 * 1000),
      notes: notes || `Generated via n8n webhook`,
      createdBy: shipment.createdBy
    });

    await Notification.create({
      user: client._id, type: 'payment_required',
      title: 'New Invoice',
      message: `Invoice ${invoiceNumber} of $${subtotal} issued for ${containerNumber}.`,
      shipment: shipment._id
    });

    res.status(201).json({
      success: true,
      message: 'Invoice generated',
      data: { invoice: { _id: invoice._id, invoiceNumber, total: subtotal, status: 'issued' } }
    });
  } catch (error) {
    console.error('Webhook generate-invoice error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// ─── n8n: Get Shipments Data (for n8n polling) ──────────────────
// n8n polls this to get shipment data for workflows
// GET /api/webhooks/shipments-feed
router.get('/shipments-feed', async (req, res) => {
  try {
    const { status, since, limit = 50 } = req.query;
    const query = { isActive: true };

    if (status) query.status = status;
    if (since) query.updatedAt = { $gte: new Date(since) };

    const shipments = await Shipment.find(query)
      .populate('clients', 'name company email phone')
      .populate('assignedStaff', 'name email')
      .sort({ updatedAt: -1 })
      .limit(Number(limit));

    res.json({
      success: true,
      data: {
        shipments: shipments.map(s => ({
          _id: s._id,
          containerNumber: s.containerNumber,
          blNumber: s.blNumber,
          shippingLine: s.shippingLine,
          vesselName: s.vesselName,
          status: s.status,
          origin: s.origin,
          destination: s.destination,
          etd: s.etd,
          eta: s.eta,
          actualArrival: s.actualArrival,
          shipmentType: s.shipmentType,
          containerType: s.containerType,
          weight: s.weight,
          clients: s.clients,
          assignedStaff: s.assignedStaff,
          updatedAt: s.updatedAt,
          createdAt: s.createdAt,
        })),
        count: shipments.length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Webhook shipments-feed error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// ─── n8n: Overdue Invoice Detection ─────────────────────────────
// n8n polls this to find overdue invoices and trigger follow-ups
// GET /api/webhooks/overdue-invoices
router.get('/overdue-invoices', async (req, res) => {
  try {
    const overdueInvoices = await Invoice.find({
      status: { $in: ['issued', 'pending'] },
      dueDate: { $lt: new Date() }
    })
      .populate('shipment', 'containerNumber')
      .populate('client', 'name company email phone');

    // Auto-mark as overdue
    for (const inv of overdueInvoices) {
      if (inv.status !== 'overdue') {
        inv.status = 'overdue';
        await inv.save();
      }
    }

    res.json({
      success: true,
      data: {
        invoices: overdueInvoices.map(inv => ({
          _id: inv._id,
          invoiceNumber: inv.invoiceNumber,
          total: inv.total,
          currency: inv.currency,
          dueDate: inv.dueDate,
          daysOverdue: Math.ceil((new Date() - new Date(inv.dueDate)) / (1000 * 60 * 60 * 24)),
          client: inv.client,
          containerNumber: inv.shipment?.containerNumber,
        })),
        count: overdueInvoices.length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Webhook overdue-invoices error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

module.exports = router;
