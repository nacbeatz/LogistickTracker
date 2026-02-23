const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema({
  shipment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shipment',
    required: true
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comment: {
    type: String
  },
  category: {
    type: String,
    enum: ['service', 'staff', 'communication', 'timeliness', 'overall'],
    default: 'overall'
  },
  ratedStaff: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  isVisible: {
    type: Boolean,
    default: true
  },
  response: {
    text: String,
    respondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    respondedAt: Date
  }
}, {
  timestamps: true
});

// Index for faster queries
ratingSchema.index({ shipment: 1 });
ratingSchema.index({ client: 1 });
ratingSchema.index({ rating: 1 });

module.exports = mongoose.model('Rating', ratingSchema);
