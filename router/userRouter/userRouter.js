import express from "express"
const router = express.Router()
import userController from "../../controllers/users/userController.js"

router.get('/',userController.loadHome)
router.get('/signup',userController.loadSignUp)
router.get('/page',userController.pageNoteFound)
router.post('/signup',userController.Signup)
router.post('/verify-otp',userController.verifyOtp)
router.post('/resend-otp',userController.resendOtp)
export default router