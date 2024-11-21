const {HttpStatus,createResponse} = require("../utils/generateResponse");
const Offer = require('../models/offersSchema');
const Product = require('../models/productsSchema')

const addOffer = async (req,res) => {
   const {offerName,offerType,targetId,offerValue,startDate,endDate} = req.body;
   if(!req.user.isAdmin)
      return res.status(HttpStatus.FORBIDDEN).json(createResponse(HttpStatus.FORBIDDEN,"You don't have the permission"));
   try {
      const isExistingOffer = await Offer.findOne({targetId});
      if(isExistingOffer)
         return res.status(HttpStatus.CONFLICT).json(createResponse(HttpStatus.CONFLICT,"Offer for this product is already exists"));

      const newOffer = new Offer({
         offerName,
         offerType,
         offerValue,
         startDate,
         endDate,
         targetId
      });
      const offerData = await newOffer.save();
      
      if(offerType === 'product'){
         const productData = await Product.findById(targetId).populate('offer')
         
         if(!productData)
            return res.status(HttpStatus.OK).json(createResponse(HttpStatus.OK,"No produt were found"));

         if(!productData?.offer || offerValue > productData.offer.offerValue){
            await Product.findByIdAndUpdate(targetId,{$set:{offer:offerData._id}});
         }

      }else if(offerType === 'category'){
         const products = await Product.find({category:targetId}).populate('offer')

         for(const product of products){
            if(!product?.offer || offerValue > product?.offer?.offerValue){
               await Product.findByIdAndUpdate(product._id,{$set:{offer:offerData._id}})
            }
         }
      }

      res.status(HttpStatus.OK).json(createResponse(HttpStatus.OK,"Offer created successfully")); 
   } catch (error) {
      console.log(error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(createResponse(HttpStatus.INTERNAL_SERVER_ERROR,"Internal Server Error"));
   }
}

const getOffers = async (req,res) => {
   if(!req.user.isAdmin)
      return res.status(HttpStatus.FORBIDDEN).json(createResponse(HttpStatus.FORBIDDEN,"You don't have the permission"));
   try {
      const offers = await Offer.find();
      
      if(!offers)
         return res.status(HttpStatus.OK).json(createResponse(HttpStatus.OK,"No offers were found",[]));

      res.status(HttpStatus.OK).json(createResponse(HttpStatus.OK,"successfully fetched offers",offers));

      
   } catch (error) {
      console.log(error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(createResponse(HttpStatus.INTERNAL_SERVER_ERROR,"Internal Server Error"))
   }
}

const editOfferStatus = async (req,res) => {
   if(!req.user.isAdmin)
      return res.status(HttpStatus.FORBIDDEN).json(createResponse(HttpStatus.FORBIDDEN,"You don't have the permission"));
   try {
      const {offerId} = req.body;

      const offerData = await Offer.findById(offerId);
      if(!offerData)
         return res.status(HttpStatus.OK).json(createResponse(HttpStatus.OK,"No offer were found"));
      
      const newStatus = !offerData.isActive; 
      await Offer.findByIdAndUpdate(offerId,{isActive:newStatus})

      if(!newStatus){
         if(offerData.offerType === "product"){
            await Product.findOneAndUpdate(
               {_id:offerData.targetId,offer:offerId},
               {$unset:{offer:""}}
            );
         }else if(offerData.offerType === "category"){
            await Product.updateMany(
               {category:offerData.targetId,offer:offerId},
               {$unset:{offer:""}}
            );
         }
      }

      res.status(HttpStatus.OK).json(createResponse(HttpStatus.OK,"successfully updated the offer"));
      
   } catch (error) {
      console.log(error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(createResponse(HttpStatus.INTERNAL_SERVER_ERROR,"Internal Server Error"))
   }
}

const editOffer = async (req,res) => {
   if(!req.user.isAdmin)
      return res.status(HttpStatus.FORBIDDEN).json(createResponse(HttpStatus.FORBIDDEN,"You don't have the permission"));
   try {
      const {offerId,offerName,offerType,applicableItems,offerValue,startDate,endDate} = req.body;
      
      const offerData = await Offer.findById(offerId)
      if(!offerData)
         return res.status(HttpStatus.OK).json(createResponse(HttpStatus.OK,"No offer were found"));

      await Offer.findByIdAndUpdate(offerId,{
            $set:{
               offerName,
               offerType,
               applicableItems,
               offerValue,
               startDate,
               endDate
          }
      });

      res.status(HttpStatus.OK).json(createResponse(HttpStatus.OK,"successfully updated the offer"));

   } catch (error) {
      console.log(error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(createResponse(HttpStatus.INTERNAL_SERVER_ERROR,"Internal Server Error"))
   }
}

module.exports = {
   addOffer,
   getOffers,
   editOfferStatus,
   editOffer
}