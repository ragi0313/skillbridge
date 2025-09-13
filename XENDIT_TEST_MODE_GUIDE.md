# Xendit Test Mode Guide

## 🧪 Testing Xendit Without DTI Registration

You can fully test Xendit withdrawals and payments in test mode without any business registration. Here's how:

## 1. **Xendit Test Account Setup**

### Create Test Account
1. Go to [https://dashboard.xendit.co/register](https://dashboard.xendit.co/register)
2. Sign up with your personal email
3. **Skip business verification** - you can test immediately
4. Access your test dashboard at [https://dashboard.xendit.co/](https://dashboard.xendit.co/)

### Get Test API Keys
1. Navigate to **Settings > API Keys**
2. Copy your **Test Secret Key** (starts with `xnd_development_`)
3. Copy your **Test Public Key** (starts with `xnd_public_development_`)

## 2. **Environment Configuration for Testing**

Update your `.env` file with test credentials:

```bash
# Xendit Test Mode
XENDIT_SECRET_KEY="xnd_development_your_test_key"
XENDIT_PUBLISHABLE_KEY="xnd_public_development_your_test_key"
XENDIT_WEBHOOK_TOKEN="test_webhook_token_123"

# Test Platform Account (for platform fee testing)
XENDIT_PLATFORM_BANK_CODE="BPI"
XENDIT_PLATFORM_ACCOUNT_NAME="Test Account"
XENDIT_PLATFORM_ACCOUNT_NUMBER="1234567890"
```

## 3. **Test Bank Accounts (No Real Banks Needed)**

### For Mentor Withdrawals Testing
Use these **test bank details** in your withdrawal form:

```bash
# Test BPI Account
Bank Code: BPI
Account Holder: "Test User"
Account Number: "1234567890"

# Test BDO Account  
Bank Code: BDO
Account Holder: "Test Mentor"
Account Number: "0987654321"

# Other Test Banks
METRO_BANK: "1111222233"
UNION_BANK: "4444555566"
```

### For Platform Fee Collection Testing
Your SessionCompletionService will use:
```bash
XENDIT_PLATFORM_ACCOUNT_NUMBER="1234567890" # Test account
```

## 4. **Testing Scenarios**

### A. Test Credit Purchases
1. Go to `/pricing` in your app
2. Select a credit package
3. You'll get Xendit test invoice with **test payment methods**:
   - Test Credit Card: `4000 0000 0000 0002`
   - Test GCash, GrabPay (simulated)
   - Test bank transfers

### B. Test Mentor Withdrawals
1. Go to `/mentor/withdrawals`
2. Enter test withdrawal amount (e.g., 50 credits)
3. Use test bank details above
4. Submit withdrawal request
5. **Check Xendit Dashboard** → Disbursements for test transaction

### C. Test Platform Fee Collection (SessionCompletionService)
1. Complete a session between learner and mentor
2. Check the logs for platform fee disbursement
3. **Check Xendit Dashboard** → Disbursements for platform fee transfer
4. Verify disbursement to your test platform account

## 5. **Xendit Test Dashboard Features**

### Monitor Test Transactions
- **Invoices**: See all test credit purchases
- **Disbursements**: See all test withdrawals and platform fees
- **Webhooks**: Monitor webhook delivery
- **Logs**: Debug any issues

### Test Webhook Setup
1. Go to **Settings > Webhooks**
2. Add webhook URL: `https://your-domain.com/api/xendit/webhook`
3. Use test verification token: `test_webhook_token_123`
4. Test webhook delivery with sample events

## 6. **Test Payment Methods Available**

### Credit Purchases (No Real Money)
- **Test Cards**: Various test card numbers for different scenarios
- **Test E-Wallets**: Simulated GCash, GrabPay, PayMaya
- **Test Bank Transfers**: BPI, BDO, etc. (simulated)
- **Test OTC**: 7-Eleven, Cebuana (simulated)

### Withdrawals (No Real Bank Transfers)
- **Test Disbursements**: Simulate bank transfers to any Philippine bank
- **Instant Success**: Test successful disbursements
- **Test Failures**: Simulate failed disbursements for error handling

## 7. **Testing Checklist**

### ✅ Credit Purchase Flow
- [ ] Create test invoice
- [ ] Complete payment with test methods
- [ ] Verify webhook received
- [ ] Check credits added to learner balance
- [ ] Verify database records

### ✅ Withdrawal Flow  
- [ ] Request withdrawal with test bank details
- [ ] Check disbursement created in Xendit dashboard
- [ ] Verify withdrawal status updates
- [ ] Check mentor balance deduction
- [ ] Verify transaction records

### ✅ Platform Fee Collection
- [ ] Complete a test session
- [ ] Check platform fee disbursement created
- [ ] Verify correct amount calculation
- [ ] Check transaction logging
- [ ] Verify mentor gets 80% share

### ✅ Error Handling
- [ ] Test invalid bank details
- [ ] Test insufficient balance
- [ ] Test webhook failures
- [ ] Test network timeouts

## 8. **Important Test Mode Notes**

### ✅ **Advantages**
- **No DTI/Business Registration Required**
- **No Real Money Involved**
- **Full API Feature Testing**
- **Webhook Testing Available**
- **Real-time Dashboard Monitoring**

### ⚠️ **Limitations**
- **Test credentials only** - won't work in production
- **Simulated transactions** - no actual bank transfers
- **Lower rate limits** - fewer API calls per minute
- **Test data resets** - periodic cleanup

### 🚀 **When Ready for Production**
1. Complete DTI business registration
2. Upgrade to Xendit business account
3. Complete KYC verification
4. Switch to production API keys
5. Update environment variables

## 9. **Test Commands**

```bash
# Install dependencies
npm install

# Push database schema
npm run db:push

# Start development server
npm run dev

# Test the flows at:
# http://localhost:3000/pricing (credit purchase)
# http://localhost:3000/mentor/withdrawals (withdrawals)
```

## 10. **Debug Test Issues**

### Check Logs
```bash
# Check server logs for Xendit API calls
tail -f logs/xendit.log

# Check webhook processing
tail -f logs/webhook.log
```

### Common Test Issues
1. **Invalid API Keys**: Check test key format starts with `xnd_development_`
2. **Webhook Not Received**: Verify webhook URL and verification token
3. **Disbursement Failures**: Check test bank account format
4. **Rate Limits**: Wait a few seconds between API calls

You can start testing immediately with just a free Xendit test account - no business registration needed!