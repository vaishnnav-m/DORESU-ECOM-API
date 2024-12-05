const Order = require('../models/orderSchema');
const User = require("../models/userSchema");
const Product = require("../models/productsSchema");
const {HttpStatus,createResponse} = require("../utils/generateResponse");


const getDashboardData = async (req,res) => {
   try {
      if(!req?.user?.isAdmin)
         return res.status(HttpStatus.UNAUTHORIZED).json(createResponse(HttpStatus.UNAUTHORIZED,"you don't have permission"));
      
      const totalCustomers = await User.countDocuments({isAdmin:false});
      const totalOrders = await Order.countDocuments();
      const pendingOrders = await Order.aggregate([
         {$unwind:"$items"},
         {$match:{'items.status':"Pending"}},
         { $group: { _id: null, totalPendingOrders: { $sum: 1 } } } 
      ]);
      const totalProductsSoldData = await Order.aggregate([
         {$unwind:"$items"},
         {$group:{
            _id:null,
            totalSold:{$sum:"$items.quantity"}
         }}
      ]);
      const totalProductsSold = totalProductsSoldData[0].totalSold;

      const totalRevenue = await Order.aggregate([
         {$group:{
            _id:null,
            totalPrice:{$sum:'$totalPrice'},
            count:{$sum:1}
         }}
      ]);

      // top 5 products
      const topProducts = await Order.aggregate([
         {$unwind:"$items"},
         {$lookup:{
            from:"products",
            localField:"items.productId",
            foreignField:"_id",
            as:"productDetails"
         }},
         {$unwind:"$productDetails"},
         {$group:{
            _id:"$productDetails.productName",
            varient:{$first:"$productDetails.variants"},
            image:{$first:"$productDetails.gallery"},
            totalSold:{$sum:"$items.quantity"}
         }},
         {$sort:{totalSold:-1}},
         {$limit:5}
      ]);

      const processedTopProducts = topProducts.map(product => {
         return {
           ...product,
           varient:product.varient[0].price,
           image:`${req.protocol}://${req.get("host")}/uploads/products/${product.image[0]}`
         };
       });

      // top 5 categories
      const topCategories = await Order.aggregate([
         {$unwind:"$items"},
         {$lookup:{
            from:"products",
            localField:"items.productId",
            foreignField:"_id",
            as:"productDetails"
         }},
         {$unwind:"$productDetails"},

         {$lookup:{
            from:"categories",
            localField:"productDetails.category",
            foreignField:"_id",
            as:"categoryDetails"
         }},
         {$unwind:"$categoryDetails"},

         {$group:{
            _id:"$categoryDetails.categoryName",
            totalSold:{$sum:"$items.quantity"}
         }},
         {$sort:{totalSold:-1}},
         {$limit:5}
      ]);

      const data = {
         totalCustomers,
         totalOrders,
         totalProductsSold,
         totalRevenue:totalRevenue[0].totalPrice,
         totalPendingOrders:pendingOrders[0].totalPendingOrders,
         topProducts:processedTopProducts,
         topCategories,
      }

      res.status(HttpStatus.OK).json(createResponse(HttpStatus.OK,"Successfully fetched",data));

   } catch (error) {
      console.log(error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(createResponse(HttpStatus.INTERNAL_SERVER_ERROR,"Internal Server Error"));
   }
}

const getChartData = async (req,res) => {
   try {
      if(!req?.user?.isAdmin)
         return res.status(HttpStatus.UNAUTHORIZED).json(createResponse(HttpStatus.UNAUTHORIZED,"you don't have permission"));

      const { filter } = req.query;

      let startDate, endDate;
      const today = new Date();

      const chartData = {
         weekly: {
           labels: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
           sales: [0, 0, 0, 0, 0, 0, 0],
         },
         monthly: {
           labels: [
             "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"
           ],
           sales: Array(12).fill(0),
         },
       };

      if(filter === "weekly"){
         const firstDayOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
         const lastDayOfWeek = new Date(today.setDate(today.getDate() - today.getDay() + 6));
         startDate = new Date(firstDayOfWeek.setHours(0, 0, 0, 0));
         endDate = new Date(lastDayOfWeek.setHours(23, 59, 59, 999));
      }else if(filter === "monthly"){
         startDate = new Date(today.getFullYear(), 0, 1);
         endDate = new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999);
      }

      const orders = await Order.find({
         createdAt: { $gte: startDate, $lte: endDate },
       });

      orders.forEach((order) => {
         const orderDate = new Date(order.createdAt);
         
         if(filter === "weekly"){
            const dayOfWeek = orderDate.getDay();
            chartData.weekly.sales[dayOfWeek] += order.totalPrice; 
         }else if(filter === 'monthly'){
            const month = orderDate.getMonth(); 
            chartData.monthly.sales[month] += order.totalPrice;
         }
      })
      
      if(filter === "weekly"){
         return res.status(HttpStatus.OK).json(createResponse(HttpStatus.OK,"Successfully fetched",chartData.weekly));
      }else if(filter === "monthly"){
         return res.status(HttpStatus.OK).json(createResponse(HttpStatus.OK,"Successfully fetched",chartData.monthly));
      }
      
   } catch (error) {
      console.log(error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(createResponse(HttpStatus.INTERNAL_SERVER_ERROR,"Internal Server Error"));
   }
}

module.exports = {
   getDashboardData,
   getChartData
}