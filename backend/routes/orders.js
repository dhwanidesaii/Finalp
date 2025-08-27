const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { auth, optionalAuth } = require('../middleware/auth');

// Temporary in-memory store for orders until DB model is ready
// Note: This is process-local and resets on server restart
const inMemoryOrders = new Map();
let nextOrderNumericId = 1010;

const generateOrderId = () => `ORD-${nextOrderNumericId++}`;

// SSE clients registry
const sseClients = new Set();

const broadcastOrderEvent = (type, payload) => {
  const data = `event: ${type}\n` +
               `data: ${JSON.stringify(payload)}\n\n`;
  for (const res of sseClients) {
    try { res.write(data); } catch (_) {}
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

  sseClients.add(res);

  const ping = setInterval(() => {
    try { res.write(`: ping ${Date.now()}\n\n`); } catch (_) {}
  }, 25000);

  req.on('close', () => {
    clearInterval(ping);
    sseClients.delete(res);
  });
});

// @route   GET /api/orders
// @desc    Get all orders
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const orders = Array.from(inMemoryOrders.values());
    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/orders
// @desc    Create order
// @access  Private
router.post('/', [
  auth,
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('deliveryAddress').notEmpty().withMessage('Delivery address is required'),
  body('paymentMethod').notEmpty().withMessage('Payment method is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { items, deliveryAddress, paymentMethod, deliveryInstructions, restaurantId, customerName, customerPhone } = req.body;

    const newOrder = {
      id: generateOrderId(),
      userId: req.user?._id || req.user?.id || null,
      restaurantId: restaurantId || null,
      customerName: customerName || req.user?.name || 'Customer',
      customerPhone: customerPhone || req.user?.phone || 'N/A',
      items,
      deliveryAddress,
      deliveryInstructions: deliveryInstructions || '',
      paymentMethod,
      createdAt: new Date().toISOString(),
      status: 'pending',
      payoutAmount: Math.max(30, Math.round(items.reduce((sum, it) => sum + (Number(it.price) * Number(it.quantity || 1)), 0) * 0.1)),
      restaurantName: req.body.restaurantName || 'Restaurant',
      pickupAddress: req.body.pickupAddress || 'Restaurant Address',
      dropAddress: typeof deliveryAddress === 'string' ? deliveryAddress : [deliveryAddress?.street, deliveryAddress?.city].filter(Boolean).join(', '),
      paymentType: paymentMethod === 'cash' ? 'COD' : 'Paid Online'
    };

    inMemoryOrders.set(newOrder.id, newOrder);

    // Broadcast creation
    broadcastOrderEvent('order_created', newOrder);

    res.status(201).json(newOrder);
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
    const order = inMemoryOrders.get(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json(order);
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
  body('status').isIn(['pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'])
    .withMessage('Invalid order status')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const order = inMemoryOrders.get(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    order.status = req.body.status;
    inMemoryOrders.set(order.id, order);

    // Broadcast update
    broadcastOrderEvent('order_updated', order);

    res.json(order);
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delivery-side helper endpoints
// List orders available for pickup (pending/confirmed/preparing but not assigned)
router.get('/available/list', auth, async (req, res) => {
  try {
    const available = Array.from(inMemoryOrders.values()).filter(o => ['pending', 'confirmed', 'preparing'].includes(o.status));
    res.json(available);
  } catch (error) {
    console.error('Error fetching available orders:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Assign an order to current delivery user and mark as out_for_delivery
router.post('/:id/assign', auth, async (req, res) => {
  try {
    const order = inMemoryOrders.get(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    if (!['pending', 'confirmed', 'preparing'].includes(order.status)) {
      return res.status(400).json({ error: 'Order is not available for assignment' });
    }
    order.status = 'out_for_delivery';
    order.driver = { id: req.user?._id || req.user?.id, name: req.user?.name || 'Driver' };
    inMemoryOrders.set(order.id, order);
    // Broadcast assignment
    broadcastOrderEvent('order_assigned', order);
    res.json(order);
  } catch (error) {
    console.error('Error assigning order:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Restaurant accepts order (confirm)
router.post('/:id/accept-restaurant', auth, async (req, res) => {
  try {
    const order = inMemoryOrders.get(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    if (!['pending'].includes(order.status)) {
      return res.status(400).json({ error: 'Order cannot be accepted' });
    }
    order.status = 'confirmed';
    inMemoryOrders.set(order.id, order);
    broadcastOrderEvent('order_confirmed', order);
    res.json(order);
  } catch (error) {
    console.error('Error confirming order:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
