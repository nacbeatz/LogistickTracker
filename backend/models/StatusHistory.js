const mongoose = require('mongoose');

const statusHistorySchema = new mongoose.Schema({
  shipment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shipment',
    required: true
  },
  fromStatus: {
    type: String,
    required: true
  },
  toStatus: {
    type: String,
    required: true
  },
  changedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  notes: {
    type: String
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Index for faster queries
statusHistorySchema.index({ shipment: 1 });
statusHistorySchema.index({ createdAt: -1 });

module.exports = mongoose.model('StatusHistory', statusHistorySchema);
