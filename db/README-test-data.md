# How to Populate Test Data for Admin Panel

This guide explains how Session Logs and Reports & Feedback get populated in the admin panel.

## Understanding How Data is Created

### 1. Session Logs (`session_logs` table)

**Session logs are automatically created** when:
- A session is booked → Creates "session_create" log
- A session starts → Creates "status_changed" log
- Users join/leave → Creates "user_joined" and "user_left" logs
- Session completes → Creates "session_completed" log
- Admin takes action → Creates "admin_action" log

**Where it's created:**
- `lib/services/SessionLogService.ts` - Used throughout the app
- Sessions need to actually happen for logs to appear

**To populate session logs:**
1. Have users book sessions
2. Have users join and complete sessions
3. OR use the SQL script below to insert test data

### 2. Reports & Feedback (`user_reports` table)

**User reports are created when:**
- Users report other users for violations
- Reports can be about harassment, fraud, inappropriate content, etc.

**Currently Missing:**
- There's no user-facing UI to create reports yet
- Reports can only be populated manually via SQL

**To populate reports:**
- Use the SQL script: `db/seed-admin-test-data.sql`

---

## Quick Setup Steps

### Step 1: Get Your Actual Database IDs

First, find real IDs from your database:

```sql
-- Get user IDs
SELECT id, email, role FROM users ORDER BY id LIMIT 20;

-- Get session IDs (if any exist)
SELECT id, status, scheduled_start FROM booking_sessions ORDER BY id LIMIT 10;
```

### Step 2: Edit the SQL Script

Open `db/seed-admin-test-data.sql` and replace these values:

- Replace `session_id = 1` with an actual session ID from your database
- Replace `reporter_id = 2` with an actual user ID (learner)
- Replace `reported_user_id = 3` with another user ID (mentor)
- Replace `reviewed_by = 1` with your admin user ID

### Step 3: Run the SQL Script

**Option A: Using PostgreSQL command line**
```bash
psql -U your_username -d your_database -f db/seed-admin-test-data.sql
```

**Option B: Using a GUI tool (pgAdmin, TablePlus, etc.)**
1. Open the SQL file
2. Copy the INSERT statements
3. Execute them in your database

**Option C: Using Drizzle Studio**
```bash
npm run db:studio
# Then manually insert data through the UI
```

### Step 4: Verify Data

Run these queries to check if data was inserted:

```sql
-- Check session logs
SELECT
  sl.id,
  sl.event_type,
  sl.description,
  sl.created_at
FROM session_logs sl
ORDER BY sl.created_at DESC
LIMIT 10;

-- Check user reports
SELECT
  r.id,
  r.status,
  r.category,
  reporter.email as reporter,
  reported.email as reported_user
FROM user_reports r
LEFT JOIN users reporter ON r.reporter_id = reporter.id
LEFT JOIN users reported ON r.reported_user_id = reported.id
ORDER BY r.created_at DESC
LIMIT 10;
```

---

## Simpler Alternative: Minimal Test Data

If you just want to see the admin panels with some data, here's a minimal script that works with just 2-3 users:

```sql
-- Assuming you have:
-- User ID 1 = Admin
-- User ID 2 = Learner
-- User ID 3 = Mentor
-- Session ID 1 exists (create a booking first)

-- Insert a few session logs
INSERT INTO session_logs (session_id, event_type, actor_type, description, created_at)
VALUES
  (1, 'status_changed', 'system', 'Session was scheduled', NOW() - INTERVAL '2 hours'),
  (1, 'session_completed', 'system', 'Session completed successfully', NOW() - INTERVAL '1 hour');

-- Insert a few reports
INSERT INTO user_reports (reporter_id, reported_user_id, category, description, status, created_at, updated_at)
VALUES
  (2, 3, 'other', 'Test report for demonstration', 'pending', NOW(), NOW()),
  (2, 3, 'inappropriate_content', 'Another test report', 'under_review', NOW(), NOW());
```

---

## Creating Real Data (Production Way)

For production, data should be created through the application:

### Session Logs
1. Users book sessions through the booking system
2. Sessions automatically create logs when they start/end
3. Admin actions create audit logs

### Reports & Feedback
**You need to create a report submission UI** (currently missing):

1. Add a "Report User" button on mentor/learner profiles
2. Add a "Report Session" button on completed sessions
3. Create an API route like `/api/reports/create`
4. The route should insert into `user_reports` table

**Example API structure needed:**
```typescript
// app/api/reports/route.ts
export async function POST(req: NextRequest) {
  const { reportedUserId, category, description, sessionId, evidence } = await req.json()

  await db.insert(userReports).values({
    reporterId: session.id,
    reportedUserId,
    category,
    description,
    sessionId,
    evidence,
    status: 'pending'
  })
}
```

---

## Troubleshooting

### "No session logs showing"
- Check if you have any booking sessions in the database
- Session logs are only created when sessions actually happen
- Use the SQL script to insert test logs

### "No reports showing"
- There's no user UI to create reports yet
- You must insert reports via SQL
- Or create a report submission feature

### "Foreign key constraint error"
- Make sure the user IDs and session IDs you're using actually exist
- Run the SELECT queries above to get valid IDs

---

## Next Steps

To make your admin panel fully functional:

1. ✅ Session Logs work automatically when sessions happen
2. ❌ **Create a Report User feature** so users can submit reports
3. ❌ Create admin API routes for managing reports (`/api/admin/reports`)
4. ✅ The admin UI for viewing reports already exists

Would you like me to help create the missing report submission feature?
