import User from "../../models/userSchema.js";
import Order from "../../models/orderSchema.js";
import mongoose from "mongoose";
import Product from "../../models/productSchema.js";
import Wallet from "../../models/walletSchema.js";
import PDFDocument from 'pdfkit'

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


const postCancelOrder = async (req, res) => {
    try {
        const userId = req.session.user;
        const orderId = req.params.orderId;
        const productId = req.params.productId;
        const { reason } = req.body;

        console.log("Cancellation Reason:", reason);

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
        if (order.couponDiscount > 0 && order.orderAmount > 0) {
            const discountRatio = order.couponDiscount / order.orderAmount;
            const itemDiscount = itemToCancel.price * discountRatio;
            refundAmount = itemToCancel.price - itemDiscount;
        } else {
            refundAmount = itemToCancel.price;
        }

        // gst will be add 
        const gstAmount = refundAmount * 0.05;
        refundAmount += gstAmount; 

        let product;
        try {
            product = await Product.findById(itemToCancel.product._id);
        } catch (productFindError) {
            console.error("Error finding product:", productFindError);
            return res.status(500).render('user/orderStatus', {
                message: 'Error finding product.',
                order: order
            });
        }

        if (!product) {
            return res.status(404).render('user/orderStatus', {
                message: 'Product not found.',
                order: order
            });
        }

        product.quantity += quantityToCancel;
        await product.save();


       
        await Order.updateOne(
            { _id: orderId, 'orderedItem.product._id': productId },
            { $set: { 'orderedItem.$.status': 'Cancelled' } }
        );

        

       
        order.orderedItem.forEach(item => {
            if (item.product._id.toString() === productId) {
                item.orderStatus = 'Cancelled';
                item.cancelReason = reason
            }
        });

        
        const allItemsCancelled = order.orderedItem.every(item => item.orderStatus === 'Cancelled');

        if (allItemsCancelled) {
            order.orderStatus = 'Cancelled';
            order.cancelReason = reason
        }
        await order.save()
        //Wallet Logic

        let wallet = await Wallet.findOne({ userId: userId });
        if (!wallet) {
            try {
                wallet = new Wallet({
                    userId: userId,
                    balance: 0,
                    transactions: []
                });
                await wallet.save(); 
                console.log("New wallet created for user:", userId);
            } catch (walletCreationError) {
                console.error("Error creating wallet:", walletCreationError);
                return res.status(500).render('user/orderStatus', {
                    message: 'Error processing cancellation: Wallet creation failed',
                    order: null
                });
            }
        }


        console.log("Wallet balance before refund:", wallet.balance);
        console.log("Refund amount:", refundAmount);

        const initialBalance = wallet.balance; 


        wallet.balance += refundAmount;

        const newTransaction = {
            amount: refundAmount,
            transactionsMethod: 'Refund',
            date: new Date(),
            orderId: orderId
        };

        wallet.transactions.push(newTransaction);

         

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

const returnProduct = async (req, res) => {
    try {
      const { orderId, productId } = req.params;
      const { returnReason } = req.body;
      const user = req.session.user;
  
      console.log("Request body:", req.body);
      console.log("Order ID:", orderId, "Product ID:", productId, "Return Reason:", returnReason);
  
      if (!mongoose.Types.ObjectId.isValid(orderId) || !mongoose.Types.ObjectId.isValid(productId)) {
        return res.status(400).json({ message: "Invalid order or product ID" });
      }
  
      const order = await Order.findById(orderId);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
  
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
  
      const orderItem = order.orderedItem.find(
        (item) => item.product.toString() === productId
      );
      if (!orderItem) {
        return res.status(400).json({ message: "Product not found in this order" });
      }
  
      if (order.userId.toString() !== user) {
        return res.status(403).json({ message: "Unauthorized: Order does not belong to user" });
      }
  
      // Update item-level status and order-level return reason
      orderItem.orderStatus = "Request"; // Update the specific item's status
      orderItem.returnReason = returnReason || "No reason provided";
  
      await order.save();
      console.log("Updated order:", order); // Debug the saved order
  
      res.status(200).json({ message: "Return request submitted successfully" });
    } catch (error) {
      console.error("Error requesting return:", error.message);
      res.status(500).json({ message: "Failed to submit return request" });
    }
  };
 
  const invoiceController = {
    generateAndDownload: async (req, res) => {
        try {
            const { orderId } = req.params;

            if (!orderId || !orderId.match(/^[0-9a-fA-F]{24}$/)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid order ID format'
                });
            }

            const order = await Order.findById(orderId)
                .populate('orderedItem.product')
                .populate('userId');

            if (!order) {
                return res.status(404).json({
                    success: false,
                    message: 'Order not found'
                });
            }

            // Create PDF document
            const doc = new PDFDocument({
                margin: 50,
                size: 'A4'
            });

            // Set response headers
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=invoice-${orderId}.pdf`);

            // Pipe the PDF directly to the response
            doc.pipe(res);

            // Add content to PDF
            // Header
            doc.fontSize(20)
                .text('INVOICE', { align: 'center' })
                .moveDown();

            // Company Details
            doc.fontSize(12)
                .text('EcoBuy', { align: 'left' })
                .text('Email: EcoBuy@company.com')
                .moveDown();

            // Invoice Details
            const createdAt = order.createdAt ? new Date(order.createdAt) : new Date();
            const dueDate = new Date(createdAt.getTime() + 30 * 24 * 60 * 60 * 1000);
            
            doc.text(`Invoice #: ${orderId}`)
               .text(`Date: ${createdAt.toLocaleDateString()}`)
               .text(`Due Date: ${dueDate.toLocaleDateString()}`)
               .moveDown();

            // Customer Details
            doc.text('Bill To:')
            order.deliveryAddress.forEach((address) => {
                doc.text(order.userId?.email || 'N/A')
                .text(order.userId?.mobile || 'N/A')
                .text(address.addressType || 'N/A')
                .text(`${address.city || 'N/A'}, ${address.state || 'N/A'} ${address.pincode || 'N/A'}`)
                .text(address.landMark || 'N/A')
                .moveDown();
            });

            // Table Header
            const tableTop = doc.y;
            const columnWidth = (doc.page.width - 100) / 6;

            ['Product', 'Quantity', 'Price', 'Status', 'Total'].forEach((header, i) => {
                doc.text(header, 50 + (i * columnWidth), tableTop, {
                    width: columnWidth,
                    align: 'left'
                });
            });

            // Draw line under headers
            doc.moveTo(50, tableTop + 20)
                .lineTo(doc.page.width - 50, tableTop + 20)
                .stroke();

            // Table Content
            let tableContentTop = tableTop + 30;
            order.orderedItem.forEach((item, index) => {
                const y = tableContentTop + (index * 20);
                
                doc.fontSize(10);
                
                doc.text(item.product?.productName || 'Product Unavailable', 50, y, {
                    width: columnWidth,
                    align: 'left'
                });
                
                doc.text(item.quantity.toString(), 50 + (columnWidth * 2), y, {
                    width: columnWidth,
                    align: 'left'
                });
                
                doc.text(`₹${Number(item.price).toFixed(2)}`, 50 + (columnWidth * 3), y, {
                    width: columnWidth,
                    align: 'left'
                });
                
                doc.text(item.orderStatus || 'N/A', 50 + (columnWidth * 4), y, {
                    width: columnWidth,
                    align: 'left'
                });
                
                doc.text(`₹${(item.quantity * Number(item.price)).toFixed(2)}`, 50 + (columnWidth * 5), y, {
                    width: columnWidth,
                    align: 'left'
                });
            });

            // Total Amount
            doc.moveDown()
                .moveTo(50, doc.y)
                .lineTo(doc.page.width - 50, doc.y)
                .stroke()
                .moveDown();

            doc.fontSize(12)
                .text(`Total Amount: ₹${Number(order.totalPrice).toFixed(2)}`, {
                    align: 'right'
                })
                .text(`Payment Method: ${order.paymentMethod || 'N/A'}`, {
                    align: 'right'
                });

            // Finalize the PDF
            doc.end();

        } catch (error) {
            console.error('Error generating invoice:', error);
            res.status(500).json({
                success: false,
                message: 'Error generating invoice',
                error: error.message
            });
        }
    }
};
  

export default {
    orderDetails,
    loadorderStatus,
   postCancelOrder,
   returnProduct,
   invoiceController
}