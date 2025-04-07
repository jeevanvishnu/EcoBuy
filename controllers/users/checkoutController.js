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
import Wishlist from "../../models/wishlistSchema.js";

const razorpay = new Razorpay ({
    key_id:process.env.Razorpay_API,
    key_secret:process.env.Razorpay_SCRECT,
})


const getCheckout = async (req, res) => {   

    let cartCount = 0
    let wishlistCount = 0

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


        if (userId) {
            const cart = await Cart.findOne({ userId: userId });
            
            if (cart && cart.items) {
              cartCount = cart.items.length;
            }
            const wishlist = await Wishlist.find({ user: userId });
            wishlistCount = wishlist.length;
          }

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
            user: userData,
            cartCount,
            wishlistCount
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

    let cartCount =0
    let wishlistCount =0

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

        if (user) {
              const cart = await Cart.findOne({ userId: user });
              
              if (cart && cart.items) {
                cartCount = cart.items.length;
                console.log(cartCount)
              }
              const wishlist = await Wishlist.find({ user: user });
              wishlistCount = wishlist.length;
            }

        const addressData = currentAddress.address.find((item)=>{
            return item._id.toString() === addressId.toString()
        })

        if(!addressData){
            return res.redirect('/page')
        }
        res.render('user/edit-checkout',
            {address:addressData ,
                user : userData,
                cartCount,
                wishlistCount

            })

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

       
        

        const totalAmount = cart.totalAmount;
        const discountAmount = cart.discountAmount;
        const coupon = cart.appliedCoupon;
        const couponUsed = coupon ? await Coupon.findOne({ _id: coupon }) : null;

       
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

        const gstRate = 0.05;
        const gstAmount = finalAmount * gstRate;
        const finalAmountWithGST = finalAmount + gstAmount;

        console.log(gstAmount,finalAmount,finalAmountWithGST,"Place order>>>>>")
        

        if (finalAmountWithGST > 1000) {
            return res.status(400).json({
                success: false,
                message: "Order amount exceeds the limit of 1000 Rupees."
            });
        }
      


        
        if (paymentMethod === 'Wallet') {
            if (wallet.balance <= 0 || cart.cartTotal > wallet.balance) {
                return res.status(400).send('Insufficient wallet balance.');
            }
            wallet.balance -= cart.cartTotal;
            await wallet.save();
        }

       
        const order = new Order({
            orderedItem: orderedItems,
            cartId:cart._id,
            userId,
            totalPrice: cartTotal,
            discount: discountAmount,
            finalAmount: finalAmountWithGST,
            deliveryAddress : addressFound, 
            paymentMethod:paymentMethod,
            couponCode: couponUsed ? couponUsed.couponCode : null,
            couponApplied:couponUsed ? true :false,
            couponDiscount: discountAmount,
        });
        

        console.log('order placed successfully', order);
        await order.save();

        
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

    let cartCount = 0
    let wishlistCount = 0

    try {
        const user = req.session.user
        const userData = await User.findById(user)
        const order = Order.find()

        if (user) {
            const cart = await Cart.findOne({ userId: user });
            
            if (cart && cart.items) {
              cartCount = cart.items.length;
              console.log(cartCount)
            }
            const wishlist = await Wishlist.find({ user: user });
            wishlistCount = wishlist.length;
          }
      

        res.render('user/order-sucess',{order,user:userData , cartCount ,wishlistCount})
        
    } catch (error) {
        console.error("Error has been orderSuceess",error.message)
        res.redirect('/page')
        
    }
}

const initiateRazorpay = async (req, res) => {
    console.log("Hello")
    try {
        const userId = req.session.user;
        const cart = await Cart.findOne({ userId: userId }).populate('appliedCoupon');

        if (!cart) {
            return res.status(404).json({ error: 'Cart not found' });
        }

       
        const totalPrice = cart.items.reduce((acc, item) => acc + item.totalPrice, 0);
        
        

        
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
            amount: Math.round(finalAmountWithGST * 100), 
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
            apiKey:process.env.Razorpay_API,
        });

    } catch (error) {
        console.error('Razorpay order creation failed:', error.message);
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
                        message: `Insufficient stock for ${productDoc.productName}. Available stock: ${productDoc.quantity}. Ordered Quantity: ${quantity}`
                    });
                }
            }


           
            
            let totalDiscount = 0;
            if (coupon) {
                const couponUsed = await Coupon.findOne({ _id: coupon });
                if (couponUsed) {
                    totalDiscount = (cartTotal * couponUsed.discount) / 100;
                    console.log('totalDiscount', totalDiscount);
                }
            }

            const couponName = coupon ? await Coupon.findOne({ _id: coupon }) : null;
            
           
            const subtotal = cartTotal - totalDiscount;
            const gstAmount = subtotal * 0.05; // 5% GST
            const finalAmount = subtotal + gstAmount;
           
            
            const orderData = {
                userId,
                cartId: cart._id,
                orderedItem: orderedItems, 
                deliveryAddress: address,
                totalPrice: cartTotal,
                discount: totalDiscount,
                finalAmount: finalAmount, 
                paymentMethod: 'Online Payment',
                status: 'Pending',
                paymentStatus: 'paid',
                paymentId: razorpay_payment_id,
                couponCode: couponName ? couponName.couponCode : "",
                couponDiscount: totalDiscount,
                orderId: razorpay_order_id,
                couponApplied:couponName ? true : false
            };

            console.log('Creating order with data:', orderData);
            const order = new Order(orderData);
            await order.save();

            
            await Cart.findOneAndDelete({ userId });

           
            if (req.session.coupon) {
                delete req.session.coupon;
            }

            
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
        console.error('Error during payment verification:', error.message);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: error.message
        });
    }
};

const loadWalletPayment = async (req, res) => {
    try {
      const { addressId, paymentMethod } = req.body;
      console.log(paymentMethod, "wallet payment");
      const userId = req.session.user;
  
      
      const cart = await Cart.findOne({ userId }).populate("items.productId");
      if (!cart || cart.items.length === 0) {
        return res
          .status(400)
          .json({ success: false, message: "Cart is empty" });
      }
  
     
      const addressDocument = await Address.findOne({ userId });
      if (!addressDocument || !addressDocument.address) {
        return res.status(400).json({ success: false, message: "No addresses found" });
      }
  
      
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
  
      
      const wallet = await Wallet.findOne({ userId });
      if (!wallet) {
        return res
          .status(400)
          .json({ success: false, message: "Wallet not found" });
      }
  
     
      const totalPrice = cart.items.reduce((acc, item) => acc + item.totalPrice, 0);
      
      
      let totalDiscount = 0;
      if (cart.appliedCoupon) {
        totalDiscount = cart.discountAmount || (totalPrice * cart.appliedCoupon.discount) / 100;
      }
      
      
      const subtotal = totalPrice - totalDiscount;
      const gstAmount = subtotal * 0.05; 
      const finalAmount = subtotal + gstAmount;

     
      if (wallet.balance < finalAmount) {
        return res.status(400).json({
          success: false,
          message: `Insufficient wallet balance. Available: ₹${wallet.balance.toFixed(2)}, Required: ₹${finalAmount.toFixed(2)}`,
        });
      }
  
    
      const orderedItems = cart.items.map(item => {
        return {
          product: item.productId._id, 
          quantity: item.quantity,
          price: item.productId.salePrice,
          orderStatus: 'Pending'
        };
      });
  
      
      const newOrder = new Order({
        userId,
        cartId: cart._id,
        orderedItem: orderedItems, 
        deliveryAddress: address,
        totalPrice: totalPrice,
        discount: totalDiscount,
        finalAmount: finalAmount, 
        paymentMethod: paymentMethod || 'Wallet Payment',
        paymentStatus: 'paid',
        status: 'Pending', 
        couponApplied: cart.appliedCoupon ? true : false
      });
  
      const savedOrder = await newOrder.save();
  
      
      wallet.balance -= finalAmount;
      wallet.transactions.push({
        amount: finalAmount,
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
        orderDetails: {
          totalPrice: totalPrice,
          discount: totalDiscount,
          subtotal: subtotal,
          gstAmount: gstAmount,
          finalAmount: finalAmount
        }
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

        const userId = req.session.user;
        const userData = await User.findById({_id:userId})
        if (!userId) {
            return res.status(401).json({ success: false, error: 'User not authenticated' });
        }
        
        const order = await Order.findOne({ razorpayOrderId: razorpayOrderId });
        if (!order) {
            return res.status(400).json({ success: false, error: 'Order not found' });
        }
        
        if (order.userId.toString() !== userId.toString()) {
            return res.status(403).json({ success: false, error: 'Unauthorized access to this order' });
        }
        
        if (order.paymentStatus !== 'failed' && order.paymentStatus !== 'pending') {
            return res.status(400).json({ success: false, error: 'Only failed or pending payments can be retried' });
        }


        const baseAmount = order.totalPrice;
        

        const discount = order.discount || 0;
        const discountedAmount = baseAmount - discount;
        
        
        const gstRate = 0.05; 
        const gstAmount = discountedAmount * gstRate;
        
      
        const finalAmount = discountedAmount + gstAmount;

        const options = {
            amount: Math.round(finalAmount * 100), 
            currency: 'INR',
            receipt: 'retry_order_' + order._id,
            notes: {
                orderId: order._id.toString(),
                userEmail: userData.email || 'User email not available'
            }
        };

        const newOrder = await razorpay.orders.create(options);
        
      
        order.razorpayOrderId = newOrder.id;
        order.paymentStatus = 'pending'; 
        await order.save();

        
        res.json({
            success: true,
            razorpayOrderId: newOrder.id,
            amount: baseAmount,
            discount: discount,
            finalAmount: finalAmount,
            apiKey: process.env.Razorpay_API
        });

    } catch (error) {
        console.error('Error in retryPayment:', error.message);
        res.status(500).json({ success: false, error: 'Failed to retry payment' });
    }
};

  
const paymentSucess = async (req, res) => {
    try {
        const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;

        console.log('Starting payment verification with details:');
        console.log('req.body:', req.body);
      
        // Verify payment signature
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

           
            const existingOrder = await Order.findOne({ 
                $or: [
                    { orderId: razorpay_order_id },
                    { razorpayOrderId: razorpay_order_id }
                ]
            });
            
           
            if (existingOrder) {
                console.log('Found existing order:', existingOrder._id);
                
                
                if (existingOrder.paymentStatus !== 'paid') {
                    existingOrder.paymentStatus = 'paid';
                    existingOrder.paymentId = razorpay_payment_id;
                    await existingOrder.save();
                    console.log('Updated existing order payment status to paid');
                } else {
                    console.log('Order already marked as paid, no update needed');
                }
                
                return res.json({
                    success: true,
                    orderId: existingOrder._id,
                    message: 'Payment successful for existing order'
                });
            }
            
          
            const cart = await Cart.findOne({ userId }).populate('items.productId');
            if (!cart || !cart.items || cart.items.length === 0) {
                return res.status(400).json({ 
                    success: false,
                    error: 'No existing order found for this payment, and cart is empty or invalid' 
                });
            }
            
           
            const coupon = cart.appliedCoupon;
          
            const addressDocument = await Address.findOne({ userId });
            console.log("addressDocument", addressDocument);
             
            let cartTotal = 0;
            
            const orderedItems = cart.items.map(item => {
                const itemTotal = item.productId.salePrice * item.quantity;
                cartTotal += itemTotal;

                return {
                    product: item.productId._id,
                    quantity: item.quantity,
                    price: item.productId.salePrice, 
                    orderStatus: "Pending"
                };
            });

            console.log("Ordered items:", orderedItems);
            
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
                        message: `Insufficient stock for ${productDoc.productName}. Available stock: ${productDoc.quantity}. Ordered Quantity: ${quantity}`
                    });
                }
            }
            
            let totalDiscount = 0;
            if (coupon) {
                const couponUsed = await Coupon.findOne({ _id: coupon });
                if (couponUsed) {
                    totalDiscount = (cartTotal * couponUsed.discount) / 100;
                    console.log('totalDiscount', totalDiscount);
                }
            }

            const couponName = coupon ? await Coupon.findOne({ _id: coupon }) : null;
            
            const subtotal = cartTotal - totalDiscount;
            const gstAmount = subtotal * 0.05; // 5% GST
            const finalAmount = subtotal + gstAmount;
           
            const orderData = {
                userId,
                cartId: cart._id,
                orderedItem: orderedItems, 
                totalPrice: cartTotal,
                discount: totalDiscount,
                finalAmount: finalAmount, 
                paymentMethod: 'Online Payment',
                status: 'Pending',
                paymentStatus: 'paid',
                paymentId: razorpay_payment_id,
                couponCode: couponName ? couponName.couponCode : "",
                couponDiscount: totalDiscount,
                orderId: razorpay_order_id,
                couponApplied: couponName ? true : false
            };

            console.log('Creating new order with data:', orderData);
            const order = new Order(orderData);
            await order.save();
            
            await Cart.findOneAndDelete({ userId });
            
            if (req.session.coupon) {
                delete req.session.coupon;
            }
            
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
        console.error('Error during payment verification:', error.message);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: error.message
        });
    }
};




const paymentFailed = async (req, res) => {
    console.log('Entering payment failed handler');
    
    try {
        const { razorpay_order_id, razorpay_payment_id, error_code, error_description, addressId } = req.body;
        
        if (!mongoose.isValidObjectId(addressId)) {
            return res.status(400).json({ success: false, error: 'Invalid address ID format' });
        }
        
        const userId = req.session.user;
        
        if (!userId) {
            return res.status(401).json({ success: false, error: 'User not authenticated' });
        }
        
        const cart = await Cart.findOne({ userId }).populate('items.productId').populate('appliedCoupon');
        
        if (!cart || !cart.items || cart.items.length === 0) {
            return res.status(400).json({ success: false, error: 'Cart is empty or invalid' });
        }
        
        const addressDocument = await Address.findOne({ userId });
        const address = addressDocument.address.find(addr => addr._id.toString() === addressId);
        
        if (!address) {
            return res.status(400).json({ success: false, error: 'Delivery address not found' });
        }
        
        let cartTotal = 0;
        const orderedItems = cart.items.map(item => {
            const itemTotal = item.productId.salePrice * item.quantity;
            cartTotal += itemTotal;
            
            return {
                product: item.productId._id,
                quantity: item.quantity,
                price: item.productId.salePrice,
                orderStatus: 'Pending'
            };
        });
        
        const gstRate = 0.05;
        const gstAmount = cartTotal * gstRate;
        
        
        let discount = 0;
        let finalAmount = cartTotal + gstAmount;
        
        if (cart.appliedCoupon && cart.discountAmount > 0) {
            discount = cart.discountAmount;
            
            const discountedCartTotal = cartTotal - discount;
          
            const discountedGstAmount = discountedCartTotal * gstRate;
            finalAmount = discountedCartTotal + discountedGstAmount;
            
            console.log('Coupon applied:', cart.appliedCoupon.code);
            console.log('Discount amount:', discount);
        }
        
        console.log('Base cartTotal:', cartTotal);
        console.log('Discount:', discount);
        console.log('After discount:', cartTotal - discount);
        console.log('GST (5%):', gstAmount);
        console.log('Final amount with discount and GST:', finalAmount);
        
        const failedOrder = new Order({
            userId,
            cartId: cart._id,
            orderedItem: orderedItems,
            deliveryAddress: address,
            totalPrice: cartTotal,
            discount: discount,
            finalAmount: finalAmount,
            paymentMethod: 'Online Payment',
            paymentStatus: 'pending',
            paymentId: razorpay_payment_id,
            razorpayOrderId: razorpay_order_id
        });
        
        await failedOrder.save();
        await Cart.findOneAndDelete({ userId });
        
        return res.status(200).json({
            success: true,
            message: 'Failed order saved successfully'
        });
        
    } catch (error) {
        console.error('Error saving failed order:', error.message);
        return res.status(500).json({
            success: false,
            error: 'An error occurred while processing your payment. Please try again later.'
        });
    }
};


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
  removeCoupon,
  paymentSucess
};
