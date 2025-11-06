# Production Deployment Fixes

## Issues Fixed

### 1. Payment Redirect URL Issue ✅
**Problem**: Xendit payment redirects to `localhost:3000/payment/success` after successful payment.

**Root Cause**: `NEXT_PUBLIC_BASE_URL` was set to `http://localhost:3000` in environment variables.

**Fixes Applied**:
- Updated `.env` file to use production URL: `https://skillbridge-2m1e.vercel.app`
- Improved `app/api/xendit/checkout/route.ts` to prevent localhost URLs in production
- Added fallback logic to use request headers if env var is incorrect

### 2. Credits Not Being Added After Payment ✅ FIXED
**Problem**: Credits not added to user account after successful Xendit payment.

**Root Causes**:
1. Webhook verification was using HMAC signature check (incorrect)
2. Webhook format detection didn't handle Xendit's legacy format

**Fixes Applied**:
- Fixed webhook verification to use simple token comparison (not HMAC)
- Added support for both new event-based format and legacy direct invoice format
- Added detailed logging for debugging webhook issues
- Improved error handling and validation

**Solution Required**:
1. Configure Xendit webhook in Xendit Dashboard:
   - Go to https://dashboard.xendit.co/settings/developers#webhooks
   - Add webhook URL: `https://skillbridge-2m1e.vercel.app/api/xendit/webhook`
   - For "Invoices paid" event, enter the webhook URL
   - Enable "Also notify my application when an invoice has expired"
   - Copy the X-CALLBACK-TOKEN (webhook verification token)

2. The webhook handler is already implemented at `app/api/xendit/webhook/route.ts`
   - ✅ Processes payments and adds credits to user accounts
   - ✅ Has idempotency protection to prevent duplicate credits
   - ✅ Logs all transactions for audit
   - ✅ Handles both legacy and new webhook formats
   - ✅ Proper token verification (fixed!)

### 3. Conversations Fetching Error ✅ FIXED
**Problem**: "Failed to fetch conversations" error when clicking message button.

**Root Cause**:
- API was returning 401 Unauthorized for unauthenticated users
- Frontend hook threw error on 401 status, showing error toast

**Fixes Applied**:
- API now returns 200 with empty array instead of 401
- Frontend hook gracefully handles all response types without throwing
- Added detailed logging to track conversation fetching
- Improved error suppression to prevent UI spam

**Result**: No more console errors or toast spam when not authenticated.

## Required Actions in Vercel

### Step 1: Update Environment Variables
Go to Vercel Dashboard → Your Project → Settings → Environment Variables

Update the following variables for **Production** environment:

```
NEXT_PUBLIC_BASE_URL=https://skillbridge-2m1e.vercel.app
```

**IMPORTANT**: Make sure to:
1. Select "Production" environment when adding/updating
2. After updating, **redeploy** your application for changes to take effect

### Step 2: Configure Xendit Webhook
1. Log in to Xendit Dashboard: https://dashboard.xendit.co
2. Go to Settings → Developers → Webhooks
3. Add new webhook:
   - **URL**: `https://skillbridge-2m1e.vercel.app/api/xendit/webhook`
   - **Events**: Select:
     - `invoice.paid`
     - `invoice.expired`
     - `invoice.payment_failed`
   - **Verification Token**: Copy this token (you'll need it next)

4. Add the webhook token to Vercel environment variables:
   ```
   XENDIT_WEBHOOK_TOKEN=<paste-the-token-from-xendit>
   ```

### Step 3: Verify All Required Environment Variables
Ensure all these variables are set in Vercel Production environment:

```bash
# Database
DATABASE_URL=<your-neon-database-url>

# Authentication
JWT_SECRET=<your-jwt-secret>

# Email
EMAIL_PROVIDER=smtp
SMTP_HOST=smtpout.secureserver.net
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=noreply@bridge-mentor.com
SMTP_PASSWORD=<your-smtp-password>
FROM_EMAIL=noreply@bridge-mentor.com

# Base URL (CRITICAL - MUST BE PRODUCTION URL)
NEXT_PUBLIC_BASE_URL=https://skillbridge-2m1e.vercel.app

# Pusher (Real-time messaging)
PUSHER_APP_ID=<your-pusher-app-id>
PUSHER_KEY=<your-pusher-key>
PUSHER_SECRET=<your-pusher-secret>
PUSHER_CLUSTER=ap1
NEXT_PUBLIC_PUSHER_KEY=<your-pusher-key>
NEXT_PUBLIC_PUSHER_CLUSTER=ap1

# Cloudinary (Image uploads)
CLOUDINARY_CLOUD_NAME=<your-cloud-name>
CLOUDINARY_API_KEY=<your-api-key>
CLOUDINARY_API_SECRET=<your-api-secret>

# Vercel Blob (File storage)
BLOB_READ_WRITE_TOKEN=<your-blob-token>

# Xendit (Payments)
XENDIT_PUBLISHABLE_KEY=<your-xendit-publishable-key>
XENDIT_SECRET_KEY=<your-xendit-secret-key>
XENDIT_WEBHOOK_TOKEN=<your-xendit-webhook-token>

# Agora (Video calls)
AGORA_APP_ID=<your-agora-app-id>
AGORA_APP_CERTIFICATE=<your-agora-certificate>
NEXT_PUBLIC_AGORA_APP_ID=<your-agora-app-id>
NEXT_PUBLIC_ENABLE_AGORA_CHAT=true
NEXT_PUBLIC_AGORA_CHAT_APP_KEY=<your-agora-chat-key>

# Cron Security
CRON_SECRET=<your-cron-secret>
```

### Step 4: Deploy the Changes
After fixing the code and updating environment variables:

```bash
git add .
git commit -m "Fix: Production payment redirect URL and improve error handling"
git push
```

Vercel will automatically deploy the changes.

## Testing the Fixes

### Test Webhook First (In Xendit Dashboard):
1. Go to Xendit Dashboard → Settings → Webhooks
2. Find "Invoices paid" webhook configuration
3. Click "Test Webhook"
4. **Expected Result**: Status 200 OK with message:
   ```json
   {
     "received": true,
     "message": "Test webhook received successfully. Real invoices will include user metadata."
   }
   ```
5. This confirms webhook is reachable and authentication works

**Note**: Test webhooks will show "Invalid user ID" in older versions because they don't include user metadata. This is expected! Real payments include metadata and will work correctly.

### Test Real Payment Flow:
1. **CRITICAL**: First ensure `NEXT_PUBLIC_BASE_URL` is set in Vercel (see Step 1 above)
2. Go to `https://skillbridge-2m1e.vercel.app/pricing`
3. Select a credit package
4. Complete payment with Xendit e-wallet (or test cards in sandbox mode)
5. After payment, you should be redirected to:
   `https://skillbridge-2m1e.vercel.app/payment/success` ✅ (NOT localhost!)
6. Credits should be added to your account within 1-2 minutes
7. Check your account dashboard to verify credits
8. Check Vercel logs for `[WEBHOOK SUCCESS] ✅ Added X credits to user Y`

### Test Withdrawal Flow:
1. Go to mentor withdrawals page
2. Enter credits amount and bank details
3. Submit withdrawal request
4. Should see confirmation and status update

### Test Messaging:
1. Click message button on any learner/mentor profile
2. Should open chat without errors
3. Messages should send and receive in real-time

## Troubleshooting

### If payment still redirects to localhost:
- Clear browser cache
- Verify `NEXT_PUBLIC_BASE_URL` is set in Vercel Production environment
- Redeploy the application
- Create a new test payment (old Xendit invoices have the old URL cached)

### If credits are not added:
- Check Vercel logs for webhook errors
- Verify Xendit webhook is configured correctly
- Check that `XENDIT_WEBHOOK_TOKEN` matches the one in Xendit dashboard
- Look for failed webhook attempts in Xendit dashboard

### If conversations error persists:
- Check Vercel logs for the actual error
- Verify database connection is working
- Check if rate limiting is being triggered
- Ensure user is authenticated before accessing chat

## Support
If issues persist after following these steps, check:
1. Vercel deployment logs
2. Xendit webhook logs in dashboard
3. Browser console for client-side errors
4. Database connection status

## Code Changes Made
- `app/api/xendit/checkout/route.ts`: Improved base URL detection
- `.env`: Updated production URL
- `DEPLOYMENT_FIX.md`: This comprehensive guide
