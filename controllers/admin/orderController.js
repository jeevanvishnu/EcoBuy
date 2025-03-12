import Order from "../../models/orderSchema.js"
import Address from "../../models/addressSchema.js";
import User from "../../models/userSchema.js";

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



export default {
    loadOrderManagment 
}