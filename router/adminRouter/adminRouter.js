import express from "express";
const router = express.Router();
import adminController from "../../controllers/admin/adminController.js";
import auth from "../../middlewares/auth.js";
import customerController from "../../controllers/admin/customerController.js";
const { userAuth, adminAuth } = auth;
import categoryController from "../../controllers/admin/categoryControll.js";
import productController from "../../controllers/admin/productControll.js";
// import upload from "../../public/upload.js";
import bannerController from "../../controllers/admin/bannerController.js"
import orderController from "../../controllers/admin/orderController.js";
import multer from "multer";
import storage from "../../helpers/upload.js";
import uploads from '../../helpers/bannerUpload.js'
const upload = multer({storage:storage})


router.get("/pageerror", adminController.pageerror);
router.get("/login", adminController.loadLogin);
router.post("/login", adminController.login);
router.get("/", adminAuth, adminController.loadDashboard);
router.get("/logout", adminController.logout);

// Cumstomer Managment
router.get("/Users", adminAuth, customerController.customerInfo);
router.get("/blockCustomer", customerController.customerBlocked);
router.get("/unblockCustomer", customerController.customerUnBlocked);

// Category Managment
router.get("/category", adminAuth, categoryController.categeoryinfo);
router.post("/addCategory", categoryController.addCategory);
router.post(
  "/addCategoryOffer",
  adminAuth,
  categoryController.addCategoryOffer
);
router.post(
  "/removeCategoryOffer",
  adminAuth,
  categoryController.removeCategoryOffer
);
router.get("/listCategory", adminAuth, categoryController.getListCategory);
router.get("/unListeCategory", adminAuth, categoryController.getUnlistCategory);
router.get("/editCategory", adminAuth, categoryController.getEditCategory);
router.post("/editCategory/:id", adminAuth, categoryController.editCategory);
router.post('/deleteCategory',adminAuth,categoryController.deleteCategory)

// Product Managment
router.get("/addProducts", adminAuth, productController.getProductAddPage);
router.post(
  "/addProducts",
  adminAuth,
  upload.array("images", 4),
  productController.addProducts
);
router.get("/products", adminAuth, productController.getAllProducts);
router.post("/addProduct", adminAuth, productController.productOffer);
router.post(
  "/removeProductOffer",
  adminAuth,
  productController.removeProductOffer
);
router.get("/blockProduct", adminAuth, productController.blockProduct);
router.get("/unblockProduct", adminAuth, productController.unblockProduct);
router.get("/editProduct", adminAuth, productController.getEditProduct);
router.post('/editProduct/:id',adminAuth,upload.array('images',4),productController.editProduct)
router.post('/deleteImage',adminAuth,productController.deleteSingleImage)
router.get('/deleteProduct',adminAuth,productController.deleteProduct)

// Banner Managment 
router.get('/banner',adminAuth,bannerController.getBannerPage)
router.get('/addBanner',adminAuth,bannerController.addgetBannerPage)
router.post('/addBanner',adminAuth,uploads.single('images'),bannerController.addBanner)
router.get('/deleteBanner',adminAuth,bannerController.deleteBanner)

// Order Managment
router.get('/orderManagment',adminAuth,orderController.loadOrderManagment)

export default router;
