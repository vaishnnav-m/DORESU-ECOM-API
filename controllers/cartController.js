const Product = require("../models/productsSchema");
const Cart = require("../models/cartSchema");
const {HttpStatus,createResponse} = require("../utils/generateResponse");


const addCart = async (req,res) => {
   const {productId,size,quantity} = req.body;
   try {
      const productData = await Product.findById(productId);
      if(!productData || !productData.isActive)
         return res.status(HttpStatus.NOT_FOUND).json(createResponse(HttpStatus.NOT_FOUND, "Product not found"));

      const selectedVariant = productData.variants.find( vrnt => vrnt.size === size);
      if(!selectedVariant)
         return res.status(HttpStatus.NOT_FOUND).json(createResponse(HttpStatus.NOT_FOUND, "Variant not found"));

      if(selectedVariant.stock < quantity)
         return res.status(HttpStatus.BAD_REQUEST).json(createResponse(HttpStatus.BAD_REQUEST, "Insufficient stock for this variant"));

      let cart = await Cart.findOne({userId:req.user.id});
      if(!cart)
         cart = new Cart({userId:req.user.id,products:[],totalPrice:0,totalQuantity:0});

      const existingProduct = cart.products.find((item) =>  String(item.productId) === String(productId) && item.size === size);
      if(existingProduct)
         return res.status(HttpStatus.BAD_REQUEST).json(
            createResponse(HttpStatus.BAD_REQUEST, "Product with this variant is already in the cart"));

      cart.products.push({
         productId,
         size,
         quantity,
         price:selectedVariant.price * quantity
      })

      cart.totalPrice = cart.products.reduce((total,item) => total + item.price, 0 );
      cart.totalQuantity = cart.products.reduce((total,item) => total + item.quantity,0);

      await cart.save();
      res.status(HttpStatus.OK).json(createResponse(HttpStatus.OK,"Added successfully"));
      
   } catch (error) {
     console.log(error);
     res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(createResponse(HttpStatus.INTERNAL_SERVER_ERROR,"Internal Server Error"));
   }
}

const getCart = async (req,res) => {
   try {
      const  userId  = req.user.id
      let cartData = await Cart.findOne({userId})
      .populate({
         path:'products.productId',
         select:'productName price gallery offer',
         populate:{
            path:'offer',
            select: 'offerName offerValue startDate endDate',
         },
      })
      .select('products totalPrice totalQuantity').lean();


      if(!cartData){
         cartData = new Cart({userId,products:[],totalPrice:0,totalQuantity:0});
         await cartData.save();
      }

      console.log(cartData);

      let totalPriceAfterDiscount = 0;
      const updatedProducts = cartData.products.map(item => {

         const product = item.productId;
         const originalPrice = item.price;
         const offerValue = product?.offer?.offerValue || 0;

         const priceAfterDiscount = Math.floor(originalPrice - (originalPrice * offerValue) / 100)
         totalPriceAfterDiscount += priceAfterDiscount * item.quantity;

         const imageUrl = `${req.protocol}://${req.get('host')}/uploads/products/${item.productId.gallery[0]}`;
         return {
            ...item,
            productId: {
              ...product,
              gallery: imageUrl,
            },
          };
      });
      
      cartData.products = updatedProducts;


      res.status(HttpStatus.OK).json(createResponse(HttpStatus.OK,"cart fetched succefully",{...cartData,totalPriceAfterDiscount}));
   } catch (error) {
      console.log(error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(createResponse(HttpStatus.INTERNAL_SERVER_ERROR,"Internal Server Error"));
   }
}

const updateCart = async (req,res) => {
   try {
      const  userId  = req.user.id
      const {productId,newQuantity} = req.body;

      const cart = await Cart.findOne({userId});
      if(!cart)
         return res.status(HttpStatus.NOT_FOUND).json(createResponse(HttpStatus.NOT_FOUND,"Cart not found"));
      
      // finding the which product is to update
      const product = cart.products.find(item => item.productId.toString() === productId);
      if(!product)
         return res.status(HttpStatus.NOT_FOUND).json(createResponse(HttpStatus.NOT_FOUND,"Product in the cart not found"));

      const productData = await Product.findById(productId);
      if (!productData) {
         return res.status(HttpStatus.NOT_FOUND).json(createResponse(HttpStatus.NOT_FOUND, "Product not found"));
      }

      // find the selected varient
      const selectedVariant = productData.variants.find( vrnt => vrnt.size === product.size);
      if(!selectedVariant)
         return res.status(HttpStatus.NOT_FOUND).json(createResponse(HttpStatus.NOT_FOUND, "Variant not found"));

      // checking the new quantity is greaterthan stock
      if(selectedVariant.stock < newQuantity)
         return res.status(HttpStatus.BAD_REQUEST).json(createResponse(HttpStatus.BAD_REQUEST, "Insufficient stock for this variant"));

      // update the quantity and price
      product.quantity = newQuantity;
      product.price = selectedVariant.price;


      // updting total price and quantity
      cart.totalPrice = cart.products.reduce((total,item) => (total + item.price) * item.quantity, 0 );
      cart.totalQuantity = cart.products.reduce((total,item) => total + item.quantity,0)

      await cart.save();
      res.status(HttpStatus.OK).json(createResponse(HttpStatus.OK,"Added successfully"));

   } catch (error) {
      console.log(error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(createResponse(HttpStatus.INTERNAL_SERVER_ERROR,"Internal Server Error"));
   }
}

const removePrdctCart = async(req,res) => {
   try {
      const userId = req.user.id
      const {productId} = req.body;

      // to check cart exists or not
      const cart = await Cart.findOne({userId});
      if(!cart)
         return res.status(HttpStatus.NOT_FOUND).json(createResponse(HttpStatus.NOT_FOUND,"Cart not found"));

      // to chceck product exist in the cart or not
      const productExists = cart.products.some(item => item.productId.toString() === productId);
      if (!productExists) {
         return res.status(HttpStatus.NOT_FOUND).json(createResponse(HttpStatus.NOT_FOUND, "Product not found in cart"));
      }

      // to update the cart to remove the product
      const products = cart.products.filter(item => item.productId.toString() !== productId);
      if(!products)
         return res.status(HttpStatus.NOT_FOUND).json(createResponse(HttpStatus.NOT_FOUND,"Product in the cart not found"));

      // update the cart
      cart.products = products;
      cart.totalPrice = cart.products.reduce((total, item) => total + item.price * item.quantity, 0);
      cart.totalQuantity = cart.products.reduce((total, item) => total + item.quantity, 0);

      await cart.save();
      res.status(HttpStatus.OK).json(createResponse(HttpStatus.OK,"Added successfully"));
      
   } catch (error) {
      console.log(error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(createResponse(HttpStatus.INTERNAL_SERVER_ERROR,"Internal Server Error"));
   }
}

module.exports = {
   addCart,
   getCart,
   updateCart,
   removePrdctCart
}