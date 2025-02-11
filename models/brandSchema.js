import mongoose from "mongoose";
import { Schema } from "mongoose";

const brandSchema = new Schema({
    brandName:{
        type:String,
        requires:true,
    },
    brandImage:{
        type:[String],
        required:true
    },
    isBlocked:{
        type:Boolean,
        default:false
    },
    createdAt:{
        type:Date,
        default:Date.now()
    },

})
const Brand = mongoose.model('Brand',brandSchema)
export default Brand;