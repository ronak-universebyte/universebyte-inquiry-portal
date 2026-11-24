# UNIVERSEBYTE – INQUIRY MANAGEMENT PORTAL

> **Tagline:** Technology Redefined.  
> **Company:** UniverseByte  
> **Location:** Ahmedabad, Gujarat, India  
> **Website:** [https://www.universebyte.in](https://www.universebyte.in)  
> **WhatsApp / Phone:** +91 78598 20822  

---

## 1. Project Overview

The **UniverseByte Inquiry Management Portal** is a modern, high-performance web application designed exclusively to manage, track, organize, and convert student inquiries from the moment they arrive until they are converted or closed.

This is a focused SaaS application tailored to UniverseByte’s inquiry intake pipeline.

---

## 2. Brand Identity & Design System

- **Deep Navy Blue:** `#10152F`
- **Electric Purple:** `#7138F5`
- **Cyan:** `#00D5FF`
- **White:** `#FFFFFF`
- **Light Background:** `#F5F7FC`
- **Dark Background:** `#0B0E1F`

Built with a light theme by default, complete responsive support for desktop/tablet/mobile, and an optional dark mode toggle. Features the original UniverseByte brand logos.

---

## 3. Navigation Sections

1. **Dashboard:** Real-time database KPI cards (Total, New, Contacted, Interested, Follow-up Pending, Demo Scheduled, Converted, Not Interested), interactive charts, and recent 10 inquiries with quick actions.
2. **All Inquiries:** Enterprise table with global search, multi-parameter filters (course, status, source, priority, staff, dates), sorting, pagination, bulk assignment, bulk status updates, CSV/Excel export, and print view.
3. **Add New Inquiry:** Dedicated registration form with Indian mobile validation (10 digits), live duplicate mobile detection with warning & review link, and "Save & Add Another" mode.
4. **Follow-ups:** Categorized tracking (Today's, Upcoming, Overdue, Completed), completion modal with mandatory call remarks and outcome logging, and reschedule flows.
5. **Reports:** Performance analytics by date range (Today, Yesterday, Last 7/30 Days, This Month, Custom), conversion percentage calculation, counselor performance table, and CSV/Excel exports.
6. **Settings:** Inquiry-specific settings including General Company Info, Course Offerings, Lead Sources, Staff Accounts & Role assignments, and Predefined Status workflow.

---

## 4. Default Login Credentials

| Role | Email | Password |
|---|---|---|
| **Administrator** | `admin@universebyte.in` | `Admin@123` |
| **Staff Counselor** | `rahul@universebyte.in` | `Staff@123` |
| **Staff Counselor** | `priya@universebyte.in` | `Staff@123` |

*One-click demo login buttons are also available on the login page for rapid verification.*

---

## 5. Technology Stack & Architecture

- **Frontend:** React 18, TypeScript, Tailwind CSS, Lucide Icons, Recharts, Axios.
- **Backend:** Node.js, Express.js (ES Modules), JWT Authentication, Bcrypt password hashing.
- **Database:** Relational SQLite via `better-sqlite3` with WAL mode enabled, full foreign key constraints, indexes on key search fields, and transactions for multi-record operations.
- **Exporting:** `xlsx` library for Excel and CSV export generation.

---

## 6. How to Run the Application

### Development Mode (Both Frontend & Backend concurrently)
```bash
npm run dev
```
- Backend REST API runs on `http://localhost:5000`
- Vite Frontend Dev Server runs on `http://localhost:3000`

### Production Mode (Single Port Server)
```bash
# Build the client
npm run build

# Start the full-stack server
npm run start
```
The Express server on `http://localhost:5000` serves both the API endpoints (`/api/*`) and the built production frontend SPA.

### Running End-to-End Automated Tests
```bash
node server/test/e2e-verification.js
```
All 15 automated test cases verify admin/staff authentication, inquiry creation, duplicate detection, status updates, follow-up scheduling/completion, activity audit logs, reporting metrics, and role-based permissions.

---

**UNIVERSEBYTE – INQUIRY MANAGEMENT PORTAL**  
*Technology Redefined.*  
**One Portal. One Purpose. Complete Inquiry Control.**
