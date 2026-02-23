const express = require('express');
const { body, validationResult } = require('express-validator');
const Message = require('../models/Message');
const Shipment = require('../models/Shipment');
const Notification = require('../models/Notification');
const { auth } = require('../middleware/auth');

const router = express.Router();

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
  }
  next();
};

// @route   GET /api/messages/:shipmentId
router.get('/:shipmentId', auth, async (req, res) => {
  try {
    const shipment = await Shipment.findById(req.params.shipmentId);
    if (!shipment) return res.status(404).json({ success: false, message: 'Shipment not found' });

    if (req.user.role === 'client') {
      const hasAccess = shipment.clients.some(c => c.toString() === req.user._id.toString());
      if (!hasAccess) return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const { page = 1, limit = 50 } = req.query;

    const messages = await Message.find({ shipment: req.params.shipmentId, isDeleted: false })
      .populate('sender', 'name role avatar')
      .populate('replyTo', 'content sender')
      .sort({ createdAt: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await Message.countDocuments({ shipment: req.params.shipmentId, isDeleted: false });

    // Mark messages as read for this user
    await Message.updateMany(
      {
        shipment: req.params.shipmentId,
        sender: { $ne: req.user._id },
        'readBy.user': { $ne: req.user._id }
      },
      { $push: { readBy: { user: req.user._id, readAt: new Date() } } }
    );

    res.json({
      success: true,
      data: {
        messages,
        totalPages: Math.ceil(count / limit),
        currentPage: page, total: count
      }
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   POST /api/messages
router.post('/', auth, [
  body('shipment').notEmpty().withMessage('Shipment is required'),
  body('content').trim().notEmpty().withMessage('Message content is required'),
  validate
], async (req, res) => {
  try {
    const { shipment: shipmentId, content, type, replyTo } = req.body;

    const shipment = await Shipment.findById(shipmentId).populate('clients', 'name');
    if (!shipment) return res.status(404).json({ success: false, message: 'Shipment not found' });

    if (req.user.role === 'client') {
      const hasAccess = shipment.clients.some(c => c._id.toString() === req.user._id.toString());
      if (!hasAccess) return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const message = await Message.create({
      shipment: shipmentId,
      sender: req.user._id,
      content,
      type: type || 'text',
      replyTo
    });

    const populated = await Message.findById(message._id)
      .populate('sender', 'name role avatar');

    // Notify other participants
    const User = require('../models/User');
    const participants = new Set();

    shipment.clients.forEach(c => participants.add(c._id.toString()));
    if (shipment.assignedStaff) participants.add(shipment.assignedStaff.toString());
    if (shipment.createdBy) participants.add(shipment.createdBy.toString());

    participants.delete(req.user._id.toString());

    for (const userId of participants) {
      await Notification.create({
        user: userId, type: 'message_received',
        title: 'New Message',
        message: `${req.user.name}: ${content.substring(0, 100)}${content.length > 100 ? '...' : ''}`,
        shipment: shipmentId
      });
    }

    res.status(201).json({ success: true, message: 'Message sent', data: { message: populated } });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   DELETE /api/messages/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message) return res.status(404).json({ success: false, message: 'Message not found' });

    if (message.sender.toString() !== req.user._id.toString() && !['manager', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    message.isDeleted = true;
    await message.save();

    res.json({ success: true, message: 'Message deleted' });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   GET /api/messages/unread/count
router.get('/unread/count', auth, async (req, res) => {
  try {
    const shipmentQuery = req.user.role === 'client'
      ? { clients: req.user._id }
      : {};

    const shipments = await Shipment.find(shipmentQuery).select('_id');
    const shipmentIds = shipments.map(s => s._id);

    const unreadCount = await Message.countDocuments({
      shipment: { $in: shipmentIds },
      sender: { $ne: req.user._id },
      isDeleted: false,
      'readBy.user': { $ne: req.user._id }
    });

    res.json({ success: true, data: { unreadCount } });
  } catch (error) {
    console.error('Unread count error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

module.exports = router;
