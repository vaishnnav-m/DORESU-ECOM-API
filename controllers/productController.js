const Product = require("../models/productsSchema");
const Category = require('../models/catagorySchema');
const {HttpStatus,createResponse} = require("../utils/generateResponse");

// controller to handle products adding
const addProduct = async (req, res) => {
  const {productName,description,category,variants,} = req.body;

   if (!req.user.isAdmin)
     return res.status(HttpStatus.UNAUTHORIZED).json(HttpStatus.FORBIDDEN,"You don't have permission");
   try {
    const updatedVariants = variants.map(variant => ({
      ...variant,
      stock: variant.stock < 0 ? 0 : variant.stock
    }));
     const imageUrls = req.files.map((file) => file.filename);
     const productData = new Product({
       productName,
       description,
       category,
       variants:updatedVariants,
       gallery: imageUrls,
     });
 
     await productData.save();
     res.status(HttpStatus.OK).json(createResponse(HttpStatus.OK,"Product added Successfully"));
 
   } catch (error) {
     console.log(error);
     res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(createResponse(HttpStatus.INTERNAL_SERVER_ERROR,"Internal Server Error"));
   }
 };

 // controller to get products
 const getProducts = async (req,res) => {
  try {
    // pagination logic
    const { offset = 0, limit = 10, category = 'All', priceRange = 'All', sortOption = '', query = ""} = req.query;
    const maxLimit = 20;
    const effectiveOffset = Math.max(Number(offset),0);
    const effectiveLimit = Math.min(Number(limit),maxLimit); 

    const filter = req?.user?.isAdmin ? {} : { isActive: true };

    // category filter
    if (category !== "All" && !req?.user?.isAdmin) {
      const categoryData = await Category.findOne({categoryName:category}).select('_id');
      if(categoryData)
        filter.category = categoryData._id;
    }
    // price filter
    if (priceRange && priceRange !== "All" && !req?.user?.isAdmin) {
      if (priceRange.startsWith("<")) {
        // For < 100
        const maxPrice = Number(priceRange.replace("<", "").trim());
        filter['variants.0.price'] = { $lt: maxPrice };
      } else if (priceRange.startsWith(">")) {
        // For  > 1000
        const minPrice = Number(priceRange.replace(">", "").trim());
        filter['variants.0.price'] = { $gt: minPrice };
      } else {
        // For  100 to 500
        const [minPrice, maxPrice] = priceRange.split(" to ").map(Number);
        filter['variants.0.price'] = maxPrice
          ? { $gte: minPrice, $lte: maxPrice }
          : { $gte: minPrice };
      }
    }

    // sorting 
    let sortOptions = {};

    if (sortOption) {
      switch (sortOption) {
        case "aA - zZ":
          sortOptions = { productName: 1 }; 
          break;
        case "zZ - aA":
          sortOptions = { productName: -1 }; 
          break;
        case "price low to high":
          sortOptions = { "variants.0.price": 1 }; 
          break;
        case "price high to low":
          sortOptions = { "variants.0.price": -1 };
          break;
        default:
          break;
      }
    }

    // // searching
    // if(query){ 
    //   filter.productName = { $regex: query, $options: "i" };
    // }
    const products = await Product.find(filter).populate('category','categoryName -_id',).populate('offer').skip(effectiveOffset).limit(effectiveLimit).sort(sortOptions);
    if(!products || products.length === 0)
      return res.status(HttpStatus.OK).json(createResponse(HttpStatus.OK,"No products were found",[]));

    const updatedProducts = products.map((product) => {
      const imageUrls = product.gallery.map((image) => `${req.protocol}://${req.get("host")}/uploads/products/${image}`);
      return { ...product.toObject(), gallery: imageUrls };
    });

    res.status(HttpStatus.OK).json(createResponse(HttpStatus.OK,"Successfully fetched products",updatedProducts));

  } catch (error) {
    console.log(error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(createResponse(HttpStatus.INTERNAL_SERVER_ERROR,"Internal Server Error"));
  }
 }

 // controller to updateProduct status
 const updateStatus = async (req,res) => {
  if(!req.user.isAdmin)
    return res.status(HttpStatus.UNAUTHORIZED).json(createResponse(HttpStatus.UNAUTHORIZED,"You don't have permission"));
  try {
    const {productId} = req.body;
    const productData = await Product.findById(productId);

    if (!productData) 
      return res.status(HttpStatus.NOT_FOUND).json(createResponse(HttpStatus,"Product not found"));


    await Product.findByIdAndUpdate(productId, { isActive: !productData.isActive });
    res.status(HttpStatus.OK).json(createResponse(HttpStatus.OK,"Product added Successfully"));
  } catch (error) {
    console.log(error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(createResponse(HttpStatus.INTERNAL_SERVER_ERROR,"Internal Server Error"));
  }
 }

 const getProduct = async (req,res) => {
  try {
    const {productId} = req.params;
    const productData = await Product.findById(productId).populate('offer');
    if(!productData)
      return res.status(HttpStatus.NOT_FOUND).json(createResponse(HttpStatus,"Product not found"));

    const imageUrls = productData.gallery.map((image) => ({url:`${req.protocol}://${req.get("host")}/uploads/products/${image}`,file:image}));
    const updatedProduct = { ...productData.toObject(), gallery: imageUrls }

    res.status(HttpStatus.OK).json(createResponse(HttpStatus.OK,"Product fetched successfully",updatedProduct));
    
  } catch (error) {
    console.log(error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(createResponse(HttpStatus.INTERNAL_SERVER_ERROR,"Internal Server Error"));
  }
 }

 const editProduct = async (req,res) => {
  if(!req.user.isAdmin)
    return res.status(HttpStatus.UNAUTHORIZED).json(createResponse(HttpStatus.UNAUTHORIZED,"You don't have permission"));
  try {

    const {productId,productName,description,category,variants} = req.body;

    const productData = await Product.findById(productId);

    if(!productData)
      return res.status(HttpStatus.NOT_FOUND).json(createResponse(HttpStatus,"Product not found"));

    const updatedVariants = variants.map(variant => ({
      ...variant,
      stock: variant.stock < 0 ? 0 : variant.stock
    }));

    const imageUrls = req.files && req.files.length > 0 ?  req.files.map((file) => file.filename) : productData.gallery;

    await Product.findByIdAndUpdate(productId,{
      productName,
      description,
      category,
      variants:updatedVariants,
      gallery:imageUrls
    });

    res.status(HttpStatus.OK).json(createResponse(HttpStatus.OK,"Product updated successfully"));

    
  } catch (error) {
    console.log(error);
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(createResponse(HttpStatus.INTERNAL_SERVER_ERROR,"Internal Server Error"));
  }
 }

 module.exports = {
   addProduct,
   getProducts,
   updateStatus,
   getProduct,
   editProduct
 }