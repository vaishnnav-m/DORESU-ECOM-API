const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      required: true,
    },
    items: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "products",
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
        },
        price: {
          type: Number,
          required: true,
        },
        size: {
          type: String,
        },
        status: {
          type: String,
          enum: ["Pending", "Shipped", "Delivered", "Cancelled"],
          default: "Pending",
        },
      },
    ],
    shippingAddress: {
      name:{
         type:String,
         required:true
      },
      mobile:{
         type:Number,
         required:true
      },
      pincode:{
         type:Number,
         required:true
      },
      houseName:{
         type:String,
         required:true
      },
      landMark:{
         type:String
      },
      city:{
         type:String,
         required:true
      },
      district:{
         type:String,
         required:true
      },
      street:{
         type:String,
         required:true
      },
      state:{
         type:String,
         required:true
      },
   },
    totalPrice: {
      type: Number,
      required: true,
    },
    totalQuantity: {
      type: Number,
      required: true,
    },
    paymentMethod: {
      type: String,
      required: true,
    },
    paymentStatus:{
      type:String,
      required:true
    },
    razorpayOrderId:{
      type:String,
      unique: true,
      sparse: true,
    },
    razorpayPaymentId:{
      type:String,
      unique: true,
      sparse: true,
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('order', orderSchema);