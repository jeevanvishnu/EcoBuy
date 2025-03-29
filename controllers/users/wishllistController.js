import User from "../../models/userSchema.js";
import Product from "../../models/productSchema.js";
import Wishlist from "../../models/wishlistSchema.js";
import Cart from "../../models/cartSchema.js";
import Coupon from "../../models/couponSchema.js";


const loadAddToWishlist = async (req,res) =>{
    try {
        const userId = req.session.user;
        const userData = await User.findById({_id:userId})
      
        const wishlistItems = await Wishlist.find({ user: userId })
          .populate('product')
          .sort({ addedAt: -1 }); 
        
        
        const cartItems = await Cart.find({ user: userId }).select('product');
        const cartProductIds = cartItems.map(item => item.product.toString());
        
       
        const wishlist = wishlistItems.map(item => {
          return {
            ...item._doc,
            isInCart: cartProductIds.includes(item.product._id.toString())
          };
        });
        
        res.render('user/wishlist', { 
          wishlist,
          user:userData,
          pageTitle: 'My Wishlist' 
        });
      } catch (error) {
        console.error('Error fetching wishlist:', error.message);
        res.status(500).render('error', { message: 'Failed to load wishlist' });
      }
}


const postAddToWishlist = async (req,res) =>{

    try {
        const { productId } = req.body;
        const userId = req.session.user;
    
        
        const product = await Product.findById(productId);
        if (!product) {
          return res.status(404).json({ success: false, message: 'Product not found' });
        }
    
        
        const existingWishlistItem = await Wishlist.findOne({ 
          user: userId, 
          product: productId 
        });
    
        if (existingWishlistItem) {
          return res.status(200).json({ success: false, message: 'Product already in wishlist' });
        }
    
       
        const wishlistItem = new Wishlist({
          user: userId,
          product: productId,
          addedAt: new Date()
        });
    
        await wishlistItem.save();
    
        return res.status(200).json({ success: true, message: 'Product added to wishlist successfully' });
      } catch (error) {
        console.error('Error adding to wishlist:', error);
        return res.status(500).json({ success: false, message: 'Server error' });
      }
}



    const addToCartFromWishlist = async (req, res) => {
        try {
            const { productId } = req.body;
            const userId = req.session.user;
            
            if (!userId) {
                return res.status(401).json({ success: false, message: "Please login to add items to cart" });
            }
            
            // Check if product exists
            const product = await Product.findById(productId);
            if (!product) {
                return res.status(404).json({ success: false, message: "Product not found" });
            }
            
            // Check if product is already in cart
            let cart = await Cart.findOne({ userId });
            
            if (!cart) {
                cart = new Cart({ userId, items: [] });
            }
            
            if (!cart.items) {
                cart.items = [];
            }
            
            const existingItem = cart.items.find(item => 
                item.productId.toString() === productId.toString()
            );
            
            if (existingItem) {
                return res.status(400).json({ 
                    success: false, 
                    message: "This product is already in your cart" 
                });
            }
            
            // Check product stock
            if (product.quantity < 1) {
                return res.status(400).json({ 
                    success: false, 
                    message: "Sorry, this product is out of stock" 
                });
            }
            
            const maxQuantityPerProduct = 5;
            if (1 > maxQuantityPerProduct) {
                return res.status(400).json({ 
                    success: false, 
                    message: `You can only add a maximum of ${maxQuantityPerProduct} of this product to your cart at a time.` 
                });
            }
            
            // Add to cart logic
            const productPrice = product.salePrice || product.regularPrice || 0;
            
            cart.items.push({
                productId,
                quantity: 1,  
                totalPrice: productPrice
            });
            
            // Calculate cart totals
            cart.totalPrice = cart.items.reduce((sum, item) => sum + item.totalPrice, 0);
            
            // Check for active coupon
            const activeCoupon = await Coupon.findOne({
                _id: cart.appliedCoupon,
                expiryDate: { $gt: new Date() },
                isActive: true
            });
            
            if (activeCoupon) {
                if (activeCoupon.discount === 'Number') {
                    cart.discountAmount = (cart.totalPrice * activeCoupon.discountValue) / 100;
                } else if (activeCoupon.discount === 'fixed') {
                    cart.discountAmount = activeCoupon.discountValue;
                }
                
                cart.discountAmount = Math.min(cart.discountAmount, cart.totalPrice);
                cart.discountedTotal = cart.totalPrice - cart.discountAmount;
            } else {
                cart.appliedCoupon = null;
                cart.discountAmount = 0;
                cart.discountedTotal = cart.totalPrice;
            }
            
            await cart.save();
            
            // Return success response
            return res.status(200).json({ 
                success: true, 
                message: "Product added to cart successfully",
                cart: {
                    totalPrice: cart.totalPrice,
                    discountAmount: cart.discountAmount,
                    discountedTotal: cart.discountedTotal,
                    itemCount: cart.items.length,
                    totalItems: cart.items.reduce((sum, item) => sum + item.quantity, 0)
                }
            });
        } catch (error) {
            console.error("Error adding to cart from wishlist:", error);
            return res.status(500).json({ success: false, message: "Server error" });
        }
    };

    

    const removeWishlist = async (req,res) =>{
        try {
            const { productId } = req.body;
            const userId = req.session.user;
        
            await Wishlist.findOneAndDelete({ 
              user: userId, 
              product: productId 
            });
        
            return res.status(200).json({ success: true, message: 'Product removed from wishlist' });
          } catch (error) {
            console.error('Error removing from wishlist:', error.message);
            return res.status(500).json({ success: false, message: 'Server error' });
          }
    }



    export default {
        loadAddToWishlist,
        postAddToWishlist,
        removeWishlist,
     addToCartFromWishlist
        
    }