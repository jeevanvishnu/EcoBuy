import express from "express"
const router =express.Router()
import adminController from "../../controllers/admin/adminController.js"
import {userAuth,adminAuth} from '../../middlewares/auth.js'

router.get('/login',adminController.loadLogin)
router.post('/login',adminController.login)
router.get('/',adminAuth,adminController.loadDashboard)










export default router