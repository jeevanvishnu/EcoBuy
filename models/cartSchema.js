import mongoose from "mongoose";
import { Schema } from "mongoose";

const cartSchema = new Schema ({
    userId:{
        type:Schema.Types.ObjectId,
        ref:'User',
        required:true
    },
    items:[{
        productId:{
            type:Schema.Types.ObjectId,
            ref:"Product",
            required:true
        },
        quantity:{
            type:Number,
            default:1
        },
        totalPrice:{
            type:Number,
            required:true
        },
        status:{
            type:String,
            default:"Placed"
        },
        cancellationReason:{
            type:String,
            default:"none"
        }
    }]
})

const Cart = mongoose.model("Cart",cartSchema)
export default Cart