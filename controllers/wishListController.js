const {HttpStatus,createResponse} = require("../utils/generateResponse");
const WishList = require('../models/wishListSchema');

const addWishList = async (req,res) => {
  try {
    console.log("working");
    const {productId} = req.body;
    const userId = req.user.id;

    let wishList = await WishList.findOne({userId});
    let action;

    if(!wishList){
      wishList = new WishList({userId,wishes:[{productId}]});
      action = "added to"
    }else{ 
      const productExists = wishList.wishes.some((val) => val.productId.toString() === productId);
      
      // if product exist then add or remove
      if (productExists) {
        wishList.wishes = wishList.wishes.filter((val) => val.productId.toString() !== productId);
        action = 'removed'
      } else {
        wishList.wishes.push({ productId });
        action = 'added from'
      }
    }

    await wishList.save();

    res.status(HttpStatus.OK).json(createResponse(HttpStatus.OK,`Product ${action} wishlist successfully`));

  } catch (error) {
   console.log(error);
   res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(createResponse(HttpStatus.INTERNAL_SERVER_ERROR,"Internal Server Error"));
  }
}

const getWishList = async (req,res) => {
  try {
    const userId = req.user.id;
    const wishList = await WishList.findOne({userId}).populate({path:'wishes.productId',select:'productName gallery variants'});

    if(!wishList)
      return res.status(HttpStatus.NOT_FOUND).json(HttpStatus.NOT_FOUND,"Wish list not found");

    const updatedWishList = wishList.wishes.map((wish) => ({
      productId:wish.productId._id,
      productName:wish.productId.productName,
      price:wish.productId.variants[0].price,
      size:wish.productId.variants[0].size,
      stock:wish.productId.variants[0].stock,
      gallery:wish.productId.gallery[0]?`${req.protocol}://${req.get("host")}/uploads/products/${wish.productId.gallery[0]}`:null
    }))
    console.log(updatedWishList[0]);
    res.status(HttpStatus.OK).json(createResponse(HttpStatus.OK,"Successfully fetched wishlist",updatedWishList));
    
  } catch (error) {
    console.log(error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(createResponse(HttpStatus.INTERNAL_SERVER_ERROR,"Internal Server Error"));
  }
}

module.exports = {
   addWishList,
   getWishList
}