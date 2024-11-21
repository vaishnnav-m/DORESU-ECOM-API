const Category = require("../models/catagorySchema");

const addCategory = async (req, res) => {
   if (!req.user.isAdmin)
     return res.status(403).json({ message: "You have no permission" });
   try {
     const categoryName = await Category.findOne({
       categoryName: req.body.categoryName,
     });
 
     if (categoryName)
       return res.status(409).json({ message: "Category already exists" });
 
     const category = new Category({
       categoryName: req.body.categoryName,
       description: req.body.description,
     });
 
     const categoryData = await category.save();
     if (!categoryData)
       res.status(400).json({ message: "Category adding failed!" });
 
     res.json({ message: "category added successfully" });
   } catch (error) {
     console.log(error);
     res.status(500).json({ message: "Internal server error" });
   }
 };
 
 const getCategories = async (req, res) => { 
   try {
    const filter = req?.user?.isAdmin ? {} : { isActive: true };

     const categories = await Category.find(filter);
 
     if (!categories) return res.status(404).json({ message: "No Categories" });
 
     res.json(categories);
   } catch (error) {
     console.log(error);
     res.status(500).json({ message: "Internal server error" });
   }
 };
 
 const updateCategoryStatus = async (req, res) => {
   if (!req.user.isAdmin)
     return res.status(403).json({ message: "You have no permission" });
 
   try {
     const categoryId = req.body.categoryId;
     const categoryData = await Category.findById(categoryId);
 
     if (!categoryData) {
       return res.status(404).json({ message: "Category not found" });
     }
 
     await Category.findByIdAndUpdate(categoryId, {
       isActive: !categoryData.isActive,
     });
     res.json({ message: "Category updated successfully" });
   } catch (error) {
     console.log(error);
     res.status(500).json({ message: "Internal server error" });
   }
 };
 
 const updateCategory = async (req, res) => {
   if (!req.user.isAdmin)
     return res.status(403).json({ message: "You have no permission" });
   try {
     const { _id: categoryId, categoryName, description } = req.body;
     const categoryData = await Category.findById(categoryId);
 
     if (!categoryData) {
       return res.status(404).json({ message: "Category not found" });
     }
 
     if (categoryName !== categoryData.categoryName) {
       const exists = await Category.findOne({ categoryName });
       if (exists)
         return res.status(409).json({ message: "Category already exists" });
     }
 
     await Category.findByIdAndUpdate(categoryId,{
       $set: {
         categoryName,
         description,
       },
     });
 
     res.json({ message: "Updated succesfully" });
   } catch (error) {
     console.log(error);
     res.status(500).json({ message: "Internal server error" });
   }
 };

 module.exports = {
   addCategory,
   getCategories,
   updateCategoryStatus,
   updateCategory,
 }