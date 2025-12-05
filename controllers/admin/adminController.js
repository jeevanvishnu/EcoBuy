import User from "../../models/userSchema.js";
// import mongoose from "mongoose";
import bcrypt from 'bcrypt'
import Order from "../../models/orderSchema.js";
import Product from "../../models/productSchema.js";
import Category from "../../models/categorySchema.js";
import moment from "moment";
// create on page error page

const pageerror = (req, res) => {

    res.render('admin/admin-error')
}

// setup on login page
const loadLogin = async (req, res) => {

    if (req.session.admin) {

        return res.redirect('/admin')
    }

    res.render('admin/admin-login', { message: null , success:true})
}


const login = async (req, res) => {

    try {

        const { email, password } = req.body
        const admin = await User.findOne({ email, isAdmin: true })


        if (admin) {
            const isMatch = bcrypt.compare(password, admin.password)

            if (isMatch) {
                req.session.admin = true

                return res.redirect('/admin')
            } else {
                return res.redirect('/login')
            }
        }

    } catch (error) {

        console.log('login error', error.message)
        return res.redirect('pageerror')

    }
}






const loadDashboard = async (req, res) => {
  if (!req.session.admin) {
      return res.redirect('/admin/login');
  }
  
  try {
      console.log("Starting dashboard data fetch...");

      
      const timeRange = req.query.timeRange || 'yearly';
      
      // Set date filter based on time range
      let dateFilter = {};
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth();

      if (timeRange === 'yearly') {
          dateFilter = {
              $gte: new Date(currentYear, 0, 1),
              $lte: new Date(currentYear, 11, 31, 23, 59, 59, 999)
          };
      } else if (timeRange === 'monthly') {
          dateFilter = {
              $gte: new Date(currentYear, currentMonth, 1),
              $lte: new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999)
          };
      } else if (timeRange === 'weekly') {
          const startOfWeek = new Date(currentDate);
          startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
          startOfWeek.setHours(0, 0, 0, 0);
          
          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(startOfWeek.getDate() + 6);
          endOfWeek.setHours(23, 59, 59, 999);
          
          dateFilter = {
              $gte: startOfWeek,
              $lte: endOfWeek
          };
      }

      
      const totalRevenueData = await Order.aggregate([
          { $unwind: "$orderedItem" },
          { $match: { "orderedItem.orderStatus": "Delivered" } },
          {
              $group: {
                  _id: null,
                  totalRevenue: { $sum: "$finalAmount" },
                  totalProfit: { $sum: { $multiply: [
                      "$finalAmount", 
                      0.2 
                  ]}}
              }
          }
      ]);

      const totalRevenue = totalRevenueData.length ? totalRevenueData[0].totalRevenue : 0;
      const totalProfit = totalRevenueData.length ? totalRevenueData[0].totalProfit : 0;

      // 2. Get sales data by time range
      let salesDataPipeline;
      let salesDataLabels;

      if (timeRange === 'yearly') {
          salesDataPipeline = [
              { $unwind: "$orderedItem" },
              {
                  $match: {
                      "orderedItem.orderStatus": "Delivered",
                      "date": dateFilter
                  }
              },
              {
                  $group: {
                      _id: { month: { $month: "$date" } },
                      revenue: { $sum: "$finalAmount" },
                      profit: { $sum: { $multiply: ["$finalAmount", 0.2] }} // 20% profit margin
                  }
              },
              { $sort: { "_id.month": 1 } }
          ];
          salesDataLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      } else if (timeRange === 'monthly') {
          salesDataPipeline = [
              { $unwind: "$orderedItem" },
              {
                  $match: {
                      "orderedItem.orderStatus": "Delivered",
                      "date": dateFilter
                  }
              },
              {
                  $group: {
                      _id: { day: { $dayOfMonth: "$date" } },
                      revenue: { $sum: "$finalAmount" },
                      profit: { $sum: { $multiply: ["$finalAmount", 0.2] }}
                  }
              },
              { $sort: { "_id.day": 1 } }
          ];
          
         
          const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
          salesDataLabels = Array.from({ length: daysInMonth }, (_, i) => (i + 1).toString());
      } else if (timeRange === 'weekly') {
          salesDataPipeline = [
              { $unwind: "$orderedItem" },
              {
                  $match: {
                      "orderedItem.orderStatus": "Delivered",
                      "date": dateFilter
                  }
              },
              {
                  $group: {
                      _id: { day: { $dayOfWeek: "$date" } },
                      revenue: { $sum: "$finalAmount" },
                      profit: { $sum: { $multiply: ["$finalAmount", 0.2] }}
                  }
              },
              { $sort: { "_id.day": 1 } }
          ];
          salesDataLabels = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      }

      const salesData = await Order.aggregate(salesDataPipeline);

      // Format sales data for the chart
      const formattedSalesData = {
          labels: salesDataLabels,
          values: Array(salesDataLabels.length).fill(0),
          profits: Array(salesDataLabels.length).fill(0)
      };

      salesData.forEach(item => {
          let index;
          if (timeRange === 'yearly') {
              index = item._id.month - 1;
          } else if (timeRange === 'monthly') {
              index = item._id.day - 1;
          } else if (timeRange === 'weekly') {
              index = item._id.day % 7; // Convert MongoDB's day of week (1-7, Sunday=1) to array index
          }
          
          if (index >= 0 && index < formattedSalesData.values.length) {
              formattedSalesData.values[index] = item.revenue;
              formattedSalesData.profits[index] = item.profit;
          }
      });

      // 3. Get top 10 selling products
      const topProducts = await Order.aggregate([
          { $unwind: "$orderedItem" },
          { $match: { "orderedItem.orderStatus": "Delivered" } },
          {
              $group: {
                  _id: "$orderedItem.product",
                  totalSales: { $sum: "$orderedItem.quantity" },
                  revenue: { $sum: { $multiply: ["$orderedItem.quantity", "$orderedItem.price"] } }
              }
          },
          { $sort: { totalSales: -1 } },
          { $limit: 10 },
          {
              $lookup: {
                  from: "products",
                  localField: "_id",
                  foreignField: "_id",
                  as: "productDetails"
              }
          },
          {
              $project: {
                  productName: { $ifNull: [{ $arrayElemAt: ["$productDetails.productName", 0] }, "Unknown Product"] },
                  totalSales: 1,
                  revenue: 1
              }
          }
      ]);

      // 4. Get top 10 selling categories
      const topCategories = await Order.aggregate([
          { $unwind: "$orderedItem" },
          { $match: { "orderedItem.orderStatus": "Delivered" } },
          {
              $lookup: {
                  from: "products",
                  localField: "orderedItem.product",
                  foreignField: "_id",
                  as: "product"
              }
          },
          { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
          {
              $lookup: {
                  from: "categories",
                  localField: "product.category",
                  foreignField: "_id",
                  as: "category"
              }
          },
          { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
          {
              $group: {
                  _id: { $ifNull: ["$category._id", null] },
                  name: { $first: { $ifNull: ["$category.name", "Uncategorized"] } },
                  totalSales: { $sum: "$orderedItem.quantity" },
                  revenue: { $sum: { $multiply: ["$orderedItem.quantity", "$orderedItem.price"] } }
              }
          },
          { $sort: { totalSales: -1 } },
          { $limit: 10 }
      ]);

      // 5. Get top 10 selling brands
      const topBrands = await Order.aggregate([
          { $unwind: "$orderedItem" },
          { $match: { "orderedItem.orderStatus": "Delivered" } },
          {
              $lookup: {
                  from: "products",
                  localField: "orderedItem.product",
                  foreignField: "_id",
                  as: "product"
              }
          },
          { $unwind: { path: "$product", preserveNullAndEmptyArrays: true } },
          {
              $group: {
                  _id: { $ifNull: ["$product.brand", null] },
                  name: { $first: { $ifNull: ["$product.brand", "Unknown Brand"] } },
                  totalSales: { $sum: "$orderedItem.quantity" },
                  revenue: { $sum: { $multiply: ["$orderedItem.quantity", "$orderedItem.price"] } }
              }
          },
          { $sort: { totalSales: -1 } },
          { $limit: 10 }
      ]);

      // 6. Count statistics
      const [totalOrders, totalProducts, activeProducts, totalUsers] = await Promise.all([
          Order.countDocuments(),
          Product.countDocuments(),
          Product.countDocuments({ status: "Available" }),
          User.countDocuments({ isBlocked: false })
      ]);

      // 7. Get category distribution
      const categoryData = await Category.aggregate([
          {
              $lookup: {
                  from: "products",
                  localField: "_id",
                  foreignField: "category",
                  as: "products"
              }
          },
          {
              $project: {
                  name: "$name",
                  count: { $size: "$products" }
              }
          }
      ]);

      const formattedCategoryData = {
          labels: categoryData.map(cat => cat.name || "Unknown"),
          values: categoryData.map(cat => cat.count || 0)
      };

      // Assemble complete dashboard data
      const dashboardData = {
          totalRevenue,
          totalProfit,
          totalOrders,
          totalProducts,
          activeProducts,
          totalUsers,
          topProducts,
          topCategories,
          topBrands,
          salesData: formattedSalesData,
          categoryData: formattedCategoryData,
          timeRange
      };
     

      // Return JSON if it's an AJAX request
      if (req.xhr || req.headers.accept.includes('application/json')) {
          return res.json(dashboardData);
      }

      // Otherwise render the dashboard template
      return res.render('admin/dashboard', {
          ...dashboardData,
          admin: req.session.admin,
          active: 'dashboard'
      });

  } catch (error) {
      console.error("Error in loadDashboard:", error);
      if (req.xhr || req.headers.accept.includes('application/json')) {
          return res.status(500).json({
              error: "Server error",
              details: error.message
          });
      }
      return res.status(500).render('admin/admin-error', { error: "An error occurred loading the dashboard" });
  }
};


// create logout 

const logout = (req, res) => {

    try {

        req.session.destroy(err => {
            if (err) {
                return res.redirect('/pageerror')
            }
            return res.redirect('login')
        })


    } catch (error) {
        console.log("Session destroy error", error.message)
        res.redirect('pageerror')

    }
}

export default {
    loadLogin,
    login,
    loadDashboard,
    pageerror,
    logout
}