const mongoose = require('mongoose');

const wishListSchema = new mongoose.Schema({
   userId:{
      type:mongoose.Schema.Types.ObjectId,
      required:true
   },
   wishes:[{
      productId:{
         type:mongoose.Schema.Types.ObjectId,
         ref:'products',
         required:true
      }
   }]
});

module.exports = mongoose.model("wishList",wishListSchema);