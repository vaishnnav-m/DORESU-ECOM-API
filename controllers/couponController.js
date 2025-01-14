const { create, updateOne } = require("../models/cartSchema");
const Coupon = require("../models/couponSchema");
const Product = require('../models/productsSchema')
const {HttpStatus,createResponse} = require("../utils/generateResponse");

const addCoupon = async (req, res) => {
   console.log("working",req.body);
  const {
    couponCode,
    discountValue,
    minPurchaseAmount,
    maxDiscount,
    usageLimit,
    startDate,
    endDate,
  } = req.body;

  if(!req.user.isAdmin)
   return res.status(HttpStatus.FORBIDDEN).json(createResponse(HttpStatus.FORBIDDEN,"You don't have the permission"));

  try {
      const couponExists = await Coupon.findOne({couponCode});
      if(couponExists)
         return res.status(HttpStatus.CONFLICT).json(createResponse(HttpStatus.CONFLICT,"coupon code already exists"));

      if(discountValue >= 100)
         return res.status(HttpStatus.BAD_REQUEST).json(createResponse(HttpStatus.BAD_REQUEST,"can not give 100% discount"));

      const newCoupon = new Coupon({
         couponCode,
         discountValue,
         minPurchaseAmount,
         maxDiscount,
         usageLimit,
         startDate,
         endDate,
      });

      await newCoupon.save();

      res.status(HttpStatus.OK).json(createResponse(HttpStatus.OK,"Coupon added successfully"));
  } catch (error) {
   console.log(error);
   res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(createResponse(HttpStatus.INTERNAL_SERVER_ERROR,"Internal Server Error"));
  }
};

const getCoupons = async (req,res) => {
   try {
      const filter = req.user?.isAdmin ? {} : {isActive:true};
      
      const coupons = await Coupon.find(filter);
      const updatedCoupons = coupons.filter(coupon => coupon.usedCount < coupon.usageLimit);
      
      if(req.user?.isAdmin)
         return res.status(HttpStatus.OK).json(createResponse(HttpStatus.OK,"successfully fetched coupons",coupons));

      res.status(HttpStatus.OK).json(createResponse(HttpStatus.OK,"successfully fetched coupons",updatedCoupons));

   } catch (error) {
      console.log(error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(createResponse(HttpStatus.INTERNAL_SERVER_ERROR,"Internal Server Error"))
   }
}

const applyCoupon = async (req,res) => {
   const {couponCode,cartTotal} = req.body;
   try {
      const coupon = await Coupon.findOne({couponCode});

      if(!coupon || !coupon.isActive)
         return res.status(HttpStatus.NOT_FOUND).json(createResponse(HttpStatus.NOT_FOUND,"Invalid or inactive coupon"));

      if(new Date(coupon.endDate) < new Date)
         return res.status(HttpStatus.BAD_REQUEST).json(createResponse(HttpStatus.BAD_REQUEST,"Coupon has expired"));
      
      if(coupon.usedCount >= coupon.usageLimit)
         return res.status(HttpStatus.BAD_REQUEST).json(createResponse(HttpStatus.BAD_REQUEST,"This coupon has reached its usage limit and is no longer valid."));

      if(cartTotal < coupon.minPurchaseAmount)
         return res.status(HttpStatus.BAD_REQUEST)
      .json(createResponse(HttpStatus.BAD_REQUEST,`the minimum pruchace amout is ${coupon.minPurchaseAmount}`));

      // calculating the price after discount
      let discount = Math.round((cartTotal*coupon.discountValue)/100);
      
      if (coupon.maxDiscount && discount > coupon.maxDiscount) {
         discount = coupon.maxDiscount;
      }

      const newTotal = cartTotal - discount;

      res.status(HttpStatus.OK).json(createResponse(HttpStatus.OK,"Coupon applied successfully",{totalPriceAfterDiscount:newTotal,discount}))
   } catch (error) {
      console.log(error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(createResponse(HttpStatus.INTERNAL_SERVER_ERROR,"Internal Server Error")) 
   }
}

const editCoupons = async (req,res) => {
   if(!req.user?.isAdmin){
      return res.status(HttpStatus.FORBIDDEN).json(createResponse(HttpStatus.FORBIDDEN,"You don't have the permission"));
   }
   try {
      const {
         couponId,
         couponCode,
         discountValue,
         minPurchaseAmount,
         maxDiscount,
         usageLimit,
         startDate,
         endDate,
      } = req.body;

      
      const couponData = await Coupon.findById(couponId);
      if(!couponData)
         return res.status(HttpStatus.NOT_FOUND).json(createResponse(HttpStatus.NOT_FOUND,"coupon not found"));

      if(couponCode !== couponData.couponCode){
         const couponExists = await Coupon.findOne({couponCode});
         if(couponExists)
            return res.status(HttpStatus.CONFLICT).json(createResponse(HttpStatus.CONFLICT,"coupon code already exists"));
      }

      if(discountValue >= 80)
         return res.status(HttpStatus.BAD_REQUEST).json(createResponse(HttpStatus.BAD_REQUEST,"Maximum discount limit is 79%"));
      
      const newCoupon = {
         couponCode: couponCode || couponData.couponCode,
         discountValue: discountValue || couponData.discountValue,
         minPurchaseAmount: minPurchaseAmount || couponData.minPurchaseAmount,
         maxDiscount: maxDiscount || couponData.maxDiscount,
         usageLimit: usageLimit || couponData.usageLimit,
         startDate: startDate || couponData.startDate,
         endDate: endDate || couponData.endDate,
      }

      await Coupon.findByIdAndUpdate(couponId,newCoupon)

      res.status(HttpStatus.OK).json(createResponse(HttpStatus.OK,"Coupon updated Successfully"));
      
   } catch (error) {
      console.log(error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(createResponse(HttpStatus.INTERNAL_SERVER_ERROR,"Internal Server Error")) 
   }
}

const updateCouponStatus = async (req,res) => {
   if(!req.user.isAdmin)
      return res.status(HttpStatus.FORBIDDEN).json(createResponse(HttpStatus.FORBIDDEN,"You don't have the permission"));
   try {
      const { couponId } = req.body;

      console.log('couponId :>> ', req.body);
      const couponData = await Coupon.findById(couponId);
      if(!couponData)
         return res.status(HttpStatus.OK).json(createResponse(HttpStatus.OK,"No coupon were found"));
      const newStatus = !couponData.isActive; 
      await Coupon.findByIdAndUpdate(couponId,{isActive:newStatus})

      res.status(HttpStatus.OK).json(createResponse(HttpStatus.OK,"successfully updated the coupon"));
      
   } catch (error) {
      console.log(error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(createResponse(HttpStatus.INTERNAL_SERVER_ERROR,"Internal Server Error"))
   }
}

module.exports = {
   addCoupon,
   getCoupons,
   applyCoupon,
   editCoupons,
   updateCouponStatus
}
