const nodeMailer = require("nodemailer");

const transporter = nodeMailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASS,
  },
});

const sendVerificationMail = async (user, otp) => {
  const mailOptions = {
    from: "doresuecom@gmail.com",
    to: user.email,
    subject: "Verify your email - OTP",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5; padding: 20px; background-color: #f9f9f9;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #fff; padding: 20px; border-radius: 10px; box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);">
          <h2 style="color: #333; text-align: center;">Verify Your Email</h2>
          <p>Dear ${user.firstName + " " + user.lastName},</p>
          <p>Thank you for registering with DORESU. To complete your registration, please use the OTP below to verify your email address:</p>
          <div style="text-align: center; padding: 10px 0;">
            <span style="display: inline-block; padding: 10px 20px; font-size: 35px; letter-spacing:30px; border-radius: 5px;">
              ${otp}
            </span>
          </div>
          <p>This OTP is valid for <strong>1 minutes</strong>. If it expires, please request a new OTP.</p>
          <p>Best regards,<br><strong>DORESU Team</strong></p>
          <hr style="border-top: 1px solid #eee; margin-top: 20px;" />
          <small style="color: #999;">If you didn't request this, please ignore this email.</small>
        </div>
      </div>
   `,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.log("Error sending verification email:", error);
    throw new Error("Failed to send verification email");
  }
};

module.exports = sendVerificationMail;
