import mongoose from "mongoose";
import { Schema } from "mongoose";

const wishlistSchem = new Schema({
    userId:{
        type:Schema.Types.ObjectId,
        ref:"User",
        requires:true
    },
    products:[{
        productId:{
            type:Schema.Types.ObjectId,
            ref:"Product",
            required:true
        },
        addedOn:{
            type:Date,
            default:Date.now()
        }
    }]
})

const wishlist = mongoose.model('Wishlist', wishlistSchem)
export default wishlist