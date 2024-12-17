const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: true,
    unique: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  routeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Route',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'paid', 'completed', 'cancelled', 'refunded'],
    default: 'pending'
  },
  orderInfo: {
    orderNumber: {
      type: String,
      required: true,
      unique: true
    },
    price: Number,
    passengerCount: Number,
    departurePoint: {
      name: String,
      departureTime: String
    },
    arrivalPoint: String,
    scheduleDate: Date
  },
  passengers: [{
    name: {
      type: String,
      required: true
    },
    idType: {
      type: String,
      default: '身份证'
    },
    idNumber: {
      type: String,
      required: true
    },
    phone: String,
    insurance: {
      purchased: {
        type: Boolean,
        default: false
      },
      type: {
        type: String,
        enum: ['基础保险', '延误保险', '综合保险']
      },
      price: {
        type: Number,
        min: 0
      }
    }
  }],
  payment: {
    method: {
      type: String,
      enum: ['alipay', 'wechat', 'creditCard']
    },
    transactionId: String,
    paidAt: Date,
    amount: Number,
    refundAmount: Number,
    refundReason: String,
    refundedAt: Date
  },
  review: {
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: String,
    createdAt: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// 更新时自动更新updatedAt字段
orderSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
