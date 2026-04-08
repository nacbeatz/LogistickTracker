const express = require('express');
const Task = require('../models/Task');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/tasks
// @desc    Get all tasks (with filters)
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { 
      status, 
      assignedTo, 
      shipment, 
      page = 1, 
      limit = 20 
    } = req.query;

    const query = {};
    if (status) query.status = status;
    if (shipment) query.shipment = shipment;

    // For staff, show their tasks or unassigned
    if (req.user.role === 'staff') {
      query.$or = [
        { assignedTo: req.user._id },
        { assignedTo: null }
      ];
    } else if (req.user.role === 'client') {
      // For clients, only show their assigned tasks
      query.assignedTo = req.user._id;
    }

    if (assignedTo) {
      query.assignedTo = assignedTo;
    }

    const tasks = await Task.find(query)
      .populate('shipment', 'containerNumber')
      .populate('assignedTo', 'name')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await Task.countDocuments(query);

    // Get task counts by status
    const statusCounts = await Task.aggregate([
      { $match: query },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const counts = {};
    statusCounts.forEach(s => counts[s._id] = s.count);

    res.json({
      success: true,
      data: {
        tasks,
        counts,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        total: count
      }
    });
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   GET /api/tasks/:id
// @desc    Get single task
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('shipment', 'containerNumber clients')
      .populate('assignedTo', 'name')
      .populate('createdBy', 'name')
      .populate('completedBy', 'name');

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Check access for clients
    if (req.user.role === 'client') {
      const hasAccess = task.shipment.clients.some(
        client => client.toString() === req.user._id.toString()
      );
      if (!hasAccess && task.assignedTo?.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }

    res.json({
      success: true,
      data: { task }
    });
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   POST /api/tasks
// @desc    Create a new task
// @access  Private (Staff, Manager, Admin)
router.post('/', auth, authorize('staff', 'manager', 'admin'), async (req, res) => {
  try {
    const {
      shipment,
      type,
      title,
      description,
      assignedTo,
      dueDate,
      priority,
      notes
    } = req.body;

    const task = new Task({
      shipment,
      type,
      title,
      description,
      assignedTo,
      dueDate,
      priority: priority || 'medium',
      notes,
      createdBy: req.user._id,
      status: 'pending'
    });

    await task.save();

    // Notify assigned user with container number context
    if (assignedTo) {
      const Notification = require('../models/Notification');
      const Shipment = require('../models/Shipment');
      const shipmentDoc = await Shipment.findById(shipment).select('containerNumber');
      const containerRef = shipmentDoc ? ` for ${shipmentDoc.containerNumber}` : '';
      await Notification.create({
        user: assignedTo,
        type: 'task_assigned',
        title: 'New Task Assigned',
        message: `You have been assigned ${title.toLowerCase()}${containerRef}.`,
        task: task._id,
        shipment: shipment
      });
    }

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: { task }
    });
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   PUT /api/tasks/:id/status
// @desc    Update task status
// @access  Private
router.put('/:id/status', auth, async (req, res) => {
  try {
    const { status, notes } = req.body;

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Check permissions
    const canUpdate = 
      req.user.role === 'admin' || 
      req.user.role === 'manager' ||
      task.assignedTo?.toString() === req.user._id.toString() ||
      task.createdBy?.toString() === req.user._id.toString();

    if (!canUpdate) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    task.status = status;
    
    if (status === 'completed') {
      task.completedAt = new Date();
      task.completedBy = req.user._id;
    }

    if (notes) {
      task.notes = notes;
    }

    await task.save();

    // Notify task creator
    if (status === 'completed' && task.createdBy.toString() !== req.user._id.toString()) {
      const Notification = require('../models/Notification');
      await Notification.create({
        user: task.createdBy,
        type: 'task_completed',
        title: 'Task Completed',
        message: `Task "${task.title}" has been completed`,
        task: task._id
      });
    }

    res.json({
      success: true,
      message: 'Task status updated',
      data: { task }
    });
  } catch (error) {
    console.error('Update task status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   PUT /api/tasks/:id
// @desc    Update task
// @access  Private (Staff, Manager, Admin)
router.put('/:id', auth, authorize('staff', 'manager', 'admin'), async (req, res) => {
  try {
    const updates = {};
    const allowedFields = ['title', 'description', 'assignedTo', 'dueDate', 'priority', 'notes'];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const task = await Task.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    res.json({
      success: true,
      message: 'Task updated successfully',
      data: { task }
    });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @route   DELETE /api/tasks/:id
// @desc    Delete task
// @access  Private (Manager, Admin)
router.delete('/:id', auth, authorize('manager', 'admin'), async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    res.json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

module.exports = router;
