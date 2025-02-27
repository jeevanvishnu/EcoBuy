import User from "../../models/userSchema.js"
import nodemailer from'nodemailer'
import bcrypt from 'bcrypt'
import dotEnv from 'dotenv'
dotEnv.config()
import session from "express-session"



const getForgotPassPage = async (req,res)=>{
    try {
        
        res.render('user/forgot')

    } catch (error) {
        console.log("Error of forgot password" ,error.message)
        res.redirect('/page')
        
    }
}

function generateOtp(){
    const digits = '1234567890'
    let otp = ""
    for(let i = 0; i <6; i++){
        otp+=digits[Math.floor(Math.random()*10)]
    }
    return otp
}

const sendVeficationEmail = async (email,otp)=>{

    try {

        const transporter =  nodemailer.createTransport({
            service:"gmail",
            port:587,
            secure:false,
            requireTLS:true,
            auth:{
                user:process.env.Nodemailer_EMALIL ,
                pass:process.env.Nodemailer_PASSWORD
            }
        })

        const mailOption = {
            from:process.env.Nodemailer_EMALIL,
            to:email,
            subject:"Password Reset EcoBuy",
            text:`Your OTP is ${otp}`,
            html:`<b><h4>Your OTP: ${otp}</h4></br></b>`
        }

        const info = await transporter.sendMail(mailOption)
        console.log("Email Send", info.messageId)
        return true
        
    } catch (error) {

        console.error("Error sending email",error)
        return false
        
    }

}

const securePassword = async (password) =>{
    try {
        console.log(password)
         
        const passwordHash = await bcrypt.hash(password,10)
        return passwordHash

    } catch (error) {
        console.error("Error in password hashing:", error);
        throw error;
    }
}

const forgotEmail = async(req,res)=>{
    try {
        
        const {email} = req.body
        const findUser = await User.findOne({email:email})

        if(findUser){
            const otp = generateOtp()
            const emailSend = await sendVeficationEmail(email,otp)
            if(emailSend){
                req.session.userOtp = otp
                req.session.email = email
                res.render('user/forgot-otp')
                console.log("OTP",otp)
            }else{
                res.json({success:false,message:"Failed to send Otp .Please try again"})
            }
        }else{
            res.render('forgot-password',{
                message:"User With This Email Does Not Exist"
            })
        }

    } catch (error) {
        res.redirect('/page')

        
    }
}


const verifyPassword = async (req,res) =>{
    try {
        
        const enteredOtp = req.body.otp
        if(enteredOtp === req.session.userOtp){
            res.json({success:true,redirectUrl:"/reset-password"})
        }else{
            res.json({success:false,message:"Otp not matching"})
        }

    } catch (error) {

        res.status(500).json({success:false,message:"An error Occured. Please try again"})
        
    }
}

const getResetPassPage = async (req,res) =>{
    try {

        res.render("user/reset-password")
        
    } catch (error) {
        res.redirect('/page')
        
    }
}


const resendOtp = async (req,res) =>{
    try {

        const otp = generateOtp()
        req.session.userOtp = otp
        const email = req.session.email
        console.log("Resending otp",email)
        const emailSend = await sendVeficationEmail(email,otp)
        if(emailSend){
            console.log("Resending otp...",otp)
            res.status(200).json({success:true,message:"Resend Otp SucessFull"})
        }
        
    } catch (error) {
        
        console.error("Error in Resend Otp",error)
        res.status(500).json({success:false , message:"Internal Server error"})
    }
}

const postNewPassword = async (req, res) => {
    try {
        const { newPass1, newPass2 } = req.body;
        const email = req.session.email;

        if (newPass1 !== newPass2) {
            return res.json({ success: false, message: "Passwords do not match." });
        }

        const passwordHash = await securePassword(newPass1);
        await User.updateOne(
            { email: email },
            { $set: { password: passwordHash } }
        );

        res.json({ success: true, message: "Password changed successfully!" });

    } catch (error) {
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};


const userProfile = async (req,res) =>{
    try {

        const userId = req.session.user
        const userData = await User.findById(userId)
        res.render('user/profile',{
            user:userData
        })
        
    } catch (error) {
        console.error("Error of userProfile")
        res.redirect('/page')
        
    }
}


export default {
    getForgotPassPage,
    forgotEmail,
    verifyPassword,
    getResetPassPage,
    resendOtp,
    postNewPassword,
    userProfile
}