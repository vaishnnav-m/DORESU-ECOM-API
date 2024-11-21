const mongoose = require("mongoose");

const couponSchema = mongoose.Schema({
  couponCode: {
    type: String,
    unique: true,
    required: true,
  },
  discountValue: {
    type: Number,
    required: true,
  },
  minPurchaseAmount: {
    type: Number,
    required: true,
  },
  maxDiscount: {
    type: Number,
    required: true,
  },
  usageLimit: {
    type: Number,
    default: null,
  },
  usedCount: {
    type: Number,
    default: 0,
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  isActive: {
    type: Boolean,
    default:true,
    required: true,
  },
});

module.exports = mongoose.model('coupon',couponSchema); 