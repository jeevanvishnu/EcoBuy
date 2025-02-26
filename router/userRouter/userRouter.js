import express from "express"
const router = express.Router()
import userController from "../../controllers/users/userController.js"
import passport from "../../config/passport.js"
import userMiddleWare  from  "../../middlewares/user/userMiddle.js"
import productController from "../../controllers/users/productController.js";
import profileController from "../../controllers/users/profileController.js"

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
// shoping Router
router.get('/shop',userController.loadShoppingPage)
router.get('/filter',userController.filterProduct)
router.get('/filterPrice',userController.filterByPrice)
router.get('/search',userController.searchProducts)

// product Managment
router.get('/productDatails', productController.productDetails);
// router.get('/search',productController)

export default router