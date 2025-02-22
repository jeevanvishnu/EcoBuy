import Product from '../../models/productSchema.js'
import Category from '../../models/categorySchema.js'
import fs from 'fs'
import path from 'path'
import sharp from 'sharp'
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { fileURLToPath } from 'url';
import mongoose from 'mongoose'
console.log(__dirname)

// SetUp on getProduct Page
const getProductAddPage = async (req, res) => {
    try {

        const category = await Category.find({ isListed: true })
        res.render('admin/product-add', {
            cat: category
        })

    } catch (error) {
        res.render('pageerror')
        console.log("getProductAddPage", error.message)
    }
}

// Step up on addProducts
const addProducts = async (req, res) => {
    try {
        const products = req.body;


        const productExists = await Product.findOne({ productName: products.productName });

        if (!productExists) {
            const images = [];
            const uploadDir = path.join(process.cwd(), "public/uploads/product-image");
            console.log("Upload Directory Path:", uploadDir);

            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }

            if (req.files && req.files.length > 0) {
                for (let file of req.files) {
                    const originalImagePath = file.path;
                    const resizedFilename = `resized-${file.filename}`;
                    const resizedImagePath = path.join(uploadDir, resizedFilename);

                    await sharp(originalImagePath)
                        .resize({ width: 400, height: 400 })
                        .toFile(resizedImagePath);

                    images.push(`/uploads/product-image/${resizedFilename}`);
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
        return res.status(500).json({ success: false, error: "Internal Server Error" });
    }
};

const getAllProducts = async (req, res) => {

    try {
        const search = req.query.search || ""
        const page = req.query.page || 1
        const limit = 4
        const productData = await Product.find({
            $or: [
                { productName: { $regex: new RegExp(".*" + search + ".*", "i") } },

            ]

        }).limit(limit * 1)
            .skip((page - 1) * limit)
            .populate('category')
            .exec();

        const count = await Product.find({
            $or: [
                { productName: { $regex: new RegExp(".*" + search + ".*", "i") } },
            ]
        }).countDocuments()

        const category = await Category.find({ isListed: true })

        if (category) {
            res.render('admin/products', {
                data: productData,
                currentPage: page,
                totalPages: page,
                totalPages: Math.ceil(count / limit),
                cat: category,


            })
        } else {
            res.render('/pageerror')
        }

    } catch (error) {
        console.log("getallproduct error", error.message)
        res.redirect('/pageerror')
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

const blockProduct = async (req, res) => {
    try {
        let id = req.query.id
        await Product.updateOne({ _id: id }, { $set: { isBlocked: true } });
        res.redirect('products')

    } catch (error) {
        res.redirect('pageerror')

    }
}

const unblockProduct = async (req, res) => {
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

const getEditProduct = async (req, res) => {
    try {

        const id = req.query.id
        const product = await Product.findOne({ _id: id })
        const category = await Category.find({})
        res.render("admin/edit-product", {
            cat: category,
            product: product,
        })

    } catch (error) {
        console.log(error.message, "getEditProduct")
        res.redirect('pageerror')

    }
}


const editProduct = async (req, res) => {
    try {
        const id = req.params.id;
        const product = await Product.findOne({ _id: id });
        const data = req.body;
        console.log(data.description)

        const existingProduct = await Product.findOne({
            productName: data.productName,
            _id: { $ne: id }
        });

        if (existingProduct) {
            return res.status(400).json({ error: "Product with this name already exists. Please try with another name" });
        }

        const images = [];
        if (req.files && req.files.length > 0) {
            for (let i = 0; i < req.files.length; i++) {
                images.push(req.files[i].filename);
            }
        }

        const updateField = {
            productName: data.productName,
            description: data.description,
            category: data.category ? new mongoose.Types.ObjectId(data.category) : null,
            regularPrice: data.regularPrice,
            salePrice: data.salePrice,
            quantity: data.quantity,
            size: data.size,
            color: data.color
        };

        if (images.length > 0) {
            updateField.$push = { productImage: { $each: images } };
        }

        await Product.findByIdAndUpdate(id, updateField, { new: true });
        res.redirect('/admin/products');

    } catch (error) {
        console.log(error.message);
        res.redirect('/admin/pageerror');
    }
};






const deleteSingleImage = async (req, res) => {
    try {
        const { imageNameToServer, productToServer } = req.body;


        const product = await Product.findByIdAndUpdate(productToServer, { $pull: { productImage: imageNameToServer } });


        const imagePath = path.join(process.cwd(), "/public/uploads/product-image", imageNameToServer);
        if (fs.existsSync(imagePath)) {
            try {
                fs.unlinkSync(imagePath);
                console.log(`Image ${imageNameToServer} deleted successfully`);
            } catch (err) {
                console.error(`Error deleting file: ${err.message}`);
            }
        } else {
            console.log(`Image ${imageNameToServer} not found`);
        }

        res.json({ status: true });
    } catch (error) {
        console.error("Delete image error:", error);
        res.status(500).json({ status: false, error: "Internal server error" });
    }
};

export default {
    getProductAddPage,
    addProducts,
    getAllProducts,
    productOffer,
    removeProductOffer,
    blockProduct,
    unblockProduct,
    getEditProduct,
    editProduct,
    deleteSingleImage
} 