import Product from "../../models/productSchema.js";
import User from "../../models/userSchema.js";



const productDetails = async (req, res) => {


    try {
        console.log('hello')

        const userId = req.session.User
        const userData = await User.findById(userId)
        const productId = req.query.id
        const product = await Product.findById(productId).populate('category')
        const findCategory = product.category
        const categorOffer = findCategory ?.categorOffer || 0
        const productOffer = product.productOffer || 0
        const totalOffer = categorOffer + productOffer

        res.render('user/product-detail',{
            user:userData,
            product:product,
            quantity:product.quantity,
            totalOffer:totalOffer,
            category:findCategory,
           
        })
        
    } catch (error) {

        console.log(error.message,"Error for featching product details")
        res.redirect('/page')
        
    }
}

export default {
    productDetails
}