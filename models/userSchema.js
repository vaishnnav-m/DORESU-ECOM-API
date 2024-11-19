const mongoose = require("mongoose");

const userSchema = mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
    },
    email: {
      type: String,
      required: true,
    },
    phone: {
      type: Number,
    },
    password: {
      type: String,
    },
    googleId:{
      type:String,
      unique: true,
      sparse: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isVerified: {
      type: Boolean,
      required: true,
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    otp: { 
      type: String 
   }, 
    otpExpiresAt: { 
      type: Date 
   },
  },
  { timestamps: true });

module.exports = mongoose.model("users", userSchema);
