import { name } from "ejs";
import Category from "../../models/categorySchema.js"
import Product from "../../models/productSchema.js"

const categeoryinfo = async (req, res) => {
    try {

        const page = parseInt(req.query.page) || 1
        const limit = 4;
        const skip = (page - 1) * limit

        const categoryData = await Category.find({})
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)

        const totalCategories = await Category.countDocuments();
        const totalPages = Math.ceil(totalCategories / limit);

        res.render('admin/category', {
            cat: categoryData,
            currentPage: page,
            totalPages: totalPages,
            totalCategories: totalCategories
        })

    } catch (error) {

        console.log("Categiory error", error.message)
        res.redirect('/pageerror')

    }
}

const addCategory = async (req, res) => {

    const { name, description } = req.body

    try {

        const existingCategory = await Category.findOne({ name })

        if (existingCategory) {
            return res.status(400).json({ error: 'Category already exists' })
        }

        const newCategory = new Category({

            name,
            description
        })

        await newCategory.save()
        return res.json({ message: 'Category added sucessfully' })

    } catch (error) {

        return res.status(500).json({ error: "Internal Sever error" })

    }
}


const addCategoryOffer = async (req, res) => {

    try {
        const percentage = parseInt(req.body.percentage);
        const categoryId = req.body.categoryId;
        const category = await Category.findById(categoryId)

        if (!category) {
            return res.status(400).json({ status: false, message: 'Category not found' })
        }

        const products = await Product.find({ category: category._id })
        const hasProductOffer = products.some((product) => product.productOffer > percentage)

        if (hasProductOffer) {
            return res.json({ status: false, message: "Product within this category already have offer" })
        }

        await Category.updateOne({ _id: categoryId }, { $set: { categoryOffer: percentage } })

        for (let product of products) {
            product.productOffer = 0
            product.salePrice = product.regularPrice
            await product.save()
        }

        res.json({ status: true })

    } catch (error) {

        res.status(500).json({ status: false, message: "Internal server error" })
        console.log(error.message, "addCategoryoffer")
    }
}


// Remove category function setup

const removeCategoryOffer = async (req, res) => {

    try {

        const categoryId = req.body.categoryId;
        const category = await Category.findById(categoryId)

        if (!categoryId) {
            return res.status(404).json({ status: false, message: "Category not fount" })
        }

        const percentage = category.categoryOffer
        const products = await Product.find({ category: categoryId })

        if (products.length > 0) {

            for (const product of products) {
                product.salePrice += Math.floor(product.regularPrice * (percentage / 100))
                product.productOffer = 0
                await product.save()
            }
        }
        category.categoryOffer = 0
        await category.save()

        res.json({ status: true })

    } catch (error) {
        res.status(500).json({ status: false, message: "Internal server error" })
        console.log(error.message, "Error on remove offer")
    }
}

const getListCategory = async (req, res) => {
    try {

        let id = req.query.id
        await Category.updateOne({ _id: id }, { $set: { isListed: false } })
        res.redirect('/admin/category')

    } catch (error) {
        res.redirect('/pagerror')

    }
}

const getUnlistCategory = async (req, res) => {

    try {

        let id = req.query.id
        await Category.updateOne({ _id: id }, { $set: { isListed: true } })
        res.redirect('/admin/category')
    } catch (error) {
        console.log(error.message, "getulistecategory error")
        res.redirect('/pageerror')

    }
}

const getEditCategory = async (req, res) => {

    try {

        const id = req.query.id
        const category = await Category.findOne({ _id: id })
        res.render('admin/editCategory', { category: category })


    } catch (error) {
        res.redirect('/pageerror')
        console.log('getEditcategory error....', error.message)

    }
}

const editCategory = async (req, res) => {

    try {

        const id = req.params.id
        const { category, description } = req.body

        const existingCategory = await Category.findOne({ name: category })

        if (existingCategory) {
            return res.status(400).json({ error: "Category exists,please choose another name" })
        }

        const updateCategory = await Category.findByIdAndUpdate(id, {

            name: category,
            description: description
        }, { new: true })

        if (updateCategory) {
            res.redirect('/admin/category')
        } else {
            res.status(400).json({ error: "Category not found" })
        }

    } catch (error) {
        res.status(500).json({ error: "Internal Server errror" })
        console.log("Edit Category error",
            error.message
        )
    }
}


export default {
    categeoryinfo,
    addCategory,
    addCategoryOffer,
    removeCategoryOffer,
    getListCategory,
    getUnlistCategory,
    getEditCategory,
    editCategory,

}