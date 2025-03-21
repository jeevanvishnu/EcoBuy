import mongoose from "mongoose";
import { Schema } from "mongoose";
import { v4 as uuidv4 } from "uuid";


const orderSchema = new Schema({
    orderId :{
        type:String,
        default:()=>uuidv4(),
        unique:true
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    cartId: {
        type: Schema.Types.ObjectId,
        ref: 'Cart'
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
        },
        orderStatus:{
            type:String,
            required:true,
            enum:['Pending','Processing','Shipped','Delivered','Cancelled','Return','Request','Returned']
        },

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
    
    deliveryAddress: {
        type: Array,
        required: true
    },
    cancelReason:{
        type:String,
        default:null
    },
    returnReason: {
         type: String, 
        default: null 
    },

    invoiceDate:{
        type:Date
    },
    paymentMethod: {
        type: String,
        required: true,
        enum: ['Cash on Delivery','Online Payment','Wallet']
    },
   
    createdon:{
        type:Date,
        default:Date.now(),
            required:true
        
    },
    couponApplied:{
        type:Boolean,
        default:false
    },
    paymentId: {
        type: String
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'failed'],
        default: 'pending'
    },
    date: {
        type: Date,
        default: Date.now,
        required: true
    }

})

const order = mongoose.model("Order",orderSchema)
export default order