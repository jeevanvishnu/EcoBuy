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
    }],

    totalPrice: {  
        type: Number,
        default: 0
    },

    appliedCoupon: {
        type: Schema.Types.ObjectId,
        ref: 'Coupon',
        default: null
    },
    discountAmount: {
        type: Number,
        default: 0
    },
    discountedTotal: {
        type: Number,
        default: 0
    }
}, {timestamps: true});

cartSchema.pre('save', function(next) {
    if (this.discountAmount) {
        this.discountedTotal = this.totalPrice - this.discountAmount;
    } else {
        this.discountedTotal = this.totalPrice;
    }
    next();
});


const Cart = mongoose.model("Cart",cartSchema)
export default Cart