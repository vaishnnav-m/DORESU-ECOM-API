require("dotenv").config();
const express = require("express");
const app = express();
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path')

// enabling cors
const corsOptions = {
  origin:'http://localhost:5173',
  credentials: true,
}
app.use(cors(corsOptions))

// serve static files
app.use('/uploads/products', express.static(path.join(__dirname, 'public/uploads/products')));

const connectDB = require("./config/db");
const user_route = require("./routes/userRoute");
const admin_route = require("./routes/adminRoute");


// application middleware to parse request
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// application middleware to parse cookies
app.use(cookieParser());

// app routes
app.use("/api", user_route);
app.use('/api/admin',admin_route);

// connection part
connectDB().then(() => {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log("server started at port ", port);
  });
});