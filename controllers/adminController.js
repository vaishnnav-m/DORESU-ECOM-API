const User = require("../models/userSchema");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");


const adminLogin = async (req, res) => {
  const adminData = await User.findOne({ email: req.body.email });
  if (!adminData)
    return res.status(401).json({ message: "Invalid credentials" });

  const isPasswordMatch = await bcrypt.compare(
    req.body.password,
    adminData.password
  );

  if (!isPasswordMatch)
    return res.status(401).json({ message: "Invalid credentials" });
  if (!adminData.isAdmin)
    return res.status(403).json({ message: "Your are not admin" });

  if (!adminData.isActive)
    return res
      .status(403)
      .json({ message: "Sorry you are blocked from the site" });

  // genearating accessToken
  const accessToken = jwt.sign(
    { id: adminData._id, isAdmin: true },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: "5m" }
  );

  // generating refresh token
  const refreshToken = jwt.sign(
    { id: adminData._id, isAdmin: true },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: "7d" }
  );

  // sending refresh token
  res.cookie("adminJwt", refreshToken, {
    httpOnly: true,
    secure: false,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  // sending acess token
  res.json({ message: "Login succesful", accessToken });
};

// controller for refresh accesstoken
const refreshToken = (req, res) => {
  const cookies = req.cookies;
  if (!cookies?.adminJwt)
    return res.status(401).json({ message: "Unautherized" });

  const refreshToken = cookies.adminJwt;

  jwt.verify(
    refreshToken,
    process.env.REFRESH_TOKEN_SECRET,
    async (err, user) => {
      try {
        if (err) return res.status(403).json({ message: "Forbidden" });
        if (!user.isAdmin)
          return res.status(403).json({ message: "you are not an admin" });

        const userData = await User.findById(user.id);
        if (!userData)
          return res.status(404).json({ message: "user not found" });

        const accessToken = jwt.sign(
          { id: userData._id, isAdmin: true },
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

const getUsers = async (req, res) => {
  if (!req.user.isAdmin)
    return res.status(403).json({ message: "You have no permission" });

  const users = await User.find({ isAdmin: false }).select("-password");

  if (!users) return res.status(404).json({ message: "No Customers" });

  res.json(users);
};

const updateUserStatus = async (req, res) => {
  if (!req.user.isAdmin)
    return res.status(403).json({ message: "You have no permission" });
  try {
    const userId = req.body.userId;
    const userData = await User.findById(userId);

    if (!userData) {
      return res.status(404).json({ message: "User not found" });
    }

    await User.findByIdAndUpdate(userId, { isActive: !userData.isActive });
    res.json({ message: "User details updated successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
};


module.exports = {
  adminLogin,
  refreshToken,
  getUsers,
  updateUserStatus,
};
