const {HttpStatus,createResponse} = require("../utils/generateResponse");
const Wallet = require('../models/walletSchema');

const getUserWallet = async (req,res) => {
   try {
      const userId = req.user.id;

      const walletData = await Wallet.findOne({userId});

      if(!walletData)
         return res.status(HttpStatus.NOT_FOUND).json(createResponse(HttpStatus.NOT_FOUND,"Counld'nt find the wallet"));

      res.status(HttpStatus.OK).json(createResponse(HttpStatus.OK,"successfully fetched the walle data",walletData));
      
   } catch (error) {
      console.log(error);
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(createResponse(HttpStatus.INTERNAL_SERVER_ERROR,"Internal Server Error"));
   }
}

module.exports = {
   getUserWallet
}