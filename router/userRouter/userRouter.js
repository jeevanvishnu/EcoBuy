import express from "express"
const router = express.Router()
import userController from "../../controllers/users/userController.js"

router.get('/',userController.loadHome)
router.get('/page',userController.pageNoteFound)
export default router