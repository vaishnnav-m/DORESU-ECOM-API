const mongoose = require("mongoose");

const variantSchema = mongoose.Schema({
  size: {
    type: String,
    required: true,
  },
  stock: {
    type: Number,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
});

const productSchema = mongoose.Schema({
  productName: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "category",
    required: true,
  },
  variants: [variantSchema],
  gallery: {
    type: Array,
    required: true,
  },
  offer:{
    type:mongoose.Schema.Types.ObjectId,
    ref:"offer"
  },
  deliveryCharge:{
    type:Number,
    default:0
  },
  isActive: {
    type: Boolean,
    default: true,
  },
});

module.exports = mongoose.model("products", productSchema);
