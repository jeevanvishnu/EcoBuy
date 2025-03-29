import mongoose from 'mongoose';

const { Schema } = mongoose;

const wishlistSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  product: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  addedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });


wishlistSchema.index({ user: 1, product: 1 }, { unique: true });

export default mongoose.model('Wishlist', wishlistSchema);
