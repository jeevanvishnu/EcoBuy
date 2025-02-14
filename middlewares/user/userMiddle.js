
const loginMiddle = (req, res, next) => {
    if (req.session.user) {
        return res.redirect('/');
    } else {
       
        next();
    }
};

export default{
    loginMiddle
} 