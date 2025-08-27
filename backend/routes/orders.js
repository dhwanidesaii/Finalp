const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { auth, optionalAuth } = require('../middleware/auth');
const mongoose = require('mongoose');
const Order = require('../models/Order');

// Legacy in-memory store removed in favor of mandatory DB persistence
let nextOrderNumericId = 1010;

const generateOrderId = () => {
  const time = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `ORD-${time}-${rand}-${nextOrderNumericId++}`;
};

// SSE clients registry (optionally scoped by restaurantId)
const sseClients = new Set(); // Set<{ res, restaurantId?: string }>

const broadcastOrderEvent = (type, payload) => {
  const data = `event: ${type}\n` +
               `data: ${JSON.stringify(payload)}\n\n`;
  for (const client of sseClients) {
    try {
      if (client.restaurantId && payload?.restaurantId && client.restaurantId !== String(payload.restaurantId)) {
        continue;
      }
      client.res.write(data);
    } catch (_) {}
  }
};

// SSE endpoint for order events
router.get('/events', optionalAuth, (req, res) => {
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  // Initial comment to establish stream
  res.write(`: connected\n\n`);

  const client = { res, restaurantId: req.query.restaurantId };
  sseClients.add(client);

  const ping = setInterval(() => {
    try { res.write(`: ping ${Date.now()}\n\n`); } catch (_) {}
  }, 25000);

  req.on('close', () => {
    clearInterval(ping);
    sseClients.delete(client);
  });
});

// @route   GET /api/orders
// @desc    Get all orders
// @access  Optional (dev-friendly)
router.get('/', optionalAuth, async (req, res) => {
  try {
    if (!(mongoose.connection && mongoose.connection.readyState === 1)) {
      return res.status(503).json({ error: 'Database not connected' });
    }
    const docs = await Order.find({}).sort({ createdAt: -1 }).lean();
    const mapped = docs.map(doc => ({
      id: doc.orderId,
      restaurantId: doc.restaurantId,
      restaurantName: doc.restaurantName,
      items: doc.items,
      totalAmount: doc.totalAmount,
      deliveryAddress: doc.deliveryAddress,
      paymentMethod: doc.paymentMethod,
      status: doc.status,
      payoutAmount: doc.payoutAmount,
      createdAt: doc.createdAt,
      pickupAddress: doc.deliveryAddress?.pickupAddress || 'Restaurant Address',
      dropAddress: typeof doc.deliveryAddress === 'string' ? doc.deliveryAddress : [doc.deliveryAddress?.street, doc.deliveryAddress?.city].filter(Boolean).join(', '),
      paymentType: doc.paymentMethod === 'cash' ? 'COD' : 'Paid Online',
    }));
    return res.json(mapped);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/orders
// @desc    Create order
// @access  Private
router.post('/', [
  optionalAuth,
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('deliveryAddress').notEmpty().withMessage('Delivery address is required'),
  body('paymentMethod').notEmpty().withMessage('Payment method is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { items, deliveryAddress, paymentMethod, paymentStatus, deliveryInstructions, restaurantId, customerName, customerPhone } = req.body;

    const calcPayout = Math.max(30, Math.round(items.reduce((sum, it) => sum + (Number(it.price) * Number(it.quantity || 1)), 0) * 0.1));
    const calcTotal = items.reduce((sum, it) => sum + (Number(it.price) * Number(it.quantity || 1)), 0);

    if (!(mongoose.connection && mongoose.connection.readyState === 1)) {
      return res.status(503).json({ error: 'Database not connected' });
    }
    const orderId = generateOrderId();
    const doc = await Order.create({
      orderId,
      user: req.user?._id || req.user?.id || undefined,
      restaurantId: restaurantId || undefined,
      restaurantName: req.body.restaurantName || 'Restaurant',
      items,
      totalAmount: calcTotal,
      deliveryAddress,
      deliveryInstructions: deliveryInstructions || '',
      paymentMethod,
      paymentStatus: paymentStatus || 'pending',
      status: 'pending',
      payoutAmount: calcPayout,
    });
    const response = {
      id: doc.orderId,
      restaurantId: doc.restaurantId,
      restaurantName: doc.restaurantName,
      items: doc.items,
      totalAmount: doc.totalAmount,
      deliveryAddress: doc.deliveryAddress,
      paymentMethod: doc.paymentMethod,
      status: doc.status,
      payoutAmount: doc.payoutAmount,
      createdAt: doc.createdAt,
      pickupAddress: req.body.pickupAddress || 'Restaurant Address',
      dropAddress: typeof deliveryAddress === 'string' ? deliveryAddress : [deliveryAddress?.street, deliveryAddress?.city].filter(Boolean).join(', '),
      paymentType: paymentMethod === 'cash' ? 'COD' : 'Paid Online'
    };
    broadcastOrderEvent('order_created', response);
    return res.status(201).json(response);
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/orders/:id
// @desc    Get order by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    if (!(mongoose.connection && mongoose.connection.readyState === 1)) {
      return res.status(503).json({ error: 'Database not connected' });
    }
    const doc = await Order.findOne({ orderId: req.params.id }).lean();
    if (!doc) return res.status(404).json({ error: 'Order not found' });
    const response = {
      id: doc.orderId,
      restaurantId: doc.restaurantId,
      restaurantName: doc.restaurantName,
      items: doc.items,
      totalAmount: doc.totalAmount,
      deliveryAddress: doc.deliveryAddress,
      paymentMethod: doc.paymentMethod,
      status: doc.status,
      payoutAmount: doc.payoutAmount,
      createdAt: doc.createdAt,
    };
    return res.json(response);
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   PUT /api/orders/:id/status
// @desc    Update order status
// @access  Private
router.put('/:id/status', [
  auth,
  body('status').isIn(['pending', 'pending_delivery', 'accepted_delivery', 'rejected', 'out_for_delivery', 'delivered', 'cancelled'])
    .withMessage('Invalid order status')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    if (mongoose.connection && mongoose.connection.readyState === 1) {
      const doc = await Order.findOneAndUpdate(
        { orderId: req.params.id },
        { $set: { status: req.body.status } },
        { new: true }
      ).lean();
      if (!doc) return res.status(404).json({ error: 'Order not found' });
      const response = {
        id: doc.orderId,
        restaurantId: doc.restaurantId,
        restaurantName: doc.restaurantName,
        items: doc.items,
        deliveryAddress: doc.deliveryAddress,
        paymentMethod: doc.paymentMethod,
        status: doc.status,
        payoutAmount: doc.payoutAmount,
      };
      broadcastOrderEvent('order_updated', response);
      return res.json(response);
    }
    return res.status(503).json({ error: 'Database not connected' });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delivery-side helper endpoints
// List orders available for pickup (accepted/ready_for_pickup but not assigned)
router.get('/available/list', optionalAuth, async (req, res) => {
  try {
    if (mongoose.connection && mongoose.connection.readyState === 1) {
      const docs = await Order.find({ status: { $in: ['pending_delivery'] } }).sort({ createdAt: -1 }).lean();
      const mapped = docs.map(doc => ({
        id: doc.orderId,
        restaurantId: doc.restaurantId,
        restaurantName: doc.restaurantName,
        items: doc.items,
        totalAmount: doc.totalAmount,
        deliveryAddress: doc.deliveryAddress,
        status: doc.status,
        payoutAmount: doc.payoutAmount,
        createdAt: doc.createdAt,
        pickupAddress: 'Restaurant Address',
        dropAddress: typeof doc.deliveryAddress === 'string' ? doc.deliveryAddress : [doc.deliveryAddress?.street, doc.deliveryAddress?.city].filter(Boolean).join(', '),
        paymentType: doc.paymentMethod === 'cash' ? 'COD' : 'Paid Online',
      }));
      return res.json(mapped);
    }
    return res.status(503).json({ error: 'Database not connected' });
  } catch (error) {
    console.error('Error fetching available orders:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Assign an order to current delivery user and mark as out_for_delivery
router.post('/:id/assign', optionalAuth, async (req, res) => {
  try {
    if (mongoose.connection && mongoose.connection.readyState === 1) {
      const doc = await Order.findOne({ orderId: req.params.id }).lean();
      if (!doc) return res.status(404).json({ error: 'Order not found' });
      if (!['pending_delivery'].includes(doc.status)) {
        return res.status(400).json({ error: 'Order is not available for assignment' });
      }
      const updated = await Order.findOneAndUpdate(
        { orderId: req.params.id },
        { $set: { status: 'out_for_delivery', driver: { id: req.user?._id || req.user?.id, name: req.user?.name || 'Driver' } } },
        { new: true }
      ).lean();
      const response = {
        id: updated.orderId,
        restaurantId: updated.restaurantId,
        restaurantName: updated.restaurantName,
        items: updated.items,
        totalAmount: updated.totalAmount,
        deliveryAddress: updated.deliveryAddress,
        paymentMethod: updated.paymentMethod,
        status: updated.status,
        payoutAmount: updated.payoutAmount,
        createdAt: updated.createdAt,
      };
      broadcastOrderEvent('order_assigned', response);
      return res.json(response);
    }
    return res.status(503).json({ error: 'Database not connected' });
  } catch (error) {
    console.error('Error assigning order:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Restaurant accepts order
router.post('/:id/accept-restaurant', optionalAuth, async (req, res) => {
  try {
    if (mongoose.connection && mongoose.connection.readyState === 1) {
      const doc = await Order.findOneAndUpdate(
        { orderId: req.params.id },
        { $set: { status: 'pending_delivery' } },
        { new: true }
      ).lean();
      if (!doc) return res.status(404).json({ error: 'Order not found' });
      const response = {
        id: doc.orderId,
        restaurantId: doc.restaurantId,
        restaurantName: doc.restaurantName,
        items: doc.items,
        totalAmount: doc.totalAmount,
        deliveryAddress: doc.deliveryAddress,
        paymentMethod: doc.paymentMethod,
        status: doc.status,
        payoutAmount: doc.payoutAmount,
        createdAt: doc.createdAt,
      };
      broadcastOrderEvent('order_accepted', response);
      return res.json(response);
    }
    return res.status(503).json({ error: 'Database not connected' });
  } catch (error) {
    console.error('Error confirming order:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Restaurant marks order as ready for pickup
router.post('/:id/ready-for-pickup', optionalAuth, async (req, res) => {
  try {
    if (mongoose.connection && mongoose.connection.readyState === 1) {
      const doc = await Order.findOneAndUpdate(
        { orderId: req.params.id },
        { $set: { status: 'ready_for_pickup' } },
        { new: true }
      ).lean();
      if (!doc) return res.status(404).json({ error: 'Order not found' });
      const response = {
        id: doc.orderId,
        restaurantId: doc.restaurantId,
        restaurantName: doc.restaurantName,
        items: doc.items,
        totalAmount: doc.totalAmount,
        deliveryAddress: doc.deliveryAddress,
        paymentMethod: doc.paymentMethod,
        status: doc.status,
        payoutAmount: doc.payoutAmount,
        createdAt: doc.createdAt,
      };
      broadcastOrderEvent('order_ready_for_pickup', response);
      return res.json(response);
    }
    return res.status(503).json({ error: 'Database not connected' });
  } catch (error) {
    console.error('Error marking order ready for pickup:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Restaurant rejects order (cancel)
router.post('/:id/reject-restaurant', optionalAuth, async (req, res) => {
  try {
    if (mongoose.connection && mongoose.connection.readyState === 1) {
      const doc = await Order.findOneAndUpdate(
        { orderId: req.params.id },
        { $set: { status: 'cancelled' } },
        { new: true }
      ).lean();
      if (!doc) return res.status(404).json({ error: 'Order not found' });
      const response = {
        id: doc.orderId,
        restaurantId: doc.restaurantId,
        restaurantName: doc.restaurantName,
        items: doc.items,
        totalAmount: doc.totalAmount,
        deliveryAddress: doc.deliveryAddress,
        paymentMethod: doc.paymentMethod,
        status: doc.status,
        payoutAmount: doc.payoutAmount,
        createdAt: doc.createdAt,
      };
      broadcastOrderEvent('order_rejected', response);
      return res.json(response);
    }
    return res.status(503).json({ error: 'Database not connected' });
  } catch (error) {
    console.error('Error rejecting order:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: reassign delivery driver
router.post('/:id/reassign-driver', auth, async (req, res) => {
  try {
    const { driverId, driverName } = req.body || {};
    if (mongoose.connection && mongoose.connection.readyState === 1) {
      const doc = await Order.findOne({ orderId: req.params.id }).lean();
      if (!doc) return res.status(404).json({ error: 'Order not found' });
      const updated = await Order.findOneAndUpdate(
        { orderId: req.params.id },
        { $set: { driver: { id: driverId || 'admin-reassign', name: driverName || 'Reassigned Driver' }, status: 'out_for_delivery' } },
        { new: true }
      ).lean();
      const response = {
        id: updated.orderId,
        restaurantId: updated.restaurantId,
        restaurantName: updated.restaurantName,
        items: updated.items,
        deliveryAddress: updated.deliveryAddress,
        paymentMethod: updated.paymentMethod,
        status: updated.status,
        payoutAmount: updated.payoutAmount,
        driver: updated.driver,
      };
      broadcastOrderEvent('order_reassigned', response);
      return res.json(response);
    }
    return res.status(503).json({ error: 'Database not connected' });
  } catch (error) {
    console.error('Error reassigning driver:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Restaurant marks order ready for pickup
router.post('/:id/mark-ready', optionalAuth, async (req, res) => {
  try {
    if (mongoose.connection && mongoose.connection.readyState === 1) {
      const doc = await Order.findOneAndUpdate(
        { orderId: req.params.id },
        { $set: { status: 'ready_for_pickup' } },
        { new: true }
      ).lean();
      if (!doc) return res.status(404).json({ error: 'Order not found' });
      const response = {
        id: doc.orderId,
        restaurantId: doc.restaurantId,
        restaurantName: doc.restaurantName,
        items: doc.items,
        totalAmount: doc.totalAmount,
        deliveryAddress: doc.deliveryAddress,
        paymentMethod: doc.paymentMethod,
        status: doc.status,
        payoutAmount: doc.payoutAmount,
        createdAt: doc.createdAt,
      };
      broadcastOrderEvent('order_ready', response);
      return res.json(response);
    }
    return res.status(503).json({ error: 'Database not connected' });
  } catch (error) {
    console.error('Error marking order ready:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
