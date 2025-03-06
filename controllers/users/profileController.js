import User from "../../models/userSchema.js"
import nodemailer from'nodemailer'
import bcrypt from 'bcrypt'
import dotEnv from 'dotenv'
dotEnv.config()
import session from "express-session"
import Address  from "../../models/addressSchema.js"
import mongoose from "mongoose"

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
        const addressData = await Address.findOne({userId:userId})

        res.render('user/profile',{
            userAddress:addressData,
            user:userData
        })
        
    } catch (error) {
        console.error("Error of userProfile")
        res.redirect('/page')
        
    }
}


const changeEmail = async (req,res) =>{
    try {
        
        const userId = req.session.user
        const userData = await User.findById(userId)
        res.render('user/change-email',{user:userData})
        
    } catch (error) {
        res.redirect('/page')
        
    }
}


const changeEmailVaild = async (req,res)=>{
    try {
        
        const {email} = req.body
        const userExist = await User.findOne({ email });
        const userId = req.session.user
        const userEmail =  await User.findById(userId)
        

        if(userExist && userEmail && userExist._id.toString() === userEmail._id.toString()){
            const otp = generateOtp()
            const emailSent = await sendVeficationEmail(email,otp)
            if(emailSent){
                req.session.userOtp = otp
                req.session.userData = req.body
                req.session.email = email
               
                res.render('user/change-otp',{user:userEmail})
                console.log("Email Send otp",otp)
            }else{
                res.json("email error")
            }
        }else{
            res.render("user/change-email",{
                message:"User with this email not exist"
            })
        }


    } catch (error) {
        res.redirect('/page')
        
    }
}

const verifyEmailOtp = async (req,res) =>{

    try {

        const enteredOtp = req.body.otp.join('')
        const userId = req.session.user
        const userEmail =  await User.findById(userId)
        console.log(req.session.userOtp,"This is session otp")
        if(enteredOtp === req.session.userOtp.toString()){
            req.session.userData = req.body.userData
            res.render('user/new-email',{
                userData:req.session.userData,
                user:userEmail

            })
        }else{
            console.log("Hello...")
            res.render('user/change-email',{
                message:"OTP not matching",
                userData:req.session.userData
            })
        }
        
    } catch (error) {
        console.log("Verify email otp ", error.message)
        res.redirect('/page')
    }
}


const updateEmail = async (req,res) =>{

    try {

        const newEmail = req.body.email
        const userId = req.session.user
        await User.findByIdAndUpdate(userId,{email:newEmail})
        res.redirect('/userProfile')
        
    } catch (error) {
        console.log("Error is update email",error.message)
        res.redirect('/page')
    }
}

const changePassword = async (req,res)=>{
    try {
        const userId = req.session.user
        const userEmail =  await User.findById(userId)
        res.render('user/change-password',{user:userEmail})
        
    } catch (error) {
        res.redirect('/page')
        
    }
}

const changePasswordValid = async (req,res)=>{
    try {
       
        const {email} = req.body

        const userExist = await User.findOne({email})
        const userId = req.session.user
        const userEmail =  await User.findById(userId)
        if(userExist){
            const otp =generateOtp()
            const emailSend  = await sendVeficationEmail(email,otp)
            if(emailSend){
                req.session.userOtp =otp
                req.session.userData = req.body
                req.session.email = email
                res.render('user/forgot-otp',{user:userEmail})
                console.log("OTP",otp)
            }else{
                res.json({
                    success:false,
                    message:"Failed to otp send"
                })
            }
        }else{
            res.render("user/change-password",{
                message:"User with this email doesnot exist"
            })
        }

    } catch (error) {
        console.log("Error in change password validation",error.message)
        res.redirect('/page')
    }
}


const verifyChangePasswordOtp = async(req,res) =>{
    try {

        const enteredOtp = req.body.otp.join('')
        console.log(enteredOtp.toString() === req.session.userOtp.toString())
        console.log(enteredOtp,"Entered otp ..")
        if(enteredOtp.toString() === req.session.userOtp.toString()){
            res.json({success:true,redirectUrl:"/reset-passwordOtp"})
        }else{
            res.json({success:false,message:"OTP Failed"})
        }
        
    } catch (error) {
        console.log(error.message,"Error is verifyChangePassword")
        res.redirect('/page')
    }
}


const address = async (req,res) =>{

    try {

        const userId = req.session.user
        const userEmail =  await User.findById(userId)
        const userAddress = await Address.findOne({userId:userId})
       
        res.render('user/address',{user:userEmail , address :userAddress ? userAddress.address  : null})
        
    } catch (error) {
        res.redirect('/page')
    }
}

const addAddress = async (req,res) =>{
    try {

        const userId = req.session.user
        const userEmail =  await User.findById(userId)

        res.render('user/add-address',{user:userEmail})

        
    } catch (error) {
        console.log("Error of add address field")
        res.redirect('/page')
        
    }
}

const postAddAddress = async (req, res) => {
    try {
        const userId = req.session.user;
        const userData = await User.findOne({ _id: userId });

        const { name, addressType, city, state, pincode, landMark, phone } = req.body;

        let userAddress = await Address.findOne({ userId: userData._id });

        if (!userAddress) {
            userAddress = new Address({
                userId: userData._id,
                address: [{
                    name,
                    addressType,
                    city,
                    state,
                    pincode,
                    landMark,
                    phone
                }]
            });
        } else {
            
            userAddress.address.push({
                name,
                addressType,
                city,
                state,
                pincode,
                landMark,
                phone
            });
        }

        
        await userAddress.save();

        res.redirect('/userProfile');
    } catch (error) {
        console.error("Add Address Error", error);
        res.status(500).redirect('/page');
    }
};


const editAddress = async (req,res) =>{
    try {
        const addressId = req.query.id
        const user = req.session.user
        const currentAddress = await Address.findOne({
            "address._id": addressId
         })
         

        if(!currentAddress){
            return res.redirect('/page')
        }

        const addressData = currentAddress.address.find((item)=>{
            return item._id.toString() === addressId.toString()
        })

        if(!addressData){
            return res.redirect('/page')
        }
        res.render('user/edit-address',{address:addressData ,user : user})

    } catch (error) {
        console.error("Error of edit Address", error.message)
        res.redirect('/page')
        
    }
}

const postEditAddress = async (req,res) =>{
    try {

        const data = req.body
        const addressId = req.query.id
        const user = req.session.user
        const findAddress = await Address.findOne({"address._id":addressId})
        console.log(findAddress)
        if(!findAddress){
            res.redirect('/page')
        }
        await Address.updateOne(
            {"address._id":addressId},
            {$set: {
                "address.$": {
                    _id: addressId,
                    addressType: data.addressType,
                    name: data.name,  
                    city: data.city,
                    landMark: data.landMark,
                    state: data.state,
                    pincode: data.pincode,
                    phone: data.phone
                }
            }}),


     
        res.redirect('/userProfile')
        
    } catch (error) {
        console.error("Error in edit Address")
        res.redirect('/page')
    }
}

const deleteAddress = async (req,res) =>{
    try {
        
        const addressId = req.query.id
        const findAddress = await Address.findOne({"address._id":addressId});
        if(!findAddress){
            return res.status(404).send("Address not Found")
        }

        await Address.updateOne(
            {
                "address._id":addressId
            },
            {
                $pull:{
                    address :{
                        _id : addressId
                    }
                }
            }
        )

        res.redirect('/userProfile')

    } catch (error) {
        console.log("Error in delete Address",error.message)
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
    userProfile,
    changeEmail,
    changeEmailVaild,
    verifyEmailOtp,
    updateEmail,
    changePassword,
    changePasswordValid,
    verifyChangePasswordOtp,
    address,
    addAddress,
    postAddAddress,
    editAddress,
    postEditAddress,
    deleteAddress
}