import mongoose from 'mongoose';

const inquiryActivitySchema = new mongoose.Schema(
  {
    inquiry_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Inquiry',
      required: true,
      index: true,
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    user_name: {
      type: String,
      required: true,
    },
    activity_type: {
      type: String,
      required: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
    },
    previous_value: {
      type: String,
      default: null,
    },
    new_value: {
      type: String,
      default: null,
    },
    created_at: {
      type: String,
      default: () => new Date().toISOString().replace('T', ' ').slice(0, 19),
      index: true,
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

inquiryActivitySchema.virtual('id').get(function () {
  return this._id ? this._id.toHexString() : null;
});

const InquiryActivity = mongoose.model('InquiryActivity', inquiryActivitySchema);
export default InquiryActivity;
