const User = require("../models/userSchema");
const { OAuth2Client } = require("google-auth-library");
const client = new OAuth2Client(process.env.CLIENT_ID);
const { HttpStatus, createResponse } = require("../utils/generateResponse");
const jwt = require('jsonwebtoken')

const google_authentication = async (req, res) => {
  try {
    const { credential, client_id } = req.body;

    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: client_id,
    });

    const payload = ticket.getPayload();
    console.log(payload);
    const userId = payload["sub"]; // Google's user id
    const email = payload["email"]; // User's email from Google
    const firstName = payload["given_name"]; // User's name from Google
    const lastName = payload["family_name"]; // User's name from Google

    const user = await User.findOne({ email });

    if (!user) {
      const newUser = await User.create({
        googleId: userId,
        email,
        firstName,
        lastName,
        isVerified: true,
      });

      // genearating accessToken
      const accessToken = jwt.sign(
        { id: newUser._id },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "5m" }
      );

      // generating refresh token
      const refreshToken = jwt.sign(
        { id: newUser._id },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: "7d" }
      );

      // sending refresh token
      res.cookie("jwt", refreshToken, {
        httpOnly: true,
        secure: false,
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      // sending acess token
      res
        .status(HttpStatus.OK)
        .json(
          createResponse(
            HttpStatus.OK,
            "User successfully loged in",
            accessToken
          )
        );
    } else {
      if (user.isActive) {
        // genearating accessToken
        const accessToken = jwt.sign(
          { id:user._id },
          process.env.ACCESS_TOKEN_SECRET,
          { expiresIn: "30m" }
        );

        // generating refresh token
        const refreshToken = jwt.sign(
          { id: user._id },
          process.env.REFRESH_TOKEN_SECRET,
          { expiresIn: "7d" }
        );

        // sending refresh token
        res.cookie("jwt", refreshToken, {
          httpOnly: true,
          secure: false,
          maxAge: 7 * 24 * 60 * 60 * 1000,
        });
        res
          .status(HttpStatus.OK)
          .json(
            createResponse(
              HttpStatus.OK,
              "User successfully loged in",
              accessToken
            )
          );
      } else {
        res.status(HttpStatus.FORBIDDEN).json(createResponse(HttpStatus.FORBIDDEN,"You are blocked from the site"));
      }
    }
  } catch (error) {
   console.log(error);
   res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(createResponse(HttpStatus.INTERNAL_SERVER_ERROR,"Internal Server Error"));
  }
};

module.exports = {google_authentication};