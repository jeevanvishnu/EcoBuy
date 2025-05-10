import User from "../../models/userSchema.js";
import Coupon from "../../models/couponSchema.js";
import order from "../../models/orderSchema.js";
const customerInfo = async (req, res) => {
    try {
        let search = '';  
        let page = parseInt(req.query.page) || 1; 
        const limit = 3; 

        const userData = await User.find({
            isAdmin: false,
            $or: [
                { name: { $regex: '.*' + search + '.*', $options: 'i' } }, 
                { email: { $regex: '.*' + search + '.*', $options: 'i' } }
            ],
        })
        .limit(limit)
        .skip((page - 1) * limit)
        .exec();

        const count = await User.countDocuments({
            isAdmin: false,
            $or: [
                { name: { $regex: '.*' + search + '.*', $options: 'i' } },
                { email: { $regex: '.*' + search + '.*', $options: 'i' } }
            ],
        });

        res.render('admin/customers', {
            data: userData,
            totalPages: Math.ceil(count / limit),
            currentPage: page
        });

    } catch (error) {
        console.log("Customer error", error.message);
        return res.status(500).send('Internal server error');
    }
};


const customerBlocked = async (req, res) => {
    try {

        let id = req.query.id
        await User.updateOne({ _id: id }, { $set: { isBlocked: true } })
        res.redirect('/admin/users')
    } catch (error) {
        console.log('block error', error.message)
        res.redirect('pageerror')
    }
}

const customerUnBlocked = async (req, res) => {
    try {

        let id = req.query.id
        await User.updateOne({ _id: id }, { $set: { isBlocked: false } })


        res.redirect('/admin/users')

    } catch (error) {
        console.log('unblock error', error.message)
        res.redirect('pageerror')

    }
}


const couponMangment = async (req,res) =>{
    try {
        const coupon = await Coupon.find()
        console.log("coupon",coupon)
        res.render('admin/admin-coupon',{
            admin:req.session.admin,
            acitive:'coupons',
            coupon:coupon,
            message:null
        })

        
    } catch (error) {
        
    }
}


const addCoupon = async (req,res)=>{
    try {
        const coupon = await Coupon.find()
        const { code, discount, minimumPrice, maxRedeem, expiry } = req.body;
        console.log('req.body',req.body)
        
        if(!code||!discount||!minimumPrice||!maxRedeem||!expiry){
            return res.render('couponManagement', {
                message: { text: 'All fields are required', type: 'error' },
                admin: req.session.admin,
                active: 'coupons',
                
            });
        }

        
        const newCoupon = new Coupon({
            couponCode:code,
            discount:discount,
            minimumPrice:minimumPrice,
            maxRedeem:maxRedeem,
            expiry:expiry,
            status:true
        })

        await newCoupon.save();
        const updatedCoupon = await Coupon.find()

        return res.render('admin/admin-coupon', {
            message: { text: 'Coupon created successfully', type: 'success' },
            admin: req.session.admin,
            active: 'coupons',
            coupon:updatedCoupon
        });
    } catch (error) {
        console.log('error while creating coupons',error)   
        res.redirect('pageerror')
    }
}
const editCoupon = async (req,res)=>{

    try {
        console.log(req.body)
        const {couponId,code,minimumPrice,maxRedeem,expiry,discount}=req.body
        await Coupon.findOneAndUpdate({_id:couponId},{
            $set:{
               couponCode:code,
               discount:discount,
               minimumPrice:minimumPrice,
               maxRedeem:maxRedeem,
               expiry:expiry
            }
        },
    {new:true})
    res.redirect('/admin/coupons')
    } catch (error) {
    console.log('error while editing coupon',error) 
    }
}

const deleteCoupon = async (req,res)=>{
    try {
        const couponId = req.params.id
        const coupon = await Coupon.findOne({_id:couponId})
        const  toggleStatus  = coupon.status == true ? false : true
        await Coupon.findOneAndUpdate({_id:couponId},{
            $set:{
                status:toggleStatus
            }
        },{new:true})
        res.redirect('/admin/coupons')
        
    } catch (error) {
        
        console.log("Error of coupon inactive",error.message)
    }
}


export default {
    customerInfo,
    customerBlocked,
    customerUnBlocked,
    couponMangment,
    addCoupon,
    editCoupon,
    deleteCoupon
}

