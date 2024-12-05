const Order = require('../models/orderSchema');
const Cart = require('../models/cartSchema');
const Product = require('../models/productsSchema');
const Coupon = require('../models/couponSchema')
const Wallet = require('../models/walletSchema')
const {HttpStatus,createResponse} = require("../utils/generateResponse");
const Razorpay = require('razorpay');
const crypto = require('crypto');
const ExcelJS = require("exceljs");
const { jsPDF } = require("jspdf");
require("jspdf-autotable") 

// ------------------ Helper Functions ------------------ //
// function to refund 
const refund = async (affectedItem,userId,updatedOrder,remark) => {
   const {price,quantity} = affectedItem;
   const totalOrderPrice = updatedOrder.totalPrice;
   const totalCouponDiscount = updatedOrder.couponDiscount || 0;
   
   const itemTotal = price * quantity;
   const proportionalCouponDiscount = (itemTotal / totalOrderPrice) * totalCouponDiscount;

   const refundAmount = itemTotal - proportionalCouponDiscount;

   let wallet = await Wallet.findOne({userId});
   if(!wallet){
      wallet = new Wallet({
         userId,
         balance:0,
         histories:[]
      });
   }

   console.log(refundAmount);

   wallet.balance += refundAmount;
   wallet.histories.push({
      type:"Credit",
      amount:refundAmount,
      remark
   });

   await wallet.save();
}

// function to get date filter
const getDateFilter = (filter, startDate, endDate) => {
      console.log("inside the date",startDate,endDate,filter);
      if (filter === "today") {
         const today = new Date();
         const startOfDay = new Date(today.setHours(0, 0, 0, 0));
         const endOfDay = new Date(today.setHours(23, 59, 59, 999));
         return {
           createdAt: {
             $gte: startOfDay,
             $lte: endOfDay,
           },
         };
       } else if (filter === "week") {
         const today = new Date();
         const firstDayOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
         const lastDayOfWeek = new Date(today.setDate(today.getDate() - today.getDay() + 6)); 
         return {
           createdAt: {
             $gte: firstDayOfWeek,
             $lte: lastDayOfWeek,
           },
         };
       } else if (filter === "month") {
         const today = new Date();
         const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1); 
         const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
         return {
           createdAt: {
             $gte: startOfMonth,
             $lte: endOfMonth,
           },
         };
       } else if (startDate && endDate) {
         // Custom date filter if "startDate" and "endDate" are provided
         return {
           createdAt: {
             $gte: new Date(new Date(startDate).setHours(0, 0, 0, 0)),
             $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)),
           },
         };
       }
       return {};
}

// ------------------ Controller Functions ------------------ //
// place order logic
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
         razorpayOrderId: paymentMethod === "online" && razorpayOrderId 
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

// verify payment logic
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

// get all orders
const getOrderhistories = async (req,res) => {
   try {
      const { filter, startDate = "", endDate = "", limit = 10, page = 1 } = req.query;
      const filterCondition = req.user.isAdmin ? {} : { userId: req.user.id };
      const maxLimit = 20;

      const effectiveLimit = Math.min(limit,maxLimit);
      const skip = (page-1)*effectiveLimit;
      const totalOrders = await Order.countDocuments(filterCondition);
      const totalPages = Math.ceil(totalOrders / limit);

      const dateFilter = getDateFilter(filter, startDate ? startDate : null, endDate ? endDate : null);

      const filterQuery = { ...filterCondition, ...(dateFilter ? { ...dateFilter } : {}) };

      const orderhistories = await Order.find(filterQuery).populate("items.productId").sort({createdAt:-1}).skip(skip).limit(effectiveLimit);
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

      res.status(HttpStatus.OK).json(createResponse(HttpStatus.OK, 'Order histories fetched successfully',
         {orders:updatedOrderHistories,totalPages,currentPage:page}));
      
   } catch (error) {
      console.log(error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(createResponse(HttpStatus.INTERNAL_SERVER_ERROR,"Internal Server Error"));
   }
}

// update order status 
const updateOrderStatus = async (req,res) => {
   try {
      const {status,itemId,orderId} = req.body;
   
      const updatedOrder = await Order.findOneAndUpdate({_id:orderId,"items._id":itemId},{$set:{"items.$.status":status}},{new:true});
   
      if(!updatedOrder)
         return res.status(HttpStatus.NOT_FOUND).json(createResponse(HttpStatus.NOT_FOUND,"Item in the order is not found"));

      const affectedItem = updatedOrder.items.find(item => item._id.toString() === itemId);
      console.log('updatedOrder  in order:>> ', updatedOrder);
      if(status === "Cancelled" && affectedItem){
         if(updatedOrder.paymentStatus === "Paid")
            await refund(affectedItem,req.user.id,updatedOrder, "Refund for product cancellation");

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

         await refund(affectedItem,req.user.id,updatedOrder,"Refund for product return");
      }

      res.status(HttpStatus.OK).json(createResponse(HttpStatus.OK, 'Order status updated successfully')); 
   
   } catch (error) {
      console.log(error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(createResponse(HttpStatus.INTERNAL_SERVER_ERROR,"Internal Server Error"));
   }
}

// get specific order
const getOneOrder = async (req,res) => {
   try {
      const {orderId} = req.params;

      const orderData = await Order.findById(orderId).populate('items.productId').lean();
      if(!orderData)
         return res.status(HttpStatus.NOT_FOUND).json(createResponse(HttpStatus.NOT_FOUND,"Order details not found"));

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

const downloadPDFReport = async (req,res) => {
 try {
     const { filter, startDate, endDate } = req.query;
  
     const dateFilter = getDateFilter(filter,startDate,endDate);
     const salesData = await Order.find(dateFilter).populate("items.productId");
  
     if (!salesData || salesData.length === 0) 
        return res.status(HttpStatus.NOT_FOUND).json(createResponse(HttpStatus.NOT_FOUND,"Could'nt fetch sales report"));
  
     const pdf = new jsPDF();

     // title
     pdf.text("DORESU Sales Report",10,10);
  
     // table
     pdf.autoTable({ 
      startY: 20,
       head: [
        [
          "Order ID",
          "Costomer Name",
          "Date",
          "Items",
          "Payment Method",
          "Price",
        ],
      ],
      body:salesData.map((order) => [
        order._id,
        order.shippingAddress.name,
        new Date(order.createdAt).toLocaleString(),
        order.totalQuantity,
        order.paymentMethod,
        order.totalPrice.toFixed(2),
      ]),
      styles:{
         fontSize:10,
         cellPadding:2
      },
       tableWidth:"wrap",
       headStyles: {
         fontSize: 11, 
         halign: "center",
       },
       bodyStyles: {
         valign: "middle", 
         halign: "left",
       },
       margin: { left: 10 },

     });

     const pdfData = pdf.output("arraybuffer");
  
     res.setHeader("Content-Type", "application/pdf");
     res.setHeader("Content-Disposition", "attachment; filename=SalesReport.pdf");
  
     res.send(Buffer.from(pdfData));
 } catch (error) {
      console.log(error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(createResponse(HttpStatus.INTERNAL_SERVER_ERROR,"Internal Server Error"));
 }
}

const downloadXLReport = async(req,res) => {
  try {
    const { filter, startDate, endDate } = req.query;
   
      const dateFilter = getDateFilter(filter,startDate,endDate);
      const salesData = await Order.find(dateFilter).populate("items.productId");
   
      if (!salesData || salesData.length === 0) 
         return res.status(HttpStatus.NOT_FOUND).json(createResponse(HttpStatus.NOT_FOUND,"Could'nt fetch sales report"));

      const workBook = new ExcelJS.Workbook();
      const worksheet = workBook.addWorksheet("DORESU Sales Report");

      // headers
      worksheet.columns = [
         { header: "Order ID", key: "id", width: 25 },
         { header: "Customer Name", key: "customerName", width: 20 },
         { header: "Date", key: "date", width: 20 },
         { header: "Items", key: "items", width: 40 },
         { header: "Payment Method", key: "paymentMethod", width: 20 },
         { header: "Price", key: "price", width: 15 },
       ];

       salesData.forEach((order) => {
         worksheet.addRow({
            id:order._id,
            customerName:order.shippingAddress.name,
            date:new Date(order.createdAt),
            items:order.totalQuantity,
            paymentMethod:order.paymentMethod,
            price:order.totalPrice.toFixed(2),
         });
       });

       const headerRow = worksheet.getRow(1);
       headerRow.eachCell((cell) => {
         cell.font = { bold:true },
         cell.alignment = { vertical: "middle", horizontal: "center" }
       });

       res.setHeader(
         "Content-Type",
         "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
       );
       res.setHeader(
         "Content-Disposition",
         "attachment; filename=DORESU_Sales_Report.xlsx"
       );
   
       await workBook.xlsx.write(res);
       res.end();

  } catch (error) {
      console.log(error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(createResponse(HttpStatus.INTERNAL_SERVER_ERROR,"Internal Server Error"));
  }
}

const downloadInvoice = async (req,res) => {
   const {orderId} = req.params
   try {
      const order = await Order.findById(orderId).populate('items.productId')
      if(!order)
         return res.status(HttpStatus.NOT_FOUND).json(createResponse(HttpStatus.NOT_FOUND,"order not found"));

      const pdf = new jsPDF();

      // title
      pdf.setFontSize(20);
      pdf.text('Invoice',105,20,{ align:'center' });

      pdf.setFontSize(12);
      pdf.text(`Order ID: ${order._id}`,20, 40);
      pdf.text(`Date: ${new Date(order.createdAt).toLocaleDateString()}`, 20, 50);
      pdf.text(`Customer: ${order.shippingAddress.name}`, 20, 60);

      const tableColumns = ['Product', 'Quantity', 'Price', 'Total'];
      const tableRows = order.items.map(item => [
         item.productId.productName,
         item.quantity,
         `₹${item.price}`,
         `₹${(item.price * item.quantity).toFixed(2)}`
      ]);

      pdf.autoTable({
         head: [tableColumns],
         body: tableRows,
         startY: 70,
         styles: { halign: 'center' },
       });

      const finalY = pdf.previousAutoTable.finalY + 10;
      pdf.text(`Total Amount: $${order.totalPrice}`, 20, finalY);

      const pdfData = pdf.output("arraybuffer");
  
     res.setHeader("Content-Type", "application/pdf");
     res.setHeader("Content-Disposition", `attachment; filename=invoice-${order._id}.pdf`);
  
     res.send(Buffer.from(pdfData));
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
   verifyPayment,
   downloadPDFReport,
   downloadXLReport,
   downloadInvoice
}