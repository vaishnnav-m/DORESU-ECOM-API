const jwt = require('jsonwebtoken');

const verifyToken = (req,res,next) =>{
   const authHeader = req.headers["authorization"];
   const token = authHeader && authHeader.split(' ')[1];
   if(!token)
      return res.status(401).json({message:"No token access denied"});

   jwt.verify(token,process.env.ACCESS_TOKEN_SECRET,(err,user) => {
      if(err)
         return res.status(403).json({message:"Token is not valid"});
      req.user = user;
      next();
   })
}
module.exports = verifyToken;