const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config();

const User = require('./models/User');
const Shipment = require('./models/Shipment');
const Document = require('./models/Document');
const Task = require('./models/Task');
const Notification = require('./models/Notification');
const StatusHistory = require('./models/StatusHistory');
const Invoice = require('./models/Invoice');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/messenger-tracking';

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await Promise.all([
      User.deleteMany({}),
      Shipment.deleteMany({}),
      Document.deleteMany({}),
      Task.deleteMany({}),
      Notification.deleteMany({}),
      StatusHistory.deleteMany({}),
      Invoice.deleteMany({}),
    ]);
    console.log('Cleared existing data');

    // Create users
    const admin = await User.create({
      email: 'admin@messenger.rw',
      password: 'admin123',
      name: 'Admin User',
      role: 'admin',
      company: 'Messenger Logistics Ltd',
      phone: '+250788310510',
      language: 'en',
      isActive: true,
    });

    const manager = await User.create({
      email: 'manager@messenger.rw',
      password: 'manager123',
      name: 'Jean Claude Mugabo',
      role: 'manager',
      company: 'Messenger Logistics Ltd',
      phone: '+250788000001',
      language: 'en',
      isActive: true,
    });

    const staff = await User.create({
      email: 'staff@messenger.rw',
      password: 'staff123',
      name: 'Alice Uwimana',
      role: 'staff',
      company: 'Messenger Logistics Ltd',
      phone: '+250788000002',
      language: 'rw',
      isActive: true,
    });

    const client1 = await User.create({
      email: 'client@test.com',
      password: 'client123',
      name: 'Patrick Niyonzima',
      role: 'client',
      company: 'Rwanda Import Co.',
      phone: '+250788000003',
      language: 'rw',
      businessType: 'importer',
      serviceType: 'full_service',
      isActive: true,
    });

    const client2 = await User.create({
      email: 'client2@test.com',
      password: 'client123',
      name: 'Grace Mukamana',
      role: 'client',
      company: 'Great Lakes Trading',
      phone: '+250788000004',
      language: 'en',
      businessType: 'transit',
      serviceType: 'sea_transport',
      isActive: true,
    });

    const client3 = await User.create({
      email: 'client3@test.com',
      password: 'client123',
      name: 'Emmanuel Habimana',
      role: 'client',
      company: 'Kigali Electronics',
      phone: '+250788000005',
      language: 'en',
      businessType: 'importer',
      serviceType: 'sea_only',
      isActive: true,
    });

    console.log('Created users');

    // Create shipments
    const now = new Date();
    const daysAgo = (d) => new Date(now - d * 24 * 60 * 60 * 1000);
    const daysFromNow = (d) => new Date(now.getTime() + d * 24 * 60 * 60 * 1000);

    const shipment1 = await Shipment.create({
      containerNumber: 'MSCU7654321',
      blNumber: 'MSC-BL-2026-001',
      shippingLine: 'MSC',
      vesselName: 'MSC Flaminia',
      etd: daysAgo(25),
      eta: daysFromNow(5),
      origin: 'Shanghai, China',
      destination: 'Kigali, Rwanda',
      status: 'on_sea',
      shipmentType: 'FCL',
      containerType: '40ft_standard',
      weight: 18500,
      cargoDescription: 'Electronics and household appliances',
      clients: [client1._id, client3._id],
      createdBy: staff._id,
      assignedStaff: staff._id,
      isActive: true,
    });

    const shipment2 = await Shipment.create({
      containerNumber: 'COSCO2468135',
      blNumber: 'COSCO-BL-2026-042',
      shippingLine: 'COSCO',
      vesselName: 'COSCO Harmony',
      etd: daysAgo(40),
      eta: daysAgo(2),
      actualArrival: daysAgo(1),
      origin: 'Guangzhou, China',
      destination: 'Kigali, Rwanda',
      status: 'arrived_mombasa',
      shipmentType: 'FCL',
      containerType: '40ft_high_cube',
      weight: 22000,
      cargoDescription: 'Textiles and garments',
      clients: [client2._id],
      createdBy: staff._id,
      assignedStaff: staff._id,
      isActive: true,
    });

    const shipment3 = await Shipment.create({
      containerNumber: 'MAEU1357924',
      blNumber: 'MAERSK-BL-2026-078',
      shippingLine: 'MAERSK',
      vesselName: 'Maersk Elba',
      etd: daysAgo(60),
      eta: daysAgo(15),
      actualArrival: daysAgo(14),
      origin: 'Dubai, UAE',
      destination: 'Kigali, Rwanda',
      status: 'in_transit',
      shipmentType: 'LCL',
      containerType: '20ft_standard',
      weight: 8500,
      cargoDescription: 'Building materials and hardware',
      clients: [client1._id, client2._id],
      createdBy: manager._id,
      assignedStaff: staff._id,
      isActive: true,
    });

    const shipment4 = await Shipment.create({
      containerNumber: 'ONEU9876543',
      blNumber: 'ONE-BL-2026-015',
      shippingLine: 'ONE',
      vesselName: 'ONE Commitment',
      etd: daysAgo(90),
      eta: daysAgo(45),
      actualArrival: daysAgo(44),
      origin: 'Yokohama, Japan',
      destination: 'Kigali, Rwanda',
      status: 'completed',
      shipmentType: 'FCL',
      containerType: '40ft_standard',
      weight: 15000,
      cargoDescription: 'Auto parts and machinery',
      clients: [client3._id],
      createdBy: staff._id,
      assignedStaff: staff._id,
      isActive: true,
    });

    const shipment5 = await Shipment.create({
      containerNumber: 'CMAU5551234',
      blNumber: 'CMA-BL-2026-099',
      shippingLine: 'CMA_CGM',
      vesselName: 'CMA CGM Volta',
      etd: daysAgo(5),
      eta: daysFromNow(25),
      origin: 'Mumbai, India',
      destination: 'Bujumbura, Burundi',
      status: 'created',
      shipmentType: 'groupage',
      containerType: '40ft_high_cube',
      weight: 20000,
      cargoDescription: 'Mixed consumer goods',
      clients: [client1._id, client2._id, client3._id],
      createdBy: manager._id,
      assignedStaff: staff._id,
      isActive: true,
    });

    console.log('Created shipments');

    // Create status history entries
    const histories = [
      { shipment: shipment1._id, fromStatus: 'none', toStatus: 'created', changedBy: staff._id, notes: 'Shipment created' },
      { shipment: shipment1._id, fromStatus: 'created', toStatus: 'on_sea', changedBy: staff._id, notes: 'Vessel departed Shanghai' },
      { shipment: shipment2._id, fromStatus: 'none', toStatus: 'created', changedBy: staff._id, notes: 'Shipment created' },
      { shipment: shipment2._id, fromStatus: 'created', toStatus: 'on_sea', changedBy: staff._id, notes: 'Vessel departed' },
      { shipment: shipment2._id, fromStatus: 'on_sea', toStatus: 'arrived_mombasa', changedBy: staff._id, notes: 'Arrived at Mombasa port' },
      { shipment: shipment3._id, fromStatus: 'none', toStatus: 'created', changedBy: manager._id, notes: 'Shipment created' },
      { shipment: shipment3._id, fromStatus: 'created', toStatus: 'on_sea', changedBy: staff._id },
      { shipment: shipment3._id, fromStatus: 'on_sea', toStatus: 'arrived_mombasa', changedBy: staff._id },
      { shipment: shipment3._id, fromStatus: 'arrived_mombasa', toStatus: 'discharged', changedBy: staff._id },
      { shipment: shipment3._id, fromStatus: 'discharged', toStatus: 'cleared', changedBy: staff._id },
      { shipment: shipment3._id, fromStatus: 'cleared', toStatus: 'in_transit', changedBy: staff._id, notes: 'Loaded on truck' },
      { shipment: shipment4._id, fromStatus: 'none', toStatus: 'created', changedBy: staff._id },
      { shipment: shipment4._id, fromStatus: 'created', toStatus: 'on_sea', changedBy: staff._id },
      { shipment: shipment4._id, fromStatus: 'on_sea', toStatus: 'arrived_mombasa', changedBy: staff._id },
      { shipment: shipment4._id, fromStatus: 'arrived_mombasa', toStatus: 'cleared', changedBy: staff._id },
      { shipment: shipment4._id, fromStatus: 'cleared', toStatus: 'in_transit', changedBy: staff._id },
      { shipment: shipment4._id, fromStatus: 'in_transit', toStatus: 'delivered', changedBy: staff._id },
      { shipment: shipment4._id, fromStatus: 'delivered', toStatus: 'completed', changedBy: manager._id },
      { shipment: shipment5._id, fromStatus: 'none', toStatus: 'created', changedBy: manager._id, notes: 'Groupage shipment created' },
    ];
    await StatusHistory.insertMany(histories);
    console.log('Created status history');

    // Create tasks
    const tasks = [
      {
        shipment: shipment1._id,
        type: 'upload_invoice',
        title: 'Upload Commercial Invoice',
        description: 'Please upload commercial invoice for MSCU7654321',
        assignedTo: client1._id,
        createdBy: staff._id,
        status: 'pending',
        priority: 'high',
        dueDate: daysFromNow(3),
      },
      {
        shipment: shipment1._id,
        type: 'upload_invoice',
        title: 'Upload Commercial Invoice',
        description: 'Please upload commercial invoice for MSCU7654321',
        assignedTo: client3._id,
        createdBy: staff._id,
        status: 'pending',
        priority: 'high',
        dueDate: daysFromNow(3),
      },
      {
        shipment: shipment2._id,
        type: 'customs_clearance',
        title: 'Process Customs Clearance',
        description: 'Process customs clearance for container COSCO2468135 at Mombasa',
        assignedTo: staff._id,
        createdBy: manager._id,
        status: 'in_progress',
        priority: 'urgent',
        dueDate: daysFromNow(2),
      },
      {
        shipment: shipment2._id,
        type: 'upload_document',
        title: 'Upload Packing List',
        description: 'Upload packing list for COSCO2468135',
        assignedTo: client2._id,
        createdBy: staff._id,
        status: 'pending',
        priority: 'medium',
        dueDate: daysFromNow(5),
      },
      {
        shipment: shipment3._id,
        type: 'arrange_transport',
        title: 'Arrange Transport to Kigali',
        description: 'Arrange trucking for container MAEU1357924 from Mombasa to Kigali',
        assignedTo: staff._id,
        createdBy: manager._id,
        status: 'completed',
        priority: 'high',
        dueDate: daysAgo(1),
        completedAt: daysAgo(1),
        completedBy: staff._id,
      },
      {
        shipment: shipment5._id,
        type: 'notify_client',
        title: 'Notify Clients of New Shipment',
        description: 'Send notification to all clients about groupage shipment CMAU5551234',
        assignedTo: staff._id,
        createdBy: manager._id,
        status: 'pending',
        priority: 'medium',
        dueDate: daysFromNow(1),
      },
    ];
    await Task.insertMany(tasks);
    console.log('Created tasks');

    // Create notifications
    const notifications = [
      {
        user: client1._id,
        type: 'shipment_created',
        title: 'New Shipment Created',
        message: 'Your shipment MSCU7654321 has been created. Please upload required documents.',
        shipment: shipment1._id,
        isRead: false,
      },
      {
        user: client1._id,
        type: 'status_changed',
        title: 'Shipment Status Updated',
        message: 'Your shipment MSCU7654321 is now on sea.',
        shipment: shipment1._id,
        isRead: true,
        readAt: daysAgo(20),
      },
      {
        user: client2._id,
        type: 'status_changed',
        title: 'Shipment Arrived',
        message: 'Your shipment COSCO2468135 has arrived at Mombasa port.',
        shipment: shipment2._id,
        isRead: false,
      },
      {
        user: client1._id,
        type: 'document_required',
        title: 'Document Required',
        message: 'Please upload your commercial invoice for shipment MSCU7654321.',
        shipment: shipment1._id,
        isRead: false,
      },
      {
        user: client3._id,
        type: 'shipment_created',
        title: 'New Shipment',
        message: 'A new groupage shipment CMAU5551234 has been created for you.',
        shipment: shipment5._id,
        isRead: false,
      },
      {
        user: staff._id,
        type: 'task_assigned',
        title: 'New Task Assigned',
        message: 'You have been assigned customs clearance for COSCO2468135.',
        isRead: false,
      },
      {
        user: manager._id,
        type: 'alert',
        title: 'Attention Required',
        message: 'Container COSCO2468135 arrived at Mombasa - customs clearance needed.',
        shipment: shipment2._id,
        isRead: false,
      },
    ];
    await Notification.insertMany(notifications);
    console.log('Created notifications');

    // Create invoices
    const invoices = [
      {
        invoiceNumber: 'INV-2026-001',
        shipment: shipment4._id,
        client: client3._id,
        type: 'sea_freight',
        items: [
          { description: 'Sea freight - 40ft container (Yokohama to Mombasa)', quantity: 1, unitPrice: 2800, total: 2800 },
          { description: 'Port handling charges', quantity: 1, unitPrice: 350, total: 350 },
        ],
        subtotal: 3150,
        tax: 0,
        total: 3150,
        currency: 'USD',
        status: 'paid',
        issueDate: daysAgo(50),
        dueDate: daysAgo(35),
        paidAt: daysAgo(38),
        paidAmount: 3150,
        paymentMethod: 'bank_transfer',
        paymentReference: 'TXN-2026-89012',
        createdBy: manager._id,
      },
      {
        invoiceNumber: 'INV-2026-002',
        shipment: shipment4._id,
        client: client3._id,
        type: 'transport',
        items: [
          { description: 'Inland transport Mombasa to Kigali', quantity: 1, unitPrice: 4200, total: 4200 },
          { description: 'Customs clearance fees', quantity: 1, unitPrice: 500, total: 500 },
        ],
        subtotal: 4700,
        tax: 0,
        total: 4700,
        currency: 'USD',
        status: 'paid',
        issueDate: daysAgo(40),
        dueDate: daysAgo(25),
        paidAt: daysAgo(28),
        paidAmount: 4700,
        paymentMethod: 'bank_transfer',
        paymentReference: 'TXN-2026-89015',
        createdBy: manager._id,
      },
      {
        invoiceNumber: 'INV-2026-003',
        shipment: shipment2._id,
        client: client2._id,
        type: 'sea_freight',
        items: [
          { description: 'Sea freight - 40ft HC container (Guangzhou to Mombasa)', quantity: 1, unitPrice: 3200, total: 3200 },
          { description: 'Documentation fee', quantity: 1, unitPrice: 150, total: 150 },
          { description: 'Port handling', quantity: 1, unitPrice: 400, total: 400 },
        ],
        subtotal: 3750,
        tax: 0,
        total: 3750,
        currency: 'USD',
        status: 'pending',
        issueDate: daysAgo(3),
        dueDate: daysFromNow(12),
        createdBy: manager._id,
      },
    ];
    await Invoice.insertMany(invoices);
    console.log('Created invoices');

    console.log('\n========================================');
    console.log('  SEED DATA CREATED SUCCESSFULLY!');
    console.log('========================================');
    console.log('\n  Test Accounts:');
    console.log('  ─────────────────────────────────────');
    console.log('  Admin:   admin@messenger.rw   / admin123');
    console.log('  Manager: manager@messenger.rw / manager123');
    console.log('  Staff:   staff@messenger.rw   / staff123');
    console.log('  Client:  client@test.com      / client123');
    console.log('  Client2: client2@test.com     / client123');
    console.log('  Client3: client3@test.com     / client123');
    console.log('  ─────────────────────────────────────');
    console.log(`\n  Shipments: 5`);
    console.log(`  Tasks: ${tasks.length}`);
    console.log(`  Notifications: ${notifications.length}`);
    console.log(`  Invoices: ${invoices.length}`);
    console.log('========================================\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

seed();
