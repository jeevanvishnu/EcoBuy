import User from "../../models/userSchema.js";

const checkBlockedUser = async (req, res, next) => {
    try {
        
        if (req.session.user) {
            const user = await User.findById(req.session.user);

            
            if (user && user.isBlocked) {
                delete req.session.user;
                // return res.redirect('/login'); 
                return res.render('user/login',{message:"Your account has been blocked."})
            }
        }

       
        next();
    } catch (error) {
        console.error("Error checking blocked user:", error);
        res.status(500).send('Server Error');
    }
};


const loginMiddle = (req, res, next) => {
    if (req.session.user) {
        return res.redirect('/');
    } else {
       
        next();
    }
};

export default{
    loginMiddle,
    checkBlockedUser
} 