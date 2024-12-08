require('dotenv').config()
const mongoose = require("mongoose");

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log("Mongodb connected succesfully");
  } catch (error) {
    console.log(error);
  }
}

module.exports = connectDB;
