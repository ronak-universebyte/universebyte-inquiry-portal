import mongoose from 'mongoose';

const inquirySourceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
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

inquirySourceSchema.virtual('id').get(function () {
  return this._id ? this._id.toHexString() : null;
});

const InquirySource = mongoose.model('InquirySource', inquirySourceSchema);
export default InquirySource;
