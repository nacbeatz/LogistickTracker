const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

// Import routes
const authRoutes = require('./routes/auth');
const shipmentRoutes = require('./routes/shipments');
const documentRoutes = require('./routes/documents');
const userRoutes = require('./routes/users');
const notificationRoutes = require('./routes/notifications');
const taskRoutes = require('./routes/tasks');
const dashboardRoutes = require('./routes/dashboard');
const invoiceRoutes = require('./routes/invoices');
const ratingRoutes = require('./routes/ratings');
const messageRoutes = require('./routes/messages');

// Initialize Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/messenger-tracking';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected Successfully'))
  .catch(err => {
    console.error('❌ MongoDB Connection Error:', err.message);
    console.log('⚠️  Running in demo mode without database persistence');
  });

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/shipments', shipmentRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/messages', messageRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Messenger Tracking API is running',
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Messenger Logistics Tracking API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      shipments: '/api/shipments',
      documents: '/api/documents',
      users: '/api/users',
      notifications: '/api/notifications',
      tasks: '/api/tasks',
      dashboard: '/api/dashboard',
      invoices: '/api/invoices',
      ratings: '/api/ratings',
      messages: '/api/messages',
      health: '/api/health'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║     Messenger Logistics Tracking System - Backend        ║
╠══════════════════════════════════════════════════════════╣
║  Server running on port: ${PORT}                            ║
║  API Base URL: http://localhost:${PORT}/api                 ║
║  Health Check: http://localhost:${PORT}/api/health          ║
╚══════════════════════════════════════════════════════════╝
  `);
});

module.exports = app;
