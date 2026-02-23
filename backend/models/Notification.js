const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: [
      'shipment_created',
      'status_changed',
      'document_required',
      'document_verified',
      'document_rejected',
      'payment_required',
      'payment_received',
      'message_received',
      'task_assigned',
      'task_completed',
      'alert',
      'reminder'
    ]
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  shipment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shipment'
  },
  document: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document'
  },
  task: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task'
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date
  },
  sentVia: {
    type: [String],
    enum: ['in_app', 'email', 'whatsapp', 'sms'],
    default: ['in_app']
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Index for faster queries
notificationSchema.index({ user: 1, isRead: 1 });
notificationSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
