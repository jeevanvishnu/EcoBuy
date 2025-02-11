import express from "express"
const router = express.Router()
import userController from "../../controllers/users/userController.js"

router.get('/',userController.loadHome)
router.get('/signup',userController.loadSignUp)
router.post('/signup',userController.Signup)
export default router