import mongoose from 'mongoose';

const inquirySchema = new mongoose.Schema(
  {
    inquiry_id: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    student_name: {
      type: String,
      required: true,
      trim: true,
    },
    mobile: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    alt_mobile: {
      type: String,
      trim: true,
      default: null,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: null,
    },
    qualification: {
      type: String,
      trim: true,
      default: null,
    },
    college: {
      type: String,
      trim: true,
      default: null,
    },
    current_status: {
      type: String,
      default: 'Student',
    },
    city: {
      type: String,
      default: 'Ahmedabad',
      trim: true,
    },
    course_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      default: null,
    },
    course_name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    source_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InquirySource',
      default: null,
    },
    source_name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    inquiry_date: {
      type: String,
      default: () => new Date().toISOString().replace('T', ' ').slice(0, 19),
      index: true,
    },
    preferred_contact_time: {
      type: String,
      default: 'Any Time',
    },
    assigned_to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    assigned_to_name: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      required: true,
      enum: [
        'New',
        'Contacted',
        'Interested',
        'Follow-up Required',
        'Demo Scheduled',
        'Converted',
        'Not Interested',
        'Invalid Number',
      ],
      default: 'New',
      index: true,
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High'],
      default: 'Medium',
      index: true,
    },
    next_followup_date: {
      type: String,
      default: null,
      index: true,
    },
    last_contact_date: {
      type: String,
      default: null,
    },
    remarks: {
      type: String,
      default: null,
    },
    created_by: {
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

inquirySchema.virtual('id').get(function () {
  return this._id ? this._id.toHexString() : null;
});

const Inquiry = mongoose.model('Inquiry', inquirySchema);
export default Inquiry;
