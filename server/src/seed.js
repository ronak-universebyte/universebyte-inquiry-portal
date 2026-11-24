import bcrypt from 'bcryptjs';
import db, { initDatabase } from './db.js';

export async function seedDatabase() {
  initDatabase();

  console.log('Seeding initial system data...');

  // 1. Settings
  const settingsInsert = db.prepare(`
    INSERT OR REPLACE INTO settings (key, value, description, updated_at) 
    VALUES (?, ?, ?, datetime('now', 'localtime'))
  `);

  const initialSettings = [
    ['company_name', 'UniverseByte', 'Company brand name'],
    ['company_tagline', 'Technology Redefined.', 'Company official tagline'],
    ['company_location', 'Ahmedabad, Gujarat, India', 'Company headquarters location'],
    ['company_website', 'https://www.universebyte.in', 'Official website URL'],
    ['company_whatsapp', '+91 78598 20822', 'Primary WhatsApp contact number'],
    ['company_phone', '+91 78598 20822', 'Primary phone number'],
    ['company_email', 'info@universebyte.in', 'Official contact email'],
    ['company_logo', '/universebyte-logo.png', 'Logo path or URL'],
    ['allow_duplicate_mobile', 'warn', 'Policy on duplicate phone numbers (warn / block)'],
    ['default_inquiry_status', 'New', 'Default status for incoming inquiries'],
    ['currency_symbol', '₹', 'Currency symbol used']
  ];

  for (const [key, val, desc] of initialSettings) {
    settingsInsert.run(key, val, desc);
  }

  // 2. Courses
  const defaultCourses = [
    'Artificial Intelligence',
    'Python',
    'Full Stack Development',
    'MERN Stack Development',
    'Web Development',
    'PHP & Laravel',
    'Data Science',
    'Other'
  ];

  const courseInsert = db.prepare(`
    INSERT OR IGNORE INTO courses (name, description, is_active, created_at, updated_at)
    VALUES (?, ?, 1, datetime('now', 'localtime'), datetime('now', 'localtime'))
  `);

  for (const course of defaultCourses) {
    courseInsert.run(course, `Comprehensive training program in ${course} with industry-aligned syllabus.`);
  }

  // 3. Inquiry Sources
  const defaultSources = [
    'Website',
    'WhatsApp',
    'Instagram',
    'Facebook Ads',
    'Google Ads',
    'Walk-in',
    'Reference',
    'Justdial',
    'Other'
  ];

  const sourceInsert = db.prepare(`
    INSERT OR IGNORE INTO inquiry_sources (name, is_active, created_at, updated_at)
    VALUES (?, 1, datetime('now', 'localtime'), datetime('now', 'localtime'))
  `);

  for (const src of defaultSources) {
    sourceInsert.run(src);
  }

  // 4. Users (Admin and Staff)
  const userInsert = db.prepare(`
    INSERT OR IGNORE INTO users (name, email, password, role, phone, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 1, datetime('now', 'localtime'), datetime('now', 'localtime'))
  `);

  const adminPasswordHash = bcrypt.hashSync('Admin@123', 10);
  const staffPasswordHash = bcrypt.hashSync('Staff@123', 10);

  userInsert.run('Admin UniverseByte', 'admin@universebyte.in', adminPasswordHash, 'admin', '+91 78598 20822');
  userInsert.run('Rahul Sharma', 'rahul@universebyte.in', staffPasswordHash, 'staff', '+91 98765 43210');
  userInsert.run('Priya Patel', 'priya@universebyte.in', staffPasswordHash, 'staff', '+91 98250 12345');
  userInsert.run('Amit Trivedi', 'amit@universebyte.in', staffPasswordHash, 'staff', '+91 94280 67890');

  // Check if inquiries already exist
  const existingInquiriesCount = db.prepare('SELECT COUNT(*) as count FROM inquiries').get().count;

  if (existingInquiriesCount === 0) {
    console.log('Seeding sample inquiry records...');

    const adminUser = db.prepare("SELECT * FROM users WHERE email = 'admin@universebyte.in'").get();
    const rahulUser = db.prepare("SELECT * FROM users WHERE email = 'rahul@universebyte.in'").get();
    const priyaUser = db.prepare("SELECT * FROM users WHERE email = 'priya@universebyte.in'").get();
    const amitUser = db.prepare("SELECT * FROM users WHERE email = 'amit@universebyte.in'").get();

    const sampleInquiries = [
      {
        inquiry_id: 'UB-INQ-2026-0001',
        student_name: 'Aarav Mehta',
        mobile: '9825123456',
        alt_mobile: '9825123457',
        email: 'aarav.mehta@gmail.com',
        qualification: 'B.E. Computer Engineering',
        college: 'L.D. College of Engineering, Ahmedabad',
        current_status: 'Student',
        city: 'Ahmedabad',
        course_name: 'Artificial Intelligence',
        source_name: 'Website',
        inquiry_date: '2026-11-20 10:15:00',
        preferred_contact_time: 'Evening (5 PM - 8 PM)',
        assigned_to: rahulUser.id,
        assigned_to_name: rahulUser.name,
        status: 'Interested',
        priority: 'High',
        next_followup_date: '2026-11-24 16:30:00', // Today
        last_contact_date: '2026-11-22 14:00:00',
        remarks: 'Very eager to learn Generative AI and LLM architectures. Requested syllabus PDF.'
      },
      {
        inquiry_id: 'UB-INQ-2026-0002',
        student_name: 'Sneha Joshi',
        mobile: '9879112233',
        alt_mobile: null,
        email: 'sneha.j@yahoo.com',
        qualification: 'BCA',
        college: 'Gujarat University',
        current_status: 'Fresher',
        city: 'Gandhinagar',
        course_name: 'Full Stack Development',
        source_name: 'Instagram',
        inquiry_date: '2026-11-21 11:30:00',
        preferred_contact_time: 'Afternoon (1 PM - 4 PM)',
        assigned_to: priyaUser.id,
        assigned_to_name: priyaUser.name,
        status: 'Demo Scheduled',
        priority: 'High',
        next_followup_date: '2026-11-25 11:00:00', // Upcoming
        last_contact_date: '2026-11-23 15:30:00',
        remarks: 'Scheduled demo lecture for React + Node fullstack module on Wednesday 11 AM.'
      },
      {
        id_suffix: '0003',
        inquiry_id: 'UB-INQ-2026-0003',
        student_name: 'Karan Shah',
        mobile: '9909223344',
        alt_mobile: '9909223345',
        email: 'karan.shah@outlook.com',
        qualification: 'B.Tech IT',
        college: 'Nirma University',
        current_status: 'Working Professional',
        city: 'Ahmedabad',
        course_name: 'Python',
        source_name: 'Google Ads',
        inquiry_date: '2026-11-18 16:45:00',
        preferred_contact_time: 'Morning (10 AM - 12 PM)',
        assigned_to: rahulUser.id,
        assigned_to_name: rahulUser.name,
        status: 'Converted',
        priority: 'High',
        next_followup_date: null,
        last_contact_date: '2026-11-22 17:00:00',
        remarks: 'Enrolled in Weekend Python Data Mastery batch! Registration fee received.'
      },
      {
        inquiry_id: 'UB-INQ-2026-0004',
        student_name: 'Diya Patel',
        mobile: '9712334455',
        alt_mobile: null,
        email: 'diya.patel22@gmail.com',
        qualification: 'Diploma Computer',
        college: 'Government Polytechnic, Ahmedabad',
        current_status: 'Student',
        city: 'Ahmedabad',
        course_name: 'MERN Stack Development',
        source_name: 'WhatsApp',
        inquiry_date: '2026-11-17 14:20:00',
        preferred_contact_time: 'Any Time',
        assigned_to: amitUser.id,
        assigned_to_name: amitUser.name,
        status: 'Follow-up Required',
        priority: 'Medium',
        next_followup_date: '2026-11-23 10:00:00', // Overdue
        last_contact_date: '2026-11-20 16:00:00',
        remarks: 'Wanted to discuss with parents regarding offline vs hybrid schedule.'
      },
      {
        inquiry_id: 'UB-INQ-2026-0005',
        student_name: 'Rohan Varma',
        mobile: '9898445566',
        alt_mobile: null,
        email: 'rohan.varma@gmail.com',
        qualification: 'B.Com',
        college: 'H.L. College of Commerce',
        current_status: 'Fresher',
        city: 'Ahmedabad',
        course_name: 'Data Science',
        source_name: 'Walk-in',
        inquiry_date: '2026-11-24 11:00:00',
        preferred_contact_time: 'Morning (10 AM - 12 PM)',
        assigned_to: priyaUser.id,
        assigned_to_name: priyaUser.name,
        status: 'New',
        priority: 'Medium',
        next_followup_date: '2026-11-24 17:00:00', // Today
        last_contact_date: null,
        remarks: 'Walked in at reception. Inquired about career transition from non-tech to Data Science.'
      },
      {
        inquiry_id: 'UB-INQ-2026-0006',
        student_name: 'Hardik Desai',
        mobile: '9427556677',
        alt_mobile: null,
        email: 'hardik.desai@rediffmail.com',
        qualification: 'MCA',
        college: 'GLS University',
        current_status: 'Working Professional',
        city: 'Surat',
        course_name: 'PHP & Laravel',
        source_name: 'Facebook Ads',
        inquiry_date: '2026-11-15 09:30:00',
        preferred_contact_time: 'Evening (5 PM - 8 PM)',
        assigned_to: rahulUser.id,
        assigned_to_name: rahulUser.name,
        status: 'Not Interested',
        priority: 'Low',
        next_followup_date: null,
        last_contact_date: '2026-11-19 12:00:00',
        remarks: 'Looking exclusively for 100% free courses. Advised regarding scholarships, but declined.'
      },
      {
        inquiry_id: 'UB-INQ-2026-0007',
        student_name: 'Pooja Bhatt',
        mobile: '9824667788',
        alt_mobile: null,
        email: 'pooja.bhatt@gmail.com',
        qualification: 'B.Sc IT',
        college: 'St. Xavier’s College',
        current_status: 'Student',
        city: 'Ahmedabad',
        course_name: 'Web Development',
        source_name: 'Reference',
        inquiry_date: '2026-11-23 15:10:00',
        preferred_contact_time: 'Afternoon (1 PM - 4 PM)',
        assigned_to: amitUser.id,
        assigned_to_name: amitUser.name,
        status: 'Contacted',
        priority: 'High',
        next_followup_date: '2026-11-26 14:00:00', // Upcoming
        last_contact_date: '2026-11-24 12:15:00',
        remarks: 'Referred by alumni Parth Solanki. Explained frontend curriculum and project portfolio.'
      },
      {
        inquiry_id: 'UB-INQ-2026-0008',
        student_name: 'Vikram Rajput',
        mobile: '9000012345',
        alt_mobile: null,
        email: 'fake.number@test.com',
        qualification: '12th Pass',
        college: 'N/A',
        current_status: 'Student',
        city: 'Vadodara',
        course_name: 'Python',
        source_name: 'Justdial',
        inquiry_date: '2026-11-14 13:00:00',
        preferred_contact_time: 'Any Time',
        assigned_to: rahulUser.id,
        assigned_to_name: rahulUser.name,
        status: 'Invalid Number',
        priority: 'Low',
        next_followup_date: null,
        last_contact_date: '2026-11-14 14:00:00',
        remarks: 'Dialer responded "The number you have dialed does not exist". Marked as invalid lead.'
      },
      {
        inquiry_id: 'UB-INQ-2026-0009',
        student_name: 'Manish Soni',
        mobile: '9725778899',
        alt_mobile: '9725778800',
        email: 'manish.soni@gmail.com',
        qualification: 'B.E. Mechanical',
        college: 'VGEC, Chandkheda',
        current_status: 'Working Professional',
        city: 'Ahmedabad',
        course_name: 'Artificial Intelligence',
        source_name: 'Google Ads',
        inquiry_date: '2026-11-19 18:20:00',
        preferred_contact_time: 'Evening (5 PM - 8 PM)',
        assigned_to: priyaUser.id,
        assigned_to_name: priyaUser.name,
        status: 'Interested',
        priority: 'High',
        next_followup_date: '2026-11-24 18:00:00', // Today
        last_contact_date: '2026-11-22 16:40:00',
        remarks: 'Has basic Python knowledge. Wants to build AI agent solutions for industrial automation.'
      },
      {
        inquiry_id: 'UB-INQ-2026-0010',
        student_name: 'Bhavik Prajapati',
        mobile: '9898889900',
        alt_mobile: null,
        email: 'bhavik.p@gmail.com',
        qualification: 'BCA',
        college: 'Som-Lalit Institute',
        current_status: 'Student',
        city: 'Ahmedabad',
        course_name: 'Full Stack Development',
        source_name: 'Website',
        inquiry_date: '2026-11-16 11:00:00',
        preferred_contact_time: 'Morning (10 AM - 12 PM)',
        assigned_to: rahulUser.id,
        assigned_to_name: rahulUser.name,
        status: 'Converted',
        priority: 'High',
        next_followup_date: null,
        last_contact_date: '2026-11-21 15:00:00',
        remarks: 'Joined November 2026 Full Stack batch. First installment cleared.'
      }
    ];

    const inqInsert = db.prepare(`
      INSERT INTO inquiries (
        inquiry_id, student_name, mobile, alt_mobile, email,
        qualification, college, current_status, city,
        course_name, source_name, inquiry_date, preferred_contact_time,
        assigned_to, assigned_to_name, status, priority,
        next_followup_date, last_contact_date, remarks,
        created_by, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?
      )
    `);

    const actInsert = db.prepare(`
      INSERT INTO inquiry_activities (
        inquiry_id, user_id, user_name, activity_type,
        description, previous_value, new_value, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const fupInsert = db.prepare(`
      INSERT INTO followups (
        inquiry_id, scheduled_date, scheduled_time, assigned_to,
        status, outcome, remarks, completed_at, completed_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const inq of sampleInquiries) {
      const res = inqInsert.run(
        inq.inquiry_id, inq.student_name, inq.mobile, inq.alt_mobile, inq.email,
        inq.qualification, inq.college, inq.current_status, inq.city,
        inq.course_name, inq.source_name, inq.inquiry_date, inq.preferred_contact_time,
        inq.assigned_to, inq.assigned_to_name, inq.status, inq.priority,
        inq.next_followup_date, inq.last_contact_date, inq.remarks,
        adminUser.id, inq.inquiry_date, inq.inquiry_date
      );

      const dbInqId = res.lastInsertRowid;

      // Add Creation activity
      actInsert.run(
        dbInqId, adminUser.id, adminUser.name, 'CREATED',
        `Inquiry received via ${inq.source_name} for course ${inq.course_name}`,
        null, inq.status, inq.inquiry_date
      );

      // Add Assignment activity
      if (inq.assigned_to) {
        actInsert.run(
          dbInqId, adminUser.id, adminUser.name, 'ASSIGNED',
          `Inquiry assigned to ${inq.assigned_to_name}`,
          null, inq.assigned_to_name, inq.inquiry_date
        );
      }

      // Add follow-up if present
      if (inq.next_followup_date) {
        const parts = inq.next_followup_date.split(' ');
        const dateStr = parts[0];
        const timeStr = parts[1] ? parts[1].substring(0, 5) : '15:00';
        
        let fupStatus = 'Pending';
        if (dateStr < '2026-11-24') {
          fupStatus = 'Pending'; // Overdue
        }

        fupInsert.run(
          dbInqId, dateStr, timeStr, inq.assigned_to,
          fupStatus, null, inq.remarks, null, null, inq.inquiry_date, inq.inquiry_date
        );

        actInsert.run(
          dbInqId, inq.assigned_to, inq.assigned_to_name, 'FOLLOWUP_SCHEDULED',
          `Follow-up scheduled for ${dateStr} at ${timeStr}`,
          null, `${dateStr} ${timeStr}`, inq.inquiry_date
        );
      }

      // Add completed follow-up for converted inquiries
      if (inq.status === 'Converted') {
        fupInsert.run(
          dbInqId, inq.last_contact_date.split(' ')[0], '14:30', inq.assigned_to,
          'Completed', 'Enrolled & Paid', 'Student completed registration formalities.',
          inq.last_contact_date, inq.assigned_to, inq.inquiry_date, inq.last_contact_date
        );

        actInsert.run(
          dbInqId, inq.assigned_to, inq.assigned_to_name, 'STATUS_CHANGE',
          `Status changed from Interested to Converted`,
          'Interested', 'Converted', inq.last_contact_date
        );
      }
    }

    console.log('Sample inquiries, activities, and follow-ups successfully seeded.');
  }

  console.log('Database initialization & seeding complete.');
}

// Run directly if invoked from command line
if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  seedDatabase().catch(err => {
    console.error('Seeding failed:', err);
    process.exit(1);
  });
}
