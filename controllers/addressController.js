const Address = require('../models/addressSchema');
const {HttpStatus,createResponse} = require("../utils/generateResponse");

const addAddress = async (req,res) => {
   try {
      const {name,mobile,pincode,houseName,landmark,city,district,street,state} = req.body;
      const addresses = await Address.find({userId:req.user.id,isDeleted:false})
      let isDefault = false;
      if(!addresses?.length){
         isDefault = true;
      }
      const addressData = new Address({
         userId:req.user.id,
         name,
         mobile,
         pincode,
         houseName,
         landmark,
         city,
         district,
         street,
         state,
         isDefault
      });
      await addressData.save();

      res.status(HttpStatus.OK).json(createResponse(HttpStatus.OK,"Address added successfully"))
   } catch (error) {
     console.log(error);
     res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(createResponse(HttpStatus.INTERNAL_SERVER_ERROR,"Internal Server Error"));
   }
}

const getAddress = async (req,res) => {
   try {
      const addresses = await Address.find({userId:req.user.id,isDeleted:false})
      if(!addresses)
         return res.status(HttpStatus.NOT_FOUND).json(createResponse(HttpStatus.NOT_FOUND,"No addresses found"));

      res.status(HttpStatus.OK).json(createResponse(HttpStatus.OK,"Addresses found",addresses));
      
   } catch (error) {
      console.log(error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(createResponse(HttpStatus.INTERNAL_SERVER_ERROR,"Internal Server Error"));
   }
}

const updateIsDefault = async (req,res) => {
   try {
      const {addressId} = req.body;
      await Address.updateMany({ userId:req.user.id, isDefault: true }, { isDefault: false });

      const address = await Address.findByIdAndUpdate(
         addressId,
         { $set: { isDefault: true } },
         { new: true }
      );

      if (!address) {
         return res.status(HttpStatus.NOT_FOUND).json(createResponse(HttpStatus.NOT_FOUND, "No addresses found"));
      }

      res.status(HttpStatus.OK).json(createResponse(HttpStatus.OK,"Address updated successfully"));
      
   } catch (error) {
      console.log(error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(createResponse(HttpStatus.INTERNAL_SERVER_ERROR,"Internal Server Error"));
   }
}

const getOneAddress = async (req,res) => {
   try {
      const { addressId } = req.params;
      
      const address = await Address.findById( addressId );
      if (!address) {
         return res.status(HttpStatus.NOT_FOUND).json(createResponse(HttpStatus.NOT_FOUND, "No addresses found"));
      }

      res.status(HttpStatus.OK).json(createResponse(HttpStatus.OK,"Address fetched successfully",address));
   } catch (error) {
      console.log(error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(createResponse(HttpStatus.INTERNAL_SERVER_ERROR,"Internal Server Error"));
   }
}

const updateAddress = async (req,res) => {
   try {
      const {
         _id:addressId,
         name,
         mobile,
         pincode,
         houseName,
         landmark,
         city,
         district,
         street,
         state,
      } = req.body;

      const addressData = await Address.findByIdAndUpdate(
         addressId,
         {name,mobile,pincode,houseName,landmark,city,district,street,state},
         {new:true}
      );

      if (!addressData) {
         return res.status(HttpStatus.NOT_FOUND).json(createResponse(HttpStatus.NOT_FOUND, "No addresses found"));
      }

      res.status(HttpStatus.OK).json(createResponse(HttpStatus.OK,"Address updated successfully"));

   } catch (error) {
     console.log(error);
     res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(createResponse(HttpStatus.INTERNAL_SERVER_ERROR,"Internal Server Error"));
   }
}

const deleteAddress = async (req,res) => {
   try {

      const {addressId} = req.body;

      const addressData = await Address.findById(addressId);
      if(!addressData)
         return res.status(HttpStatus.NOT_FOUND).json(createResponse(HttpStatus.NOT_FOUND, "Address not found"));

      await Address.findByIdAndUpdate(addressId,{isDeleted:true});

      res.status(HttpStatus.OK).json(createResponse(HttpStatus.OK,"Address Deleted successfully"));
      
   } catch (error) {
      console.log(error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(createResponse(HttpStatus.INTERNAL_SERVER_ERROR,"Internal Server Error"));
   }
}

module.exports = {
   addAddress,
   getAddress,
   updateIsDefault,
   updateAddress,
   getOneAddress,
   deleteAddress
}