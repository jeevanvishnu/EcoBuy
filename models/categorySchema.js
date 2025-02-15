import mongoose from "mongoose";
import { Schema } from "mongoose";

const categorySchema = new Schema({
    name:{
        type:String,
        required:true,
        unique:true,
    },
    description:{
        type:String,
        required:true
    },
    isListed:{
        type:Boolean,
        default:true,
    },
    categoryOffer:{
        type:Number,
        default:0
    },
    createdAt:{
        type:Date,
        default:Date.now()
    },

})
const category = mongoose.model("Category", categorySchema)

export default category