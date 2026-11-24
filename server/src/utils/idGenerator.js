import db from '../db.js';

export function generateInquiryId() {
  const year = new Date().getFullYear();
  const prefix = `UB-INQ-${year}-`;

  // Find latest inquiry ID with this prefix
  const lastInquiry = db.prepare(`
    SELECT inquiry_id FROM inquiries 
    WHERE inquiry_id LIKE ? 
    ORDER BY id DESC LIMIT 1
  `).get(`${prefix}%`);

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
