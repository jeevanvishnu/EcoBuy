import express from "express"
const router = express.Router()
import userController from "../../controllers/users/userController.js"
import passport from "../../config/passport.js"

router.get('/',userController.loadHome)
router.get('/signup',userController.loadSignUp)
router.get('/page',userController.pageNoteFound)
router.post('/signup',userController.Signup)
router.post('/verify-otp',userController.verifyOtp)
router.post('/resend-otp',userController.resendOtp)
router.get('/auth/google',passport.authenticate('google',{scope:['profile','email']}))
router.get('/auth/google/callback',passport.authenticate('google',{failureRedirect:'/signup'}),(req,res)=>{

    res.redirect('/')
})

export default router