const mongoose = require('mongoose');

const categorySchema = mongoose.Schema({
   categoryName:{
      type:String,
      required:true
   },
   description:{
      type:String,
      required:true
   },
   isActive:{
      type:Boolean,
      default:true
   }
});

module.exports = mongoose.model('category',categorySchema);