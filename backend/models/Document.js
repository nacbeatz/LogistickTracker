const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  shipment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shipment',
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: [
      'commercial_invoice',
      'packing_list',
      'bill_of_lading',
      'sea_freight_invoice',
      'loa',
      't1',
      'im4',
      'delivery_note',
      'import_permit',
      'certificate_of_origin',
      'payment_receipt',
      'other'
    ]
  },
  filename: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  path: {
    type: String,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'uploaded', 'verified', 'rejected', 'locked', 'unlocked'],
    default: 'pending'
  },
  isLocked: {
    type: Boolean,
    default: false
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  verifiedAt: {
    type: Date
  },
  rejectionReason: {
    type: String
  },
  notes: {
    type: String
  },
  version: {
    type: Number,
    default: 1
  }
}, {
  timestamps: true
});

// Index for faster queries
documentSchema.index({ shipment: 1 });
documentSchema.index({ type: 1 });
documentSchema.index({ status: 1 });

module.exports = mongoose.model('Document', documentSchema);
