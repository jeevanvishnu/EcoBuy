import mongoose from "mongoose";
import { Schema } from "mongoose";
import { v4 as uuidv4 } from "uuid";


const orderSchema = new Schema({
    orderId :{
        type:String,
        default:()=>uuidv4(),
        unique:true
    },
    orderedItem:[{
        product:{
            type:Schema.Types.ObjectId,
            ref:"Product",
            required:true
        },
        quantity:{
            type:Number,
            required:true
        },
        price:{
            type:Number,
            default:0
        }

    }],
    totalPrice:{
        type:Number,
        required:true
    },
    discount:{
        type:Number,
        default:0
    },
    finalAmount:{
        type:Number,
        required:true,

    },
    address:{
        type:Schema.Types.ObjectId,
        ref:"User",
        required:true
    },
    invoiceDate:{
        type:Date
    },
    status:{
        type:String,
        required:true,
        enum:['Pending','Processing','Shipped','Cancellec','Return','Request','Returned']
    },
    createdon:{
        type:Date,
        default:Date.now(),
            required:true
        
    },
    couponApplied:{
        type:Boolean,
        default:false
    }
})

const order = mongoose.model("Order",orderSchema)
export default order