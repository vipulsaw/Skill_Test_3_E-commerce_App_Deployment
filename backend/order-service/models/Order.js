const mongoose = require('mongoose');

const OrderItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  total: {
    type: Number,
    required: true,
    min: 0
  },
  productDetails: {
    name: { type: String, required: true },
    sku: { type: String, required: true },
    image: String
  }
});

const ShippingAddressSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  street: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  zipCode: { type: String, required: true },
  country: { type: String, required: true },
  phone: String
});

const OrderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    unique: true,
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  items: [OrderItemSchema],
  pricing: {
    subtotal: { type: Number, required: true },
    tax: { type: Number, default: 0 },
    shipping: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    total: { type: Number, required: true }
  },
  shippingAddress: ShippingAddressSchema,
  billingAddress: ShippingAddressSchema,
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'],
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['credit_card', 'debit_card', 'paypal', 'bank_transfer', 'cash_on_delivery'],
    required: true
  },
  paymentDetails: {
    transactionId: String,
    paymentGateway: String,
    paidAt: Date
  },
  shipping: {
    method: { type: String, required: true },
    carrier: String,
    trackingNumber: String,
    estimatedDelivery: Date,
    shippedAt: Date,
    deliveredAt: Date
  },
  notes: String,
  customerNotes: String
}, {
  timestamps: true
});

// Generate order number before saving
OrderSchema.pre('save', async function(next) {
  if (this.isNew) {
    const count = await mongoose.model('Order').countDocuments();
    this.orderNumber = `ORD-${Date.now()}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

// Calculate totals before saving
OrderSchema.pre('save', function(next) {
  // Calculate item totals
  this.items.forEach(item => {
    item.total = item.price * item.quantity;
  });

  // Calculate pricing
  this.pricing.subtotal = this.items.reduce((sum, item) => sum + item.total, 0);
  this.pricing.total = this.pricing.subtotal + this.pricing.tax + this.pricing.shipping - this.pricing.discount;

  next();
});

// Update payment status
OrderSchema.methods.markAsPaid = function(transactionId, paymentGateway) {
  this.paymentStatus = 'paid';
  this.paymentDetails.transactionId = transactionId;
  this.paymentDetails.paymentGateway = paymentGateway;
  this.paymentDetails.paidAt = new Date();
  
  if (this.status === 'pending') {
    this.status = 'confirmed';
  }
};

// Update shipping status
OrderSchema.methods.markAsShipped = function(trackingNumber, carrier) {
  this.status = 'shipped';
  this.shipping.trackingNumber = trackingNumber;
  this.shipping.carrier = carrier;
  this.shipping.shippedAt = new Date();
};

// Update delivery status
OrderSchema.methods.markAsDelivered = function() {
  this.status = 'delivered';
  this.shipping.deliveredAt = new Date();
};

// Cancel order
OrderSchema.methods.cancelOrder = function(reason) {
  this.status = 'cancelled';
  this.notes = reason || 'Order cancelled';
};

module.exports = mongoose.model('Order', OrderSchema);