import express from "express"
const router = express.Router()
import userController from "../../controllers/users/userController.js"
import passport from "../../config/passport.js"
import userMiddleWare  from  "../../middlewares/user/userMiddle.js"
import productController from "../../controllers/users/productController.js";
import profileController from "../../controllers/users/profileController.js"
import userAuth from '../../middlewares/auth.js'
import cartController from "../../controllers/users/cartController.js"
import checkoutController from "../../controllers/users/checkoutController.js"

router.get('/',userMiddleWare.checkBlockedUser,userController.loadHome)
router.get('/signup',userMiddleWare.loginMiddle,userController.loadSignUp)
router.get('/page',userController.pageNoteFound)
router.post('/signup',userController.Signup)
router.post('/verify-otp',userController.verifyOtp)
router.post('/resend-otp',userController.resendOtp)
router.get('/auth/google',passport.authenticate('google',{scope:['profile','email']}))
router.get('/auth/google/callback',passport.authenticate('google',{failureRedirect:'/signup'}),(req,res)=>{
    req.session.user = req.user._id;
    res.redirect('/')
})
router.get('/login',userMiddleWare.loginMiddle,userController.Loadlogin)
router.post('/login',userController.login)
router.get('/logout',userController.logout)

// profile managment
router.get ('/forgot-password',profileController.getForgotPassPage)
router.post('/forgot-email',profileController.forgotEmail)
router.post('/verify-password',profileController.verifyPassword)
router.get('/reset-password',profileController.getResetPassPage)
router.post('/resend-otp',profileController.resendOtp)
router.post('/reset-passwordOtp',profileController.postNewPassword)
router.get('/userProfile',profileController.userProfile)
router.get('/editProfile',profileController.editProfile)
router.post('/editProfile',profileController.postEditProfile)


// shoping Router
router.get('/shop',userController.shopController)
router.get('/filter',userController.filterProduct)
router.get('/filterPrice',userController.filterByPrice)
router.get('/search',userController.searchProducts)


// product Managment
router.get('/productDatails', productController.productDetails);
router.get('/change-email',userAuth.userAuth,profileController.changeEmail)
router.post('/change-email',userAuth.userAuth,profileController.changeEmailVaild)
router.post('/verify-email-otp',userAuth.userAuth,profileController.verifyEmailOtp)
router.post('/update-email',userAuth.userAuth,profileController.updateEmail)
router.get('/change-password',userAuth.userAuth,profileController.changePassword)
router.post('/change-password',userAuth.userAuth,profileController.changePasswordValid)
router.post('/verify-changePassword',userAuth.userAuth,profileController.verifyChangePasswordOtp)

// Address Managment
router.get('/address',userAuth.userAuth,profileController.address)
router.get('/addAddress',userAuth.userAuth,profileController.addAddress)
router.post('/addAddress',userAuth.userAuth,profileController.postAddAddress)
router.get('/editAddress',userAuth.userAuth,profileController.editAddress)
router.post('/editAddress',userAuth.userAuth,profileController.postEditAddress)
router.get('/deleteAddress',userAuth.userAuth,profileController.deleteAddress)


// Cart Managment
router.get('/cart',userAuth.userAuth,cartController.getCartPage)
router.post('/addToCart',userAuth.userAuth,cartController.addToCart)
router.post('/changeQuantity',userAuth.userAuth,cartController.changeQuantity)
router.get('/deleteItem',userAuth.userAuth,cartController.deleteProduct)

// checkout Managment
router.get('/checkout',userAuth.userAuth,checkoutController.getCheckout)
router.get('/addCheckoutAddress',userAuth.userAuth,checkoutController.addCheckoutAddress)
router.post('/checkoutAddAddress',userAuth.userAuth,checkoutController.checkoutAddAddress)
router.get('/editAddressCheckout',userAuth.userAuth,checkoutController.getCheckoutEdit)
router.post('/editAddressCheckout',userAuth.userAuth,checkoutController.editCheckoutAddress)
router.get('/checkoutDelete',userAuth.userAuth,checkoutController.checkoutDeleteAddress)
router.get('/getCartTotal',userAuth.userAuth,checkoutController.getCartTotal)
router.post('/placeOrder',userAuth.userAuth,checkoutController.placeOrder)
router.get('/orders',userAuth.userAuth,checkoutController.orderSucess)
export default router