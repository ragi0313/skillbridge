# 🚀 Production Deployment Guide

## **Prerequisites**

### 1. **Stripe Setup** 
```bash
# Required Stripe Products
✅ Stripe Connect (for mentor payouts)
✅ Stripe Payment Intents (for learner payments)  
✅ Stripe Webhooks (for payment confirmations)
✅ Stripe Refunds API (for learner withdrawals)
```

### 2. **Environment Variables**
```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_live_xxxxx           # Live secret key
STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx      # Live publishable key
STRIPE_WEBHOOK_SECRET=whsec_xxxxx         # Webhook endpoint secret

# Database
DATABASE_URL=postgresql://user:pass@host:5432/skillbridge_prod

# Next.js
NEXTAUTH_SECRET=your-production-secret-key
NEXTAUTH_URL=https://yourdomain.com

# Optional: Rate Limiting
REDIS_URL=redis://your-redis-instance
```

---

## **Production Architecture**

### **Payment Flow**
```
Learner Purchase → Stripe Payment → Credits Added → Session Booking
                                      ↓
Mentor Completes Session → Credits Released → Withdrawal Available
                                      ↓
Withdrawal Request → Immediate Processing → Stripe Transfer
```

### **Database Tables Used**
- `mentorPayouts` - Tracks earnings and 20% platform fees
- `withdrawalRequests` - Withdrawal history and status
- `learners.creditsBalance` - Learner credit balances
- `users.stripeCustomerId` - For refund processing

---

## **Deployment Steps**

### 1. **Stripe Connect Setup**

#### **Create Connected Accounts for Mentors**
```javascript
// During mentor onboarding
const account = await stripe.accounts.create({
  type: 'express',
  country: 'US', // mentor's country
  email: mentorEmail,
  capabilities: {
    card_payments: { requested: true },
    transfers: { requested: true },
  },
});

// Store account.id in mentor profile
await db.update(mentors).set({ 
  stripeAccountId: account.id 
}).where(eq(mentors.id, mentorId));
```

#### **Account Links for Onboarding**
```javascript
const accountLink = await stripe.accountLinks.create({
  account: stripeAccountId,
  refresh_url: 'https://yourdomain.com/mentor/stripe/reauth',
  return_url: 'https://yourdomain.com/mentor/dashboard',
  type: 'account_onboarding',
});
// Redirect mentor to accountLink.url
```

### 2. **Webhook Configuration**

#### **Required Webhooks**
```javascript
// webhook endpoint: https://yourdomain.com/api/stripe/webhook
const events = [
  'payment_intent.succeeded',     // Credit purchases
  'transfer.created',             // Mentor payouts
  'account.updated',              // Stripe Connect status
  'charge.dispute.created',       // Payment disputes
];
```

#### **Webhook Handler Updates**
```javascript
// Add to /api/stripe/webhook/route.ts
case 'transfer.created':
  // Update withdrawal status to completed
  const transfer = event.data.object;
  await db.update(withdrawalRequests)
    .set({ 
      status: 'completed',
      completedAt: new Date(),
      payoutReference: transfer.id 
    })
    .where(eq(withdrawalRequests.payoutReference, transfer.id));
  break;
```

### 3. **Database Migration**

#### **Add Missing Fields**
```sql
-- Add Stripe customer ID for refunds
ALTER TABLE users ADD COLUMN stripe_customer_id VARCHAR(255);

-- Add Stripe account ID for mentors
ALTER TABLE mentors ADD COLUMN stripe_account_id VARCHAR(255);

-- Update withdrawal requests schema
ALTER TABLE withdrawal_requests ADD COLUMN payout_reference VARCHAR(255);
```

### 4. **Production Validations**

#### **Mentor Withdrawal Validation**
```javascript
// Before processing withdrawal
const account = await stripe.accounts.retrieve(mentor.stripeAccountId);

if (!account.charges_enabled || !account.payouts_enabled) {
  throw new Error('Mentor Stripe account not fully activated');
}

// Check minimum payout amount
if (withdrawalAmount < 10) {
  throw new Error('Minimum withdrawal: $10');
}
```

#### **Learner Refund Validation**
```javascript
// Check if customer has payment methods
const customer = await stripe.customers.retrieve(user.stripeCustomerId);
if (!customer || customer.deleted) {
  throw new Error('No payment method on file for refund');
}
```

---

## **Security Considerations**

### 1. **Rate Limiting**
```javascript
// Add to withdrawal endpoints
export const POST = withRateLimit('withdrawal', async (request) => {
  // Max 3 withdrawals per day per user
}, { 
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  maxRequests: 3 
});
```

### 2. **Fraud Detection**
```javascript
// Add withdrawal limits
const DAILY_WITHDRAWAL_LIMIT = 1000; // $1000/day
const MONTHLY_WITHDRAWAL_LIMIT = 5000; // $5000/month

// Check withdrawal history
const todayWithdrawals = await db.select({ total: sum(withdrawalRequests.requestedCredits) })
  .from(withdrawalRequests)
  .where(and(
    eq(withdrawalRequests.mentorId, mentorId),
    gte(withdrawalRequests.createdAt, startOfDay)
  ));
```

### 3. **Error Handling**
```javascript
// Graceful failure handling
try {
  const transfer = await stripe.transfers.create({...});
} catch (stripeError) {
  // Log for manual review
  console.error('Stripe transfer failed:', {
    mentorId,
    amount: withdrawalAmount,
    error: stripeError.message
  });
  
  // Mark as failed, allow retry
  await db.update(withdrawalRequests)
    .set({ status: 'failed', adminNotes: stripeError.message });
    
  // Notify admin for manual processing
  await notifyAdmin(`Withdrawal failed for mentor ${mentorId}`);
}
```

---

## **Monitoring & Alerts**

### 1. **Key Metrics to Track**
- Failed withdrawal rate
- Average withdrawal processing time  
- Platform fee revenue
- Refund/dispute rates
- Stripe account activation rates

### 2. **Alerts to Set Up**
```javascript
// Critical alerts
- Withdrawal failure rate > 5%
- Daily withdrawal volume > $10,000
- Multiple failed withdrawals from same mentor
- Stripe webhook failures
- Database connection errors
```

### 3. **Dashboard Metrics**
```javascript
// Admin dashboard should show:
- Total platform fees collected
- Pending vs completed withdrawals
- Top earning mentors
- Refund/cancellation rates
- Failed payment recovery rate
```

---

## **Testing in Production**

### 1. **Staging Environment**
```bash
# Use Stripe test mode
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx

# Test scenarios:
✅ Mentor connects Stripe account
✅ Learner purchases credits  
✅ Session completion triggers payout
✅ Mentor withdrawal processes
✅ Learner refund processes
✅ Webhook delivery and retry
```

### 2. **Gradual Rollout**
```javascript
// Feature flags for gradual release
const INSTANT_WITHDRAWAL_ENABLED = process.env.NODE_ENV === 'production' && 
  process.env.ENABLE_INSTANT_WITHDRAWALS === 'true';

if (INSTANT_WITHDRAWAL_ENABLED) {
  // Process immediately
} else {
  // Keep admin approval (fallback)
}
```

---

## **Cost Optimization**

### 1. **Stripe Fees**
```
Standard Processing: 2.9% + 30¢
International: 3.9% + 30¢
Connect (transfers): 0.5% per transfer
Instant Payouts: 1.5% (for same-day transfers)
```

### 2. **Fee Strategy**
```javascript
// Pass processing costs to users
const STRIPE_FEE_PERCENTAGE = 0.029; // 2.9%
const STRIPE_FEE_FIXED = 0.30;       // 30¢

// For $100 purchase:
// Learner pays: $103.20 ($100 + 2.9% + 30¢)
// Platform receives: $100
// Stripe keeps: $3.20
```

---

## **Launch Checklist**

### **Pre-Launch** ✅
- [ ] Stripe Connect accounts working
- [ ] Webhook endpoints configured
- [ ] Database migrations applied  
- [ ] Rate limiting enabled
- [ ] Error monitoring setup
- [ ] Test transactions completed

### **Post-Launch** ✅
- [ ] Monitor webhook delivery rates
- [ ] Track withdrawal success rates
- [ ] Review fraud detection logs
- [ ] Monitor Stripe dashboard
- [ ] Set up customer support for payment issues

---

## **Support & Troubleshooting**

### **Common Issues**
1. **Mentor can't withdraw** → Check Stripe account status
2. **Learner refund fails** → Verify original payment method  
3. **Webhook failures** → Check endpoint URL and signature validation
4. **High fees** → Review fee structure and Stripe pricing

### **Emergency Procedures**
1. **Disable withdrawals**: Set `WITHDRAWALS_ENABLED=false`
2. **Manual processing**: Use Stripe Dashboard for manual transfers
3. **Webhook replay**: Use Stripe CLI to replay failed events
4. **Database rollback**: Keep transaction logs for reversals

---

✅ **Ready for Production!** 
Your withdrawal system now supports immediate processing, proper fee structures, and enterprise-grade security. 🚀