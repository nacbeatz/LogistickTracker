const express = require('express');
const Shipment = require('../models/Shipment');
const Document = require('../models/Document');
const Invoice = require('../models/Invoice');
const Task = require('../models/Task');
const User = require('../models/User');
const Rating = require('../models/Rating');
const StatusHistory = require('../models/StatusHistory');
const { auth } = require('../middleware/auth');
const { webhookAuth } = require('../middleware/webhookAuth');

const router = express.Router();

// ─── AI: ETA Prediction ────────────────────────────────────────
// Calculates predicted ETA based on historical transit times for similar routes
// GET /api/ai/predict-eta/:shipmentId
router.get('/predict-eta/:shipmentId', auth, async (req, res) => {
  try {
    const shipment = await Shipment.findById(req.params.shipmentId);
    if (!shipment) return res.status(404).json({ success: false, message: 'Shipment not found' });

    // Find completed shipments with similar route
    const similar = await Shipment.find({
      status: 'completed',
      shippingLine: shipment.shippingLine,
      origin: { $regex: shipment.origin.split(',')[0], $options: 'i' },
      actualArrival: { $exists: true },
      etd: { $exists: true }
    }).limit(20);

    let predictedDays = null;
    let confidence = 'low';
    let basedOn = 0;

    if (similar.length > 0) {
      const transitDays = similar.map(s => {
        const transit = (new Date(s.actualArrival) - new Date(s.etd)) / (1000 * 60 * 60 * 24);
        return transit;
      }).filter(d => d > 0 && d < 120);

      basedOn = transitDays.length;

      if (transitDays.length >= 3) {
        const avg = transitDays.reduce((a, b) => a + b, 0) / transitDays.length;
        const stdDev = Math.sqrt(transitDays.reduce((sq, n) => sq + Math.pow(n - avg, 2), 0) / transitDays.length);
        predictedDays = Math.round(avg);
        confidence = stdDev < 5 ? 'high' : stdDev < 10 ? 'medium' : 'low';
      } else if (transitDays.length > 0) {
        predictedDays = Math.round(transitDays.reduce((a, b) => a + b, 0) / transitDays.length);
        confidence = 'low';
      }
    }

    // Fallback: estimate based on common routes
    if (!predictedDays) {
      const routeEstimates = {
        'china_mombasa': 25, 'india_mombasa': 15, 'japan_mombasa': 28,
        'uae_mombasa': 10, 'europe_mombasa': 22, 'default': 30
      };

      const originLower = shipment.origin.toLowerCase();
      if (originLower.includes('china') || originLower.includes('shanghai') || originLower.includes('guangzhou')) {
        predictedDays = routeEstimates.china_mombasa;
      } else if (originLower.includes('india') || originLower.includes('mumbai')) {
        predictedDays = routeEstimates.india_mombasa;
      } else if (originLower.includes('japan') || originLower.includes('yokohama')) {
        predictedDays = routeEstimates.japan_mombasa;
      } else if (originLower.includes('dubai') || originLower.includes('uae')) {
        predictedDays = routeEstimates.uae_mombasa;
      } else {
        predictedDays = routeEstimates.default;
      }
      confidence = 'estimate';
      basedOn = 0;
    }

    const predictedArrival = new Date(new Date(shipment.etd).getTime() + predictedDays * 24 * 60 * 60 * 1000);
    const daysFromNow = Math.ceil((predictedArrival - new Date()) / (1000 * 60 * 60 * 24));

    // Delay risk assessment
    const originalEta = new Date(shipment.eta);
    const delayDays = Math.ceil((predictedArrival - originalEta) / (1000 * 60 * 60 * 24));
    let delayRisk = 'on_time';
    if (delayDays > 7) delayRisk = 'high_delay';
    else if (delayDays > 3) delayRisk = 'moderate_delay';
    else if (delayDays > 0) delayRisk = 'slight_delay';

    res.json({
      success: true,
      data: {
        shipmentId: shipment._id,
        containerNumber: shipment.containerNumber,
        origin: shipment.origin,
        destination: shipment.destination,
        shippingLine: shipment.shippingLine,
        currentStatus: shipment.status,
        originalEta: shipment.eta,
        prediction: {
          predictedArrival,
          predictedTransitDays: predictedDays,
          daysFromNow,
          confidence,
          basedOnHistorical: basedOn,
          delayRisk,
          delayDays: Math.max(0, delayDays)
        }
      }
    });
  } catch (error) {
    console.error('AI predict-eta error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// ─── AI: Shipment Risk Analysis ─────────────────────────────────
// Analyzes all active shipments and returns risk scores
// GET /api/ai/risk-analysis
router.get('/risk-analysis', auth, async (req, res) => {
  try {
    const shipments = await Shipment.find({ isActive: true, status: { $nin: ['completed', 'delivered'] } })
      .populate('clients', 'name company');

    const risks = [];

    for (const s of shipments) {
      const riskFactors = [];
      let score = 0;

      // ETA risk
      const daysToEta = Math.ceil((new Date(s.eta) - new Date()) / (1000 * 60 * 60 * 24));
      if (daysToEta < 0) {
        riskFactors.push({ factor: 'overdue', severity: 'high', detail: `${Math.abs(daysToEta)} days past ETA` });
        score += 30;
      } else if (daysToEta < 3) {
        riskFactors.push({ factor: 'approaching_eta', severity: 'medium', detail: `${daysToEta} days to ETA` });
        score += 15;
      }

      // Document risk
      const docs = await Document.find({ shipment: s._id });
      const verifiedCount = docs.filter(d => d.status === 'verified').length;
      const requiredDocs = ['commercial_invoice', 'packing_list', 'bill_of_lading'];
      const missingDocs = requiredDocs.filter(t => !docs.find(d => d.type === t));

      if (missingDocs.length > 0 && ['arrived_mombasa', 'discharged', 'documents_ready'].includes(s.status)) {
        riskFactors.push({
          factor: 'missing_documents', severity: missingDocs.length > 1 ? 'high' : 'medium',
          detail: `Missing: ${missingDocs.join(', ')}`
        });
        score += missingDocs.length * 10;
      }

      // Payment risk
      const unpaidInvoices = await Invoice.find({
        shipment: s._id, status: { $in: ['issued', 'pending', 'overdue'] }
      });
      const totalUnpaid = unpaidInvoices.reduce((sum, inv) => sum + inv.total, 0);
      const overdueInvoices = unpaidInvoices.filter(inv => new Date(inv.dueDate) < new Date());

      if (overdueInvoices.length > 0) {
        riskFactors.push({
          factor: 'overdue_payment', severity: 'high',
          detail: `$${totalUnpaid} overdue across ${overdueInvoices.length} invoice(s)`
        });
        score += 25;
      } else if (unpaidInvoices.length > 0) {
        riskFactors.push({
          factor: 'pending_payment', severity: 'low',
          detail: `$${totalUnpaid} pending`
        });
        score += 5;
      }

      // Stale shipment (no status change in 7+ days)
      const lastHistory = await StatusHistory.findOne({ shipment: s._id }).sort({ createdAt: -1 });
      if (lastHistory) {
        const daysSinceUpdate = Math.ceil((new Date() - new Date(lastHistory.createdAt)) / (1000 * 60 * 60 * 24));
        if (daysSinceUpdate > 14) {
          riskFactors.push({ factor: 'stale', severity: 'medium', detail: `No update for ${daysSinceUpdate} days` });
          score += 15;
        } else if (daysSinceUpdate > 7) {
          riskFactors.push({ factor: 'slow_progress', severity: 'low', detail: `No update for ${daysSinceUpdate} days` });
          score += 5;
        }
      }

      let riskLevel = 'low';
      if (score >= 40) riskLevel = 'critical';
      else if (score >= 25) riskLevel = 'high';
      else if (score >= 10) riskLevel = 'medium';

      risks.push({
        shipmentId: s._id,
        containerNumber: s.containerNumber,
        status: s.status,
        origin: s.origin,
        destination: s.destination,
        eta: s.eta,
        clients: s.clients.map(c => ({ name: c.name, company: c.company })),
        riskLevel,
        riskScore: score,
        riskFactors
      });
    }

    risks.sort((a, b) => b.riskScore - a.riskScore);

    res.json({
      success: true,
      data: {
        summary: {
          total: risks.length,
          critical: risks.filter(r => r.riskLevel === 'critical').length,
          high: risks.filter(r => r.riskLevel === 'high').length,
          medium: risks.filter(r => r.riskLevel === 'medium').length,
          low: risks.filter(r => r.riskLevel === 'low').length,
        },
        shipments: risks
      }
    });
  } catch (error) {
    console.error('AI risk-analysis error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// ─── AI: Smart Insights / Analytics ─────────────────────────────
// Generates AI-powered business insights
// GET /api/ai/insights
router.get('/insights', auth, async (req, res) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now - 60 * 24 * 60 * 60 * 1000);

    // Shipment throughput comparison
    const thisMonth = await Shipment.countDocuments({ createdAt: { $gte: thirtyDaysAgo } });
    const lastMonth = await Shipment.countDocuments({ createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo } });
    const throughputChange = lastMonth > 0 ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100) : 0;

    // Average transit time
    const transitData = await Shipment.aggregate([
      { $match: { status: 'completed', actualArrival: { $exists: true }, etd: { $exists: true } } },
      { $project: { transitDays: { $divide: [{ $subtract: ['$actualArrival', '$etd'] }, 86400000] } } },
      { $group: { _id: null, avg: { $avg: '$transitDays' }, min: { $min: '$transitDays' }, max: { $max: '$transitDays' } } }
    ]);

    // Revenue insights
    const revenueData = await Invoice.aggregate([
      { $match: { status: 'paid', paidAt: { $gte: thirtyDaysAgo } } },
      { $group: { _id: null, total: { $sum: '$paidAmount' }, count: { $sum: 1 } } }
    ]);

    const pendingRevenue = await Invoice.aggregate([
      { $match: { status: { $in: ['issued', 'pending'] } } },
      { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } }
    ]);

    // Top shipping lines
    const topLines = await Shipment.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$shippingLine', count: { $sum: 1 } } },
      { $sort: { count: -1 } }, { $limit: 5 }
    ]);

    // Top routes
    const topRoutes = await Shipment.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: { origin: '$origin', destination: '$destination' }, count: { $sum: 1 } } },
      { $sort: { count: -1 } }, { $limit: 5 }
    ]);

    // Customer satisfaction
    const satisfaction = await Rating.aggregate([
      { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } }
    ]);

    // Document compliance rate
    const totalDocs = await Document.countDocuments();
    const verifiedDocs = await Document.countDocuments({ status: 'verified' });
    const complianceRate = totalDocs > 0 ? Math.round((verifiedDocs / totalDocs) * 100) : 0;

    // Active bottlenecks
    const statusDistribution = await Shipment.aggregate([
      { $match: { isActive: true, status: { $nin: ['completed'] } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Generate text insights
    const insights = [];

    if (throughputChange > 20) {
      insights.push({ type: 'positive', icon: '📈', text: `Shipment volume is up ${throughputChange}% compared to last month (${thisMonth} vs ${lastMonth})` });
    } else if (throughputChange < -20) {
      insights.push({ type: 'warning', icon: '📉', text: `Shipment volume is down ${Math.abs(throughputChange)}% compared to last month` });
    }

    if (pendingRevenue[0]?.total > 0) {
      insights.push({ type: 'info', icon: '💰', text: `$${pendingRevenue[0].total.toLocaleString()} in pending invoices across ${pendingRevenue[0].count} invoice(s)` });
    }

    if (revenueData[0]?.total > 0) {
      insights.push({ type: 'positive', icon: '✅', text: `$${revenueData[0].total.toLocaleString()} collected this month from ${revenueData[0].count} paid invoice(s)` });
    }

    if (satisfaction[0]?.avg) {
      const avg = satisfaction[0].avg.toFixed(1);
      insights.push({
        type: avg >= 4 ? 'positive' : avg >= 3 ? 'info' : 'warning',
        icon: '⭐', text: `Customer satisfaction: ${avg}/5.0 from ${satisfaction[0].count} rating(s)`
      });
    }

    if (complianceRate < 80) {
      insights.push({ type: 'warning', icon: '📋', text: `Document compliance rate is ${complianceRate}%. Target: 80%+` });
    }

    const bottleneck = statusDistribution[0];
    if (bottleneck && bottleneck.count >= 3) {
      insights.push({
        type: 'info', icon: '⚠️',
        text: `Bottleneck detected: ${bottleneck.count} shipments stuck at "${bottleneck._id.replace(/_/g, ' ')}"`
      });
    }

    res.json({
      success: true,
      data: {
        insights,
        metrics: {
          shipmentVolume: { thisMonth, lastMonth, change: throughputChange },
          transitTime: transitData[0] ? { avg: Math.round(transitData[0].avg), min: Math.round(transitData[0].min), max: Math.round(transitData[0].max) } : null,
          revenue: { collected: revenueData[0]?.total || 0, pending: pendingRevenue[0]?.total || 0 },
          satisfaction: satisfaction[0] ? { average: satisfaction[0].avg.toFixed(1), count: satisfaction[0].count } : null,
          documentCompliance: complianceRate,
          topShippingLines: topLines.map(l => ({ line: l._id, count: l.count })),
          topRoutes: topRoutes.map(r => ({ origin: r._id.origin, destination: r._id.destination, count: r.count })),
          statusDistribution: statusDistribution.map(s => ({ status: s._id, count: s.count }))
        },
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('AI insights error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// ─── AI: Shipment Query (Chatbot-ready) ─────────────────────────
// Natural-language style query endpoint for n8n AI chatbot integration
// POST /api/ai/query
router.post('/query', auth, async (req, res) => {
  try {
    const { question } = req.body;
    if (!question) return res.status(400).json({ success: false, message: 'question is required' });

    const q = question.toLowerCase();
    let answer = '';
    let data = null;

    // Pattern matching for common queries
    if (q.includes('how many') && q.includes('shipment')) {
      const total = await Shipment.countDocuments({ isActive: true });
      const active = await Shipment.countDocuments({ isActive: true, status: { $nin: ['completed', 'delivered'] } });
      answer = `There are ${total} total shipments, ${active} currently active.`;
      data = { total, active };
    }

    else if (q.match(/container\s*#?\s*([A-Z0-9]{6,})/i) || q.match(/where\s+is\s+([A-Z0-9]{6,})/i)) {
      const match = q.match(/([A-Z0-9]{6,})/i);
      if (match) {
        const shipment = await Shipment.findOne({ containerNumber: match[1].toUpperCase(), isActive: true })
          .populate('clients', 'name company');
        if (shipment) {
          answer = `Container ${shipment.containerNumber} is currently "${shipment.status.replace(/_/g, ' ')}". Route: ${shipment.origin} → ${shipment.destination}. ETA: ${new Date(shipment.eta).toLocaleDateString()}.`;
          data = { containerNumber: shipment.containerNumber, status: shipment.status, origin: shipment.origin, destination: shipment.destination, eta: shipment.eta };
        } else {
          answer = `Container ${match[1].toUpperCase()} not found in the system.`;
        }
      }
    }

    else if (q.includes('overdue') && q.includes('invoice')) {
      const overdue = await Invoice.find({ status: 'overdue' }).populate('client', 'name company');
      const total = overdue.reduce((s, i) => s + i.total, 0);
      answer = `There are ${overdue.length} overdue invoice(s) totaling $${total.toLocaleString()}.`;
      data = { count: overdue.length, total, invoices: overdue.map(i => ({ number: i.invoiceNumber, total: i.total, client: i.client?.name })) };
    }

    else if (q.includes('on sea') || q.includes('at sea')) {
      const onSea = await Shipment.find({ status: 'on_sea', isActive: true }).select('containerNumber origin destination eta');
      answer = `${onSea.length} shipment(s) currently on sea.`;
      data = { count: onSea.length, shipments: onSea };
    }

    else if (q.includes('arrived') || q.includes('mombasa')) {
      const atPort = await Shipment.find({ status: { $in: ['arrived_mombasa', 'discharged'] }, isActive: true })
        .select('containerNumber origin destination');
      answer = `${atPort.length} shipment(s) currently at Mombasa port.`;
      data = { count: atPort.length, shipments: atPort };
    }

    else if (q.includes('pending') && q.includes('task')) {
      const pending = await Task.countDocuments({ status: 'pending' });
      const urgent = await Task.countDocuments({ status: 'pending', priority: 'urgent' });
      answer = `There are ${pending} pending task(s), ${urgent} marked as urgent.`;
      data = { pending, urgent };
    }

    else if (q.includes('revenue') || q.includes('income') || q.includes('paid')) {
      const revenue = await Invoice.aggregate([
        { $match: { status: 'paid' } },
        { $group: { _id: null, total: { $sum: '$paidAmount' }, count: { $sum: 1 } } }
      ]);
      const total = revenue[0]?.total || 0;
      answer = `Total revenue collected: $${total.toLocaleString()} from ${revenue[0]?.count || 0} paid invoice(s).`;
      data = { total, count: revenue[0]?.count || 0 };
    }

    else if (q.includes('client') && (q.includes('how many') || q.includes('count'))) {
      const count = await User.countDocuments({ role: 'client', isActive: true });
      answer = `There are ${count} active client(s) in the system.`;
      data = { count };
    }

    else {
      answer = `I can help with: shipment status, container tracking, invoice queries, task status, revenue reports, and client information. Try asking "Where is MSCU7654321?" or "How many shipments are on sea?"`;
      data = {
        supportedQueries: [
          'How many shipments are active?',
          'Where is [container number]?',
          'How many overdue invoices?',
          'How many shipments on sea?',
          'What is at Mombasa port?',
          'How many pending tasks?',
          'What is total revenue?',
          'How many clients?'
        ]
      };
    }

    res.json({ success: true, data: { question, answer, details: data, timestamp: new Date().toISOString() } });
  } catch (error) {
    console.error('AI query error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// ─── AI: Document Classification Suggestion ─────────────────────
// n8n sends document metadata, AI suggests classification
// POST /api/ai/classify-document
router.post('/classify-document', webhookAuth, async (req, res) => {
  try {
    const { filename, mimeType, textContent } = req.body;

    if (!filename) return res.status(400).json({ success: false, message: 'filename is required' });

    const name = filename.toLowerCase();
    const text = (textContent || '').toLowerCase();
    let suggestedType = 'other';
    let confidence = 0;

    const patterns = [
      { type: 'commercial_invoice', keywords: ['commercial', 'invoice', 'proforma', 'ci-', 'inv-'], confidence: 0.9 },
      { type: 'packing_list', keywords: ['packing', 'pack_list', 'pl-', 'packing_list'], confidence: 0.9 },
      { type: 'bill_of_lading', keywords: ['bill_of_lading', 'bl-', 'b/l', 'bol', 'lading'], confidence: 0.9 },
      { type: 'sea_freight_invoice', keywords: ['sea_freight', 'freight_invoice', 'shipping_invoice'], confidence: 0.85 },
      { type: 'certificate_of_origin', keywords: ['certificate_of_origin', 'coo', 'origin_cert'], confidence: 0.85 },
      { type: 'import_permit', keywords: ['import_permit', 'permit', 'license'], confidence: 0.8 },
      { type: 'delivery_note', keywords: ['delivery_note', 'delivery', 'dn-'], confidence: 0.8 },
      { type: 't1', keywords: ['t1', 't1_doc', 'transit_doc'], confidence: 0.85 },
      { type: 'im4', keywords: ['im4', 'im-4', 'customs_entry'], confidence: 0.85 },
      { type: 'payment_receipt', keywords: ['receipt', 'payment_receipt', 'payment_proof'], confidence: 0.85 },
      { type: 'loa', keywords: ['loa', 'letter_of_authority', 'authorization'], confidence: 0.8 },
    ];

    for (const pattern of patterns) {
      for (const keyword of pattern.keywords) {
        if (name.includes(keyword) || text.includes(keyword)) {
          suggestedType = pattern.type;
          confidence = pattern.confidence;
          break;
        }
      }
      if (confidence > 0) break;
    }

    if (confidence === 0) {
      confidence = 0.3;
    }

    const typeLabels = {
      commercial_invoice: 'Commercial Invoice', packing_list: 'Packing List',
      bill_of_lading: 'Bill of Lading', sea_freight_invoice: 'Sea Freight Invoice',
      certificate_of_origin: 'Certificate of Origin', import_permit: 'Import Permit',
      delivery_note: 'Delivery Note', t1: 'T1 Document', im4: 'IM4 Customs Entry',
      payment_receipt: 'Payment Receipt', loa: 'Letter of Authority', other: 'Other Document'
    };

    res.json({
      success: true,
      data: {
        filename,
        suggestedType,
        suggestedLabel: typeLabels[suggestedType] || suggestedType,
        confidence,
        allTypes: Object.entries(typeLabels).map(([value, label]) => ({ value, label }))
      }
    });
  } catch (error) {
    console.error('AI classify-document error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// ─── n8n-ready: Daily Digest ────────────────────────────────────
// n8n calls this daily to get a summary for email/WhatsApp digest
// GET /api/ai/daily-digest
router.get('/daily-digest', webhookAuth, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeShipments = await Shipment.countDocuments({ isActive: true, status: { $nin: ['completed'] } });
    const onSea = await Shipment.countDocuments({ status: 'on_sea', isActive: true });
    const atPort = await Shipment.countDocuments({ status: { $in: ['arrived_mombasa', 'discharged'] }, isActive: true });
    const inTransit = await Shipment.countDocuments({ status: 'in_transit', isActive: true });

    const arrivingSoon = await Shipment.find({
      status: 'on_sea', isActive: true,
      eta: { $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }
    }).select('containerNumber eta origin destination').sort({ eta: 1 });

    const pendingTasks = await Task.countDocuments({ status: 'pending' });
    const urgentTasks = await Task.countDocuments({ status: 'pending', priority: 'urgent' });

    const overdueInvoices = await Invoice.find({
      status: { $in: ['issued', 'pending'] },
      dueDate: { $lt: new Date() }
    }).populate('client', 'name company').populate('shipment', 'containerNumber');

    const totalOverdue = overdueInvoices.reduce((s, i) => s + i.total, 0);

    const todayUpdates = await StatusHistory.countDocuments({ createdAt: { $gte: today } });

    // Build text digest
    const lines = [
      `📊 DAILY DIGEST — ${today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`,
      ``,
      `🚢 Active Shipments: ${activeShipments}`,
      `   • On Sea: ${onSea}  |  At Port: ${atPort}  |  In Transit: ${inTransit}`,
      ``,
    ];

    if (arrivingSoon.length > 0) {
      lines.push(`⚓ Arriving Within 7 Days:`);
      arrivingSoon.forEach(s => {
        lines.push(`   • ${s.containerNumber} — ETA: ${new Date(s.eta).toLocaleDateString()} (${s.origin})`);
      });
      lines.push('');
    }

    if (overdueInvoices.length > 0) {
      lines.push(`💰 Overdue Invoices: ${overdueInvoices.length} ($${totalOverdue.toLocaleString()})`);
      overdueInvoices.forEach(i => {
        lines.push(`   • ${i.invoiceNumber} — $${i.total} — ${i.client?.name}`);
      });
      lines.push('');
    }

    lines.push(`📋 Tasks: ${pendingTasks} pending (${urgentTasks} urgent)`);
    lines.push(`📝 Status Updates Today: ${todayUpdates}`);

    res.json({
      success: true,
      data: {
        text: lines.join('\n'),
        metrics: {
          activeShipments, onSea, atPort, inTransit,
          arrivingSoon: arrivingSoon.length,
          pendingTasks, urgentTasks,
          overdueInvoices: overdueInvoices.length,
          overdueAmount: totalOverdue,
          todayUpdates
        },
        arrivingSoon,
        overdueInvoices: overdueInvoices.map(i => ({
          invoiceNumber: i.invoiceNumber, total: i.total,
          containerNumber: i.shipment?.containerNumber,
          client: i.client?.name
        })),
        generatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('AI daily-digest error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

module.exports = router;
