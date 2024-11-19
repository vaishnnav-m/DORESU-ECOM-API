const mongoose = require('mongoose');

const addressSchema = mongoose.Schema({
   userId:{
      type:mongoose.Schema.ObjectId,
      ref: "users",
      required: true,
   },
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
   isDefault:{
      type:Boolean,
      default:false
   },
   isDeleted:{
      type:Boolean,
      default:false
   }
},{ timestamps: true })

module.exports = mongoose.model('address',addressSchema);