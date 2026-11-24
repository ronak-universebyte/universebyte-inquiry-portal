import bcrypt from 'bcryptjs';
import { connectDB, disconnectDB } from './db.js';
import {
  User,
  Course,
  InquirySource,
  Inquiry,
  Followup,
  InquiryActivity,
  Setting,
} from './models/index.js';

export async function seedDatabase() {
  await connectDB();

  console.log('Checking and seeding system initial data...');

  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

  // 1. Settings
  const initialSettings = [
    { key: 'company_name', value: 'UniverseByte', description: 'Company brand name' },
    { key: 'company_tagline', value: 'Technology Redefined.', description: 'Company official tagline' },
    { key: 'company_location', value: 'Ahmedabad, Gujarat, India', description: 'Company headquarters location' },
    { key: 'company_website', value: 'https://www.universebyte.in', description: 'Official website URL' },
    { key: 'company_whatsapp', value: '+91 78598 20822', description: 'Primary WhatsApp contact number' },
    { key: 'company_phone', value: '+91 78598 20822', description: 'Primary phone number' },
    { key: 'company_email', value: 'info@universebyte.in', description: 'Official contact email' },
    { key: 'company_logo', value: '/universebyte-logo.png', description: 'Logo path or URL' },
    { key: 'allow_duplicate_mobile', value: 'warn', description: 'Policy on duplicate phone numbers (warn / block)' },
    { key: 'default_inquiry_status', value: 'New', description: 'Default status for incoming inquiries' },
    { key: 'currency_symbol', value: '₹', description: 'Currency symbol used' },
  ];

  for (const item of initialSettings) {
    await Setting.findOneAndUpdate(
      { key: item.key },
      { $setOnInsert: { value: item.value, description: item.description, updated_at: now } },
      { upsert: true }
    );
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
    'Other',
  ];

  for (const courseName of defaultCourses) {
    await Course.findOneAndUpdate(
      { name: courseName },
      {
        $setOnInsert: {
          description: `Comprehensive training program in ${courseName} with industry-aligned syllabus.`,
          is_active: 1,
          created_at: now,
          updated_at: now,
        },
      },
      { upsert: true }
    );
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
    'Other',
  ];

  for (const src of defaultSources) {
    await InquirySource.findOneAndUpdate(
      { name: src },
      {
        $setOnInsert: {
          is_active: 1,
          created_at: now,
          updated_at: now,
        },
      },
      { upsert: true }
    );
  }

  // 4. Default Users (Admin and Staff)
  const adminPasswordHash = await bcrypt.hash('Admin@123', 10);
  const staffPasswordHash = await bcrypt.hash('Staff@123', 10);

  const defaultUsers = [
    {
      name: 'Admin UniverseByte',
      email: 'admin@universebyte.in',
      password: adminPasswordHash,
      role: 'admin',
      phone: '+91 78598 20822',
    },
    {
      name: 'Rahul Sharma',
      email: 'rahul@universebyte.in',
      password: staffPasswordHash,
      role: 'staff',
      phone: '+91 98765 43210',
    },
    {
      name: 'Priya Patel',
      email: 'priya@universebyte.in',
      password: staffPasswordHash,
      role: 'staff',
      phone: '+91 98250 12345',
    },
    {
      name: 'Amit Trivedi',
      email: 'amit@universebyte.in',
      password: staffPasswordHash,
      role: 'staff',
      phone: '+91 94280 67890',
    },
  ];

  for (const u of defaultUsers) {
    const existing = await User.findOne({ email: u.email });
    if (!existing) {
      await User.create({
        ...u,
        is_active: 1,
        created_at: now,
        updated_at: now,
      });
    }
  }

  // Check if inquiries already exist
  const existingInquiriesCount = await Inquiry.countDocuments();

  if (existingInquiriesCount === 0) {
    console.log('Seeding sample inquiry records and follow-ups...');

    const adminUser = await User.findOne({ email: 'admin@universebyte.in' });
    const rahulUser = await User.findOne({ email: 'rahul@universebyte.in' });
    const priyaUser = await User.findOne({ email: 'priya@universebyte.in' });
    const amitUser = await User.findOne({ email: 'amit@universebyte.in' });

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
        assigned_to: rahulUser?._id,
        assigned_to_name: rahulUser?.name,
        status: 'Interested',
        priority: 'High',
        next_followup_date: '2026-11-24 16:30:00',
        last_contact_date: '2026-11-22 14:00:00',
        remarks: 'Very eager to learn Generative AI and LLM architectures. Requested syllabus PDF.',
        created_by: adminUser?._id,
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
        assigned_to: priyaUser?._id,
        assigned_to_name: priyaUser?.name,
        status: 'Demo Scheduled',
        priority: 'High',
        next_followup_date: '2026-11-25 11:00:00',
        last_contact_date: '2026-11-23 15:30:00',
        remarks: 'Scheduled demo lecture for React + Node fullstack module on Wednesday 11 AM.',
        created_by: adminUser?._id,
      },
      {
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
        assigned_to: rahulUser?._id,
        assigned_to_name: rahulUser?.name,
        status: 'Converted',
        priority: 'High',
        next_followup_date: null,
        last_contact_date: '2026-11-22 17:00:00',
        remarks: 'Enrolled in Weekend Python Data Mastery batch! Registration fee received.',
        created_by: adminUser?._id,
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
        assigned_to: amitUser?._id,
        assigned_to_name: amitUser?.name,
        status: 'Follow-up Required',
        priority: 'Medium',
        next_followup_date: '2026-11-23 10:00:00',
        last_contact_date: '2026-11-20 16:00:00',
        remarks: 'Wanted to discuss with parents regarding offline vs hybrid schedule.',
        created_by: adminUser?._id,
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
        assigned_to: priyaUser?._id,
        assigned_to_name: priyaUser?.name,
        status: 'New',
        priority: 'Medium',
        next_followup_date: '2026-11-24 17:00:00',
        last_contact_date: null,
        remarks: 'Walked in at reception. Inquired about career transition from non-tech to Data Science.',
        created_by: adminUser?._id,
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
        assigned_to: rahulUser?._id,
        assigned_to_name: rahulUser?.name,
        status: 'Not Interested',
        priority: 'Low',
        next_followup_date: null,
        last_contact_date: '2026-11-19 12:00:00',
        remarks: 'Looking exclusively for 100% free courses. Advised regarding scholarships, but declined.',
        created_by: adminUser?._id,
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
        assigned_to: amitUser?._id,
        assigned_to_name: amitUser?.name,
        status: 'Contacted',
        priority: 'High',
        next_followup_date: '2026-11-26 14:00:00',
        last_contact_date: '2026-11-24 12:15:00',
        remarks: 'Referred by alumni Parth Solanki. Explained frontend curriculum and project portfolio.',
        created_by: adminUser?._id,
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
        assigned_to: rahulUser?._id,
        assigned_to_name: rahulUser?.name,
        status: 'Invalid Number',
        priority: 'Low',
        next_followup_date: null,
        last_contact_date: '2026-11-14 14:00:00',
        remarks: 'Dialer responded "The number you have dialed does not exist". Marked as invalid lead.',
        created_by: adminUser?._id,
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
        assigned_to: priyaUser?._id,
        assigned_to_name: priyaUser?.name,
        status: 'Interested',
        priority: 'High',
        next_followup_date: '2026-11-24 18:00:00',
        last_contact_date: '2026-11-22 16:40:00',
        remarks: 'Has basic Python knowledge. Wants to build AI agent solutions for industrial automation.',
        created_by: adminUser?._id,
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
        assigned_to: rahulUser?._id,
        assigned_to_name: rahulUser?.name,
        status: 'Converted',
        priority: 'High',
        next_followup_date: null,
        last_contact_date: '2026-11-21 15:00:00',
        remarks: 'Joined November 2026 Full Stack batch. First installment cleared.',
        created_by: adminUser?._id,
      },
    ];

    for (const inqData of sampleInquiries) {
      const createdInq = await Inquiry.create({
        ...inqData,
        created_at: inqData.inquiry_date,
        updated_at: inqData.inquiry_date,
      });

      // 1. Creation Activity
      await InquiryActivity.create({
        inquiry_id: createdInq._id,
        user_id: adminUser?._id,
        user_name: adminUser?.name || 'Admin',
        activity_type: 'CREATED',
        description: `Inquiry received via ${createdInq.source_name} for course ${createdInq.course_name}`,
        previous_value: null,
        new_value: createdInq.status,
        created_at: createdInq.inquiry_date,
      });

      // 2. Assignment Activity
      if (createdInq.assigned_to) {
        await InquiryActivity.create({
          inquiry_id: createdInq._id,
          user_id: adminUser?._id,
          user_name: adminUser?.name || 'Admin',
          activity_type: 'ASSIGNED',
          description: `Inquiry assigned to ${createdInq.assigned_to_name}`,
          previous_value: null,
          new_value: createdInq.assigned_to_name,
          created_at: createdInq.inquiry_date,
        });
      }

      // 3. Follow-up if present
      if (createdInq.next_followup_date) {
        const parts = createdInq.next_followup_date.split(' ');
        const dateStr = parts[0];
        const timeStr = parts[1] ? parts[1].substring(0, 5) : '15:00';

        await Followup.create({
          inquiry_id: createdInq._id,
          scheduled_date: dateStr,
          scheduled_time: timeStr,
          assigned_to: createdInq.assigned_to,
          status: 'Pending',
          outcome: null,
          remarks: createdInq.remarks,
          completed_at: null,
          completed_by: null,
          created_at: createdInq.inquiry_date,
          updated_at: createdInq.inquiry_date,
        });

        await InquiryActivity.create({
          inquiry_id: createdInq._id,
          user_id: createdInq.assigned_to,
          user_name: createdInq.assigned_to_name,
          activity_type: 'FOLLOWUP_SCHEDULED',
          description: `Follow-up scheduled for ${dateStr} at ${timeStr}`,
          previous_value: null,
          new_value: `${dateStr} ${timeStr}`,
          created_at: createdInq.inquiry_date,
        });
      }

      // 4. Completed follow-up for Converted inquiries
      if (createdInq.status === 'Converted') {
        const contactDate = createdInq.last_contact_date ? createdInq.last_contact_date.split(' ')[0] : '2026-11-21';

        await Followup.create({
          inquiry_id: createdInq._id,
          scheduled_date: contactDate,
          scheduled_time: '14:30',
          assigned_to: createdInq.assigned_to,
          status: 'Completed',
          outcome: 'Enrolled & Paid',
          remarks: 'Student completed registration formalities.',
          completed_at: createdInq.last_contact_date || createdInq.inquiry_date,
          completed_by: createdInq.assigned_to,
          created_at: createdInq.inquiry_date,
          updated_at: createdInq.last_contact_date || createdInq.inquiry_date,
        });

        await InquiryActivity.create({
          inquiry_id: createdInq._id,
          user_id: createdInq.assigned_to,
          user_name: createdInq.assigned_to_name,
          activity_type: 'STATUS_CHANGE',
          description: 'Status changed from Interested to Converted',
          previous_value: 'Interested',
          new_value: 'Converted',
          created_at: createdInq.last_contact_date || createdInq.inquiry_date,
        });
      }
    }

    console.log('Sample inquiries, activities, and follow-ups successfully seeded.');
  }

  console.log('Database initialization & seeding complete.');
}

// Run directly if invoked from command line
if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  seedDatabase()
    .then(async () => {
      console.log('Seeding script finished successfully.');
      await disconnectDB();
      process.exit(0);
    })
    .catch((err) => {
      console.error('Seeding failed:', err);
      process.exit(1);
    });
}
