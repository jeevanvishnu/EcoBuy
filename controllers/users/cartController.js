import Product from "../../models/productSchema.js";
import User from "../../models/userSchema.js"
import Cart from "../../models/cartSchema.js"
import mongodb from 'mongodb'
import mongoose from "mongoose";

const getCartPage = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).send("Unauthorized");
        }

        const user = await User.findById(req.session.user);
        if (!user) {
            return res.status(404).send("User not found");
        }

       
        const productDetails = await Cart.findOne({ userId: user._id })
            .populate({ path: 'items.productId', select: 'productName salePrice regularPrice productImage category brand' });

        console.log("Fetched Cart:", productDetails);

        let totalAmount = 0;
        let cartData = [];

        
        if (productDetails && Array.isArray(productDetails.items)) {
            cartData = productDetails.items.map(product => {
                if (product.productId) {
                    const price = product.productId.salePrice || product.productId.regularPrice || 0;
                    totalAmount += price * product.quantity;
                    return product;
                }
            }).filter(Boolean); 
        }

        res.render('user/cart', {
            user,
            data: cartData,
            totalAmount
        });

    } catch (error) {
        console.error("Get cart error:", error.message);
        res.status(500).send('Internal Server Error');
    }
};



  




// const addToCart = async (req, res) => {
//     try {
//         const { productId } = req.body;
//         const userId = req.session.user; 

//         if (!userId) {
//             return res.status(401).json({ success: false, message: "Unauthorized" });
//         }

//         const user = await User.findById(userId);
//         if (!user) {
//             return res.status(404).json({ success: false, message: "User not found" });
//         }

//         const product = await Product.findById(productId);
//         if (!product) {
//             return res.status(404).json({ success: false, message: "Product not found" });
//         }

//         let cart = await Cart.findOne({ userId });

//         if (!cart) {
//             cart = new Cart({ userId, items: [] });
//         }

        
//         if (!cart.items) {
//             cart.items = [];
//         }

//         const existingItem = cart.items.find(item => item.productId.toString() === new mongoose.Types.ObjectId(productId).toString());

//         if (existingItem) {
//             existingItem.quantity += 1;
//             existingItem.totalPrice = existingItem.quantity * (product.salePrice || product.regularPrice || 0);
//         } else {
//             cart.items.push({
//                 productId,
//                 quantity: 1,
//                 totalPrice: product.salePrice || product.regularPrice || 0
//             });
//         }

//         await cart.save();
//         res.json({ success: true, message: "Product added to cart" });

//     } catch (error) {
//         console.error("Add to cart error:", error.message);
//         res.status(500).json({ success: false, message: "Internal Server Error" });
//     }
// };


const addToCart = async (req, res) => {
    try {
        const { productId } = req.body;
        const userId = req.session.user;

        console.log("Server: Received productId:", productId, "userId:", userId); 

        if (!userId) {
            console.log("Server: Unauthorized - No user ID in session.");
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const user = await User.findById(userId);
        if (!user) {
            console.log("Server: User not found for ID:", userId);
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const product = await Product.findById(productId);
        if (!product) {
            console.log("Server: Product not found for ID:", productId);
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        let cart = await Cart.findOne({ userId });

        if (!cart) {
            cart = new Cart({ userId, items: [] });
        }

        if (!cart.items) {
            cart.items = [];
        }

        const existingItem = cart.items.find(item => item.productId.toString() === new mongoose.Types.ObjectId(productId).toString());

        if (existingItem) {
            existingItem.quantity += 1;
            existingItem.totalPrice = existingItem.quantity * (product.salePrice || product.regularPrice || 0);
        } else {
            cart.items.push({
                productId,
                quantity: 1,
                totalPrice: product.salePrice || product.regularPrice || 0
            });
        }

        await cart.save();
        console.log("Server: Product added to cart successfully."); // Success log
        res.json({ success: true, message: "Product added to cart" });

    } catch (error) {
        console.error("Add to cart error:", error.message);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

  
  
  


const changeQuantity = async (req, res) => {
    try {
        const productId = req.body.productId;
        const userId = req.session.user;
        const count = parseInt(req.body.count);
        
        console.log("Change quantity request:", { userId, productId, count });
        
        
        const cart = await Cart.findOne({ userId: userId });
        
        if (!cart) {
            console.log("Cart not found for user:", userId);
            return res.status(404).json({ status: false, error: "Cart not found" });
        }
        
        console.log("Found cart:", cart._id, "with items count:", cart.items.length);
        
      
        console.log("Product IDs in cart:", cart.items.map(item => {
            return {
                cartItemId: item.productId.toString(),
                requestedId: productId.toString()
            };
        }));
        
       
        const cartItem = cart.items.find(item => 
            item.productId.toString() === productId.toString()
        );
        
        if (!cartItem) {
            console.log("Product not found in cart items. Requested ID:", productId);
            return res.status(404).json({ status: false, error: "Product not found in cart" });
        }
        
        console.log("Found cart item:", cartItem);
        
       
        const product = await Product.findById(productId);
        if (!product) {
            console.log("Product not found in database:", productId);
            return res.status(404).json({ status: false, error: "Product not found" });
        }
        
      
        const newQuantity = cartItem.quantity + count;
        console.log("Current quantity:", cartItem.quantity, "New quantity:", newQuantity);
        
        
        if (newQuantity > 0 && newQuantity <= product.quantity) {
            // Update the quantity
            cartItem.quantity = newQuantity;
            
            
            const productPrice = product.salePrice || product.regularPrice || 0;
            console.log("Product price:", productPrice);
            
            cartItem.totalPrice = newQuantity * productPrice;
            await cart.save();
            
           
            const totalAmount = cartItem.totalPrice;
            
            
            let grandTotal = 0;
            cart.items.forEach(item => {
                grandTotal += item.totalPrice || 0;
            });
            
            console.log("Response data:", {
                quantityInput: newQuantity,
                totalAmount: totalAmount,
                grandTotal: grandTotal
            });
            
            res.json({
                status: true,
                quantityInput: newQuantity,
                count: count,
                totalAmount: totalAmount,
                grandTotal: grandTotal
            });
        } else if (newQuantity <= 0) {
            res.json({ status: false, error: "Quantity cannot be less than 1" });
        } else {
            res.json({ status: false, error: "Out of stock" });
        }
    } catch (error) {
        console.error("Change quantity error:", error);
        return res.status(500).json({ status: false, error: "Server error" });
    }
};


  
const deleteProduct = async (req, res) => {
    try {
        const productId = req.query.id;
        const userId = req.session.user;
        
       
        const cart = await Cart.findOne({ userId });
        
        if (!cart) {
            return res.redirect("user/cart");
        }
        
        // Find the product in cart items and remove it
        const itemIndex = cart.items.findIndex(
            item => item.productId.toString() === productId.toString()
        );
        
        if (itemIndex > -1) {
            cart.items.splice(itemIndex, 1);
            await cart.save();
        }
        
        res.redirect("/cart");
    } catch (error) {
        console.error("Error deleting item:", error);
        res.redirect("user/cart");
    }
};
  
  
  
  
  
  export default {
    getCartPage,
    addToCart,
    changeQuantity,
    deleteProduct,
  };
  
  