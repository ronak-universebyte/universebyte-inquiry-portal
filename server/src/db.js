import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.resolve(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'universebyte.db');
const db = new Database(dbPath);

// Enable WAL mode & foreign key constraints
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  const schema = `
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'staff' CHECK(role IN ('admin', 'staff')),
      phone TEXT,
      is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0, 1)),
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    -- Courses table
    CREATE TABLE IF NOT EXISTS courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0, 1)),
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    -- Inquiry Sources table
    CREATE TABLE IF NOT EXISTS inquiry_sources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      is_active INTEGER NOT NULL DEFAULT 1 CHECK(is_active IN (0, 1)),
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    -- Inquiries table
    CREATE TABLE IF NOT EXISTS inquiries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      inquiry_id TEXT NOT NULL UNIQUE,
      student_name TEXT NOT NULL,
      mobile TEXT NOT NULL,
      alt_mobile TEXT,
      email TEXT,
      qualification TEXT,
      college TEXT,
      current_status TEXT DEFAULT 'Student',
      city TEXT DEFAULT 'Ahmedabad',
      course_id INTEGER REFERENCES courses(id) ON DELETE SET NULL,
      course_name TEXT NOT NULL,
      source_id INTEGER REFERENCES inquiry_sources(id) ON DELETE SET NULL,
      source_name TEXT NOT NULL,
      inquiry_date TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      preferred_contact_time TEXT DEFAULT 'Any Time',
      assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
      assigned_to_name TEXT,
      status TEXT NOT NULL DEFAULT 'New' CHECK(status IN (
        'New', 'Contacted', 'Interested', 'Follow-up Required', 
        'Demo Scheduled', 'Converted', 'Not Interested', 'Invalid Number'
      )),
      priority TEXT NOT NULL DEFAULT 'Medium' CHECK(priority IN ('Low', 'Medium', 'High')),
      next_followup_date TEXT,
      last_contact_date TEXT,
      remarks TEXT,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    -- Follow-ups table
    CREATE TABLE IF NOT EXISTS followups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      inquiry_id INTEGER NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
      scheduled_date TEXT NOT NULL,
      scheduled_time TEXT,
      assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,
      status TEXT NOT NULL DEFAULT 'Pending' CHECK(status IN ('Pending', 'Completed', 'Cancelled', 'Rescheduled')),
      outcome TEXT,
      remarks TEXT,
      completed_at TEXT,
      completed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    -- Activity / Audit Timeline table
    CREATE TABLE IF NOT EXISTS inquiry_activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      inquiry_id INTEGER NOT NULL REFERENCES inquiries(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      user_name TEXT NOT NULL,
      activity_type TEXT NOT NULL,
      description TEXT NOT NULL,
      previous_value TEXT,
      new_value TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    -- Settings table
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      description TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    -- Indexes for high performance
    CREATE INDEX IF NOT EXISTS idx_inquiries_mobile ON inquiries(mobile);
    CREATE INDEX IF NOT EXISTS idx_inquiries_status ON inquiries(status);
    CREATE INDEX IF NOT EXISTS idx_inquiries_course ON inquiries(course_name);
    CREATE INDEX IF NOT EXISTS idx_inquiries_source ON inquiries(source_name);
    CREATE INDEX IF NOT EXISTS idx_inquiries_assigned ON inquiries(assigned_to);
    CREATE INDEX IF NOT EXISTS idx_inquiries_inquiry_date ON inquiries(inquiry_date);
    CREATE INDEX IF NOT EXISTS idx_inquiries_next_followup ON inquiries(next_followup_date);
    CREATE INDEX IF NOT EXISTS idx_inquiries_priority ON inquiries(priority);

    CREATE INDEX IF NOT EXISTS idx_followups_inquiry ON followups(inquiry_id);
    CREATE INDEX IF NOT EXISTS idx_followups_date ON followups(scheduled_date);
    CREATE INDEX IF NOT EXISTS idx_followups_status ON followups(status);
    CREATE INDEX IF NOT EXISTS idx_followups_assigned ON followups(assigned_to);

    CREATE INDEX IF NOT EXISTS idx_activities_inquiry ON inquiry_activities(inquiry_id);
    CREATE INDEX IF NOT EXISTS idx_activities_created ON inquiry_activities(created_at);
  `;

  db.exec(schema);
  console.log('Database schema verified & initialized successfully.');
}

export default db;
