const express = require('express');
const user_route = express.Router();
const userController = require('../controllers/userController');
const productController = require('../controllers/productController')
const verifyToken = require('../middlewares/tokenCheck');
const googleAuthController = require('../controllers/googleAuthController');
const addressController = require('../controllers/addressController');
const cartController = require('../controllers/cartController');
const orderController = require('../controllers/orderController');
const wishListController = require('../controllers/wishListController');

user_route.post('/signup',userController.postSignup);

user_route.post('/login',userController.postLogin);

user_route.post('/googleAuth',googleAuthController.google_authentication);

user_route.post('/verifyOtp',userController.verifyOtp);

user_route.post('/resendOtp',userController.resendOtp);

user_route.get('/refresh',userController.refreshToken);

user_route.get('/getUser',verifyToken,userController.getUser);

user_route.put('/updateUser',verifyToken,userController.updateUser);

user_route.patch('/resetPassword',verifyToken,userController.resetPassword);

user_route.post('/logout',verifyToken,userController.logoutUser);

user_route.get('/getProducts',productController.getProducts);

user_route.get('/getProduct/:productId',productController.getProduct);

user_route.post('/addAddress',verifyToken,addressController.addAddress);

user_route.get('/getAddresses',verifyToken,addressController.getAddress);

user_route.patch('/updateDefaultAddress',verifyToken,addressController.updateIsDefault);

user_route.get('/getOneAddress/:addressId',verifyToken,addressController.getOneAddress)

user_route.put('/updateAddress',verifyToken,addressController.updateAddress);

user_route.delete('/deleteAddress',verifyToken,addressController.deleteAddress);

user_route.post('/addToCart',verifyToken,cartController.addCart);

user_route.get('/getCart',verifyToken,cartController.getCart);

user_route.patch('/updateCart',verifyToken,cartController.updateCart);

user_route.delete('/removeCartProduct',verifyToken,cartController.removePrdctCart);

user_route.post('/placeOrder',verifyToken,orderController.placeOrder);

user_route.post('/verifyOrder',verifyToken,orderController.verifyPayment);

user_route.get('/getUserOrderHistories',verifyToken,orderController.getOrderhistories);

user_route.get('/getOneOrder/:orderId',verifyToken,orderController.getOneOrder);

user_route.patch('/cancelOrder',verifyToken,orderController.updateOrderStatus);

user_route.post('/wishList/add',verifyToken,wishListController.addWishList);

user_route.get('/wishList/get',verifyToken,wishListController.getWishList);

module.exports = user_route;