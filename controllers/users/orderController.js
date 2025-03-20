import User from "../../models/userSchema.js";
import Order from "../../models/orderSchema.js";
import mongoose from "mongoose";
import Product from "../../models/productSchema.js";
import Wallet from "../../models/walletSchema.js";

const orderDetails = async (req, res) => {
    try {
        const userId = req.session.user;
        const user = await User.findOne({ _id:userId});

        const page = parseInt(req.query.page) || 1; 
        const limit = parseInt(req.query.limit) || 3; 
        const skip = (page - 1) * limit;

        const totalOrders = await Order.countDocuments({ userId: userId });
        const orders = await Order.find({ userId: userId })
        .populate('orderedItem.product') 
        .sort({ _id: -1 })
        .skip(skip)
        .limit(limit);
        const totalPages = Math.ceil(totalOrders / limit);
        res.render('user/order-details', {
            orders,
            user,
            currentPage: page,
            totalPages,
        });
    } catch (error) {
        console.log('Error while running order page:', error.message);
        res.status(500).send('Server error');
    }
};


const loadorderStatus = async (req, res) => {
    try {
        const orderId = req.params.id;
        const userId = req.session.user;
        const userData = await User.findOne({ _id:userId});
        console.log('Attempting to find order with ID:', orderId);
        
        if (!mongoose.Types.ObjectId.isValid(orderId)) {
            console.log('Invalid order ID format:', orderId);
            return res.redirect('page');
        }

        const order = await Order.findById(orderId);
        
        if (!order) {
            console.log('Order not found:', orderId);
            return res.redirect('page');
        }

        const populatedOrder = await Order.findById(orderId)
            .populate({
                path: 'orderedItem.product',
                model: 'Product',
                select: 'productName productImage price'
            });

        

        if (!populatedOrder) {
            console.log('Failed to populate order data');
            return res.redirect('page');
        }

        res.render('user/orderStatus', {
            user: userData,
            order: populatedOrder,
            message: req.query.error || null
        });

    } catch (error) {
        console.error('Detailed error in loadorderStatus:', {
            error: error.message,
            stack: error.stack,
            orderId: req.params.id,
            userId: req.session.user
        });
        
        
        console.log('Full error:', error.message);
        
        return res.render('user/orderStatus', {
            order: null,
            message: 'Error loading order details'
        });
    }
};

// const postCancelOrder = async (req, res) => {
//     try {
//         const userId = req.session.user;
//         const orderId = req.params.orderId;
//         const productId = req.params.productId; 
//         const {reason} = req.body
        
//         console.log(reason)
//         const order = await Order.findOne({ userId: userId, _id: orderId }).populate('orderedItem.product');

//         if (!order) {
//             return res.status(404).render('user/orderStatus', {  
//                 message: 'Order not found',
//                 order: null
//             });
//         }

        
//         const itemToCancel = order.orderedItem.find(item => item.product._id.toString() === productId);

//         if (!itemToCancel) {
//             return res.status(404).render('user/orderStatus', {  
//                 message: 'Product not found in this order',
//                 order: null
//             });
//         }

//         const quantityToCancel = itemToCancel.quantity;  

       
//         let refundAmount = 0;
//         if (order.couponDiscount > 0) {
            
//             const discountRatio = order.couponDiscount / order.orderAmount;
//             const itemDiscount = itemToCancel.price * discountRatio;
//             refundAmount = itemToCancel.price - itemDiscount; 
//         } else {
//             refundAmount = itemToCancel.price;
//         }

      
//         const product = await Product.findById(itemToCancel.product._id);  
//         if (!product) {
//             return res.status(404).render('user/orderStatus', { 
//                 message: 'Product not found.', 
//                 order: order
//             });
//         }

//         product.quantity += quantityToCancel; 
//         await product.save();
        
//         order.returnReason = reason;
//         order.status = 'Cancelled'; 

        
//         const itemIndex = order.orderedItem.findIndex(item => item.product._id.toString() === productId);

//         if (itemIndex !== -1) {
//             order.orderedItem[itemIndex].productStatus = 'Cancelled';
//         }

//         await order.save(); 


        
//         let wallet = await Wallet.findOne({ userId: userId });
//         if (!wallet) {
//             wallet = new Wallet({
//                 userId: userId,
//                 balance: 0,
//                 transactions: []
//             });
//         }

//         wallet.balance += refundAmount;

//         const newTransaction = {
//             amount: refundAmount,
//             transactionsMethod: 'Refund',
//             date: new Date(),
//             orderId: orderId
//         };

//         wallet.transactions.push(newTransaction);
//         await wallet.save();

//         // 7. Render Success
//         res.render('user/orderStatus', {  
//             message: `Product cancelled successfully. ₹${refundAmount} added to your wallet.`,
//             order: order // Pass the UPDATED order object
//         });

//     } catch (error) {
//         console.error('Error during order cancellation:', error);
//         res.status(500).render('user/orderStatus', {  
//             message: 'Error processing cancellation',
//             order: null
//         });
//     }
// };



const postCancelOrder = async (req, res) => {
    try {
        const userId = req.session.user;
        const orderId = req.params.orderId;
        const productId = req.params.productId;
        const {reason} = req.body

        console.log(reason)
        const order = await Order.findOne({ userId: userId, _id: orderId }).populate('orderedItem.product');

        if (!order) {
            return res.status(404).render('user/orderStatus', {
                message: 'Order not found',
                order: null
            });
        }


        const itemToCancel = order.orderedItem.find(item => item.product._id.toString() === productId);

        if (!itemToCancel) {
            return res.status(404).render('user/orderStatus', {
                message: 'Product not found in this order',
                order: null
            });
        }

        const quantityToCancel = itemToCancel.quantity;

        let refundAmount = 0;
        if (order.couponDiscount > 0) {

            const discountRatio = order.couponDiscount / order.orderAmount;
            const itemDiscount = itemToCancel.price * discountRatio;
            refundAmount = itemToCancel.price - itemDiscount;
        } else {
            refundAmount = itemToCancel.price;
        }


        const product = await Product.findById(itemToCancel.product._id);
        if (!product) {
            return res.status(404).render('user/orderStatus', {
                message: 'Product not found.',
                order: order
            });
        }

        product.quantity += quantityToCancel;
        await product.save();

        order.returnReason = reason;
        order.status = 'Cancelled';


        const itemIndex = order.orderedItem.findIndex(item => item.product._id.toString() === productId);

        if (itemIndex !== -1) {
            order.orderedItem[itemIndex].productStatus = 'Cancelled';
        }

        await order.save();


        let wallet = await Wallet.findOne({ userId: userId });
        if (!wallet) {
            wallet = new Wallet({
                userId: userId,
                balance: 0,
                transactions: []
            });
            await wallet.save(); // Save the new wallet immediately
            console.log("New wallet created for user:", userId);
        }
        if (!wallet) {
            console.error("Wallet not found or creation failed for user:", userId);
            return res.status(500).render('user/orderStatus', {
                message: 'Error processing cancellation: Wallet creation failed',
                order: null
            });
        }

        console.log("Wallet balance before refund:", wallet.balance);
        console.log("Refund amount:", refundAmount);

        const initialBalance = wallet.balance; // Capture initial balance for comparison


        wallet.balance += refundAmount;

        const newTransaction = {
            amount: refundAmount,
            transactionsMethod: 'Refund',
            date: new Date(),
            orderId: orderId
        };

        wallet.transactions.push(newTransaction);

        console.log("Wallet object before saving:", JSON.stringify(wallet)); // Log the wallet object

        await wallet.save()
            .then(savedWallet => {
                console.log("Wallet saved successfully. New balance:", savedWallet.balance);

                const finalBalance = savedWallet.balance;
                if (finalBalance !== initialBalance + refundAmount) {
                    console.warn("WARNING: Wallet balance mismatch! Expected:", initialBalance + refundAmount, "Actual:", finalBalance);
                }

                // 7. Render Success
                res.render('user/orderStatus', {
                    message: `Product cancelled successfully. ₹${refundAmount} added to your wallet.`,
                    order: order
                });
            })
            .catch(err => {
                console.error("Error saving wallet:", err);
                return res.status(500).render('user/orderStatus', {
                    message: 'Error processing cancellation: Failed to update wallet',
                    order: null
                });
            });
    } catch (error) {
        console.error('Error during order cancellation:', error);
        res.status(500).render('user/orderStatus', {
            message: 'Error processing cancellation',
            order: null
        });
    }
};


// return product 

const returnProduct = async (req,res) =>{
   
    try {
        const { orderId, productId } = req.params;
        console.log("Request body:", req.body);
        const returnReason = req.body.returnReason
        const user = req.session.user
        console.log(orderId,productId,returnReason,"This is return")
        if (!mongoose.Types.ObjectId.isValid(orderId) || !mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({ message: 'Invalid order or product ID' });
        }

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        const product = await Product.findById(productId);
        console.log("This is product",product)
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        
        const orderItem = order.orderedItem.find(item => item.product.toString() === productId);
        if (!orderItem) {
            return res.status(400).json({ message: 'Product not found in this order' });
        }

       
        if (order.userId.toString() !== user) {
            return res.status(403).json({ message: 'Unauthorized: Order does not belong to user' });
        }
       
        order.status = 'Request';
        order.returnReason = returnReason;
        if(returnReason){

            await order.save();
        }


        
        res.status(200).json({ message: 'Return request submitted successfully' });

    } catch (error) {
        console.error('Error requesting return:', error.message);
        res.status(500).json({ message: 'Failed to submit return request' });
    }
}


 

export default {
    orderDetails,
    loadorderStatus,
   postCancelOrder,
   returnProduct
}