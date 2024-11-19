const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "users",
    required: true,
  },
  products: [
    {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "products",
        required: true,
      },
      size: {
        type: String,
        required: true,
      },
      quantity: {
        type: Number,
        required: true,
        default: 1,
      },
      price: {
        type: Number,
        required: true,
      }
    },
  ],
  totalPrice:{
   type:Number,
   required:true
  },
  totalQuantity:{
   type:Number,
   required:true,
  }
}, { timestamps: true });

module.exports = mongoose.model("cart", cartSchema);
