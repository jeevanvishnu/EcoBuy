import User from "../../models/userSchema.js";
import Order from "../../models/orderSchema.js";
import mongoose from "mongoose";
import Product from "../../models/productSchema.js";
const orderDetails = async (req, res) => {
    try {
        const userId = req.session.user;
        const user = await User.findOne({ _id:userId});

        const page = parseInt(req.query.page) || 1; 
        const limit = parseInt(req.query.limit) || 5; 
        const skip = (page - 1) * limit;

        const totalOrders = await Order.countDocuments({ userId: userId });
       
        const orders = await Order.find({ userId: userId })
        .populate('orderedItem.product') 
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
        console.log(userId)
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

const postCancelOrder = async (req,res) =>{
    const { orderId } = req.params;
    const { reason } = req.body;
    console.log(reason,"this is  reson")
    try {
        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        if (order.status !== 'Pending' && order.status !== 'Processing') {
            return res.status(400).json({ message: 'Order cannot be cancelled at this stage' });
        }

        order.status = 'Cancelled';
        order.cancelReason = reason;
        await order.save();

        res.status(200).json({ message: 'Order cancelled successfully' });

    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: 'Failed to cancel order' });
    }
}


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