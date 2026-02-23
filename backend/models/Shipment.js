const mongoose = require('mongoose');

const shipmentItemSchema = new mongoose.Schema({
  description: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    default: 1
  },
  value: {
    type: Number,
    default: 0
  },
  weight: {
    type: Number,
    default: 0
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
});

const shipmentSchema = new mongoose.Schema({
  containerNumber: {
    type: String,
    required: [true, 'Container number is required'],
    unique: true,
    uppercase: true,
    trim: true
  },
  blNumber: {
    type: String,
    trim: true
  },
  shippingLine: {
    type: String,
    required: [true, 'Shipping line is required'],
    enum: ['ONE', 'COSCO', 'MSC', 'MAERSK', 'CMA_CGM', 'EVERGREEN', 'HAPAG_LLOYD', 'OTHER']
  },
  vesselName: {
    type: String,
    trim: true
  },
  etd: {
    type: Date,
    required: [true, 'ETD is required']
  },
  eta: {
    type: Date,
    required: [true, 'ETA is required']
  },
  actualArrival: {
    type: Date
  },
  status: {
    type: String,
    enum: [
      'created',
      'on_sea',
      'arrived_mombasa',
      'discharged',
      'documents_ready',
      'payment_pending',
      'payment_received',
      'cleared',
      'in_transit',
      'at_warehouse',
      'delivered',
      'completed'
    ],
    default: 'created'
  },
  origin: {
    type: String,
    required: [true, 'Origin is required']
  },
  destination: {
    type: String,
    required: [true, 'Destination is required']
  },
  shipmentType: {
    type: String,
    enum: ['FCL', 'LCL', 'groupage'],
    default: 'FCL'
  },
  containerType: {
    type: String,
    enum: ['20ft_standard', '40ft_standard', '40ft_high_cube', '20ft_reefer', '40ft_reefer'],
    default: '40ft_standard'
  },
  weight: {
    type: Number,
    default: 0
  },
  cargoDescription: {
    type: String
  },
  clients: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  items: [shipmentItemSchema],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedStaff: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  notes: {
    type: String
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for faster queries
shipmentSchema.index({ status: 1 });
shipmentSchema.index({ clients: 1 });
shipmentSchema.index({ createdAt: -1 });

// Virtual for days remaining
shipmentSchema.virtual('daysRemaining').get(function() {
  if (this.eta) {
    const now = new Date();
    const eta = new Date(this.eta);
    const diffTime = eta - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }
  return null;
});

// Virtual for progress percentage
shipmentSchema.virtual('progressPercentage').get(function() {
  const statusOrder = [
    'created', 'on_sea', 'arrived_mombasa', 'discharged', 
    'documents_ready', 'payment_pending', 'payment_received',
    'cleared', 'in_transit', 'at_warehouse', 'delivered', 'completed'
  ];
  const currentIndex = statusOrder.indexOf(this.status);
  return Math.round((currentIndex / (statusOrder.length - 1)) * 100);
});

module.exports = mongoose.model('Shipment', shipmentSchema);
