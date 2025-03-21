import Order from "../../models/orderSchema.js"

// In loadOrderManagment
const loadOrderManagment = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 5;
        const skip = (page - 1) * limit;

        const totalOrders = await Order.countDocuments();
        const totalPages = Math.ceil(totalOrders / limit);

        const orders = await Order.find()
            .populate({
                path: "orderedItem.product",
                model: "Product",
                select: 'productName productImage salePrice'
            })
            
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip(skip);

        console.log(orders, "orders")
        res.render('admin/admin-order', {
            order: orders,
            currentPage: page,
            totalPages,
            admin: req.session.admin,
            active: 'orders',
        });
    } catch (error) {
        console.error("Error loading order management:", error);
        req.flash('error', 'An error occurred while loading orders.');
        res.redirect('pageerror');
    }
};

// post a order Status
const loadOrderDetails = async (req, res) => {
    const orderId = req.params.id;
    console.log(orderId,"this is loadOrderDetails orderid")

    try {
        const order = await Order.findById(orderId)
            .populate({
                path: 'orderedItem.product',
                model: 'Product',
                select: 'productName productImage price'
            });

        if (!order) {
            return res.status(404).send('Order not found');
        }

        res.render('admin/orderDetails', { order, admin: req.session.admin, 
            active: 'order'   });
    } catch (error) {
        console.error('Error fetching order details:', error.message);
        res.status(500).send('Internal Server Error');
    }
};

// update Orderdetails 
const updateOrderStatus = async (req,res)=>{
    try {
        const { orderId, productId,status } = req.body;
   
        const order = await Order.updateOne(
            { _id: orderId, "orderedItem.productId": productId }, 
            { $set: { "orderedItem.$.productStatus": status } } 
        );
        
        res.redirect()
        
      
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({ success: false, message: 'An error occurred', error });
    }
    
}




// update updateProduct details

const updateProductStatus = async (req, res) => {
    const { orderId, productId, status } = req.body;

    console.log("Status", status)

    try {
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).send('Order not found');
        }

        // Find the item in the order
        const itemIndex = order.orderedItem.findIndex(item => 
            item.product.toString() === productId
        );
        
        if (itemIndex === -1) {
            console.error('Product not found in order:', order.orderedItem);
            return res.status(404).send('Product not found in order');
        }

        // Update the specific item's status
        order.orderedItem[itemIndex].orderStatus = status;
        await order.save();

        res.redirect(`/admin/orderDetails/${orderId}`);

    } catch (error) {
        console.error('Error updating product status:', error);
        res.status(500).send('Internal Server Error');
    }
};


export default {
    loadOrderManagment ,
    loadOrderDetails,
    updateProductStatus,
    updateOrderStatus,
    
}
