import Product from '../../models/productSchema.js'
import Category from '../../models/categorySchema.js'
import fs from 'fs'
import path from 'path'
import sharp from 'sharp'
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { fileURLToPath } from 'url';

const getProductAddPage = async  (req,res) =>{
    try {

        const category = await Category.find({isListed:true})
        res.render('admin/product-add',{
            cat:category
        })
        
    } catch (error) {
        res.render('pageerror')
        console.log("getProductAddPage",error.message)
    }
}

const addProducts = async (req, res) => {
    try {
        const products = req.body;

        
        const productExists = await Product.findOne({ productName: products.productName });

        if (!productExists) {
            const images = [];

            
            const uploadDir = path.join(__dirname, "..", "public", "uploads", "images");
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }

            
            if (req.files && req.files.length > 0) {
                for (let i = 0; i < req.files.length; i++) {
                    const originalImagePath = req.files[i].path;
                    const resizedImagePath = path.join(uploadDir, req.files[i].filename);

                    try {
                        await sharp(originalImagePath)
                            .resize({ width: 400, height: 400 })
                            .toFile(resizedImagePath);
                        
                        images.push(req.files[i].filename);
                    } catch (error) {
                        console.error("Error resizing image:", error);
                        return res.status(500).json({ error: "Error processing images" });
                    }
                }
            }

            
            const categoryId = await Category.findOne({ name: products.category });
            if (!categoryId) {
                return res.status(400).json("Invalid Category name");
            }

           
            const newProduct = new Product({
                productName: products.productName,
                description: products.description,
                category: categoryId._id,
                regularPrice: products.regularPrice,
                salePrice: products.salePrice,
                createdOn: Date.now(),
                quantity: products.quantity,
                size: products.size,
                color: products.color,
                productImage: images,
                status: "Available",
            });

            await newProduct.save();
            return res.redirect("addProducts");
        } else {
            return res.status(400).json("Product already exists, please try with another name");
        }
    } catch (error) {
        console.error("Error saving product:", error.message);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};

const getAllProducts = async (req,res) =>{

    try {
        const search = req.query.search || ""
        const page = req.query.page || 1
        const limit = 4
        const productData = await Product.find({
            $or:[
                {productName:{$regex:new RegExp(".*"+search+".*","i")}},

            ]

        }).limit(limit*1)
        .skip((page-1)* limit)
        .populate('category')
        .exec();

        const count = await Product.find({
            $or:[
                {productName:{$regex:new RegExp(".*"+search+".*","i")}},
            ]
        }).countDocuments()

        const category = await Category.find({isListed:true})
        
        if(category ){
            res.render('admin/products',{
                data:productData,
                currentPage:page,
                totalPages:page,
                totalPages:Math.ceil(count/limit),
                cat:category,

            })
        }else{
            res.render('pageerror')
        }

    } catch (error) {
        console.log("getallproduct error",error.message)
        res.redirect('pageerror')
    }
}

const productOffer = async (req, res) => {
    try {
        const { productId, percentage } = req.body;
        const findProduct = await Product.findOne({ _id: productId });

        if (!findProduct) {
            return res.status(404).json({ status: false, message: "Product not found" });
        }

        const findCategory = await Category.findOne({ _id: findProduct.category });

        if (findCategory && findCategory.categorOffer > percentage) {
            return res.json({ status: false, message: "This product's category already has a higher discount" });
        }

        findProduct.salePrice = Math.floor(findProduct.regularPrice * (percentage / 100));
        findProduct.productOffer = parseInt(percentage);
        await findProduct.save();

        if (findCategory) {
            findCategory.categorOffer = 0;
            await findCategory.save();
        }

        return res.json({ status: true });

    } catch (error) {
        console.log("Error in productOffer:", error.message);
        return res.status(500).json({ status: false, message: "Internal server error" });
    }
};

const removeProductOffer = async (req, res) => {
    try {
        const { productId } = req.body;
        const findProduct = await Product.findOne({ _id: productId });

        if (!findProduct) {
            return res.status(404).json({ status: false, message: "Product not found" });
        }

        findProduct.salePrice = Math.floor(findProduct.regularPrice);
        findProduct.productOffer = 0;
        await findProduct.save();

        return res.json({ status: true });

    } catch (error) {
        console.log("removeProductOffer error:", error.message);
        return res.status(500).json({ status: false, message: "Internal server error" });
    }
};

const blockProduct = async (req,res) =>{
    try {
        let id = req.query.id
        await Product.updateOne({ _id: id }, { $set: { isBlocked: true } });
        res.redirect('products')

    } catch (error) {
        res.redirect('pageerror')
        
    }
}

const unblockProduct = async (req,res) =>{
    try {
        
        let id = req.query.id;
        console.log(id)
        await Product.updateOne({ _id: id }, { $set: { isBlocked: false } });
        await res.redirect('/admin/products')
    } catch (error) {
        console.log(error.message,)
        res.redirect('pageerror')
    }
}

export default{
    getProductAddPage,
    addProducts,
    getAllProducts,
    productOffer,
    removeProductOffer,
    blockProduct,
    unblockProduct
} 