// Enum that contains http status
const HttpStatus = {
   OK: 200,
   BAD_REQUEST: 400,
   UNAUTHORIZED: 401,
   FORBIDDEN: 403,
   NOT_FOUND : 404,
   CONFLICT:409,
   INTERNAL_SERVER_ERROR: 500,
 }
 
 // fuction to create response
 const createResponse = (status,message,data = null) => {
   return {
     status,
     message,
     data
   }
 }

 module.exports = {
   HttpStatus,
   createResponse
 }