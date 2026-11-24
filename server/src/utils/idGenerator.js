import Inquiry from '../models/Inquiry.js';

export async function generateInquiryId() {
  const year = new Date().getFullYear();
  const prefix = `UB-INQ-${year}-`;

  // Find latest inquiry ID with this prefix
  const regex = new RegExp(`^${prefix}\\d+`);
  const lastInquiry = await Inquiry.findOne({ inquiry_id: regex })
    .sort({ inquiry_id: -1, _id: -1 })
    .select('inquiry_id');

  let nextNum = 1;
  if (lastInquiry && lastInquiry.inquiry_id) {
    const parts = lastInquiry.inquiry_id.split('-');
    const lastNumStr = parts[parts.length - 1];
    const parsed = parseInt(lastNumStr, 10);
    if (!isNaN(parsed)) {
      nextNum = parsed + 1;
    }
  }

  // Format as 4-digit number: 0001, 0002, ...
  const formattedNum = String(nextNum).padStart(4, '0');
  return `${prefix}${formattedNum}`;
}
