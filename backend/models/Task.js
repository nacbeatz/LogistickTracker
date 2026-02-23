const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  shipment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shipment',
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: [
      'upload_invoice',
      'upload_document',
      'verify_document',
      'update_eta',
      'process_payment',
      'arrange_transport',
      'customs_clearance',
      'notify_client',
      'review_shipment',
      'other'
    ]
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  dueDate: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  completedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  notes: {
    type: String
  },
  relatedDocument: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document'
  }
}, {
  timestamps: true
});

// Index for faster queries
taskSchema.index({ shipment: 1 });
taskSchema.index({ assignedTo: 1, status: 1 });
taskSchema.index({ status: 1, dueDate: 1 });

module.exports = mongoose.model('Task', taskSchema);
