import User from "../../models/userSchema.js";
import Order from "../../models/orderSchema.js";
import mongoose from "mongoose";
import Product from "../../models/productSchema.js";
import Wallet from "../../models/walletSchema.js";
import PDFDocument from "pdfkit";
import Cart from "../../models/cartSchema.js";
import Wishlist from "../../models/wishlistSchema.js";

const orderDetails = async (req, res) => {
  let cartCount = 0;
  let wishlistCount = 0;

  try {
    const userId = req.session.user;
    const user = await User.findOne({ _id: userId });

    if (userId) {
      const cart = await Cart.findOne({ userId: userId });

      if (cart && cart.items) {
        cartCount = cart.items.length;
        console.log(cartCount);
      }
      const wishlist = await Wishlist.find({ user: userId });
      wishlistCount = wishlist.length;
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 3;
    const skip = (page - 1) * limit;

    const totalOrders = await Order.countDocuments({ userId: userId });
    const orders = await Order.find({ userId: userId })
      .populate("orderedItem.product")
      .sort({ _id: -1 })
      .skip(skip)
      .limit(limit);
    const totalPages = Math.ceil(totalOrders / limit);
    res.render("user/order-details", {
      orders,
      user,
      currentPage: page,
      totalPages,
      cartCount,
      wishlistCount,
    });
  } catch (error) {
    console.log("Error while running order page:", error.message);
    res.status(500).send("Server error");
  }
};

const loadorderStatus = async (req, res) => {
  let cartCount = 0;
  let wishlistCount = 0;
  try {
    const orderId = req.params.id;
    const userId = req.session.user;
    const userData = await User.findOne({ _id: userId });
    console.log("Attempting to find order with ID:", orderId);

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      console.log("Invalid order ID format:", orderId);
      return res.redirect("page");
    }

    const order = await Order.findById(orderId);

    if (!order) {
      console.log("Order not found:", orderId);
      return res.redirect("page");
    }

    const populatedOrder = await Order.findById(orderId).populate({
      path: "orderedItem.product",
      model: "Product",
      select: "productName productImage price",
    });

    if (userId) {
      const cart = await Cart.findOne({ userId: userId });

      if (cart && cart.items) {
        cartCount = cart.items.length;
        console.log(cartCount);
      }
      const wishlist = await Wishlist.find({ user: userId });
      wishlistCount = wishlist.length;
    }

    if (!populatedOrder) {
      console.log("Failed to populate order data");
      return res.redirect("page");
    }

    res.render("user/orderStatus", {
      user: userData,
      order: populatedOrder,
      message: req.query.error || null,
      cartCount,
      wishlistCount,
    });
  } catch (error) {
    console.error("Detailed error in loadorderStatus:", {
      error: error.message,
      stack: error.stack,
      orderId: req.params.id,
      userId: req.session.user,
    });

    console.log("Full error:", error.message);

    return res.render("user/orderStatus", {
      order: null,
      message: "Error loading order details",
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

    const order = await Order.findOne({
      userId: userId,
      _id: orderId,
    }).populate("orderedItem.product");

    if (!order) {
      return res.status(404).render("user/orderStatus", {
        message: "Order not found",
        order: null,
      });
    }

    const itemToCancel = order.orderedItem.find(
      (item) => item.product._id.toString() === productId
    );

    if (!itemToCancel) {
      return res.status(404).render("user/orderStatus", {
        message: "Product not found in this order",
        order: null,
      });
    }

    const quantityToCancel = itemToCancel.quantity;
    const itemPrice = itemToCancel.price;

    // Calculate proportional discount for this item
    let itemDiscount = 0;
    if (order.discount > 0 && order.totalPrice > 0) {
      const discountRatio = order.discount / order.totalPrice;
      itemDiscount = itemPrice * discountRatio;
    }

    // Calculate refund amount (item price minus proportional discount)
    let refundAmount = itemPrice - itemDiscount;

    const gstAmount = refundAmount * 0.05;
    const totalRefundAmount = refundAmount + gstAmount;

    // Find the product to update inventory
    let product;
    try {
      product = await Product.findById(itemToCancel.product._id);
    } catch (productFindError) {
      console.error("Error finding product:", productFindError);
      return res.status(500).render("user/orderStatus", {
        message: "Error finding product.",
        order: order,
      });
    }

    if (!product) {
      return res.status(404).render("user/orderStatus", {
        message: "Product not found.",
        order: order,
      });
    }

    // Update product inventory
    product.quantity += quantityToCancel;
    await product.save();

    // Mark item as cancelled in the database
    await Order.updateOne(
      { _id: orderId, "orderedItem.product": productId },
      {
        $set: {
          "orderedItem.$.orderStatus": "Cancelled",
          "orderedItem.$.cancelReason": reason,
        },
      }
    );

    order.orderedItem.forEach((item) => {
      if (item.product._id.toString() === productId) {
        item.orderStatus = "Cancelled";
        item.cancelReason = reason;
      }
    });

    // Recalculate totalPrice based on non-cancelled items only
    const activeTotalPrice = order.orderedItem.reduce((total, item) => {
      if (item.orderStatus !== "Cancelled") {
        return total + item.price;
      }
      return total;
    }, 0);

    // Update the totalPrice with the new calculated value
    order.totalPrice = activeTotalPrice;

    // Check if all items are cancelled
    const allItemsCancelled = order.orderedItem.every(
      (item) => item.orderStatus === "Cancelled"
    );
    if (allItemsCancelled) {
      order.orderStatus = "Cancelled";
      order.discount = 0;
      order.finalAmount = 0;
    } else {
      // Recalculate discount for the remaining items
      if (order.couponApplied && order.totalPrice > 0) {
        const originalDiscountPercentage =
          (order.discount / (order.totalPrice + itemPrice)) * 100;
        order.discount = (order.totalPrice * originalDiscountPercentage) / 100;
      }

      // Calculate final amount including GST
      const remainingAfterDiscount = order.totalPrice - order.discount;
      order.finalAmount =
        remainingAfterDiscount + remainingAfterDiscount * 0.05; // Adding 5% GST
    }

    // Save the updated order
    await order.save();

    // Wallet Logic
    let wallet = await Wallet.findOne({ userId: userId });
    if (!wallet) {
      try {
        wallet = new Wallet({
          userId: userId,
          balance: 0,
          transactions: [],
        });
        await wallet.save();
        console.log("New wallet created for user:", userId);
      } catch (walletCreationError) {
        console.error("Error creating wallet:", walletCreationError);
        return res.status(500).render("user/orderStatus", {
          message: "Error processing cancellation: Wallet creation failed",
          order: null,
        });
      }
    }

    console.log("Wallet balance before refund:", wallet.balance);
    console.log("Refund amount:", totalRefundAmount);

    const initialBalance = wallet.balance;

    wallet.balance += totalRefundAmount;

    const newTransaction = {
      amount: totalRefundAmount,
      transactionsMethod: "Refund",
      date: new Date(),
      orderId: orderId,
    };

    wallet.transactions.push(newTransaction);

    await wallet
      .save()
      .then((savedWallet) => {
        console.log(
          "Wallet saved successfully. New balance:",
          savedWallet.balance
        );
        console.log("Order after cancellation:", {
          totalPrice: order.totalPrice,
          discount: order.discount,
          finalAmount: order.finalAmount,
        });

        const finalBalance = savedWallet.balance;
        if (finalBalance !== initialBalance + totalRefundAmount) {
          console.warn(
            "WARNING: Wallet balance mismatch! Expected:",
            initialBalance + totalRefundAmount,
            "Actual:",
            finalBalance
          );
        }

        // Render success
        res.render("user/orderStatus", {
          message: `Product cancelled successfully. ₹${totalRefundAmount.toFixed(
            2
          )} added to your wallet.`,
          order: order,
        });
      })
      .catch((err) => {
        console.error("Error saving wallet:", err);
        return res.status(500).render("user/orderStatus", {
          message: "Error processing cancellation: Failed to update wallet",
          order: null,
        });
      });
  } catch (error) {
    console.error("Error during order cancellation:", error);
    res.status(500).render("user/orderStatus", {
      message: "Error processing cancellation",
      order: null,
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
    console.log(
      "Order ID:",
      orderId,
      "Product ID:",
      productId,
      "Return Reason:",
      returnReason
    );

    if (
      !mongoose.Types.ObjectId.isValid(orderId) ||
      !mongoose.Types.ObjectId.isValid(productId)
    ) {
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
      return res
        .status(400)
        .json({ message: "Product not found in this order" });
    }

    if (order.userId.toString() !== user) {
      return res
        .status(403)
        .json({ message: "Unauthorized: Order does not belong to user" });
    }

    orderItem.orderStatus = "Request";
    orderItem.returnReason = returnReason || "No reason provided";

    await order.save();
    console.log("Updated order:", order);

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
          message: "Invalid order ID format",
        });
      }
  
      const order = await Order.findById(orderId)
        .populate("orderedItem.product")
        .populate("userId");
  
      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found",
        });
      }
  
      // Create PDF document
      const doc = new PDFDocument({
        margin: 50,
        size: "A4",
      });
  
      // Set response headers
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=invoice-${orderId}.pdf`
      );
  
      // Pipe the PDF directly to the response
      doc.pipe(res);
  
      // Define colors that match HTML design
      const primaryColor = '#4361ee';
      const textColor = '#333333';
      const lightTextColor = '#6c757d';
      const borderColor = '#dee2e6';
  
      // Helper function for drawing styled sections
      const drawSection = (title, content, x, y, width) => {
        // Section background
        doc
          .rect(x, y, width, 120)
          .fillAndStroke('#f9f9f9', borderColor);
        
        // Left accent border
        doc
          .rect(x, y, 4, 120)
          .fill(primaryColor);
        
        // Title
        doc
          .font('Helvetica-Bold')
          .fontSize(14)
          .fillColor(primaryColor)
          .text(title, x + 15, y + 15, { width: width - 30 });
        
        // Divider
        doc
          .moveTo(x + 15, y + 40)
          .lineTo(x + width - 15, y + 40)
          .strokeColor(borderColor)
          .stroke();
        
        // Content
        doc
          .font('Helvetica')
          .fontSize(10)
          .fillColor(textColor)
          .text(content, x + 15, y + 50, { width: width - 30 });
      };
  
      // Header
      doc
        .rect(50, 50, doc.page.width - 100, 80)
        .fillAndStroke('white', borderColor);
  
      // Company Logo/Name box
      doc
        .rect(70, 60, 150, 60)
        .fillAndStroke(primaryColor);
      
      doc
        .font('Helvetica-Bold')
        .fontSize(16)
        .fillColor('white')
        .text('EcoBuy', 70, 80, { width: 150, align: 'center' });
  
      // Invoice Title
      doc
        .font('Helvetica-Bold')
        .fontSize(24)
        .fillColor(primaryColor)
        .text('INVOICE', doc.page.width - 200, 65, { align: 'right' });
      
      doc
        .font('Helvetica')
        .fontSize(12)
        .fillColor(lightTextColor)
        .text(`Invoice #${orderId}`, doc.page.width - 200, 95, { align: 'right' });
  
      // Calculate dates
      const createdAt = order.createdAt ? new Date(order.createdAt) : new Date();
      const dueDate = new Date(createdAt.getTime() + 30 * 24 * 60 * 60 * 1000);
      const invoiceDate = createdAt.toLocaleDateString();
      const invoiceDueDate = dueDate.toLocaleDateString();
  
      // Customer and Company Information Grid
      const sectionY = 150;
      const sectionWidth = (doc.page.width - 120) / 2;
  
      // Customer Details
      let customerInfo = '';
      if (order.userId) {
        customerInfo += `Name: ${order.userId.name || 'N/A'}\n`;
        customerInfo += `Email: ${order.userId.email || 'N/A'}\n`;
        customerInfo += `Phone: ${order.userId.mobile || 'N/A'}`;
      } else {
        customerInfo = 'Customer information not available';
      }
      drawSection('Customer Details', customerInfo, 50, sectionY, sectionWidth);
  
      // Company Details
      let companyInfo = '';
      companyInfo += 'EcoBuy\n';
      companyInfo += 'Address: 123 Eco Street, Green City\n';
      companyInfo += 'Email: EcoBuy@company.com\n';
      companyInfo += 'Phone: +91 98765 43210\n';
      companyInfo += 'GST: 29AADCB2230M1ZT';
      drawSection('Company Details', companyInfo, 50 + sectionWidth + 20, sectionY, sectionWidth);
  
      // Shipping and Invoice Details
      const sectionY2 = sectionY + 140;
      
      // Shipping Address
      let shippingInfo = '';
      if (order.deliveryAddress && order.deliveryAddress.length > 0) {
        const address = order.deliveryAddress[0];
        shippingInfo += `Type: ${address.addressType || 'N/A'}\n`;
        shippingInfo += `${address.city || 'N/A'}, ${address.state || 'N/A'}\n`;
        shippingInfo += `Pincode: ${address.pincode || 'N/A'}\n`;
        shippingInfo += `Landmark: ${address.landMark || 'N/A'}`;
      } else {
        shippingInfo = 'Shipping information not available';
      }
      drawSection('Shipping Address', shippingInfo, 50, sectionY2, sectionWidth);
  
      // Invoice Details
      let invoiceInfo = '';
      invoiceInfo += `Invoice Date: ${invoiceDate}\n`;
      invoiceInfo += `Due Date: ${invoiceDueDate}\n`;
      invoiceInfo += `Payment Method: ${order.paymentMethod || 'N/A'}`;
      drawSection('Invoice Details', invoiceInfo, 50 + sectionWidth + 20, sectionY2, sectionWidth);
  
      // Products Table
      const tableTop = sectionY2 + 140;
      
      // Table Header Background
      doc
        .rect(50, tableTop, doc.page.width - 100, 30)
        .fill(primaryColor);
      
      // Table Headers
      const columns = [
        { header: 'Product', width: 0.35 },
        { header: 'Quantity', width: 0.15 },
        { header: 'Price', width: 0.15 },
        { header: 'Total', width: 0.15 },
        { header: 'Status', width: 0.20 }
      ];
      
      let xPosition = 60;
      columns.forEach(column => {
        const columnWidth = (doc.page.width - 120) * column.width;
        doc
          .font('Helvetica-Bold')
          .fontSize(12)
          .fillColor('white')
          .text(column.header, xPosition, tableTop + 10);
        xPosition += columnWidth;
      });
  
      // Table Content
      let yPosition = tableTop + 40;
      let rowColor = false; // For alternating row colors
      
      order.orderedItem.forEach((item, index) => {
        // Row background for alternating colors
        if (rowColor) {
          doc
            .rect(50, yPosition - 10, doc.page.width - 100, 30)
            .fill('#f8f9fa');
        }
        rowColor = !rowColor;
  
        // Item content
        let xPos = 60;
        const productName = item.product?.productName || 'Product Unavailable';
        const quantity = item.quantity.toString();
        const price = `₹${Number(item.price).toFixed(2)}`;
        const total = `₹${(item.quantity * Number(item.price)).toFixed(2)}`;
        const status = item.orderStatus || 'N/A';
  
        // Print row data
        doc.font('Helvetica').fontSize(10).fillColor(textColor);
        
        // Product name
        doc.text(productName, xPos, yPosition);
        xPos += (doc.page.width - 120) * 0.35;
        
        // Quantity
        doc.text(quantity, xPos, yPosition);
        xPos += (doc.page.width - 120) * 0.15;
        
        // Price
        doc.text(price, xPos, yPosition);
        xPos += (doc.page.width - 120) * 0.15;
        
        // Total
        doc.text(total, xPos, yPosition);
        xPos += (doc.page.width - 120) * 0.15;
        
        // Status - with styled "tag"
        let statusColor;
        switch(status.toLowerCase()) {
          case 'delivered': 
            statusColor = '#38b000'; break;
          case 'shipped': 
            statusColor = '#ff9e00'; break;
          default: 
            statusColor = '#4cc9f0'; break;
        }
        
        // Draw status tag background
        doc
          .roundedRect(xPos, yPosition - 5, 80, 20, 10)
          .fill(statusColor);
        
        // Status text
        doc
          .font('Helvetica-Bold')
          .fontSize(10)
          .fillColor('white')
          .text(status, xPos + 10, yPosition);
        
        yPosition += 30;
      });
  
      // Summary Section
      const summaryY = yPosition + 20;
      const summaryWidth = 250;
      const summaryX = doc.page.width - 50 - summaryWidth;
      
      // Summary box
      doc
        .rect(summaryX, summaryY, summaryWidth, 90)
        .fillAndStroke('white', borderColor);
      
      // Summary rows
      doc.font('Helvetica').fontSize(12).fillColor(textColor);
      
      // Subtotal
      doc.text('Subtotal:', summaryX + 20, summaryY + 15);
      doc.text(`₹${Number(order.finalAmount).toFixed(2)}`, summaryX + summaryWidth - 70, summaryY + 15, { align: 'right' });
      
      // Draw divider
      doc
        .moveTo(summaryX + 20, summaryY + 35)
        .lineTo(summaryX + summaryWidth - 20, summaryY + 35)
        .strokeColor(borderColor)
        .stroke();
      
      // Tax
      doc.text('Tax (Included):', summaryX + 20, summaryY + 45);
      doc.text('₹0.00', summaryX + summaryWidth - 70, summaryY + 45, { align: 'right' });
      
      // Shipping
      doc.text('Shipping:', summaryX + 20, summaryY + 65);
      doc.text('₹0.00', summaryX + summaryWidth - 70, summaryY + 65, { align: 'right' });
  
      // Final total background
      doc
        .rect(summaryX, summaryY + 90, summaryWidth, 40)
        .fill(primaryColor);
      
      // Final total
      doc
        .font('Helvetica-Bold')
        .fontSize(14)
        .fillColor('white')
        .text('Total:', summaryX + 20, summaryY + 105);
        
      doc
        .font('Helvetica-Bold')
        .fontSize(14)
        .fillColor('white')
        .text(`₹${Number(order.finalAmount).toFixed(2)}`, summaryX + summaryWidth - 70, summaryY + 105, { align: 'right' });
      
      // Thank you message
      doc
        .font('Helvetica-Bold')
        .fontSize(16)
        .fillColor(primaryColor)
        .text('Thank you for your business!', 50, summaryY + 150, { align: 'center' });
      
      // Footer
      const footerY = doc.page.height - 100;
      doc
        .moveTo(50, footerY)
        .lineTo(doc.page.width - 50, footerY)
        .strokeColor(borderColor)
        .stroke();
      
      doc
        .font('Helvetica')
        .fontSize(10)
        .fillColor(lightTextColor)
        .text('This is a computer-generated invoice and does not require a signature.', 50, footerY + 20, { align: 'center' })
        .text('For any questions regarding this invoice, please contact our support team.', 50, footerY + 40, { align: 'center' });
  
      // Finalize the PDF
      doc.end();
    } catch (error) {
      console.error("Error generating invoice:", error);
      res.status(500).json({
        success: false,
        message: "Error generating invoice",
        error: error.message,
      });
    }
  },
};

export default {
  orderDetails,
  loadorderStatus,
  postCancelOrder,
  returnProduct,
  invoiceController,
};
