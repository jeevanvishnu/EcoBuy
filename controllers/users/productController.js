import Product from "../../models/productSchema.js";
import User from "../../models/userSchema.js";
import Cart from '../../models/cartSchema.js'
import Wishlist from '../../models/wishlistSchema.js'

const productDetails = async (req, res) => {
    try {
        let cartCount = 0
        let wishlistCount = 0
        console.log('Fetching product details');

        const userId = req.session.user;
        const userData = await User.findById(userId);
        const productId = req.query.id;
        const product = await Product.findById(productId).populate('category');

        if (!product) {
            return res.status(404).send("Product not found");
        }

        const findCategory = product.category;
        const categorOffer = findCategory?.categorOffer || 0;
        const productOffer = product.productOffer || 0;
        const totalOffer = categorOffer + productOffer;

        if (userId) {
            const cart = await Cart.findOne({ userId: userId });
            
            if (cart && cart.items) {
              cartCount = cart.items.length;
              console.log(cartCount)
            }
            const wishlist = await Wishlist.find({ user: userId });
            wishlistCount = wishlist.length;
          }
           

        const recommendedProducts = await Product.find({
            category: findCategory._id,
            _id: { $ne: productId }
        }).limit(4);

        res.render('user/product-detail', {
            user: userData,
            product: product,
            quantity: product.quantity,
            totalOffer: totalOffer,
            category: findCategory,
            recommendedProducts: recommendedProducts,
            cartCount,
            wishlistCount
        });

    } catch (error) {
        console.error("Error fetching product details:", error.message);
        res.redirect('/page'); 
    }
};


export default {
    productDetails
}