import mongoose from "mongoose";
import { Schema } from "mongoose";

const couponSchema = new Schema({
    name:{
        type:String,
        required:true,
        unique:true
    },
    createdOn:{
        type:Date,
        default:Date.now(),
        required:true
    },
    expiredOn:{
        type:Date,
        required:true,
    },
    offerPrice:{
        type:Number,
        required:true
    },
    minimumaPrice:{
        type:Number,
        required:true
    },
    isList:{
        type:Boolean,
        default:true
    },
    userId:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User'
    }]
})

const Coupon = mongoose.model('Coupon',couponSchema);
export default Coupon