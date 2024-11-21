const Order = require('../models/orderSchema');
const Cart = require('../models/cartSchema');
const Product = require('../models/productsSchema');
const Coupon = require('../models/couponSchema')
const Wallet = require('../models/walletSchema')
const {HttpStatus,createResponse} = require("../utils/generateResponse");
const Razorpay = require('razorpay');
const crypto = require('crypto');

const placeOrder = async (req,res) => {
   try {
      const userId = req.user.id;
      const { address, items, totalPrice, totalQuantity, paymentMethod, couponDiscount, couponCode } = req.body;

      let razorpayOrderId = null;    
      if(paymentMethod === 'online'){
         const razorpay = new Razorpay({
            key_id:process.env.RAZORPAY_KEY_ID,
            key_secret:process.env.RAZORPAY_SECRET
         });

         const options = {
            amount:totalPrice * 100,
            currency:"INR",
            receipt: `receipt_${Date.now()}`,
         }

         const order = await razorpay.orders.create(options);
         if(!order)
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(
         createResponse(HttpStatus.INTERNAL_SERVER_ERROR,"Failed to create Razorpay order. Please try again."));
         razorpayOrderId = order.id;
      }

      const newOrder = new Order({
         userId,
         items:items.map(item => ({
            productId:item.productId,
            quantity:item.quantity,
            price: item.price,
            size: item.size,
            status: 'Pending'
         })),
         shippingAddress:{
            name:address.name,
            mobile:address.mobile,
            pincode:address.pincode,
            houseName:address.houseName,
            landmark:address.landmark,
            city:address.city,
            district:address.district,
            street:address.street,
            state:address.state,
         },
         couponDiscount:couponDiscount?couponDiscount:0,
         totalPrice,
         totalQuantity,
         paymentMethod:paymentMethod,
         paymentStatus:"pending",
         razorpayOrderId: paymentMethod === "online" ? razorpayOrderId : null
      });
   
      await newOrder.save();

      if(couponCode)
         await Coupon.findOneAndUpdate({ couponCode }, { $inc: { usedCount:1 } });

      if(paymentMethod === "online"){
         return res.status(HttpStatus.OK).json(createResponse(HttpStatus.OK,"Order created successfully",{razorpayOrderId}))
      }

      const stockUpdate = items.map((item) => ({
         updateOne:{
            filter:{_id:item.productId,"variants.size":item.size},
            update:{$inc:{"variants.$.stock":-item.quantity}}
         }
      }));

      await Product.bulkWrite(stockUpdate);

      await Cart.updateOne({userId},{ $set: { products: [], totalPrice: 0, totalQuantity: 0 } });
   
      res.status(HttpStatus.OK).json(createResponse(HttpStatus.OK, 'Order created successfully'));
   } catch (error) {
      console.log(error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(createResponse(HttpStatus.INTERNAL_SERVER_ERROR,"Internal Server Error"));
   }
}

const verifyPayment = async (req,res) => {
   const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
   console.log("verify payment",razorpay_order_id);
   try {
      const sha = crypto.createHmac('sha256',process.env.RAZORPAY_SECRET);
      sha.update(`${razorpay_order_id}|${razorpay_payment_id}`);
      const digest = sha.digest('hex');

      if(digest !== razorpay_signature){
         return res.status(HttpStatus.BAD_REQUEST).json(createResponse(HttpStatus.BAD_REQUEST,"Payment verification Failed"));
      }

      const order = await Order.findOneAndUpdate(
         {razorpayOrderId: razorpay_order_id },
         {
            $set:{
               paymentStatus:"Paid",
               razorpayPaymentId:razorpay_payment_id
            },
         },
      );

      const stockUpdate = order.items.map((item) => ({
         updateOne: {
           filter: { _id: item.productId, "variants.size": item.size },
           update: { $inc: { "variants.$.stock": -item.quantity } },
         },
       }));
   
       await Product.bulkWrite(stockUpdate);
   
       // Clear cart
       await Cart.updateOne(
         { userId: order.userId },
         { $set: { products: [], totalPrice: 0, totalQuantity: 0 } }
       );

      res.status(HttpStatus.OK).json(createResponse(HttpStatus.OK, 'Payment verification completed successfully'));
      
   } catch (error) {
      console.log(error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(createResponse(HttpStatus.INTERNAL_SERVER_ERROR,"Internal Server Error"));
   }
}

const getOrderhistories = async (req,res) => {
   try {
      const { filter, startDate, endDate } = req.query;
      const filterCondition = req.user.isAdmin ? {} : { userId: req.user.id };

      let dateFilter = {};

      if (filter === "today") {
         const today = new Date();
         const startOfDay = new Date(today.setHours(0, 0, 0, 0));
         const endOfDay = new Date(today.setHours(23, 59, 59, 999));
         dateFilter = {
           createdAt: {
             $gte: startOfDay,
             $lte: endOfDay,
           },
         };
       } else if (filter === "week") {
         const today = new Date();
         const firstDayOfWeek = new Date(today.setDate(today.getDate() - today.getDay())); // Set to Sunday
         const lastDayOfWeek = new Date(today.setDate(today.getDate() - today.getDay() + 6)); // Set to Saturday
         dateFilter = {
           createdAt: {
             $gte: firstDayOfWeek,
             $lte: lastDayOfWeek,
           },
         };
       } else if (filter === "month") {
         const today = new Date();
         const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1); // First day of the month
         const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0); // Last day of the month
         dateFilter = {
           createdAt: {
             $gte: startOfMonth,
             $lte: endOfMonth,
           },
         };
       } else if (startDate && endDate) {
         // Custom date filter if "startDate" and "endDate" are provided
         dateFilter = {
           createdAt: {
             $gte: new Date(startDate),
             $lte: new Date(endDate),
           },
         };
       }

       const filterQuery = { ...filterCondition, ...dateFilter };

       console.log(filterQuery);

      const orderhistories = await Order.find(filterQuery).populate("items.productId");
      if(!orderhistories)
         return res.status(HttpStatus.NOT_FOUND).json(createResponse(HttpStatus,"Order histories not found"));

      const updatedOrderHistories = orderhistories.map((order) => {
         order.items = order.items.map((item) => {
           const imageUrls = item.productId.gallery.map((image) => `${req.protocol}://${req.get("host")}/uploads/products/${image}`);
           return {
             ...item.toObject(),
             productId: {
               ...item.productId.toObject(),
               gallery: imageUrls
             }
           };
         });
         return order;
       });

      res.status(HttpStatus.OK).json(createResponse(HttpStatus.OK, 'Order histories fetched successfully',updatedOrderHistories));
      
   } catch (error) {
      console.log(error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(createResponse(HttpStatus.INTERNAL_SERVER_ERROR,"Internal Server Error"));
   }
}

const updateOrderStatus = async (req,res) => {
   try {
      const {status,itemId,orderId} = req.body;
   
      const updatedOrder = await Order.findOneAndUpdate({_id:orderId,"items._id":itemId},{$set:{"items.$.status":status}},{new:true});
   
      if(!updatedOrder)
         return res.status(HttpStatus.NOT_FOUND).json(createResponse(HttpStatus.NOT_FOUND,"Item in the order is not found"));

      const affectedItem = updatedOrder.items.find(item => item._id.toString() === itemId);

      if(status === "Cancelled" && affectedItem){
            await Product.updateOne(
               {_id:affectedItem.productId,"variants.size":affectedItem.size},
               { $inc: { "variants.$.stock": affectedItem.quantity } }
            );
      }

      if(status === "Returned" && affectedItem){
            await Product.updateOne(
               {_id:affectedItem.productId,"variants.size":affectedItem.size},
               { $inc: { "variants.$.stock": affectedItem.quantity } }
            ); 

            const {price,quantity} = affectedItem;
            const totalOrderPrice = updatedOrder.totalPrice;
            const totalCouponDiscount = updatedOrder.couponDiscount || 0;

            const itemTotal = price * quantity;
            const proportionalCouponDiscount = (itemTotal / totalOrderPrice) * totalCouponDiscount;

            const refundAmount = itemTotal - proportionalCouponDiscount;
            const userId = req.user.id;

            let wallet = await Wallet.findOne({userId});
            if(!wallet){
               wallet = new Wallet({
                  userId,
                  balance:0,
                  histories:[]
               });
            }

            wallet.balance += refundAmount;
            wallet.histories.push({
               type:"Credit",
               amount:refundAmount,
            });

            await wallet.save();
      }

      res.status(HttpStatus.OK).json(createResponse(HttpStatus.OK, 'Order status updated successfully')); 
   
   } catch (error) {
      console.log(error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(createResponse(HttpStatus.INTERNAL_SERVER_ERROR,"Internal Server Error"));
   }
}

const getOneOrder = async (req,res) => {
   try {
      const {orderId} = req.params;

      const orderData = await Order.findById(orderId).populate('items.productId').lean();
      if(!orderData)
         return res.status(HttpStatus.NOT_FOUND).json(createResponse(HttpStatus,"Order details not found"));

      const updatedOrderData = {
         ...orderData,
          items:orderData.items.map((item) => {
           const imageUrls = item.productId.gallery.map((image) => `${req.protocol}://${req.get("host")}/uploads/products/${image}`);
           return {
              ...item,
              gallery:imageUrls
           }
        })
      }
      
      res.status(HttpStatus.OK).json(createResponse(HttpStatus.OK, "Order details retrieved",updatedOrderData));
      
   } catch (error) {
      console.log(error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(createResponse(HttpStatus.INTERNAL_SERVER_ERROR,"Internal Server Error"));
   }
}

module.exports = {
   placeOrder,
   getOrderhistories,
   updateOrderStatus,
   getOneOrder,
   verifyPayment
}