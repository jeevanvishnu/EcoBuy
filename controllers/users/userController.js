import User from "../../models/userSchema.js"


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

// Signup Setup

const Signup = async  (req,res) =>{
    const {name , email , password , confirmPassword } = req.body
    try {
        const newUser = new User({name,email,password,confirmPassword})
       await newUser.save()
        res.redirect('/signup')
        
    } catch (error) {
        console.log(`Some Error ${error.message}`)
        res.status(500).send("Internal Sever error")
    }
}

export default  {
    loadHome,
    pageNoteFound,
    loadSignUp,
    Signup
}