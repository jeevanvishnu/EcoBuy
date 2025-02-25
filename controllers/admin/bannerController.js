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
        const data = req.body;
        const images = req.file;

        // Validate file upload
        if (!images) {
            console.log("Error: No file uploaded");
            return res.redirect("/admin/addBanner?error=NoFile");
        }

        // Create new banner
        const newBanner = new Banner({
            image: images.filename, // Ensure it matches schema
            title: data.title,
            description: data.description,
            startDate: new Date(data.startDate + "T00:00:00"),
            endDate: new Date(data.endDate + "T00:00:00"),
        });

        // Save to database
        await newBanner.save();
        console.log("Banner saved successfully:", newBanner);

        // Redirect to admin page
        res.redirect("/admin/addBanner");
    } catch (error) {
        console.error("Error in addBanner:", error.message);
        res.redirect("/admin/pageerror");
    }
};

const deleteBanner =  async (req,res) =>{
    try {
        const id = req.query.id
        await Banner.deleteOne({_id:id}).then((data)=>{
        })
        res.redirect('banner')
    } catch (error) {
        res.redirect('/admin/pageerror')
    }
}

export default {
    getBannerPage,
    addgetBannerPage,
    addBanner,
    deleteBanner
}

