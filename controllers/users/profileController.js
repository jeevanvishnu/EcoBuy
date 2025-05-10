import User from "../../models/userSchema.js";
import nodemailer from "nodemailer";
import bcrypt from "bcrypt";
import dotEnv from "dotenv";
dotEnv.config();
import session from "express-session";
import Order from "../../models/orderSchema.js";
import Address from "../../models/addressSchema.js";
import mongoose from "mongoose";
import Wallet from "../../models/walletSchema.js";
import Razorpay from "razorpay";
import crypto from "crypto";
import doEnv from "dotenv";
doEnv.config();
import Wishlist from "../../models/wishlistSchema.js";
import Cart from "../../models/cartSchema.js";

const razorpay = new Razorpay({
  key_id: process.env.Razorpay_API,
  key_secret: process.env.Razorpay_SCRECT,
});

const getForgotPassPage = async (req, res) => {
  try {
    res.render("user/forgot");
  } catch (error) {
    console.log("Error of forgot password", error.message);
    res.redirect("/page");
  }
};

function generateOtp() {
  const digits = "1234567890";
  let otp = "";
  for (let i = 0; i < 6; i++) {
    otp += digits[Math.floor(Math.random() * 10)];
  }
  return otp;
}

const sendVeficationEmail = async (email, otp) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: process.env.Nodemailer_EMALIL,
        pass: process.env.Nodemailer_PASSWORD,
      },
    });

    const mailOption = {
      from: process.env.Nodemailer_EMALIL,
      to: email,
      subject: "Password Reset EcoBuy",
      text: `Your OTP is ${otp}`,
      html: `<b><h4>Your OTP: ${otp}</h4></br></b>`,
    };

    const info = await transporter.sendMail(mailOption);
    console.log("Email Send", info.messageId);
    return true;
  } catch (error) {
    console.error("Error sending email", error);
    return false;
  }
};

const securePassword = async (password) => {
  try {
    console.log(password);

    const passwordHash = await bcrypt.hash(password, 10);
    return passwordHash;
  } catch (error) {
    console.error("Error in password hashing:", error);
    throw error;
  }
};

const forgotEmail = async (req, res) => {
  try {
    const { email } = req.body;
    const findUser = await User.findOne({ email: email });

    if (findUser) {
      const otp = generateOtp();
      const emailSend = await sendVeficationEmail(email, otp);
      if (emailSend) {
        req.session.userOtp = otp;
        req.session.email = email;
        res.render("user/forgot-otp");
        console.log("OTP", otp);
      } else {
        res.json({
          success: false,
          message: "Failed to send Otp .Please try again",
        });
      }
    } else {
      res.render("forgot-password", {
        message: "User With This Email Does Not Exist",
      });
    }
  } catch (error) {
    res.redirect("/page");
  }
};

const verifyPassword = async (req, res) => {
  try {
    const enteredOtp = req.body.otp;
    if (enteredOtp === req.session.userOtp) {
      res.json({ success: true, redirectUrl: "/reset-password" });
    } else {
      res.json({ success: false, message: "Otp not matching" });
    }
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "An error Occured. Please try again" });
  }
};

const getResetPassPage = async (req, res) => {
  try {
    res.render("user/reset-password");
  } catch (error) {
    res.redirect("/page");
  }
};

const resendOtp = async (req, res) => {
  try {
    const otp = generateOtp();
    req.session.userOtp = otp;
    const email = req.session.email;
    console.log("Resending otp", email);
    const emailSend = await sendVeficationEmail(email, otp);
    if (emailSend) {
      console.log("Resending otp...", otp);
      res.status(200).json({ success: true, message: "Resend Otp SucessFull" });
    }
  } catch (error) {
    console.error("Error in Resend Otp", error);
    res.status(500).json({ success: false, message: "Internal Server error" });
  }
};

const postNewPassword = async (req, res) => {
  try {
    const { newPass1, newPass2 } = req.body;
    const email = req.session.email;

    if (newPass1 !== newPass2) {
      return res.json({ success: false, message: "Passwords do not match." });
    }

    const passwordHash = await securePassword(newPass1);
    await User.updateOne(
      { email: email },
      { $set: { password: passwordHash } }
    );

    res.json({ success: true, message: "Password changed successfully!" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

const userProfile = async (req, res) => {
  let cartCount = 0;
  let wishlistCount = 0;

  try {
    const userId = req.session.user;
    const userData = await User.findById(userId);
    const addressData = await Address.findOne({ userId: userId });

    if (userId) {
      const cart = await Cart.findOne({ userId: userId });

      if (cart && cart.items) {
        cartCount = cart.items.length;
        console.log(cartCount);
      }
      const wishlist = await Wishlist.find({ user: userId });
      wishlistCount = wishlist.length;
    }

    res.render("user/profile", {
      userAddress: addressData,
      user: userData,
      cartCount,
      wishlistCount,
    });
  } catch (error) {
    console.error("Error of userProfile");
    res.redirect("/page");
  }
};

const changeEmail = async (req, res) => {
  let cartCount = 0;
  let wishlistCount = 0;
  try {
    const userId = req.session.user;

    if (userId) {
      const cart = await Cart.findOne({ userId: userId });

      if (cart && cart.items) {
        cartCount = cart.items.length;
        console.log(cartCount);
      }
      const wishlist = await Wishlist.find({ user: userId });
      wishlistCount = wishlist.length;
    }

    const userData = await User.findById(userId);
    res.render("user/change-email", {
      user: userData,
      wishlistCount,
      cartCount,
    });
  } catch (error) {
    res.redirect("/page");
  }
};

const changeEmailVaild = async (req, res) => {
  let cartCount = 0;
  let wishlistCount = 0;

  try {
    const { email } = req.body;
    const userExist = await User.findOne({ email });
    const userId = req.session.user;
    const userEmail = await User.findById(userId);

    if (
      userExist &&
      userEmail &&
      userExist._id.toString() === userEmail._id.toString()
    ) {
      const otp = generateOtp();
      const emailSent = await sendVeficationEmail(email, otp);
      if (emailSent) {
        req.session.userOtp = otp;
        req.session.userData = req.body;
        req.session.email = email;

        if (userId) {
          const cart = await Cart.findOne({ userId: userId });

          if (cart && cart.items) {
            cartCount = cart.items.length;
            console.log(cartCount);
          }
          const wishlist = await Wishlist.find({ user: userId });
          wishlistCount = wishlist.length;
        }

        res.render("user/change-otp", {
          user: userEmail,
          cartCount,
          wishlistCount,
        });
        console.log("Email Send otp", otp);
      } else {
        res.json("email error");
      }
    } else {
      res.render("user/change-email", {
        message: "User with this email not exist",
        cartCount,
        wishlistCount,
      });
    }
  } catch (error) {
    res.redirect("/page");
  }
};

const verifyEmailOtp = async (req, res) => {
  let wishlistCount = 0;
  let cartCount = 0;

  try {
    const enteredOtp = req.body.otp.join("");
    const userId = req.session.user;
    const userEmail = await User.findById(userId);
    console.log(req.session.userOtp, "This is session otp");
    if (enteredOtp === req.session.userOtp.toString()) {
      req.session.userData = req.body.userData;

      if (userId) {
        const cart = await Cart.findOne({ userId: userId });

        if (cart && cart.items) {
          cartCount = cart.items.length;
          console.log(cartCount);
        }
        const wishlist = await Wishlist.find({ user: userId });
        wishlistCount = wishlist.length;
      }

      res.render("user/new-email", {
        userData: req.session.userData,
        user: userEmail,
        cartCount,
        wishlistCount,
      });
    } else {
      console.log("Hello...");
      res.render("user/change-email", {
        message: "OTP not matching",
        userData: req.session.userData,
      });
    }
  } catch (error) {
    console.log("Verify email otp ", error.message);
    res.redirect("/page");
  }
};

const updateEmail = async (req, res) => {
  try {
    const newEmail = req.body.email;
    const userId = req.session.user;
    await User.findByIdAndUpdate(userId, { email: newEmail });
    res.redirect("/userProfile");
  } catch (error) {
    console.log("Error is update email", error.message);
    res.redirect("/page");
  }
};

const changePassword = async (req, res) => {

    let cartCount = 0
    let wishlistCount = 0
  try {
    const userId = req.session.user;
    const userEmail = await User.findById(userId);

    if (userId) {
        const cart = await Cart.findOne({ userId: userId });
        
        if (cart && cart.items) {
          cartCount = cart.items.length;
          console.log(cartCount)
        }
        const wishlist = await Wishlist.find({ user: userId });
        wishlistCount = wishlist.length;
      }
  

    res.render("user/change-password", { user: userEmail , cartCount, wishlistCount });
  } catch (error) {
    res.redirect("/page");
  }
};

const changePasswordValid = async (req, res) => {
  try {
    const { email } = req.body;

    const userExist = await User.findOne({ email });
    const userId = req.session.user;
    const userEmail = await User.findById(userId);
    if (userExist) {
      const otp = generateOtp();
      const emailSend = await sendVeficationEmail(email, otp);
      if (emailSend) {
        req.session.userOtp = otp;
        req.session.userData = req.body;
        req.session.email = email;
        res.render("user/forgot-otp", { user: userEmail });
        console.log("OTP", otp);
      } else {
        res.json({
          success: false,
          message: "Failed to otp send",
        });
      }
    } else {
      res.render("user/change-password", {
        message: "User with this email doesnot exist",
      });
    }
  } catch (error) {
    console.log("Error in change password validation", error.message);
    res.redirect("/page");
  }
};

const verifyChangePasswordOtp = async (req, res) => {
  try {
    const enteredOtp = req.body.otp.join("");
    console.log(enteredOtp.toString() === req.session.userOtp.toString());
    console.log(enteredOtp, "Entered otp ..");
    if (enteredOtp.toString() === req.session.userOtp.toString()) {
      res.json({ success: true, redirectUrl: "/reset-passwordOtp" });
    } else {
      res.json({ success: false, message: "OTP Failed" });
    }
  } catch (error) {
    console.log(error.message, "Error is verifyChangePassword");
    res.redirect("/page");
  }
};

const address = async (req, res) => {
    let cartCount = 0
    let wishlistCount = 0
  try {
    const userId = req.session.user;
    const userEmail = await User.findById(userId);
    const userAddress = await Address.findOne({ userId: userId });

    if (userId) {
        const cart = await Cart.findOne({ userId: userId });
        
        if (cart && cart.items) {
          cartCount = cart.items.length;
          console.log(cartCount)
        }
        const wishlist = await Wishlist.find({ user: userId });
        wishlistCount = wishlist.length;
      }
  

    res.render("user/address", {
      user: userEmail,
      cartCount,
      wishlistCount,
      address: userAddress ? userAddress.address : null,
    });
  } catch (error) {
    res.redirect("/page");
  }
};

const addAddress = async (req, res) => {
    let cartCount = 0
    let wishlistCount = 0
  try {
    const userId = req.session.user;
    const userEmail = await User.findById(userId);

    if (userId) {
        const cart = await Cart.findOne({ userId: userId });
        
        if (cart && cart.items) {
          cartCount = cart.items.length;
          console.log(cartCount)
        }
        const wishlist = await Wishlist.find({ user: userId });
        wishlistCount = wishlist.length;
      }
  


    res.render("user/add-address", { user: userEmail , cartCount , wishlistCount});
  } catch (error) {
    console.log("Error of add address field");
    res.redirect("/page");
  }
};

const postAddAddress = async (req, res) => {
  try {
    const userId = req.session.user;
    const userData = await User.findOne({ _id: userId });

    const { name, addressType, city, state, pincode, landMark, phone } =
      req.body;

    let userAddress = await Address.findOne({ userId: userData._id });

    if (!userAddress) {
      userAddress = new Address({
        userId: userData._id,
        address: [
          {
            name,
            addressType,
            city,
            state,
            pincode,
            landMark,
            phone,
          },
        ],
      });
    } else {
      userAddress.address.push({
        name,
        addressType,
        city,
        state,
        pincode,
        landMark,
        phone,
      });
    }

    await userAddress.save();

    res.redirect("/userProfile");
  } catch (error) {
    console.error("Add Address Error", error);
    res.status(500).redirect("/page");
  }
};

const editAddress = async (req, res) => {
    let cartCount = 0
    let wishlistCount = 0
  try {
    const addressId = req.query.id;
    const user = req.session.user;
    const userData = await User.findById(user);
    const currentAddress = await Address.findOne({
      "address._id": addressId,
    });

    if (!currentAddress) {
      return res.redirect("/page");
    }

    const addressData = currentAddress.address.find((item) => {
      return item._id.toString() === addressId.toString();
    });

    if (!addressData) {
      return res.redirect("/page");
    }

    if (user) {
        const cart = await Cart.findOne({ userId: user });
        
        if (cart && cart.items) {
          cartCount = cart.items.length;
          console.log(cartCount)
        }
        const wishlist = await Wishlist.find({ user: user });
        wishlistCount = wishlist.length;
      }
  

    res.render("user/edit-address", { address: addressData, user: userData ,cartCount , wishlistCount });
  } catch (error) {
    console.error("Error of edit Address", error.message);
    res.redirect("/page");
  }
};

const postEditAddress = async (req, res) => {
  try {
    const data = req.body;
    const addressId = req.query.id;
    const user = req.session.user;
    const findAddress = await Address.findOne({ "address._id": addressId });
    console.log(findAddress);
    if (!findAddress) {
      res.redirect("/page");
    }
    await Address.updateOne(
      { "address._id": addressId },
      {
        $set: {
          "address.$": {
            _id: addressId,
            addressType: data.addressType,
            name: data.name,
            city: data.city,
            landMark: data.landMark,
            state: data.state,
            pincode: data.pincode,
            phone: data.phone,
          },
        },
      }
    ),
      res.redirect("/address");
  } catch (error) {
    console.error("Error in edit Address");
    res.redirect("/page");
  }
};

const deleteAddress = async (req, res) => {
  try {
    const addressId = req.query.id;
    const findAddress = await Address.findOne({ "address._id": addressId });
    if (!findAddress) {
      return res.status(404).send("Address not Found");
    }

    await Address.updateOne(
      {
        "address._id": addressId,
      },
      {
        $pull: {
          address: {
            _id: addressId,
          },
        },
      }
    );

    res.redirect("/address");
  } catch (error) {
    console.log("Error in delete Address", error.message);
    res.redirect("/page");
  }
};

const editProfile = async (req, res) => {
  let cartCount = 0;
  let wishlistCount = 0;
  try {
    const userId = req.session.user;
    const userData = await User.findById(userId);

    if (userId) {
      const cart = await Cart.findOne({ userId: userId });

      if (cart && cart.items) {
        cartCount = cart.items.length;
        console.log(cartCount);
      }
      const wishlist = await Wishlist.find({ user: userId });
      wishlistCount = wishlist.length;
    }

    res.render("user/edit-profile", {
      user: userData,
      cartCount,
      wishlistCount,
    });
  } catch (error) {
    console.log("error of edit profile", error.message);
    res.redirect("/page");
  }
};

const postEditProfile = async (req, res) => {
  try {
    const { mobile, name } = req.body;
    const id = req.query.id;
    console.log("req.body:", req.body);
    console.log("User ID from query:", id);

    if (!id) {
      return res.status(400).send("User ID is missing.");
    }

    const updateFields = {};
    if (name) updateFields.name = name;
    if (mobile) updateFields.mobile = mobile;

    const updatedUser = await User.findByIdAndUpdate(id, updateFields, {
      new: true,
      runValidators: true,
    });

    if (!updatedUser) {
      return res.status(404).send("User not found.");
    }

    console.log("User updated successfully:", updatedUser);
    res.redirect("userProfile");
  } catch (error) {
    console.error("Error updating profile:", error);
    res.redirect("/page");
  }
};

const loadWallet = async (req, res) => {

    let cartCount  = 0 
    let wishlistCount = 0
  try {
    const userId = req.session.user;
    if (!userId) {
      return res.redirect("/login");
    }

    if (userId) {
        const cart = await Cart.findOne({ userId: userId });
        
        if (cart && cart.items) {
          cartCount = cart.items.length;
          console.log(cartCount)
        }
        const wishlist = await Wishlist.find({ user: userId });
        wishlistCount = wishlist.length;
      }
  

    const user = await User.findById(userId);

    let wallet = await Wallet.findOne({ userId });

    const walletBalance = wallet ? wallet.balance : 0;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;

    const transactions = wallet
      ? wallet.transactions
          .slice()
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(skip, skip + limit)
      : [];

    const totalTransactions = wallet ? wallet.transactions.length : 0;
    const totalPages = Math.ceil(totalTransactions / limit);

    res.render("user/wallet", {
      user,
      walletBalance,
      transactions,
      currentPage: page,
      totalPages,
      message: null,
      cartCount,
      wishlistCount
    });
  } catch (error) {
    console.error("Error while rendering wallet:", error);
    res.status(500).send("Internal server error");
  }
};

const createWallet = async (req, res) => {
  try {
    const userId = req.session.user;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    let wallet = await Wallet.findOne({ userId });
    if (wallet) {
      return res.status(400).json({
        success: false,
        message: "Wallet already exists",
      });
    }

    wallet = new Wallet({
      userId,
      balance: 0,
      transactions: [],
    });

    await wallet.save();

    res.status(200).json({
      success: true,
      message: "Wallet created successfully",
    });
  } catch (error) {
    console.error("Error creating wallet:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const addMoney = async (req, res) => {
  try {
    const userId = req.session.user;
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }
    if (amount > 10000) {
      return res.status(400).json({ message: "₹10,000 is the one-time limit" });
    }

    let wallet = await Wallet.findOne({ userId });

    if (!wallet) {
      return res.status(400).json({ message: "Wallet not found" });
    }

    const options = {
      amount: amount * 100,
      currency: "INR",
      receipt: `wallet_${Date.now()}`,
      payment_capture: 1,
    };

    const order = await razorpay.orders.create(options);
    res.json({ success: true, order });
  } catch (error) {
    console.error("Error while adding money:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const VerifyPayment = async (req, res) => {
  try {
    const {
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      amount,
    } = req.body;
    console.log(req.body);
    const userId = req.session.user;

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      console.log("Missing payment details");
      return res.status(400).json({ message: "Missing payment details" });
    }

    const generated_signature = crypto
      .createHmac("sha256", process.env.Razorpay_SCRECT)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    console.log("Generated Signature:", generated_signature);
    console.log("Received Signature:", razorpay_signature);

    if (generated_signature !== razorpay_signature) {
      console.log("Signature mismatch - verification failed");
      return res
        .status(400)
        .json({ message: "Payment verification failed! Signature mismatch." });
    }

    let wallet = await Wallet.findOne({ userId });
    if (!wallet) {
      console.log("Wallet not found for user:", userId);
      return res.status(400).json({ message: "Wallet not found" });
    }

    // Add the transaction to the wallet
    wallet.transactions.push({
      amount: parseFloat(amount),
      transactionsMethod: "Money Added via Razorpay",
      date: new Date(),
      razorpayOrderId: razorpay_order_id,
      status: "completed",
    });

    // Update the balance
    wallet.balance += parseFloat(amount);

    // Save the updated wallet
    await wallet.save();

    console.log(`Money added successfully! New balance: ₹${wallet.balance}`);
    return res.json({
      message: "Money added successfully!",
      newBalance: wallet.balance,
    });
  } catch (error) {
    console.error("Error verifying payment:", error);
    res
      .status(500)
      .json({ message: "Payment verification failed due to server error." });
  }
};

export default {
  getForgotPassPage,
  forgotEmail,
  verifyPassword,
  getResetPassPage,
  resendOtp,
  postNewPassword,
  userProfile,
  changeEmail,
  changeEmailVaild,
  verifyEmailOtp,
  updateEmail,
  changePassword,
  changePasswordValid,
  verifyChangePasswordOtp,
  address,
  addAddress,
  postAddAddress,
  editAddress,
  postEditAddress,
  deleteAddress,
  editProfile,
  postEditProfile,
  loadWallet,
  createWallet,
  addMoney,
  VerifyPayment,
};
