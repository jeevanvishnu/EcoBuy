import Cart from "../../models/cartSchema.js";
import Address from "../../models/addressSchema.js";
import User from "../../models/userSchema.js";
import Product from "../../models/productSchema.js"; 
import mongoose from "mongoose";
import Order from "../../models/orderSchema.js"
import { v4 as uuidv4 } from 'uuid';

const getCheckout = async (req, res) => {
    try {
      const userId = req.session.user;
      console.log("User ID:", userId);
  
      if (!userId) {
        return res.redirect('/login');
      }
  
      // Find the user's cart and populate product details
      const cart = await Cart.findOne({ userId: userId }).populate({
        path: "items.productId",
        select: "productName price productImage category", 
        populate: {
          path: "category",
          select: "name"
        }
      });
      
      if (!cart || cart.items.length === 0) {
        return res.redirect('/cart?empty=true');
      }
  
      const userData = await User.findById(userId);
      
      if (!userData) {
        return res.status(404).send("User not found");
      }
      
      // Calculate order totals
      let subtotal = 0;
      cart.items.forEach((item) => {
        subtotal += item.totalPrice;
      });
  
      const discount = 0; // Calculate dynamic discount if needed
      const totalAmount = subtotal - discount;
  
      // Get user addresses
      const addresses = await Address.find({ userId: userId });
      console.log(addresses,"get Address")
      // Render checkout page with all necessary data
      res.render("user/checkout", {
        addresses: addresses || [],
        cart: cart,
        products: cart.items,
        subtotal: subtotal,
        discount: discount,
        totalAmount: totalAmount,
        userId: userId,
        user: userData
      });
  
    } catch (error) {
      console.error("Error in getCheckout:", error.message);
      res.status(500).send("Internal Server Error");
    }
  };
  

  

const addCheckoutAddress = async (req,res) =>{
    try {

        const userId = req.session.user
        const userEmail =  await User.findById(userId)

        res.render('user/add-checkout',{user:userEmail})

        
    } catch (error) {
        console.log("Error of add address field")
        res.redirect('/page')
        
    }
}

const checkoutAddAddress = async (req, res) => {
    try {
        console.log("Hrllo")
        const userId = req.session.user;
        const userData = await User.findOne({ _id: userId });

        const { name, addressType, city, state, pincode, landMark, phone } = req.body;

        let userAddress = await Address.findOne({ userId: userData._id });

        if (!userAddress) {
            userAddress = new Address({
                userId: userData._id,
                address: [{
                    name,
                    addressType,
                    city,
                    state,
                    pincode,
                    landMark,
                    phone
                }]
            });
        } else {
            
            userAddress.address.push({
                name,
                addressType,
                city,
                state,
                pincode,
                landMark,
                phone
            });
        }

        
        await userAddress.save();

        res.redirect('/checkout')
    } catch (error) {
        console.error("Add Address Error", error);
        res.status(500).redirect('/page');
    }
};



const getCheckoutEdit = async (req, res) => {
    try {
        const addressId = req.query.id
        const user = req.session.user
        const currentAddress = await Address.findOne({
            "address._id": addressId
         })
         

        if(!currentAddress){
            return res.redirect('/page')
        }

        const addressData = currentAddress.address.find((item)=>{
            return item._id.toString() === addressId.toString()
        })

        if(!addressData){
            return res.redirect('/page')
        }
        res.render('user/edit-checkout',{address:addressData ,user : user})

    } catch (error) {
        console.error("Error of edit Address", error.message)
        res.redirect('/page')
        
    }
};


const editCheckoutAddress = async (req,res) =>{
    try {

        const data = req.body
        const addressId = req.query.id
        const user = req.session.user
        const findAddress = await Address.findOne({"address._id":addressId})
        console.log(findAddress)
        if(!findAddress){
            res.redirect('/page')
        }
        await Address.updateOne(
            {"address._id":addressId},
            {$set: {
                "address.$": {
                    _id: addressId,
                    addressType: data.addressType,
                    name: data.name,  
                    city: data.city,
                    landMark: data.landMark,
                    state: data.state,
                    pincode: data.pincode,
                    phone: data.phone
                }
            }}),


     
        res.redirect('/checkout')
        
    } catch (error) {
        console.error("Error in edit Address")
        res.redirect('/page')
    }
}

const checkoutDeleteAddress = async (req, res) => {
    try {
      const addressId = req.query.id;
      
      
      const result = await Address.updateOne(
        { "address._id": addressId }, 
        { $pull: { address: { _id: addressId } } }  
      );
      
      if (result.modifiedCount === 0) {
        return res.status(404).send("Address not found");
      }
      
      res.redirect('/checkout');
    } catch (error) {
      console.error("Error in delete Address:", error.message);
      res.redirect('/page');
    }
  };


  const placeOrder = async (req, res) => {
    try {
        const { addressId } = req.body;
        const paymentMethod = "cod";
        console.log("Place order req.body", req.body);

        const userId = req.session.user;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'User not authenticated' });
        }

        
        const cart = await Cart.findOne({ userId }).populate('items.productId');

        if (!cart || !cart.items || cart.items.length === 0) {
            return res.status(400).json({ success: false, message: 'Cart is empty or invalid' });
        }

        console.log("Cart found:", cart._id);

        
        const userAddressDoc = await Address.findOne({ userId });
        if (!userAddressDoc) {
            return res.status(400).json({ success: false, message: "No addresses found for user" });
        }

       
        const addressFound = userAddressDoc.address.find(addr => addr._id.toString() === addressId);
        if (!addressFound) {
            return res.status(400).json({ success: false, message: "Selected delivery address not found" });
        }

        console.log("Delivery address found:", addressFound._id);

        
        let cartTotal = 0;
        let discountAmount = cart.discountAmount || 0;

        const orderedItems = cart.items.map(item => {
            const itemTotal = item.productId.salePrice * item.quantity; 
            cartTotal += itemTotal;

            return {
                product: item.productId._id, 
                quantity: item.quantity,
                price: item.productId.salePrice, 
            };
        });

        console.log(`Validating stock for ${orderedItems.length} items`);

       
        for (const item of orderedItems) {
            const { product, quantity } = item;

          
            const productDoc = await Product.findById(product);
            if (!productDoc) {
                return res.status(400).json({
                    success: false,
                    message: `Product not found: ${product}`
                });
            }

            
            if (!productDoc.quantity || productDoc.quantity < quantity) {
                return res.status(400).json({
                    success: false,
                    message: `Insufficient stock for ${productDoc.productName}. Available stock: ${productDoc.quantity}.  Ordered Quantity: ${quantity}`
                });
            }
        }

        const finalAmount = cartTotal - discountAmount; 
       
        const order = new Order({
            orderedItem: orderedItems,
            totalPrice: cartTotal,
            discount: discountAmount,
            finalAmount: finalAmount,
            address: userId, 
            status: 'Pending', 
        });

        await order.save();
        console.log("Order created:", order._id);

       
        if (req.session.coupon) {
            delete req.session.coupon;
        }

       
        for (const item of orderedItems) {
            const { product, quantity } = item;
            await Product.findByIdAndUpdate(product, { $inc: { quantity: -quantity } });
            console.log(`Updated stock for product ${product} by -${quantity}`);
        }

       
        await Cart.findByIdAndUpdate(cart._id, {
            $set: { items: [], totalPrice: 0, discountAmount: 0 }
        });

        
        return res.status(200).json({
            success: true,
            message: 'Order placed successfully',
            orderId: order._id
        });

    } catch (error) {
        console.error("Error while placing order:", error);
        return res.status(500).json({
            success: false,
            message: "An error occurred while processing your order. Please try again."
        });
    }
};

const orderSucess = async (req,res) =>{
    try {
        const user = req.session.user
        const userData = await User.findById(user)
        const order = Order.find()

        res.render('user/order-sucess',{order,user:userData})
        
    } catch (error) {
        console.error("Error has been orderSuceess",error.message)
        res.redirect('/page')
        
    }
}
  
export default {
  getCheckout,
  addCheckoutAddress,
  checkoutAddAddress,
  getCheckoutEdit,
  editCheckoutAddress,
  checkoutDeleteAddress,
  placeOrder,
  orderSucess

};
