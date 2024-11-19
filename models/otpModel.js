const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema({
  userId: {
    type:mongoose.Schema.ObjectId,
    required:true
  },
  otp:{
   type:String,
   required:true
  },
  otpExpiresAt:{
   type:Date,
   expires:'1m',
   required:true
  }
});

module.exports = mongoose.model("otps",otpSchema);
