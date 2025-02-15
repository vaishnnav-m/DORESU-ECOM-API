const User = require("../models/userSchema");
const Otp = require("../models/otpModel");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const {sendVerificationMail,sendVerifyOtp} = require("../utils/mailerService");

// function to hash password
const hashPassword = async (password) => {
  try {
    return await bcrypt.hash(password, 10);
  } catch (error) {
    console.log(error);
  }
};

// otp generation
const genearateOtp = async (user) => {
  const otp = crypto.randomInt(100000, 999999).toString();
  const otpExpiresAt = Date.now() + 60 * 1000;
  id = user._id || user.userId;
  const newOtp = new Otp({
    userId: id,
    otp,
    otpExpiresAt,
  });

  await newOtp.save();
  return otp;
};

// user singup controller
const postSignup = async (req, res) => {
  try {
    const userEmail = await User.findOne({ email: req.body.email });
    if (userEmail)
      return res
        .status(409)
        .json({ message: "User already exists with this email" });

    const hashedPassword = await hashPassword(req.body.password);
    const user = new User({
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: req.body.email,
      phone: req.body.phone,
      password: hashedPassword,
      isAdmin: false,
      isVerified:false
    });

    const userData = await user.save();
    if (!userData)
      return res.status(400).json({ message: "Registration failed" });

    // otp generation
    const otp = await genearateOtp(user);

    res.json({
      message: "Successfully Registered. An OTP has been sent to your email.",
      userId: userData._id,
    });

    await sendVerificationMail(
      { email: user.email, firstName: user.firstName, lastName: user.lastName },
      otp
    );
  } catch (error) {
    console.log("Error in postSignup :", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// user otp verification conroller
const verifyOtp = async (req, res) => {
  try {
    const user = await User.findById(req.body.userId);
    if (!user) return res.status(404).json({ message: "Cannot find the user" });

    const otpRecord = await Otp.findOne({ userId: req.body.userId });

    // check the otp is valid or not
    if (!otpRecord || Date.now() >= otpRecord.otpExpiresAt || otpRecord.otp !== req.body.otp)
      return res.status(400).json({ message: "Invalid or Expired OTP" });

    user.isVerified = true;
    await user.save();

    await Otp.deleteOne({ userId: req.body.userId });

    // genearating accessToken
    const accessToken = jwt.sign(
      { id: user._id, isAdmin:false },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "5m" }
    );

    // generating refresh token
    const refreshToken = jwt.sign(
      { id: user._id, isAdmin:false },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: "7d" }
    );

    // sending refresh token
    res.cookie("jwt", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "None",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // sending acess token
    res.json({status:200, message: "Login succesful", accessToken });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "internal server error",
    });
  }
};

// user resend OTP controller
const resendOtp = async (req, res) => {
  try {
    const {userId,type = ''} = req.body;
    const user = await User.findById(userId);

    if (!user) return res.status(404).json({ message: "Cannot find the user" });

    const otpRecord = await Otp.findOne({ userId });
    if (otpRecord)
      return res.status(400).json({ message: "otp is still valid" });

    const otp = await genearateOtp(user);
    res.json({
      message: "Successfully send new OTP. Check your mail",
    });

    if(type === "forgot"){
      await sendVerifyOtp(
        { email: user.email, firstName: user.firstName, lastName: user.lastName },
        otp
      );
    }

    await sendVerificationMail(
      { email: user.email, firstName: user.firstName, lastName: user.lastName },
      otp
    );
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "internal server error",
    });
  }
};

// user login controller
const postLogin = async (req, res) => {
  try {
    const {email,password} = req.body;
    const userData = await User.findOne({ email: email });

    if (!userData)
      return res.status(401).json({ message: "User details is invalid" });

    const isPasswordMatch = await bcrypt.compare(
      password,
      userData.password
    );

    if (!isPasswordMatch)
      return res.status(401).json({ message: "User details is invalid" });

    if (!userData.isActive)
      return res
        .status(401)
        .json({ message: "Your account is blocked from the site.Please contact support" });

    // genearating accessToken
    const accessToken = jwt.sign(
      { id: userData._id, isAdmin:false },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "5m" }
    );

    // generating refresh token
    const refreshToken = jwt.sign(
      { id: userData._id, isAdmin:false},
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: "7d" }
    );

    // sending refresh token
    res.cookie("jwt", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "None",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // sending acess token
    res.json({ message: "Login succesful", accessToken });
  } catch (error) {
    console.log("error is :", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const refreshToken = (req, res) => {
  const cookies = req.cookies;
  if (!cookies?.jwt) return res.status(401).json({ message: "Unautherized" });

  const refreshToken = cookies.jwt;

  jwt.verify(
    refreshToken,
    process.env.REFRESH_TOKEN_SECRET,
    async (err, user) => {
      try {
        if (err) return res.status(403).json({ message: "Forbidden" });

        const userData = await User.findById(user.id);
        if (!userData || !userData.isActive) return res.status(401).json({ message: "Unautherized" });

        console.log("userData",userData);
        const accessToken = jwt.sign(
          { id: userData._id, isAdmin:user.isAdmin },
          process.env.ACCESS_TOKEN_SECRET,
          { expiresIn: "5m" }
        );
        res.json({ accessToken });
      } catch (error) {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );
};

const getUser = async (req, res) => {
  try {
    const userData = await User.findById(req.user.id);
    if (!userData) return res.status(404).json({ message: "user not found" });

    res.json(userData);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const updateUser = async (req, res) => {
  try {
    const {firstName,lastName,phone} = req.body;
    const userData = await User.findById(req.user.id);
    if(!userData) return res.status(404).json({message: "user not found"});
    const newUserData = {
      firstName,
      lastName,
      phone
    }
    await User.findByIdAndUpdate(req.user.id,newUserData);

    res.json({message:"updated successfully"});
    
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
}

const sendForgotOtp = async (req,res) => {
  try {
    const {email} = req.body;
    const user = await User.findOne({email});

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.isActive) {
      return res
          .status(401)
          .json({ message: "Your account is blocked from the site.Please contact support" });
    }

    // otp generation
    const otp = await genearateOtp(user);

    res.json({
      message: "An OTP has been sent to your email.",
      userId: user._id,
    });

    await sendVerifyOtp(
      { email: user.email, firstName: user.firstName, lastName: user.lastName },
      otp
    );

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
}

const verifyForgotOtp = async (req,res) => {
  try {
    const {otp,userId} = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "Cannot find the user" });

    const otpRecord = await Otp.findOne({userId});

    // check the otp is valid or not
    if (!otpRecord || Date.now() >= otpRecord.otpExpiresAt || otpRecord.otp !== otp)
      return res.status(400).json({ message: "Invalid or Expired OTP" });

    await Otp.deleteOne({ userId });

    res.status(200).json({message:"Otp verified successfully",userId});

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
}

const forgotPassword = async (req,res) => {
    try {
      const {newPassword,userId} = req.body;
  
      const hashedPassword = await hashPassword(newPassword);
  
      await User.findByIdAndUpdate(userId,{password:hashedPassword});
      res.json({message:"Successfully updated password"});
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Internal server error" });
    }
}

const resetPassword = async (req,res) => {
  try {
    const {userId,oldPassword,newPassword} = req.body;

    const userData = await User.findById(userId);
    if(!userData) return res.status(404).json({message: "user not found"});

    const isPasswordMatch = await bcrypt.compare(
      oldPassword,
      userData.password
    );

    if (!isPasswordMatch)
      return res.status(401).json({ message: "Incorrect password"});

    const hashedPassword = await hashPassword(newPassword);

    await User.findByIdAndUpdate(userId,{password:hashedPassword});
    res.json({message:"Successfully updated password"});
    
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
}

const logoutUser = async (req, res) => {
  try {
    const cookies = req.cookies;
    if (!cookies?.jwt) return res.status(204);

    res.clearCookie("jwt", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "None",
    });
    res.json({ message: "cookie is cleared" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  postSignup,
  postLogin,
  verifyOtp,
  resendOtp,
  refreshToken,
  getUser,
  logoutUser,
  updateUser,
  resetPassword,
  sendForgotOtp,
  verifyForgotOtp,
  forgotPassword
};
