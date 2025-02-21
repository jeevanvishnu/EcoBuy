import Banner from "../../models/bannerSchema.js"
import path from  'path'
import { fileURLToPath } from "url"
import fs from 'fs'

const getBannerPage  =  async (req , res) =>{
    try {
        
        const findBanner = await Banner.find({})
        res.render('admin/banner',{data:findBanner})

    } catch (error) {
        res.redirect('/admin/pageerror')
    }
}

// set on get banner page

const AddgetBannerPage = async (req,res)=>{
    try {
        
        res.render('admin/addBanner')

    } catch (error) {
        res.redirect('/admin/pageerror')
    }
}

export default {
    getBannerPage
}