import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function extractSqliteData(sqliteFilePath) {
  return new Promise((resolve, reject) => {
    const pythonScript = `
import sqlite3
import json
import sys

db_path = sys.argv[1]
conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row
cur = conn.cursor()

result = {}
tables = ['settings', 'courses', 'inquiry_sources', 'users', 'inquiries', 'followups', 'inquiry_activities']

for table in tables:
    try:
        cur.execute(f"SELECT * FROM {table}")
        rows = cur.fetchall()
        result[table] = [dict(row) for row in rows]
    except Exception as e:
        result[table] = []

conn.close()
print(json.dumps(result))
`;

    const py = spawn('python', ['-c', pythonScript, sqliteFilePath]);
    let stdout = '';
    let stderr = '';

    py.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    py.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    py.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`Failed to extract SQLite data: ${stderr || 'code ' + code}`));
      }
      try {
        const parsed = JSON.parse(stdout);
        resolve(parsed);
      } catch (err) {
        reject(new Error(`Failed to parse extracted JSON: ${err.message}`));
      }
    });
  });
}

export async function migrateFromSqlite(sqlitePath) {
  const targetPath = sqlitePath || path.resolve(__dirname, '../data/inquiry.db');

  if (!fs.existsSync(targetPath)) {
    console.log(`[INFO] No SQLite database found at: ${targetPath}`);
    console.log('If you have an existing SQLite database to import, pass the file path:');
    console.log('  node src/migrate-sqlite.js <path-to-inquiry.db>');
    return;
  }

  console.log(`[START] Migrating existing SQLite database from: ${targetPath}`);
  await connectDB();

  const data = await extractSqliteData(targetPath);
  console.log(`[EXTRACTED] Records found:`);
  console.log(` - Settings: ${data.settings?.length || 0}`);
  console.log(` - Courses: ${data.courses?.length || 0}`);
  console.log(` - Sources: ${data.inquiry_sources?.length || 0}`);
  console.log(` - Users: ${data.users?.length || 0}`);
  console.log(` - Inquiries: ${data.inquiries?.length || 0}`);
  console.log(` - Follow-ups: ${data.followups?.length || 0}`);
  console.log(` - Activities: ${data.inquiry_activities?.length || 0}`);

  // 1. Migrate Settings
  let migratedSettings = 0;
  for (const s of data.settings || []) {
    await Setting.findOneAndUpdate(
      { key: s.key },
      {
        $set: {
          value: s.value,
          description: s.description || '',
          updated_at: s.updated_at || new Date().toISOString(),
        },
      },
      { upsert: true }
    );
    migratedSettings++;
  }

  // 2. Migrate Courses
  let migratedCourses = 0;
  const courseMap = {}; // old_id -> new Course doc
  for (const c of data.courses || []) {
    const doc = await Course.findOneAndUpdate(
      { name: c.name },
      {
        $set: {
          description: c.description,
          is_active: c.is_active !== undefined ? c.is_active : 1,
          updated_at: c.updated_at || new Date().toISOString(),
        },
        $setOnInsert: {
          created_at: c.created_at || new Date().toISOString(),
        },
      },
      { upsert: true, new: true }
    );
    courseMap[c.id] = doc;
    migratedCourses++;
  }

  // 3. Migrate Sources
  let migratedSources = 0;
  const sourceMap = {}; // old_id -> new Source doc
  for (const src of data.inquiry_sources || []) {
    const doc = await InquirySource.findOneAndUpdate(
      { name: src.name },
      {
        $set: {
          is_active: src.is_active !== undefined ? src.is_active : 1,
          updated_at: src.updated_at || new Date().toISOString(),
        },
        $setOnInsert: {
          created_at: src.created_at || new Date().toISOString(),
        },
      },
      { upsert: true, new: true }
    );
    sourceMap[src.id] = doc;
    migratedSources++;
  }

  // 4. Migrate Users
  let migratedUsers = 0;
  const userMap = {}; // old_id -> new User doc
  for (const u of data.users || []) {
    const doc = await User.findOneAndUpdate(
      { email: u.email.toLowerCase() },
      {
        $set: {
          name: u.name,
          role: u.role || 'staff',
          phone: u.phone || null,
          is_active: u.is_active !== undefined ? u.is_active : 1,
          updated_at: u.updated_at || new Date().toISOString(),
        },
        $setOnInsert: {
          password: u.password,
          created_at: u.created_at || new Date().toISOString(),
        },
      },
      { upsert: true, new: true }
    );
    userMap[u.id] = doc;
    migratedUsers++;
  }

  // 5. Migrate Inquiries
  let migratedInquiries = 0;
  const inquiryMap = {}; // old_id -> new Inquiry doc
  for (const inq of data.inquiries || []) {
    const assignedUser = inq.assigned_to ? userMap[inq.assigned_to] : null;
    const createdByUser = inq.created_by ? userMap[inq.created_by] : null;

    const inqDoc = await Inquiry.findOneAndUpdate(
      { inquiry_id: inq.inquiry_id },
      {
        $set: {
          student_name: inq.student_name,
          mobile: inq.mobile,
          alt_mobile: inq.alt_mobile || null,
          email: inq.email || null,
          qualification: inq.qualification || null,
          college: inq.college || null,
          current_status: inq.current_status || 'Student',
          city: inq.city || 'Ahmedabad',
          course_name: inq.course_name,
          source_name: inq.source_name,
          inquiry_date: inq.inquiry_date,
          preferred_contact_time: inq.preferred_contact_time || 'Any Time',
          assigned_to: assignedUser ? assignedUser._id : null,
          assigned_to_name: assignedUser ? assignedUser.name : (inq.assigned_to_name || null),
          status: inq.status || 'New',
          priority: inq.priority || 'Medium',
          next_followup_date: inq.next_followup_date || null,
          last_contact_date: inq.last_contact_date || null,
          remarks: inq.remarks || null,
          created_by: createdByUser ? createdByUser._id : null,
          updated_at: inq.updated_at || new Date().toISOString(),
        },
        $setOnInsert: {
          created_at: inq.created_at || inq.inquiry_date || new Date().toISOString(),
        },
      },
      { upsert: true, new: true }
    );
    inquiryMap[inq.id] = inqDoc;
    migratedInquiries++;
  }

  // 6. Migrate Follow-ups
  let migratedFollowups = 0;
  for (const f of data.followups || []) {
    const targetInq = inquiryMap[f.inquiry_id];
    if (!targetInq) continue;

    const assignedUser = f.assigned_to ? userMap[f.assigned_to] : null;
    const completedByUser = f.completed_by ? userMap[f.completed_by] : null;

    // Check if existing
    const existing = await Followup.findOne({
      inquiry_id: targetInq._id,
      scheduled_date: f.scheduled_date,
      scheduled_time: f.scheduled_time,
    });

    if (!existing) {
      await Followup.create({
        inquiry_id: targetInq._id,
        scheduled_date: f.scheduled_date,
        scheduled_time: f.scheduled_time || '15:00',
        assigned_to: assignedUser ? assignedUser._id : null,
        status: f.status || 'Pending',
        outcome: f.outcome || null,
        remarks: f.remarks || null,
        completed_at: f.completed_at || null,
        completed_by: completedByUser ? completedByUser._id : null,
        created_at: f.created_at || new Date().toISOString(),
        updated_at: f.updated_at || new Date().toISOString(),
      });
      migratedFollowups++;
    }
  }

  // 7. Migrate Activities
  let migratedActivities = 0;
  for (const a of data.inquiry_activities || []) {
    const targetInq = inquiryMap[a.inquiry_id];
    if (!targetInq) continue;

    const actUser = a.user_id ? userMap[a.user_id] : null;

    const existing = await InquiryActivity.findOne({
      inquiry_id: targetInq._id,
      activity_type: a.activity_type,
      created_at: a.created_at,
    });

    if (!existing) {
      await InquiryActivity.create({
        inquiry_id: targetInq._id,
        user_id: actUser ? actUser._id : null,
        user_name: actUser ? actUser.name : (a.user_name || 'System'),
        activity_type: a.activity_type,
        description: a.description,
        previous_value: a.previous_value || null,
        new_value: a.new_value || null,
        created_at: a.created_at || new Date().toISOString(),
      });
      migratedActivities++;
    }
  }

  console.log(`\n====================================================`);
  console.log(` SQLITE TO MONGODB MIGRATION COMPLETE`);
  console.log(`====================================================`);
  console.log(` Settings migrated/updated:   ${migratedSettings}`);
  console.log(` Courses migrated/updated:    ${migratedCourses}`);
  console.log(` Sources migrated/updated:    ${migratedSources}`);
  console.log(` Users migrated/updated:      ${migratedUsers}`);
  console.log(` Inquiries migrated/updated:  ${migratedInquiries}`);
  console.log(` Followups migrated:          ${migratedFollowups}`);
  console.log(` Activities migrated:         ${migratedActivities}`);
  console.log(`====================================================\n`);
}

if (process.argv[1] && process.argv[1].endsWith('migrate-sqlite.js')) {
  migrateFromSqlite(process.argv[2])
    .then(async () => {
      await disconnectDB();
      process.exit(0);
    })
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}
