import express from "express"
const router =express.Router()
import adminController from "../../controllers/admin/adminController.js"
import auth from '../../middlewares/auth.js'
const {userAuth , adminAuth} = auth

router.get('/pageerror',adminController.pageerror)
router.get('/login',adminController.loadLogin)
router.post('/login',adminController.login)
router.get('/',adminAuth,adminController.loadDashboard)
router.get('/logout',adminController.logout)









export default router