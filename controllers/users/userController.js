import User from "../../models/userSchema.js";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();
import bcrypt from "bcrypt";
import Category from "../../models/categorySchema.js";
import Product from "../../models/productSchema.js";
import Banner from "../../models/bannerSchema.js";
// Setup Signup page
const loadSignUp = (req, res) => {
  try {
    res.render("user/signup");
  } catch (err) {
    console.log(`request error ${err.message}`);
    res.status(500).send("Sever Error");
  }
};

// page not found
const pageNoteFound = (req, res) => {
  try {
    res.render("user/page404");
  } catch (error) {
    res.redirect("/page");
  }
};

const loadHome = async (req, res) => {
  try {
    const today = new Date().toISOString();
    const findBanner = await Banner.find({
      startDate:{$lt:new Date(today)},
      endDate:{$gt:new Date(today)}
    })
    const user = req.session.user;
    const categories = await Category.find({ isListed: true });
    let productData = await Product.find({
      isBlocked: false,
      category: { $in: categories.map((category) => category._id) },
      quantity: { $gt: 0 },
    });

    console.log(productData);
    productData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    productData = productData.slice(0, 12);

    if (user) {
      const userData = await User.findOne({ _id: user });

      console.log(userData);
      return res.render("user/home", { user: userData, products: productData ,banner:findBanner || []});
    } else {
      return res.render("user/home", { products: productData ,banner:findBanner || [] });
    }
  } catch (error) {
    console.log(`Home page rendering error ${error.message}`);
    res.status(500).send("Internal Server Error");
  }
};





// create a function on generate otp
const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// create a function on sendVerificationEmal

const sendVerificationEmail = async (email, otp) => {
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

    const info = await transporter.sendMail({
      from: process.env.Nodemailer_EMALIL,
      to: email,
      subject: "Verify your account",
      text: `Your Otp is: ${otp}`,
      html: `<b>Your Otp: ${otp}</b>`,
    });

    return info.accepted.length > 0;
  } catch (error) {
    console.log(`Error sending enail ${error.message}`);
    return false;
  }
};

const Signup = async (req, res) => {
  const { name, mobile, email, password, confirmPassword } = req.body;

  try {
    if (password !== confirmPassword) {
      return res.render("user/signup", { message: "Password donot match" });
    }

    const findUser = await User.findOne({ email });

    if (findUser) {
      return res.render("user/signup", {
        message: "User with this email already exists",
      });
    }

    const otp = generateOtp();

    const emailSend = await sendVerificationEmail(email, otp);

    if (!emailSend) {
      return res.json({ error: "email-error" });
    }

    req.session.userOtp = otp;
    req.session.userData = { email, password, mobile, name };

    res.render("user/verify-otp");
    console.log("otp send", otp);
  } catch (error) {
    console.log(`Signup error ${error.message}`);
    return res.render("user/signup", {
      message: "Something went wrong. Please try again.",
    });
  }
};

const securePassword = async (password) => {
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    return passwordHash;
  } catch (error) {
    console.log(error.message);
  }
};

const verifyOtp = async (req, res) => {
  try {
    const { otp } = req.body;
    if (otp === req.session.userOtp) {
      const user = req.session.userData;
      const passwordHash = await securePassword(user.password);
      const saveUserData = new User({
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        password: passwordHash,
      });

      await saveUserData.save();
      req.session.user = saveUserData._id;
      return res.json({ success: true, redirectUrl: "/" });
    } else {
      return res
        .status(400)
        .json({ sucess: false, message: "Invalid Otp please try again" });
    }
  } catch (error) {
    console.error("Error verifying otp", error.message);
    return res.status(500).json({ sucess: false, message: "An error occure" });
  }
};

const resendOtp = async (req, res) => {
  try {
    const { email } = req.session.userData;
    if (email) {
      return res
        .status(400)
        .json({ success: false, message: "Email not found in session" });
    }
    const otp = generateOtp();
    req.session.userOtp = otp;

    const emailSend = await sendVerificationEmail(email, otp);
    if (emailSend) {
      console.log("Resend otp", otp);
      return res
        .status(200)
        .json({ sucess: true, message: "Resend Sucessfull" });
    } else {
      return res.status(500).json({
        sucess: false,
        message: "Failed to resend otp Please try again",
      });
    }
  } catch (error) {
    console.error("Error resending OTP");
    return res
      .status(500)
      .json({ sucess: false, message: "Internal Server Error" });
  }
};

// setup on login page
const Loadlogin = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.render("user/login");
    } else {
      return res.redirect("/");
    }
  } catch (error) {
    return res.redirect("/page");
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const findUser = await User.findOne({ isAdmin: 0, email: email });

    if (!findUser) {
      return res.render("user/login", { message: "User not found" });
    }

    if (findUser.isBlocked) {
      return res.render("user/login", { message: "Your account has been blocked. Please contact support." });
    }

    const passwordMatch = await bcrypt.compare(password, findUser.password);

    if (!passwordMatch) {
      return res.render("user/login", { message: "incorrect password" });
    }

    req.session.user = findUser._id;
    res.redirect("/");
  } catch (error) {
    console.log("login error", error);
    res.render("user/login", { message: "Login Failed Please Try Again" });
  }
};

// setup logout

const logout = async (req, res) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        console.log("session error", err);

        return res.redirect("/page");
      }
      return res.redirect("/login");
    });
  } catch (error) {
    console.log(error.message);
    res.redirect("page");
  }
};

const loadShoppingPage = async (req, res) => {
  try {
    const user = req.session.user;
    const userData = await User.findOne({ _id: user });
    const categories = await Category.find({ isListed: true });
    const categoryId = categories.map((category) => category._id.toString());
    const page = parseInt(req.query.page) || 1;
    const limit = 9;
    const skip = (page - 1) * limit;
    const products = await Product.find({
      isBlocked: false,
      category: { $in: categoryId },
      quantity: { $gt: 0 },
    })
      .sort({ createdOn: -1 })
      .skip(skip)
      .limit(limit);

      // Extract unique brands from products
    const brandNames = [...new Set(products.map((product) => product.brand))];

    // Convert brand names to objects with a name field
    const brands = brandNames.map((brand) => ({ name: brand }));

    const totalProducts = await Product.countDocuments({
      isBlocked: false,
      category: { $in: categoryId },
      quantity: { $gte: 0 },
    });
    const totalPages = Math.ceil(totalProducts / limit);
    const categoriesWidths = categories.map((category) => ({
      _id: category._id,
      name: category.name,
    }));

    res.render("user/shop", {
      user: userData,
      products: products,
      brand:brands,
      category: categoriesWidths,
      totalProducts: totalProducts,
      currentPage: page,
      totalPages: totalPages,
    });
  } catch (error) {
    console.log(error.message, "load shop page error");
    res.redirect("/page");
  }
};

const filterProduct = async (req, res) => {
  try {
    const user = req.session.user;
    console.log(user);
    const category = req.query.category;
    const findCategory = category
      ? await Category.findOne({ _id: category })
      : null;

    const query = {
      isBlocked: false,
      quantity: { $gt: 0 },
    };

    if (findCategory) {
      query.category = findCategory._id;
    }

    let findProducts = await Product.find(query).lean();
    findProducts.sort((a, b) => new Date(b.createdOn) - new Date(a.createdOn));

    const categories = await Category.find({ isListed: true });
    let itemPerPage = 10;

    let currentPage = parseInt(req.query.page) || 1;
    let startIndex = (currentPage - 1) * itemPerPage;
    let endIndex = startIndex + itemPerPage;
    let totalPages = Math.ceil(findProducts.length / itemPerPage);
    let currentProduct = findProducts.slice(startIndex, endIndex);

    let userData = null;
    if (user) {
      userData = await User.findOne({ _id: user });

      if (userData) {
        const searchEntry = {
          category: findCategory ? findCategory._id : null,
          searchedOn: new Date(),
        };

        if (!Array.isArray(userData.searchEntry)) {
          userData.searchEntry = []; // ✅ Fix: Ensure it's an array
        }

        userData.searchEntry.push(searchEntry);
        await userData.save();
      }
    }

    req.session.filterProduct = currentProduct;
    res.render("user/shop", {
      user: userData,
      products: currentProduct,
      category: categories,
      totalPages,
      currentPage,
      selectedCategory: category || null,
    });
  } catch (error) {
    console.log(error.message);
    res.redirect("/page");
  }
};


const filterByPrice = async (req, res) => {
  try {
    const user = req.session.user;
    const userData = await User.findOne({ _id: user });
    const categories = await Category.find({ isListed: true }).lean();

    let minPrice = Number(req.query.gt) || 0;
    let maxPrice = Number(req.query.lt) || 100000;

    let findProducts = await Product.find({
      salePrice: { $gt: minPrice, $lt: maxPrice },
      isBlocked: false,
      quantity: { $gt: 0 },
    }).lean();

    findProducts.sort((a, b) => new Date(b.createdOn) - new Date(a.createdOn));

    let itemsPerPage = 10;
    let currentPage = parseInt(req.query.page) || 1;
    let startIndex = (currentPage - 1) * itemsPerPage;
    let endIndex = startIndex + itemsPerPage;
    let totalPages = Math.ceil(findProducts.length / itemsPerPage);
    const currentProduct = findProducts.slice(startIndex, endIndex);
    req.session.filterProduct = findProducts;

    res.render("user/shop", {
      user: userData,
      products: currentProduct,
      category: categories,
      totalPages,
      currentPage,
    });
  } catch (error) {
    console.log(error.message);
    res.redirect("/page");
  }
};

const searchProducts = async (req, res) => {
  try {
    const user = req.session.user;
    const search = req.query.search || "";

    const userData = await User.findOne({ _id: user });
    const categories = await Category.find({ isListed: true }).lean();
    const categoryId = categories.map((category) => category._id.toString());

    let searchResult = [];

    if (req.session.filterProduct && req.session.filterProduct.length > 0) {
     
      const filteredProductIds = req.session.filterProduct.map((product) => product._id);
      
      searchResult = await Product.find({
        _id: { $in: filteredProductIds },
        productName: { $regex: `.*${search}.*`, $options: "i" },
      }).lean();
    } else {
      searchResult = await Product.find({
        productName: { $regex: `.*${search}.*`, $options: "i" },
        isBlocked: false,
        quantity: { $gt: 0 },
        category: { $in: categoryId },
      }).lean();
    }

    
    searchResult.sort((a, b) => 
      new Date(b.createdOn || "2000-01-01") - new Date(a.createdOn || "2000-01-01")
    );

    
    let itemsPerPage = 10;
    let currentPage = parseInt(req.query.page) || 1;
    let startIndex = (currentPage - 1) * itemsPerPage;
    let totalPages = Math.ceil(searchResult.length / itemsPerPage);
    let currentProduct = searchResult.slice(startIndex, startIndex + itemsPerPage);

    res.render("user/shop", {
      user: userData,
      products: currentProduct,
      category: categories,
      totalPages,
      currentPage,
      count: searchResult.length,
    });

  } catch (error) {
    console.error("Error in searchProducts:", error.message);
    res.redirect("/page");
  }
};


export default {
  loadHome,
  pageNoteFound,
  loadSignUp,
  Signup,
  verifyOtp,
  resendOtp,
  Loadlogin,
  login,
  logout,
  loadShoppingPage,
  filterProduct,
  filterByPrice,
  searchProducts,

};
