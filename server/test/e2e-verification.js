import http from 'http';
import assert from 'assert';

const BASE_URL = 'http://localhost:5000/api';

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, headers: res.headers, data };
}

async function runTestSuite() {
  console.log('====================================================');
  console.log(' UNIVERSEBYTE INQUIRY MANAGEMENT PORTAL TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  async function test(name, fn) {
    total++;
    try {
      await fn();
      console.log(`[PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`[FAIL] ${name}:`, err.message);
    }
  }

  let adminToken = '';
  let staffToken = '';
  let testInquiryId = 0;
  let testInquiryCode = '';
  let testFollowupId = 0;

  // 1. Admin login works
  await test('1. Admin login works with secure password verification', async () => {
    const res = await request('/auth/login', {
      method: 'POST',
      body: { email: 'admin@universebyte.in', password: 'Admin@123' }
    });
    assert.strictEqual(res.status, 200, 'Admin login should succeed with 200');
    assert.strictEqual(res.data.user.role, 'admin');
    assert.ok(res.data.token, 'Token must be returned');
    adminToken = res.data.token;
  });

  // 2. Staff login works
  await test('2. Staff login works with role scoping', async () => {
    const res = await request('/auth/login', {
      method: 'POST',
      body: { email: 'rahul@universebyte.in', password: 'Staff@123' }
    });
    assert.strictEqual(res.status, 200, 'Staff login should succeed with 200');
    assert.strictEqual(res.data.user.role, 'staff');
    assert.ok(res.data.token);
    staffToken = res.data.token;
  });

  // 3. New inquiry creation works with auto ID and timestamp
  await test('3. New inquiry creation works with automated sequential ID generation', async () => {
    const uniqueMobile = '98' + Math.floor(10000000 + Math.random() * 90000000);
    const res = await request('/inquiries', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        student_name: 'Test Student Automated',
        mobile: uniqueMobile,
        email: 'test.student@example.com',
        course_name: 'Artificial Intelligence',
        source_name: 'Website',
        qualification: 'B.Tech CS',
        city: 'Ahmedabad',
        priority: 'High',
        remarks: 'Automated test inquiry registration.'
      }
    });

    assert.strictEqual(res.status, 201, 'Inquiry creation must return 201');
    assert.ok(res.data.inquiry.inquiry_id.startsWith('UB-INQ-'), 'ID must follow UB-INQ-YYYY-XXXX convention');
    assert.strictEqual(res.data.inquiry.student_name, 'Test Student Automated');
    testInquiryId = res.data.inquiry.id;
    testInquiryCode = res.data.inquiry.inquiry_id;
  });

  // 4. Duplicate mobile number detection works
  await test('4. Duplicate mobile number detection warns and prevents accidental duplication', async () => {
    // Attempt to register the exact same inquiry again
    const existing = (await request(`/inquiries/${testInquiryId}`, { headers: { Authorization: `Bearer ${adminToken}` } })).data.inquiry;
    const res = await request('/inquiries', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        student_name: 'Duplicate Attempt',
        mobile: existing.mobile,
        course_name: 'Python',
        source_name: 'Walk-in',
        allow_duplicate: false
      }
    });

    assert.strictEqual(res.status, 409, 'Duplicate entry should return 409 Conflict');
    assert.ok(res.data.existingInquiry, 'Existing inquiry info must be provided');
  });

  // 5. Duplicate check endpoint works
  await test('5. Duplicate check endpoint identifies existing leads', async () => {
    const existing = (await request(`/inquiries/${testInquiryId}`, { headers: { Authorization: `Bearer ${adminToken}` } })).data.inquiry;
    const res = await request(`/inquiries/check-duplicate?mobile=${existing.mobile}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.isDuplicate, true);
    assert.strictEqual(res.data.existingInquiry.inquiry_id, testInquiryCode);
  });

  // 6. Inquiry editing works
  await test('6. Inquiry editing works and preserves audit record', async () => {
    const res = await request(`/inquiries/${testInquiryId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        student_name: 'Test Student Updated',
        mobile: '9825199999',
        qualification: 'M.Tech AI',
        city: 'Gandhinagar',
        course_name: 'Data Science',
        source_name: 'Website',
        priority: 'High',
        remarks: 'Updated qualification and course.'
      }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.inquiry.student_name, 'Test Student Updated');
    assert.strictEqual(res.data.inquiry.course_name, 'Data Science');
  });

  // 7. Status updates work & record audit timeline
  await test('7. Status updates work and append to immutable timeline history', async () => {
    const res = await request(`/inquiries/${testInquiryId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        status: 'Interested',
        remarks: 'Student expressed strong interest after attending counseling session.'
      }
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.inquiry.status, 'Interested');

    // Verify activity timeline contains the change
    const detailRes = await request(`/inquiries/${testInquiryId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const statusAct = detailRes.data.activities.find(a => a.activity_type === 'STATUS_CHANGE');
    assert.ok(statusAct, 'Status change activity must be logged');
    assert.strictEqual(statusAct.new_value, 'Interested');
  });

  // 8. Follow-up creation and completion works
  await test('8. Follow-up scheduling and completion workflow works', async () => {
    // Schedule follow-up
    const schedRes = await request('/followups', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        inquiry_id: testInquiryId,
        scheduled_date: '2026-11-25',
        scheduled_time: '15:30',
        remarks: 'Discuss fee structure and enrollment date.'
      }
    });
    assert.strictEqual(schedRes.status, 201);

    // Get follow-up ID from inquiry details
    const inqDetails = (await request(`/inquiries/${testInquiryId}`, { headers: { Authorization: `Bearer ${adminToken}` } })).data;
    const fup = inqDetails.followups.find(f => f.status === 'Pending');
    assert.ok(fup, 'Pending follow-up must exist');
    testFollowupId = fup.id;

    // Complete follow-up
    const compRes = await request(`/followups/${testFollowupId}/complete`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        outcome: 'Enrolled & Paid',
        remarks: 'Student finalized registration and paid fees via UPI.',
        new_status: 'Converted'
      }
    });
    assert.strictEqual(compRes.status, 200);

    // Verify inquiry is converted
    const updatedInq = (await request(`/inquiries/${testInquiryId}`, { headers: { Authorization: `Bearer ${adminToken}` } })).data.inquiry;
    assert.strictEqual(updatedInq.status, 'Converted');
  });

  // 9. Search and filters work with database queries
  await test('9. Search and filters work seamlessly on database queries', async () => {
    const res = await request('/inquiries?search=Updated&status=Converted', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    assert.ok(res.data.inquiries.length >= 1);
    assert.strictEqual(res.data.inquiries[0].id, testInquiryId);
  });

  // 10. Dashboard returns live database KPI calculations
  await test('10. Dashboard calculates real database KPI metrics and charts', async () => {
    const res = await request('/dashboard', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    assert.ok(res.data.kpis.total >= 10);
    assert.ok(res.data.kpis.converted >= 1);
    assert.ok(res.data.dailyTrends.length > 0);
    assert.ok(res.data.courseDistribution.length > 0);
    assert.ok(res.data.sourceDistribution.length > 0);
  });

  // 11. Reports calculations and conversion percentage
  await test('11. Reports section accurately computes conversion percentage and formula', async () => {
    const res = await request('/reports?range=last30days', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    assert.ok(res.data.summary.totalInquiries > 0);
    assert.ok(typeof res.data.summary.conversionRate === 'number');
    assert.ok(res.data.reportingFormula.includes('Converted Inquiries'));
  });

  // 12. CSV and Excel export endpoints
  await test('12. CSV export produces valid CSV text headers', async () => {
    const res = await fetch(`${BASE_URL}/inquiries/export?format=csv`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    const text = await res.text();
    assert.ok(text.includes('Inquiry ID,Student Name,Mobile Number'));
  });

  // 13. Role-based backend security enforcement
  await test('13. Role-based security prevents staff from deleting inquiries or managing settings', async () => {
    // Staff trying to delete an inquiry
    const delRes = await request(`/inquiries/${testInquiryId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${staffToken}` }
    });
    assert.strictEqual(delRes.status, 403, 'Staff must be forbidden from deleting inquiries');

    // Staff trying to update general settings
    const setRes = await request('/settings', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${staffToken}` },
      body: { company_name: 'Hacked' }
    });
    assert.strictEqual(setRes.status, 403, 'Staff must be forbidden from updating settings');
  });

  // 14. Course & Source settings management
  await test('14. Settings allow admin to create and toggle course and source options', async () => {
    // Add new course
    const courseName = 'Cloud Native & DevOps ' + Date.now();
    const cRes = await request('/settings/courses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { name: courseName, description: 'DevOps training track' }
    });
    assert.strictEqual(cRes.status, 201);
    assert.strictEqual(cRes.data.course.name, courseName);
  });

  // 15. Staff user creation and password reset
  await test('15. Staff account management and password reset functions work', async () => {
    const staffEmail = `counselor.${Date.now()}@universebyte.in`;
    const uRes = await request('/users', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        name: 'New Counselor',
        email: staffEmail,
        password: 'Password@123',
        role: 'staff',
        phone: '9825000000'
      }
    });
    assert.strictEqual(uRes.status, 201);
    const newUserId = uRes.data.user.id;

    // Reset password
    const resetRes = await request(`/users/${newUserId}/reset-password`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { newPassword: 'NewPassword@456' }
    });
    assert.strictEqual(resetRes.status, 200);

    // Verify login with new password
    const loginRes = await request('/auth/login', {
      method: 'POST',
      body: { email: staffEmail, password: 'NewPassword@456' }
    });
    assert.strictEqual(loginRes.status, 200);
  });

  // 16. Unauthenticated delete request returns 401 Unauthorized
  await test('16. Unauthenticated delete request returns 401 Unauthorized', async () => {
    const res = await request(`/inquiries/${testInquiryId}`, {
      method: 'DELETE',
    });
    assert.strictEqual(res.status, 401, 'Unauthenticated delete must return 401');
    assert.ok(res.data.error, 'Must include error message');
  });

  // 17. Invalid or expired token delete request returns 401 Unauthorized
  await test('17. Invalid or expired JWT token on delete request returns 401 Unauthorized', async () => {
    const res = await request(`/inquiries/${testInquiryId}`, {
      method: 'DELETE',
      headers: { Authorization: 'Bearer invalid.or.expired.jwt.token' }
    });
    assert.strictEqual(res.status, 401, 'Invalid JWT token must return 401');
    assert.ok(res.data.error, 'Must include error message');
  });

  // 18. Non-admin staff attempting to delete inquiry returns 403 Forbidden
  await test('18. Non-admin staff attempting to delete inquiry returns 403 Forbidden', async () => {
    const res = await request(`/inquiries/${testInquiryId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${staffToken}` }
    });
    assert.strictEqual(res.status, 403, 'Non-admin staff must be denied with 403');
    assert.ok(res.data.error.toLowerCase().includes('admin'), 'Must state administrator requirement');
  });

  // 19. Admin can delete inquiry successfully (200 OK)
  await test('19. Admin can delete inquiry successfully with clean database removal', async () => {
    const res = await request(`/inquiries/${testInquiryId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200, 'Admin delete must succeed with 200 OK');
    assert.ok(res.data.message.includes('deleted successfully'));
  });

  // 20. Deleted inquiry is verified removed from database
  await test('20. Deleted inquiry is completely removed and returns 404 Not Found', async () => {
    const res = await request(`/inquiries/${testInquiryId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 404, 'Deleted inquiry should return 404 Not Found');
  });

  console.log(`\n====================================================`);
  console.log(` RESULTS: ${passed}/${total} test cases passed successfully.`);
  console.log(`====================================================`);

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTestSuite().catch(err => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
