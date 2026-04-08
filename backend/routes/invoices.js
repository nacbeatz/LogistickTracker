const express = require('express');
const { body, validationResult } = require('express-validator');
const Invoice = require('../models/Invoice');
const Shipment = require('../models/Shipment');
const Notification = require('../models/Notification');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
  }
  next();
};

// @route   GET /api/invoices
router.get('/', auth, async (req, res) => {
  try {
    // Lazily mark past-due invoices as overdue
    await Invoice.updateMany(
      { dueDate: { $lt: new Date() }, status: { $in: ['issued', 'pending'] } },
      { $set: { status: 'overdue' } }
    );

    const { shipment, client, status, page = 1, limit = 20 } = req.query;
    const query = {};

    if (shipment) query.shipment = shipment;
    if (status) query.status = status;

    if (req.user.role === 'client') {
      query.client = req.user._id;
    } else if (client) {
      query.client = client;
    }

    const invoices = await Invoice.find(query)
      .populate('shipment', 'containerNumber status')
      .populate('client', 'name company email')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await Invoice.countDocuments(query);

    const stats = await Invoice.aggregate([
      { $match: req.user.role === 'client' ? { client: req.user._id } : {} },
      { $group: { _id: '$status', count: { $sum: 1 }, total: { $sum: '$total' } } }
    ]);
    const summary = {};
    stats.forEach(s => { summary[s._id] = { count: s.count, total: s.total }; });

    res.json({
      success: true,
      data: {
        invoices, summary,
        totalPages: Math.ceil(count / limit),
        currentPage: page, total: count
      }
    });
  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   GET /api/invoices/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('shipment', 'containerNumber status origin destination')
      .populate('client', 'name company email phone')
      .populate('createdBy', 'name');

    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });

    if (req.user.role === 'client' && invoice.client._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    res.json({ success: true, data: { invoice } });
  } catch (error) {
    console.error('Get invoice error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   POST /api/invoices
router.post('/', auth, authorize('staff', 'manager', 'admin'), [
  body('shipment').notEmpty().withMessage('Shipment is required'),
  body('client').notEmpty().withMessage('Client is required'),
  body('type').isIn(['sea_freight', 'clearance', 'transport', 'storage', 'handling', 'other']),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('dueDate').isISO8601().withMessage('Valid due date is required'),
  validate
], async (req, res) => {
  try {
    const { shipment: shipmentId, client, type, items, tax, currency, dueDate, notes } = req.body;

    const shipment = await Shipment.findById(shipmentId);
    if (!shipment) return res.status(404).json({ success: false, message: 'Shipment not found' });

    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const itemsWithTotal = items.map(item => ({ ...item, total: item.quantity * item.unitPrice }));
    const totalAmount = subtotal + (tax || 0);

    const year = new Date().getFullYear();
    const count = await Invoice.countDocuments();
    const invoiceNumber = `INV-${year}-${String(count + 1).padStart(4, '0')}`;

    const invoice = await Invoice.create({
      invoiceNumber, shipment: shipmentId, client, type,
      items: itemsWithTotal, subtotal, tax: tax || 0, total: totalAmount,
      currency: currency || 'USD', status: 'issued',
      issueDate: new Date(), dueDate,
      notes, createdBy: req.user._id
    });

    await Notification.create({
      user: client, type: 'payment_required',
      title: 'New Invoice',
      message: `Invoice ${invoiceNumber} of $${totalAmount} has been issued for container ${shipment.containerNumber}.`,
      shipment: shipmentId
    });

    res.status(201).json({ success: true, message: 'Invoice created', data: { invoice } });
  } catch (error) {
    console.error('Create invoice error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/invoices/:id/pay
router.put('/:id/pay', auth, authorize('staff', 'manager', 'admin'), [
  body('paidAmount').isNumeric().withMessage('Paid amount is required'),
  body('paymentMethod').isIn(['bank_transfer', 'cash', 'mobile_money', 'check', 'other']),
  validate
], async (req, res) => {
  try {
    const { paidAmount, paymentMethod, paymentReference } = req.body;

    const invoice = await Invoice.findById(req.params.id)
      .populate('shipment', 'containerNumber clients status');
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });

    invoice.status = 'paid';
    invoice.paidAt = new Date();
    invoice.paidAmount = paidAmount;
    invoice.paymentMethod = paymentMethod;
    invoice.paymentReference = paymentReference;
    await invoice.save();

    await Notification.create({
      user: invoice.client, type: 'payment_received',
      title: 'Payment Confirmed',
      message: `Payment of $${paidAmount} for invoice ${invoice.invoiceNumber} has been confirmed.`,
      shipment: invoice.shipment._id
    });

    // Check if all invoices for this shipment are paid → auto-advance to payment_received
    const unpaidInvoices = await Invoice.countDocuments({
      shipment: invoice.shipment._id,
      status: { $nin: ['paid', 'cancelled'] }
    });

    if (unpaidInvoices === 0 && invoice.shipment.status === 'payment_pending') {
      const shipment = await Shipment.findById(invoice.shipment._id);
      const oldStatus = shipment.status;
      shipment.status = 'payment_received';
      await shipment.save();

      const Document = require('../models/Document');
      await Document.updateMany(
        { shipment: shipment._id, isLocked: true },
        { isLocked: false }
      );

      const StatusHistory = require('../models/StatusHistory');
      await StatusHistory.create({
        shipment: shipment._id, fromStatus: oldStatus, toStatus: 'payment_received',
        changedBy: req.user._id, notes: 'All invoices paid - auto-advanced'
      });

      for (const clientId of shipment.clients) {
        await Notification.create({
          user: clientId, type: 'payment_received',
          title: 'All Payments Complete - Documents Unlocked',
          message: `All payments for ${shipment.containerNumber} confirmed. Documents are now unlocked.`,
          shipment: shipment._id
        });
      }
    }

    res.json({ success: true, message: 'Payment recorded', data: { invoice } });
  } catch (error) {
    console.error('Pay invoice error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/invoices/:id
router.put('/:id', auth, authorize('staff', 'manager', 'admin'), async (req, res) => {
  try {
    const updates = {};
    const allowedFields = ['status', 'dueDate', 'notes', 'items', 'tax'];
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    if (updates.items) {
      updates.subtotal = updates.items.reduce((sum, i) => sum + (i.quantity * i.unitPrice), 0);
      updates.items = updates.items.map(i => ({ ...i, total: i.quantity * i.unitPrice }));
      updates.total = updates.subtotal + (updates.tax || 0);
    }

    const invoice = await Invoice.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });

    res.json({ success: true, message: 'Invoice updated', data: { invoice } });
  } catch (error) {
    console.error('Update invoice error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   DELETE /api/invoices/:id
router.delete('/:id', auth, authorize('manager', 'admin'), async (req, res) => {
  try {
    const invoice = await Invoice.findByIdAndUpdate(req.params.id, { status: 'cancelled' }, { new: true });
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
    res.json({ success: true, message: 'Invoice cancelled' });
  } catch (error) {
    console.error('Delete invoice error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

module.exports = router;
