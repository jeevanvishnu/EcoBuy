import express from "express"
const router =express.Router()
import adminController from "../../controllers/admin/adminController.js"
import auth from '../../middlewares/auth.js'
import customerController from '../../controllers/admin/customerController.js'
const {userAuth , adminAuth} = auth
import categoryController from "../../controllers/admin/categoryControll.js"

router.get('/pageerror',adminController.pageerror)
router.get('/login',adminController.loadLogin)
router.post('/login',adminController.login)
router.get('/',adminAuth,adminController.loadDashboard)
router.get('/logout',adminController.logout)

// Cumstomer Managment 
router.get('/Users',adminAuth,customerController.customerInfo)
router.get('/blockCustomer',customerController.customerBlocked)
router.get('/unblockCustomer',customerController.customerUnBlocked)

// Category Managment
router.get('/category',adminAuth,categoryController.categeoryinfo)
router.post('/addCategory',categoryController.addCategory)
router.post('/addCategoryOffer',adminAuth,categoryController.addCategoryOffer)
router.post ('/removeCategoryOffer',adminAuth,categoryController.removeCategoryOffer)
router.get('/listCategory',adminAuth,categoryController.getListCategory)
router.get('/unListeCategory',adminAuth,categoryController.getUnlistCategory)
router.get('/editCategory',adminAuth,categoryController.getEditCategory)
router.post('/editCategory/:id',adminAuth,categoryController.editCategory)







export default router