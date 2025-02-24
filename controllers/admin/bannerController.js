import Banner from "../../models/bannerSchema.js"
import path from  'path'
import { fileURLToPath } from "url"
import fs from 'fs'
import { title } from "process"

const getBannerPage  =  async (req , res) =>{
    try {
        
        const findBanner = await Banner.find({})
        res.render('admin/banner',{data:findBanner})

    } catch (error) {
        res.redirect('/admin/pageerror')
    }
}

// set on get banner page

const addgetBannerPage = async (req,res)=>{
    try {
        
        res.render('admin/addBanner')

    } catch (error) {
        res.redirect('/admin/pageerror')
    }
}

const addBanner = async (req, res) => {
    try {
        if (!req.body || !req.file) {
            throw new Error("Missing required data or image file.");
        }

        const { title, description, startDate, endDate } = req.body;
        const image = req.file.filename; // Ensure `req.file` is defined

        if (!title || !description || !startDate || !endDate) {
            throw new Error("All fields are required.");
        }

        const newBanner = new Banner({
            image: image, // Ensure field name matches schema
            title: title.trim(),
            description: description.trim(),
            startDate: new Date(startDate + 'T00:00:00'),
            endDate: new Date(endDate + 'T00:00:00'),
        });

        await newBanner.save();
        console.log("Banner saved successfully:", newBanner);
        res.redirect('/admin/addBanner');

    } catch (error) {
        console.error("Error in addBanner:", error.message);
        res.redirect('/admin/pageerror');
    }
};



export default {
    getBannerPage,
    addgetBannerPage,
    addBanner
}