import User from "../../models/userSchema.js";
// import mongoose from "mongoose";
import bcrypt from 'bcrypt'




// setup on login page
const loadLogin = async (req,res) =>{

    if(req.session.admin){
        
        return res.redirect('/admin/dashboard')
    }

    res.render('admin/admin-login',{messag:null})
}


const login = async (req,res) =>{

    try {

        const {email , password} = req.body
        const admin = await User.findOne({email,isAdmin:true})
        

        if(admin){
            const isMatch = bcrypt.compare(password,admin.password)

            if(isMatch){
                req.session.admin = true

                return res.redirect('/admin')
            }else{
                return  res.redirect('/login')
            }
        }
        
    } catch (error) {

        console.log('login error',error.message)
        return res.redirect('/pageerror')
        
    }
}

// Setup on admin dashboard
const loadDashboard = async (req,res) =>{
   
    if(req.session.admin){
        try {
            
            res.render('admin/dashboard')

        } catch (error) {
            
            res.redirect('/pageerror')
        }
    }
}

export default {
    loadLogin,
    login,
    loadDashboard
}