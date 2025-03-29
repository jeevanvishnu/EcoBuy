import Cart from "../../models/cartSchema.js";
import Address from "../../models/addressSchema.js";
import User from "../../models/userSchema.js";
import Product from "../../models/productSchema.js"; 
import mongoose from "mongoose";
import Order from "../../models/orderSchema.js"
import Wallet from "../../models/walletSchema.js";
import { v4 as uuidv4 } from 'uuid';
import env from 'dotenv'
env.config()
import Razorpay from 'razorpay'
import crypto from 'crypto'
import Coupon from "../../models/couponSchema.js";

const razorpay = new Razorpay ({
    key_id:process.env.Razorpay_API,
    key_secret:process.env.Razorpay_SCRECT,
   
})

const getCheckout = async (req, res) => {
    try {
        const userId = req.session.user;
        console.log("User ID:", userId);

        if (!userId) {
            return res.redirect('/login');
        }

        const wallet = await Wallet.findOne({ userId: userId });
       
        const walletBalance = wallet ? wallet.balance : 0;
       
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

        
        let subtotal = 0;
        cart.items.forEach((item) => {
            subtotal += item.totalPrice;
        });

        const discount = 0; 

        
        const gstRate = 0.05; 
        const gstAmount = subtotal * gstRate;

        const totalAmount = subtotal + gstAmount - discount;

       
        const addresses = await Address.find({ userId: userId });
        console.log(addresses, "get Address")

       
        res.render("user/checkout", {
            addresses: addresses || [],
            cart: cart,
            key: process.env.Razorpay_API,
            userWallet: wallet,
            walletBalance: walletBalance, 
            products: cart.items,
            subtotal: subtotal,
            gstRate: gstRate * 100,
            gstAmount: gstAmount,
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
        const userData = await User.findOne({_id:user});
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
        res.render('user/edit-checkout',{address:addressData ,user : userData})

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



   //Updated Route and Controller
const getCartTotal = async (req, res) => {
    try {
        const userId = req.session.user;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'User not authenticated' });
        }

        const cart = await Cart.findOne({ userId }).populate('items.productId');

        if (!cart || !cart.items || cart.items.length === 0) {
            return res.status(400).json({ success: false, message: 'Cart is empty or invalid' });
        }
       let total = 0;
     //New  CartTotal calculation
        for (const item of cart.items) {
            total += item.productId.salePrice * item.quantity;

        }
        //Add  CartTotal return

        res.status(200).json({ success: true, total });
    } catch (error) {
        console.error('Error fetching cart total:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch cart total' });
    }
};

const placeOrder = async (req, res) => {
    try {
        const { addressId, paymentMethod, couponCode, appliedCoupon } = req.body;
        console.log('dkhd', req.body);
        const userId = req.session.user;

      
        let wallet = await Wallet.findOne({ userId });
        if (!wallet) {
            wallet = new Wallet({ userId, balance: 0 });
            await wallet.save();
        }

        
        const cart = await Cart.findOne({ userId }).populate('items.productId');

       
        // if (!cart || !cart.items || cart.items.length === 0) {
        //     return res.status(400).send('Cart is empty or invalid.');
        // }
        

        const totalAmount = cart.totalAmount;
        const discountAmount = cart.discountAmount;
        const coupon = cart.appliedCoupon;
        const couponUsed = coupon ? await Coupon.findOne({ _id: coupon }) : null;

        // Find delivery address
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
      

        const orderedItems = cart.items.map(item => {
            const itemTotal = item.productId.salePrice * item.quantity; 
            cartTotal += itemTotal;

            return {
                product: item.productId._id, 
                quantity: item.quantity,
                price: item.productId.salePrice,
                orderStatus:"Pending"
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

        if (finalAmount > 1000) {
            return res.status(400).json({
                success: false,
                message: "Order amount exceeds the limit of 1000 Rupees."
            });
        }
      


        // Wallet Payment Handling
        if (paymentMethod === 'Wallet') {
            if (wallet.balance <= 0 || cart.cartTotal > wallet.balance) {
                return res.status(400).send('Insufficient wallet balance.');
            }
            wallet.balance -= cart.cartTotal;
            await wallet.save();
        }

        // Create order
        const order = new Order({
            orderedItem: orderedItems,
            cartId:cart._id,
            userId,
            totalPrice: cartTotal,
            discount: discountAmount,
            finalAmount: finalAmount,
            deliveryAddress : addressFound, 
            paymentMethod:paymentMethod,
            couponCode: couponUsed ? couponUsed.couponCode : null,
            couponDiscount: discountAmount,
        });
        

        console.log('order placed successfully', order);
        await order.save();

        // Clear cart
        await Cart.deleteOne({ userId });

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
        console.log('Error while placing order:', error.message);
        res.status(500).send('Internal Server Error');
    }
}





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

const initiateRazorpay = async (req, res) => {
    try {
        const userId = req.session.user;
        const cart = await Cart.findOne({ userId: userId }).populate('appliedCoupon');

        if (!cart) {
            return res.status(404).json({ error: 'Cart not found' });
        }

       
        const totalPrice = cart.items.reduce((acc, item) => acc + item.totalPrice, 0);
        
        
        // const totalQuantity = cart.items.reduce((acc, item) => acc + item.quantity, 0);

        
        let totalDiscount = 0;

       
        if (cart.appliedCoupon) {
            totalDiscount = cart.discountAmount || 
          (totalPrice * cart.appliedCoupon.discount) / 100;
        }

        
        const discountedTotal = totalPrice - totalDiscount;

       
        const gstRate = 5;
        const gstAmount = (discountedTotal * gstRate) / 100;
        const finalAmountWithGST = discountedTotal + gstAmount;
        
        
        console.log({
            totalPrice,
            totalDiscount,
            discountedTotal,
            gstAmount,
            finalAmountWithGST
        });
        
        
        const options = {
            amount: Math.round(finalAmountWithGST * 100), // Convert to paise
            currency: 'INR',
            receipt: 'order_' + Date.now(),
        };

       
        const order = await razorpay.orders.create(options);

        res.json({
            success: true,
            order: {
                id: order.id,
                amount: finalAmountWithGST,
            },
        });

    } catch (error) {
        console.error('Razorpay order creation failed:', error);
        res.status(500).json({ error: 'Payment initiation failed' });
    }
};



const verifyPayment = async (req, res) => {
    try {
        const { razorpay_payment_id, razorpay_order_id, razorpay_signature, couponCode, addressId } = req.body;

        console.log('Starting payment verification with details:');
        console.log('req.body:', req.body);
       
        const generated_signature = crypto
            .createHmac('sha256', process.env.Razorpay_SCRECT)
            .update(razorpay_order_id + '|' + razorpay_payment_id)
            .digest('hex');

        if (generated_signature === razorpay_signature) {
            console.log('Payment verified successfully!');

            const userId = req.session.user;
            if (!userId) {
                console.error('Error: Missing userId in session');
                return res.status(400).json({ error: 'User not authenticated' });
            }

            let wallet = await Wallet.findOne({ userId });
            if (!wallet) {
                wallet = new Wallet({ userId, balance: 0 });
                await wallet.save();
            }

            console.log(userId, "This is user id");

            const cart = await Cart.findOne({ userId }).populate('items.productId');
            if (!cart || !cart.items || cart.items.length === 0) {
                return res.status(400).json({ error: 'Cart is empty or invalid' });
            }
            
            const coupon = cart.appliedCoupon;

            // Address retrieval logic
            const addressDocument = await Address.findOne({ userId });
            console.log("addressDocument", addressDocument);

            if (!addressDocument) {
                console.log("Delivery address document not found");
                return res.status(400).json({ error: 'Delivery address not found' });
            }

            const address = addressDocument.address.find(addr => addr._id.toString() === addressId);
            console.log("address", address);

            if (!address) {
                console.log("Delivery address not found");
                return res.status(400).json({ error: 'Delivery address not found' });
            }
            console.log(address, "This is address");
             
            let cartTotal = 0;
            
            // Correctly map cart items to ordered items
            const orderedItems = cart.items.map(item => {
                const itemTotal = item.productId.salePrice * item.quantity;
                cartTotal += itemTotal;

                return {
                    product: item.productId._id,
                    quantity: item.quantity,
                    price: item.productId.salePrice, 
                    orderStatus:"Pending"
                };
            });

            console.log("Ordered items:", orderedItems);

            // Validate stock
            for (const item of orderedItems) {
                const { product, quantity } = item;

                // Find product
                const productDoc = await Product.findById(product);
                if (!productDoc) {
                    return res.status(400).json({
                        success: false,
                        message: `Product not found: ${product}`
                    });
                }

                // Check stock
                if (!productDoc.quantity || productDoc.quantity < quantity) {
                    return res.status(400).json({
                        success: false,
                        message: `Insufficient stock for ${productDoc.productName}. Available stock: ${productDoc.quantity}. Ordered Quantity: ${quantity}`
                    });
                }
            }

            // Calculate discount if coupon is applied
            let totalDiscount = 0;
            if (coupon) {
                const couponUsed = await Coupon.findOne({ _id: coupon });
                if (couponUsed) {
                    totalDiscount = (cartTotal * couponUsed.discount) / 100;
                    console.log('totalDiscount', totalDiscount);
                }
            }

            const couponName = coupon ? await Coupon.findOne({ _id: coupon }) : null;
            
            // Calculate final amount with GST
            const subtotal = cartTotal - totalDiscount;
            const gstAmount = subtotal * 0.05; // 5% GST
            const finalAmount = subtotal + gstAmount;

            // Prepare order data
            const orderData = {
                userId,
                cartId: cart._id,
                orderedItem: orderedItems, // Match the property name in your schema
                deliveryAddress: address,
                totalPrice: finalAmount,
                discount: totalDiscount,
                finalAmount: cartTotal, // Include GST
                paymentMethod: 'Online Payment',
                status: 'Pending',
                paymentStatus: 'paid',
                paymentId: razorpay_payment_id,
                couponCode: couponName ? couponName.couponCode : "",
                couponDiscount: totalDiscount,
                orderId: razorpay_order_id
            };

            console.log('Creating order with data:', orderData);
            const order = new Order(orderData);
            await order.save();

            // Clear applied coupon & cart
            await Cart.findOneAndDelete({ userId });

            // Remove coupon from session
            if (req.session.coupon) {
                delete req.session.coupon;
            }

            // Update product stock
            for (const item of orderedItems) {
                const { product, quantity } = item;
                await Product.findByIdAndUpdate(product, { $inc: { quantity: -quantity } });
                console.log(`Updated stock for product ${product} by -${quantity}`);
            }

            return res.json({
                success: true,
                orderId: order._id,
                totalDiscount,
                message: 'Order placed successfully'
            });

        } else {
            console.log('Payment verification failed!');
            return res.status(400).json({
                success: false,
                error: 'Payment verification failed. Signature mismatch.',
                redirectUrl: '/payment-failed'
            });
        }
    } catch (error) {
        console.error('Error during payment verification:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: error.message
        });
    }
};

// wallet payment
const loadWalletPayment = async (req, res) => {
    try {
      const { addressId , paymentMethod} = req.body;
      console.log(paymentMethod,"wallet payment")
      const userId = req.session.user;

      // 1. Get user's cart
      const cart = await Cart.findOne({ userId }).populate("items.productId");
      if (!cart || cart.items.length === 0) {
        return res
          .status(400)
          .json({ success: false, message: "Cart is empty" });
      }

      // 2. Check if address exists
      const addressDocument = await Address.findOne({ userId });
      if (!addressDocument || !addressDocument.address) {
        return res.status(400).json({ success: false, message: "No addresses found" });
      }

      // Find the specific address by ID
      let address;
      try {
        address = addressDocument.address.find(addr => addr._id.toString() === addressId);
      } catch (error) {
        console.error("Error finding address:", error);
      }

      if (!address) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid address" });
      }

      // 3. Get user's wallet
      const wallet = await Wallet.findOne({ userId });
      if (!wallet) {
        return res
          .status(400)
          .json({ success: false, message: "Wallet not found" });
      }

      // 4. Calculate total price from cart
      const totalPrice = cart.totalPrice;
      const discountAmount = cart.discountAmount || 0;
      const discountedTotal = cart.discountedTotal || totalPrice;

      // 5. Check if enough balance in wallet
      if (wallet.balance < discountedTotal) {
        return res.status(400).json({
          success: false,
          message: `Insufficient wallet balance. Available: ₹${wallet.balance}, Required: ₹${discountedTotal}`,
        });
      }
      let cartTotal = 0
      // 6. Create order items from cart items
      const orderedItems = cart.items.map(item => {
        const itemTotal = item.productId.salePrice * item.quantity; 
        cartTotal += itemTotal;

        return {
            product: item.productId._id, 
            quantity: item.quantity,
            price: item.productId.salePrice,
            orderStatus:'Pending'
        };
    });

      // 7. Create new order
      const newOrder = new Order({
        orderedItem: orderedItems,
            cartId:cart._id,
            userId,
            totalPrice: cartTotal,
            discount: discountAmount,
            finalAmount: cartTotal,
            deliveryAddress : address, 
            paymentMethod:paymentMethod,
            paymentStatus:'paid',
            status: 'Pending', 
      });

      const savedOrder = await newOrder.save();

      // 8. Deduct amount from wallet and add transaction record
      wallet.balance -= discountedTotal;
      wallet.transactions.push({
        amount: discountedTotal,
        transactionsMethod: "Purchase",
        date: new Date(),
        orderId: savedOrder._id,
        status: "completed",
      });
      await wallet.save();

      for (const item of orderedItems) {
        const { product, quantity } = item;
        await Product.findByIdAndUpdate(product, { $inc: { quantity: -quantity } });
        console.log(`Updated stock for product ${product} by -${quantity}`);
    }

      // 9. Clear the cart
      cart.items = [];
      cart.totalPrice = 0;
      cart.discountAmount = 0;
      cart.discountedTotal = 0;
      cart.appliedCoupon = null;
      await cart.save();

      return res.status(200).json({
        success: true,
        message: "Order placed successfully",
        orderId: savedOrder._id,
      });
    } catch (error) {
      console.error("Error processing wallet payment:", error);
      return res.status(500).json({
        success: false,
        message: "An error occurred while processing your order",
      });
    }
  };

const retryPayment = async (req, res) => {
    try {
        const { razorpayOrderId } = req.body;
        console.log('Retry Payment Request:', req.body);

      
        const order = await Order.findOne({ razorpayOrderId: razorpayOrderId });
        if (!order) {
            return res.status(400).json({ success: false, error: 'Order not found' });
        }

      
        if (order.paymentStatus !== 'failed' && order.paymentStatus !== 'pending') {
            return res.status(400).json({ success: false, error: 'Only failed payments can be retried' });
        }

        const Razorpay = require('razorpay');
        
        const razorpay = new Razorpay({
            key_id: process.env.KEY_ID,
            key_secret: process.env.KEY_SECRET
        });

        
        const options = {
            amount: order.totalPrice * 100, 
            currency: 'INR',
            receipt: 'retry_order_' + order._id
        };

        const newOrder = await razorpay.orders.create(options);

        
        order.razorpayOrderId = newOrder.id;
        order.paymentStatus = 'paid';
        await order.save();

        res.json({
            success: true,
            razorpayOrderId: newOrder.id,
            amount: order.orderAmount
        });

    } catch (error) {
        console.error('Error in retryPayment:', error);
        res.status(500).json({ success: false, error: 'Failed to retry payment' });
    }
};

const paymentFailed = async (req,res)=>{
    console.log('entering inton payment failed ')
    try {
        const { razorpay_order_id, razorpay_payment_id, error_code, error_description, addressId } = req.body;

        const userId = req.session.userId;
        if (!userId) {
            return res.status(400).json({ error: 'User not authenticated' });
        }

        const cart = await Cart.findOne({ userId });
        if (!cart || !cart.items || cart.items.length === 0) {
            return res.status(400).json({ error: 'Cart is empty or invalid' });
        }

        const address = await Address.findById(addressId);
        if (!address) {
            return res.status(400).json({ error: 'Delivery address not found' });
        }

        const orderedItem = cart.items.map(item => {
            const itemTotal = Number(item.price) * Number(item.quantity);
            return {
                productId: item.product,
                quantity: Number(item.quantity),
                size: item.size,
                productPrice: Number(item.price),
                productStatus: 'pending',
                totalProductPrice: itemTotal
            };
        });

   
        const failedOrder = new Order({
            userId,
            cartId: cart._id,
            orderedItem,
            deliveryAddress: [address], 
            orderAmount: Number(cart.cartTotal),
            paymentMethod: 'Online Payment',
            paymentStatus: 'pending',
            razorpayOrderId: razorpay_order_id,
            paymentId: razorpay_payment_id
        });

        await failedOrder.save();
        await Cart.findOneAndDelete({ userId });

        return res.json({
            success: true,
            message: 'Failed order saved successfully'
        });
    } catch (error) {
        console.error('Error saving failed order:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to save payment failure details'
        });
    }
}

const applyCoupon = async (req, res) => {
    try {
        const userId = req.session.user;
        const { couponCode } = req.body;
        const GST_RATE = 0.05; 

        const cart = await Cart.findOne({ userId });
        const coupon = await Coupon.findOne({
            couponCode: couponCode.toUpperCase()
        });

        if (!coupon) {
            return res.status(400).json({
                success: false,
                message: 'Invalid coupon code'
            });
        }

        if (coupon.status === false) {
            return res.status(400).json({
                success: false,
                message: 'Coupon code is inactive'
            });
        }

        if (!cart) {
            return res.status(404).json({
                success: false,
                message: 'Cart not found'
            });
        }

        // Calculate subtotal by summing individual item totals
        const subtotal = cart.items.reduce((acc, item) => acc + item.totalPrice, 0);
        console.log(subtotal,"Subtotal")
        
        
        // const totalQuantity = cart.items.reduce((acc, item) => acc + item.quantity, 0);
        

        if (coupon.maxRedeem < subtotal) {
            return res.status(400).json({
                success: false,
                message: `Coupon is valid only for purchases up to ₹${coupon.maxPurchaseAmount}`
            });
        }

        if(subtotal < coupon.minimumPrice){
            return res.status(400).json({
                success:false,
                message:`Coupon is valid only for purchases up to ₹${coupon.minimumPrice}`
            })
        }

        const gstAmount = subtotal * GST_RATE;
        const totalWithGST = subtotal + gstAmount;
        
        let discountAmount = (subtotal * coupon.discount) / 100;
        discountAmount = Math.min(discountAmount, subtotal);

        const discountedSubtotal = subtotal - discountAmount;
        const discountedGSTAmount = discountedSubtotal * GST_RATE;
        const finalTotal = discountedSubtotal + discountedGSTAmount;

        cart.appliedCoupon = coupon._id;
        cart.gstAmount = discountedGSTAmount;
        cart.totalWithGST = finalTotal;
        cart.discountAmount = discountAmount;
        cart.discountedTotal = finalTotal;

        await cart.save();

        coupon.usedCount += 1;
        await coupon.save();

        res.json({
            success: true,
            subtotal: subtotal,
            gstAmount: discountedGSTAmount,
            totalWithGST: finalTotal,
            discountAmount: discountAmount,
            newTotal: finalTotal,
            message: 'Coupon applied successfully'
        });

    } catch (error) {
        console.error('Error applying coupon:', error);
        res.status(500).json({
            success: false,
            message: 'Error applying coupon'
        });
    }
};

const getApplyCoupon =  async (req, res) => {
    try {
      const currentDate = new Date();
      
      const availableCoupons = await Coupon.find({
        status: true,
        expiry: { $gte: currentDate }
      }).select('couponCode discount maxRedeem');
  
      res.json(availableCoupons);
    } catch (error) {
      console.error('Error fetching available coupons:', error);
      res.status(500).json({ 
        message: 'Error retrieving available coupons',
        error: error.message 
      });
    }
  };


  const removeCoupon = async (req, res) => {
    try {
        console.log("Removing coupon");
        const userId = req.session.user;
        
        const cart = await Cart.findOne({ userId: userId });
        
        if (!cart) {
            return res.status(404).json({
                success: false,
                message: 'Cart not found'
            });
        }

        
        const originalTotal = cart.totalPrice;

        const updatedCart = await Cart.findOneAndUpdate(
            { userId: userId },
            {
                cartTotal: originalTotal,
                appliedCoupon: null,
                discountAmount: 0,
                discountedTotal: originalTotal
            },
            { new: true } 
        );

        req.session.appliedCoupon = null;

        res.json({
            success: true,
            newTotal: originalTotal,
            message: 'Coupon removed successfully'
        });

    } catch (error) {
        console.error('Error while removing the coupon', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while removing the coupon',
            error: error.message
        });
    }
};



  
export default {
  getCheckout,
  addCheckoutAddress,
  checkoutAddAddress,
  getCheckoutEdit,
  editCheckoutAddress,
  checkoutDeleteAddress,
  placeOrder,
  orderSucess,
  getCartTotal,
  initiateRazorpay,
  verifyPayment,
  retryPayment,
  paymentFailed,
  loadWalletPayment,
  applyCoupon,
  getApplyCoupon,
  removeCoupon
};
