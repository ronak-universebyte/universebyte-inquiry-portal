import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['admin', 'staff'],
      default: 'staff',
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    is_active: {
      type: Number,
      enum: [0, 1],
      default: 1,
    },
    created_at: {
      type: String,
      default: () => new Date().toISOString().replace('T', ' ').slice(0, 19),
    },
    updated_at: {
      type: String,
      default: () => new Date().toISOString().replace('T', ' ').slice(0, 19),
    },
  },
  {
    timestamps: false,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret.__v;
        return ret;
      },
    },
  }
);

userSchema.virtual('id').get(function () {
  return this._id ? this._id.toHexString() : null;
});

const User = mongoose.model('User', userSchema);
export default User;
