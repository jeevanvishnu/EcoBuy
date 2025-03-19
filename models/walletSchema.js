import mongoose from "mongoose";


const transactionSchema = new mongoose.Schema({
    amount: {
        type: Number,
        required: true
    },
    transactionsMethod: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    },
    orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order' 
    },
    status: {
        type: String,
        enum: ['completed', 'pending'],
        default: 'completed'
    }
}, { timestamps: true });

const walletSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    balance: {
        type: Number,
        required: true,
        default: 0
    },
    transactions: [transactionSchema] 
}, { timestamps: true });



const Wallet = mongoose.model('Wallet', walletSchema);

export default Wallet