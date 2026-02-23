const express = require('express');
const { body, validationResult } = require('express-validator');
const Rating = require('../models/Rating');
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

// @route   GET /api/ratings
router.get('/', auth, async (req, res) => {
  try {
    const { shipment, client, page = 1, limit = 20 } = req.query;
    const query = { isVisible: true };

    if (shipment) query.shipment = shipment;
    if (req.user.role === 'client') {
      query.client = req.user._id;
    } else if (client) {
      query.client = client;
    }

    const ratings = await Rating.find(query)
      .populate('shipment', 'containerNumber')
      .populate('client', 'name company')
      .populate('ratedStaff', 'name')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await Rating.countDocuments(query);

    const avgResult = await Rating.aggregate([
      { $match: query },
      { $group: { _id: null, avgRating: { $avg: '$rating' }, count: { $sum: 1 } } }
    ]);

    res.json({
      success: true,
      data: {
        ratings,
        average: avgResult[0]?.avgRating || 0,
        totalPages: Math.ceil(count / limit),
        currentPage: page, total: count
      }
    });
  } catch (error) {
    console.error('Get ratings error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   POST /api/ratings
router.post('/', auth, [
  body('shipment').notEmpty().withMessage('Shipment is required'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  validate
], async (req, res) => {
  try {
    const { shipment: shipmentId, rating, comment, category } = req.body;

    const shipment = await Shipment.findById(shipmentId);
    if (!shipment) return res.status(404).json({ success: false, message: 'Shipment not found' });

    if (shipment.status !== 'completed') {
      return res.status(400).json({ success: false, message: 'Can only rate completed shipments' });
    }

    const hasAccess = shipment.clients.some(c => c.toString() === req.user._id.toString());
    if (!hasAccess) return res.status(403).json({ success: false, message: 'Access denied' });

    const existing = await Rating.findOne({ shipment: shipmentId, client: req.user._id });
    if (existing) {
      return res.status(400).json({ success: false, message: 'You have already rated this shipment' });
    }

    const newRating = await Rating.create({
      shipment: shipmentId,
      client: req.user._id,
      rating,
      comment,
      category: category || 'overall',
      ratedStaff: shipment.assignedStaff
    });

    // Notify manager about new rating
    const User = require('../models/User');
    const managers = await User.find({ role: { $in: ['manager', 'admin'] }, isActive: true });
    for (const mgr of managers) {
      await Notification.create({
        user: mgr._id, type: 'alert',
        title: `New Rating: ${rating}/5`,
        message: `${req.user.name} rated shipment ${shipment.containerNumber}: ${rating}/5${comment ? ' - "' + comment + '"' : ''}`,
        shipment: shipmentId
      });
    }

    res.status(201).json({ success: true, message: 'Rating submitted', data: { rating: newRating } });
  } catch (error) {
    console.error('Create rating error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/ratings/:id/respond
router.put('/:id/respond', auth, authorize('staff', 'manager', 'admin'), [
  body('text').notEmpty().withMessage('Response text is required'),
  validate
], async (req, res) => {
  try {
    const rating = await Rating.findById(req.params.id);
    if (!rating) return res.status(404).json({ success: false, message: 'Rating not found' });

    rating.response = {
      text: req.body.text,
      respondedBy: req.user._id,
      respondedAt: new Date()
    };
    await rating.save();

    await Notification.create({
      user: rating.client, type: 'alert',
      title: 'Response to Your Rating',
      message: `Your rating has received a response: "${req.body.text}"`,
      shipment: rating.shipment
    });

    res.json({ success: true, message: 'Response added', data: { rating } });
  } catch (error) {
    console.error('Respond rating error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   GET /api/ratings/shipment/:shipmentId
router.get('/shipment/:shipmentId', auth, async (req, res) => {
  try {
    const ratings = await Rating.find({ shipment: req.params.shipmentId, isVisible: true })
      .populate('client', 'name company')
      .populate('ratedStaff', 'name')
      .sort({ createdAt: -1 });

    const myRating = req.user.role === 'client'
      ? await Rating.findOne({ shipment: req.params.shipmentId, client: req.user._id })
      : null;

    res.json({
      success: true,
      data: { ratings, myRating, hasRated: !!myRating }
    });
  } catch (error) {
    console.error('Get shipment ratings error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

module.exports = router;
