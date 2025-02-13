import User from "../../models/userSchema.js"
import nodemailer from 'nodemailer'
import dotenv from "dotenv"
dotenv.config()
import bcrypt from 'bcrypt'



// Setup Signup page
const loadSignUp = (req, res)=>{
    try {
        res.render('user/signup')
    } catch (err) {
        console.log(`request error ${err.message}`)
        res.status(500).send('Sever Error')
    }
}

// page not found
const pageNoteFound =  (req,res) =>{
    try {
        res.render("user/page404")
    } catch (error) {
        res.redirect('/pageNotFound')
    }
}

const loadHome = async (req , res) =>{
    try {

        await res.render('user/home')

    } catch (error) {

        console.log(`Home page rendering error ${error.message}`)
        res.status(500).send('Internal Server Error')
        
    }
}
// create a function on generate otp
const generateOtp = () =>{
    return Math.floor(100000 + Math.random()*900000).toString()
}

// create a function on sendVerificationEmal

const sendVerificationEmail = async (email,otp) =>{
    try {
        
        const transporter = nodemailer.createTransport({
            service:'gmail',
            port:587,
            secure:false,
            requireTLS:true,
            auth:{
                user:process.env.Nodemailer_EMALIL,
                pass:process.env.Nodemailer_PASSWORD,
            }
        })


        const info = await transporter.sendMail({
            from:process.env.Nodemailer_EMALIL,
            to:email,
            subject:'Verify your account',
            text:`Your Otp is: ${otp}`,
            html:`<b>Your Otp: ${otp}</b>`
        })

        return info.accepted.length > 0

    } catch (error) {
        console.log(`Error sending enail ${error.message}`)
        return false
    }
}

// Signup Setup

const Signup = async  (req,res) =>{
    const {name , mobile , email , password , confirmPassword } = req.body
    try {

       if(password !== confirmPassword){
        res.redirect('signup',{message:'Password donot match'})

       }

       const findUser = await User.findOne({email})

       if(findUser){
          res.render('signup',"User with this email already exists")
       }

       const otp = generateOtp()

       const emailSend = await sendVerificationEmail(email,otp)

       if(!emailSend){
       return res.json('email-error')
       }

       req.session.userOtp = otp;
       req.session.userData= {email , password , mobile , name}

       res.render('user/verify-otp')
       console.log('otp send',otp)

        
    } catch (error) {
        console.log(`Signup error ${error.message}`)
        res.redirect('/page')
    }
}
 const securePassword = async () =>{
    try {
        const passwordHash = await bcrypt.hash(password,10)
        return passwordHash
    } catch (error) {
        
    }
 }

const verifyOtp = async (req , res) =>{
    try {
        const {otp} = req.body
       
        if(otp === req.session.userOtp.toString()){
            const user = req.session.userData
            const passwordHash = await securePassword(user.password);

            const saveUserData = new User({
                name:user.name,
                email:user.email,
                mobile:user.mobile,
                password:passwordHash
            })

            await saveUserData.save()
            req.session.user = saveUserData._id;
           return res.json({success:true, redirectUrl:'/'})
        }else{
          return  res.status(400).json({sucess:false,message:'Invalid Otp please try again'})
           
        }
    } catch (error) {
        console.error('Error verifying otp')
       return res.status(500).json({sucess:false, message:'An error occure'})
        
    }
}

const resendOtp = async (req , res) =>{
    try {
        const {email} = req.session.userData
        if(email){
          return  res.status(400).json({success:false,message:"Email not found in session"})
        }
        const otp = generateOtp()
        req.session.userOtp = otp

        const emailSend = await sendVerificationEmail(email.otp);
        if(emailSend){
            console.log('Resend otp',otp)
           return res.status(200).json({sucess:true, message:"Resend Sucessfull"})
        }else{
          return  res.status(500).json({sucess:false,message:'Failed to resend otp Please try again'})
        }
    } catch (error) {
        console.error('Error resending OTP')
      return  res.status(500).json({sucess:false,message:'Internal Server Error'})
    }
}



export default  {
    loadHome,
    pageNoteFound,
    loadSignUp,
    Signup,
    verifyOtp,
    resendOtp,
   
}