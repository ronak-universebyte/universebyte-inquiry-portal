import mongoose from 'mongoose';

const followupSchema = new mongoose.Schema(
  {
    inquiry_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Inquiry',
      required: true,
      index: true,
    },
    scheduled_date: {
      type: String,
      required: true,
      index: true,
    },
    scheduled_time: {
      type: String,
      default: '16:00',
    },
    assigned_to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    status: {
      type: String,
      enum: ['Pending', 'Completed', 'Cancelled', 'Rescheduled'],
      default: 'Pending',
      index: true,
    },
    outcome: {
      type: String,
      default: null,
    },
    remarks: {
      type: String,
      default: null,
    },
    completed_at: {
      type: String,
      default: null,
    },
    completed_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
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

followupSchema.virtual('id').get(function () {
  return this._id ? this._id.toHexString() : null;
});

const Followup = mongoose.model('Followup', followupSchema);
export default Followup;
