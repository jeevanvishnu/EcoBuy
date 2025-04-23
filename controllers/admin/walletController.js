import Wallet from '../../models/walletSchema.js'
import User from '../../models/userSchema.js'
import mongoose from 'mongoose'

const getAllWallet = async (req,res) =>{
    try {
        const wallets = await Wallet.find().populate('userId');
        res.render('admin/admin-wallet', { wallets });
      } catch (error) {
        res.status(500).render('error', { message: error.message });
      }
    };

    const getWalletTransaction =async (req,res) =>{
        try {
            const wallets = await Wallet.find()
              .populate('userId', 'name email')
              .populate('transactions.orderId');
            
            
            const transactions = wallets.flatMap(wallet => 
              wallet.transactions.map(transaction => ({
                ...transaction.toObject(),
                user: {
                  _id: wallet.userId._id,
                  name: wallet.userId.name,
                  email: wallet.userId.email
                }
              }))
            );
            
            // Sort by date (newest first)
            transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
            
            res.render('admin/transaction', { transactions });
          } catch (error) {
            res.status(500).render('admin/admin-error', { message: error.message });
          }
    }

    const getTransactionById = async (req,res) =>{
        try {
            const { transactionId } = req.params;
            
            const wallet = await Wallet.findOne(
              { 'transactions._id': transactionId }
            )
            .populate('userId', 'name email mobile')
            .populate('transactions.orderId');
            
            if (!wallet) {
              return res.status(404).render('error', { message: 'Transaction not found' });
            }
            
            const transaction = wallet.transactions.find(
              t => t._id.toString() === transactionId
            );
            
            res.render('admin/transaction-details', {
              transaction,
              user: wallet.userId
            });
          } catch (error) {
            res.status(500).render('error', { message: error.message });
          }
    }

    const getWalletTransactionsByWalletId = async (req,res) =>{
        try {
            const { walletId } = req.params;
            
            const wallet = await Wallet.findById(walletId)
              .populate('transactions.orderId');
            
            if (!wallet) {
              return res.status(404).json({ message: 'Wallet not found' });
            }
            
            // Sort by date (newest first)
            const transactions = wallet.transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
            
            res.render('admin/wallet-transaction', { transactions });

          } catch (error) {
            res.status(500).json({ message: error.message });
          }
        };
    


    export default {
        getAllWallet,
        getWalletTransaction,
        getTransactionById,
        getWalletTransactionsByWalletId
    }
