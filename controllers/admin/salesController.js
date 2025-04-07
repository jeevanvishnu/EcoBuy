import Order from "../../models/orderSchema.js"
import exceljs from 'exceljs'
import PDFDocument from 'pdfkit'

export const salesreport = async (req, res) => {
    try {
        res.render('admin/salesReport', {
            admin: req.session.admin,
            active: 'sales-report',
        });
    } catch (error) {
        console.log('error while load sales', error);
        res.status(500).send('Internal Server Error');
    }
};

export const generateSalesReport = async (req, res) => {
    try {
        const { reportType, startDate, endDate } = req.body;
        let query = {};

        // Set date range based on report type
        switch (reportType) {
            case 'daily': {
                const today = new Date();
                query.date = {
                    $gte: new Date(today.setHours(0, 0, 0, 0)),
                    $lte: new Date(today.setHours(23, 59, 59, 999))
                };
                break;
            }
            case 'weekly': {
                const today = new Date();
                const startOfWeek = new Date(today);
                startOfWeek.setDate(today.getDate() - today.getDay());
                startOfWeek.setHours(0, 0, 0, 0);
                
                const endOfWeek = new Date(startOfWeek);
                endOfWeek.setDate(startOfWeek.getDate() + 6);
                endOfWeek.setHours(23, 59, 59, 999);
                
                query.date = {
                    $gte: startOfWeek,
                    $lte: endOfWeek
                };
                break;
            }
            case 'monthly': {
                const today = new Date();
                query.date = {
                    $gte: new Date(today.getFullYear(), today.getMonth(), 1),
                    $lte: new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999)
                };
                break;
            }
            case 'custom': {
                if (!startDate || !endDate) {
                    return res.status(400).json({
                        status: 'error',
                        message: 'Start date and end date are required for custom reports'
                    });
                }
                
                const startDateTime = new Date(startDate);
                startDateTime.setHours(0, 0, 0, 0);
                
                const endDateTime = new Date(endDate);
                endDateTime.setHours(23, 59, 59, 999);
                
                query.date = {
                    $gte: startDateTime,
                    $lte: endDateTime
                };
                break;
            }
        }

        // Get orders sorted by date in descending order
        const orders = await Order.find(query)
            .populate('userId', 'name email')
            .sort({ date: -1 });

        const summary = {
            totalSales: orders.reduce((acc, order) => acc + order.totalPrice, 0),
            totalOrders: orders.length,
            totalDiscounts: orders.reduce((acc, order) => acc + (order.discount || 0), 0),
            netRevenue: orders.reduce((acc, order) => acc + order.finalAmount, 0)
        };

        res.status(200).json({
            status: 'success',
            data: {
                summary,
                orders: orders.map(order => ({
                    date: order.date,
                    orderId: order._id, 
                    amount: order.totalPrice, 
                    discount: order.discount || 0, 
                    couponCode: order.couponApplied ? 'Coupon Applied' : 'No Coupon', 
                    finalAmount: order.finalAmount, 
                })),
            },
        });
    } catch (error) {
        console.error('Generate Sales Report Error:', error);
        res.status(500).json({
            status: 'error',
            message: error.message,
        });
    }
};

export const exportSalesPDF = async (req, res) => {
    try {
        const { reportType, startDate, endDate } = req.body;
        let query = {};

        // Set date range based on report type with proper date handling
        switch (reportType) {
            case 'daily': {
                const today = new Date();
                const startOfDay = new Date(today);
                startOfDay.setHours(0, 0, 0, 0);
                
                const endOfDay = new Date(today);
                endOfDay.setHours(23, 59, 59, 999);
                
                query.date = {
                    $gte: startOfDay,
                    $lte: endOfDay
                };
                break;
            }
            case 'weekly': {
                const today = new Date();
                const startOfWeek = new Date(today);
                startOfWeek.setDate(today.getDate() - today.getDay());
                startOfWeek.setHours(0, 0, 0, 0);
                
                const endOfWeek = new Date(startOfWeek);
                endOfWeek.setDate(startOfWeek.getDate() + 6);
                endOfWeek.setHours(23, 59, 59, 999);
                
                query.date = {
                    $gte: startOfWeek,
                    $lte: endOfWeek
                };
                break;
            }
            case 'monthly': {
                const today = new Date();
                const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
                
                query.date = {
                    $gte: startOfMonth,
                    $lte: endOfMonth
                };
                break;
            }
            case 'custom': {
                if (!startDate || !endDate) {
                    return res.status(400).json({
                        status: 'error',
                        message: 'Start date and end date are required for custom reports'
                    });
                }
                
                const customStartDate = new Date(startDate);
                customStartDate.setHours(0, 0, 0, 0);
                
                const customEndDate = new Date(endDate);
                customEndDate.setHours(23, 59, 59, 999);
                
                query.date = {
                    $gte: customStartDate,
                    $lte: customEndDate
                };
                break;
            }
        }

        // Get orders sorted by date in descending order
        const orders = await Order.find(query)
            .populate('userId', 'name email')
            .sort({ date: -1 });

        // Create PDF document with better margins
        const doc = new PDFDocument({
            margin: 50,
            size: 'A4',
            bufferPages: true 
        });

        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=sales-report-${reportType}.pdf`);
        doc.pipe(res);

        // Helper function to format currency
        const formatCurrency = (amount) => `₹${amount.toFixed(2)}`;

        // Add logo and company header
        doc.fontSize(24)
            .font('Helvetica-Bold')
            .text('EcoBuy', { align: 'center' })
            .moveDown(0.2);

        // Add decorative line
        const pageWidth = doc.page.width - 100;
        doc.moveTo(50, doc.y)
            .lineTo(doc.page.width - 50, doc.y)
            .stroke();

        doc.moveDown(0.5)
            .fontSize(16)
            .font('Helvetica')
            .text('Sales Report', { align: 'center' })
            .moveDown();

        // Add report details in a box
        const reportDetailsY = doc.y;
        doc.rect(50, reportDetailsY, pageWidth, 80)
            .fillAndStroke('#f6f6f6', '#cccccc');
        
        doc.fill('#000000')
            .fontSize(12)
            .font('Helvetica-Bold')
            .text('Report Details', 70, reportDetailsY + 10)
            .font('Helvetica')
            .fontSize(10)
            .text(`Report Type: ${reportType.charAt(0).toUpperCase() + reportType.slice(1)}`, 70, reportDetailsY + 30)
            .text(`Generated On: ${new Date().toLocaleString()}`, 70, reportDetailsY + 45)
            .text(`Period: ${new Date(query.date.$gte).toLocaleDateString()} to ${new Date(query.date.$lte).toLocaleDateString()}`, 70, reportDetailsY + 60);

        doc.moveDown(3);

        // Add summary section with a different background - using correct field names
        const totalSales = orders.reduce((acc, order) => acc + order.totalPrice, 0);
        const totalDiscounts = orders.reduce((acc, order) => acc + (order.discount || 0), 0);
        const netRevenue = orders.reduce((acc, order) => acc + order.finalAmount, 0);

        const summaryY = doc.y;
        doc.rect(50, summaryY, pageWidth / 2 - 10, 100)
            .fillAndStroke('#f0f7ff', '#2196f3');
        
        doc.fill('#000000')
            .fontSize(12)
            .font('Helvetica-Bold')
            .text('Summary', 70, summaryY + 10)
            .fontSize(10)
            .font('Helvetica')
            .text(`Total Orders: ${orders.length}`, 70, summaryY + 30)
            .text(`Total Sales: ${formatCurrency(totalSales)}`, 70, summaryY + 45)
            .text(`Total Discounts: ${formatCurrency(totalDiscounts)}`, 70, summaryY + 60)
            .text(`Net Revenue: ${formatCurrency(netRevenue)}`, 70, summaryY + 75);

        doc.moveDown(4);

        // Create table with improved styling
        const tableTop = doc.y;
        const tableHeaders = ['Date', 'Order ID', 'Amount', 'Discount', 'Coupon', 'Final Amount'];
        const columnWidth = pageWidth / tableHeaders.length;

        // Draw table header with gradient
        doc.rect(50, tableTop, pageWidth, 20)
            .fill('#2196f3');

        // Add table headers
        doc.fill('#ffffff');
        tableHeaders.forEach((header, i) => {
            doc.font('Helvetica-Bold')
                .fontSize(10)
                .text(
                    header,
                    50 + (i * columnWidth),
                    tableTop + 5,
                    {
                        width: columnWidth,
                        align: 'center'
                    }
                );
        });

        // Add table content with improved formatting
        let tableContentTop = tableTop + 25;
        let currentPage = 1;

        orders.forEach((order, index) => {
            // Check if we need a new page
            if (tableContentTop > doc.page.height - 150) {
                doc.addPage();
                currentPage++;
                // Reset table content position and redraw headers
                tableContentTop = 50;
                
                // Redraw headers on new page
                doc.rect(50, tableContentTop, pageWidth, 20)
                    .fill('#2196f3');

                doc.fill('#ffffff');
                tableHeaders.forEach((header, i) => {
                    doc.font('Helvetica-Bold')
                        .fontSize(10)
                        .text(
                            header,
                            50 + (i * columnWidth),
                            tableContentTop + 5,
                            {
                                width: columnWidth,
                                align: 'center'
                            }
                        );
                });
                
                tableContentTop += 25;
            }

            // Add zebra striping
            if (index % 2 === 0) {
                doc.rect(50, tableContentTop - 5, pageWidth, 20)
                    .fill('#f8f9fa');
            }

            // Add row data with correct field names
            doc.fill('#000000')
                .font('Helvetica')
                .fontSize(9);

            // Get order ID safely
            const orderId = order.orderId || (order._id ? order._id.toString().slice(-8) : 'N/A');
            
            const rowData = [
                new Date(order.date).toLocaleDateString(),
                orderId,
                formatCurrency(order.totalPrice || 0),
                formatCurrency(order.discount || 0),
                order.couponApplied ? 'Coupon Applied' : 'No Coupon',
                formatCurrency(order.finalAmount || 0)
            ];

            rowData.forEach((text, i) => {
                // Truncate text if it's too long for the column
                let displayText = text;
                if (typeof text === 'string' && text.length > 15) {
                    displayText = text.substring(0, 12) + '...';
                }
                
                doc.text(
                    displayText,
                    50 + (i * columnWidth),
                    tableContentTop,
                    {
                        width: columnWidth,
                        align: 'center'
                    }
                );
            });

            tableContentTop += 20;
        });

        // Add footer to each page
        let pages = doc.bufferedPageRange();
        for (let i = 0; i < pages.count; i++) {
            doc.switchToPage(i);
            
            // Add page border
            doc.rect(40, 40, doc.page.width - 80, doc.page.height - 80)
                .stroke('#cccccc');

            // Add footer
            doc.fontSize(8)
                .text(
                    'Generated by Kuppayam Sales System',
                    50,
                    doc.page.height - 50,
                    {
                        align: 'center',
                        width: pageWidth
                    }
                )
                .text(
                    `Page ${i + 1} of ${pages.count}`,
                    50,
                    doc.page.height - 40,
                    {
                        align: 'center',
                        width: pageWidth
                    }
                );
        }

        // Finalize PDF
        doc.end();

    } catch (error) {
        console.error("Export Sales PDF Error:", error);
        res.status(500).json({ status: 'error', message: 'Internal Server Error' });
    }
};

export const exportSalesExcel = async (req, res) => {
    try {
      const { reportType, startDate, endDate } = req.body;
      let query = {};
      
      // Set date range based on report type
      switch (reportType) {
        case 'daily': {
          const today = new Date();
          const startOfDay = new Date(today);
          startOfDay.setHours(0, 0, 0, 0);
          
          const endOfDay = new Date(today);
          endOfDay.setHours(23, 59, 59, 999);
          
          query.date = {
            $gte: startOfDay,
            $lte: endOfDay
          };
          break;
        }
        case 'weekly': {
          const today = new Date();
          const startOfWeek = new Date(today);
          startOfWeek.setDate(today.getDate() - today.getDay());
          startOfWeek.setHours(0, 0, 0, 0);
          
          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(startOfWeek.getDate() + 6);
          endOfWeek.setHours(23, 59, 59, 999);
          
          query.date = {
            $gte: startOfWeek,
            $lte: endOfWeek
          };
          break;
        }
        case 'monthly': {
          const today = new Date();
          const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
          const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
          
          query.date = {
            $gte: startOfMonth,
            $lte: endOfMonth
          };
          break;
        }
        case 'custom': {
          if (!startDate || !endDate) {
            return res.status(400).json({
              status: 'error',
              message: 'Start date and end date are required for custom reports'
            });
          }
          
          const startDateTime = new Date(startDate);
          startDateTime.setHours(0, 0, 0, 0);
          
          const endDateTime = new Date(endDate);
          endDateTime.setHours(23, 59, 59, 999);
          
          query.date = {
            $gte: startDateTime,
            $lte: endDateTime
          };
          break;
        }
      }
      
      // Get orders sorted by date in descending order
      const orders = await Order.find(query)
        .populate('userId', 'name email')
        .sort({ date: -1 });
      
      const workbook = new exceljs.Workbook();
      const worksheet = workbook.addWorksheet('Sales Report');
      
      // Style the headers
      worksheet.columns = [
        { header: 'Date', key: 'date', width: 15 },
        { header: 'Order ID', key: 'orderId', width: 20 },
        { header: 'Amount', key: 'amount', width: 15 },
        { header: 'Discount', key: 'discount', width: 15 },
        { header: 'Coupon Used', key: 'couponCode', width: 15 },
        { header: 'Final Amount', key: 'finalAmount', width: 15 },
      ];
      
      // Style header row
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };
      
      // Add data rows with correct field names to match PDF export
      orders.forEach(order => {
        worksheet.addRow({
          date: new Date(order.date).toLocaleDateString(),
          orderId: order.orderId || (order._id ? order._id.toString() : 'N/A'),
          amount: order.totalPrice || 0, // Corrected from originalPrice
          discount: order.discount || 0, // Corrected from couponDiscount
          couponCode: order.couponApplied ? 'Coupon Applied' : 'No Coupon', // Consistent with PDF export
          finalAmount: order.finalAmount || 0, // Corrected calculation
        });
      });
      
      // Add summary section
      worksheet.addRow([]); // Empty row
      worksheet.addRow(['Summary']);
      worksheet.addRow(['Total Orders', orders.length]);
      worksheet.addRow(['Total Sales', orders.reduce((acc, order) => acc + (order.totalPrice || 0), 0)]); // Corrected property name
      worksheet.addRow(['Total Discounts', orders.reduce((acc, order) => acc + (order.discount || 0), 0)]); // Corrected property name
      worksheet.addRow(['Net Revenue', orders.reduce((acc, order) => acc + (order.finalAmount || 0), 0)]); // Added net revenue
      
      // Add date range information
      worksheet.addRow([]);
      worksheet.addRow(['Report Information']);
      worksheet.addRow(['Report Type', reportType.charAt(0).toUpperCase() + reportType.slice(1)]);
      worksheet.addRow(['Period', `${new Date(query.date.$gte).toLocaleDateString()} to ${new Date(query.date.$lte).toLocaleDateString()}`]);
      worksheet.addRow(['Generated On', new Date().toLocaleString()]);
      
      // Style summary section
      const summaryStartRow = orders.length + 3;
      worksheet.getRow(summaryStartRow).font = { bold: true };
      worksheet.getRow(summaryStartRow + 5).font = { bold: true };
      
      // Style numbers as currency
      worksheet.getColumn('amount').numFmt = '₹#,##0.00';
      worksheet.getColumn('discount').numFmt = '₹#,##0.00';
      worksheet.getColumn('finalAmount').numFmt = '₹#,##0.00';
      
      // Set response headers
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=sales-report-${reportType}.xlsx`);
      
      // Write to response
      await workbook.xlsx.write(res);
      res.end();
      
    } catch (error) {
      console.error("Export Sales Excel Error:", error);
      res.status(500).json({
        status: 'error',
        message: error.message,
      });
    }
  };