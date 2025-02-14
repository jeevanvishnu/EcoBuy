import express from "express"
const router =express.Router()
import adminController from "../../controllers/admin/adminController.js"


router.get('/login',adminController.loadLogin)











export default router