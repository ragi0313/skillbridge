# Xendit Migration Guide

## Overview
This guide outlines the migration from Stripe to Xendit for payment processing in SkillBridge, specifically optimized for Philippines operations.

## Why Xendit?
- **Full Philippines Support**: Native support for Philippine banks and payment methods
- **Local Payment Methods**: GCash, GrabPay, PayMaya, and major Philippine banks
- **Better Compliance**: BSP (Bangko Sentral ng Pilipinas) compliant
- **Lower Fees**: Reduced costs for local transactions
- **Direct PHP Support**: No currency conversion issues

## Implementation Summary

### 1. Database Changes (✅ Completed)
```sql
-- Added to users table
xenditAccountId VARCHAR(255)
xenditAccountStatus VARCHAR(50) DEFAULT 'none'
preferredPaymentProvider VARCHAR(20) DEFAULT 'xendit'

-- Added to creditPurchases table  
xenditInvoiceId VARCHAR(255)
xenditPaymentId VARCHAR(255)

-- Added to creditWithdrawals table
xenditDisbursementId VARCHAR(255)
xenditChannelCode VARCHAR(50)
```

### 2. New API Endpoints (✅ Completed)

#### Credit Purchase Flow
- `POST /api/xendit/checkout` - Create payment invoice
- `POST /api/xendit/webhook` - Handle payment webhooks

#### Withdrawal Flow
- `GET /api/xendit/withdrawals` - Get withdrawal history
- `POST /api/xendit/withdrawals` - Request withdrawal

### 3. Frontend Updates (✅ Completed)
- Updated pricing page to use Xendit checkout
- New `XenditCreditWithdrawal` component for mentor withdrawals
- Philippine bank selection interface

### 4. Environment Variables Required

```bash
# Xendit Configuration
XENDIT_PUBLISHABLE_KEY="xnd_public_..."
XENDIT_SECRET_KEY="xnd_..."
XENDIT_WEBHOOK_TOKEN="your_webhook_verification_token"
```

## Migration Steps

### Step 1: Set Up Xendit Account
1. Sign up at [Xendit Dashboard](https://dashboard.xendit.co/)
2. Complete business verification for Philippines operations
3. Get API keys from Settings > API Keys
4. Set up webhook endpoint for payment notifications

### Step 2: Configure Environment Variables
1. Add Xendit credentials to your `.env` file
2. Update `NEXT_PUBLIC_BASE_URL` for webhook callbacks

### Step 3: Deploy Database Schema Updates
```bash
npm run db:push
```

### Step 4: Test Payment Flow
1. Test credit purchases with various payment methods
2. Test mentor withdrawals to Philippine banks
3. Verify webhook handling

### Step 5: Production Deployment
1. Switch to Xendit production keys
2. Configure production webhooks
3. Update webhook URLs in Xendit dashboard

## Supported Payment Methods

### For Credit Purchases
- Credit/Debit Cards (Visa, Mastercard)
- GCash
- GrabPay
- PayMaya/Maya
- Philippine Banks (BPI, BDO, Metrobank, etc.)
- Over-the-counter (7-Eleven, Cebuana, etc.)

### For Withdrawals
- BPI (Bank of the Philippine Islands)
- BDO (Banco de Oro)
- Metrobank
- UnionBank
- PNB (Philippine National Bank)
- Security Bank
- RCBC
- China Bank
- And more Philippine banks

## Key Features

### Multi-Currency Support
- USD for international users
- PHP for Philippine users
- Automatic currency detection

### Real-time Processing
- Instant payment confirmations
- Real-time balance updates
- Webhook-based transaction tracking

### Security
- Webhook signature verification
- Encrypted payment data
- PCI DSS compliant processing

## Testing

### Test Credit Purchase
1. Go to `/pricing`
2. Select a credit package
3. Complete payment with test payment methods
4. Verify credits added to account

### Test Withdrawal
1. Go to `/mentor/withdrawals`
2. Enter withdrawal amount and bank details
3. Submit withdrawal request
4. Check withdrawal status and processing

## Monitoring & Support

### Webhook Monitoring
Monitor webhook delivery and processing:
```bash
# Check webhook logs
tail -f logs/xendit-webhooks.log
```

### Payment Status Tracking
All payment statuses are tracked in the database:
- `pending` - Payment initiated
- `completed` - Payment successful
- `failed` - Payment failed
- `cancelled` - Payment cancelled

### Support Contacts
- Xendit Support: [support@xendit.co](mailto:support@xendit.co)
- Documentation: [https://developers.xendit.co/](https://developers.xendit.co/)

## Migration Checklist

- [x] Install Xendit SDK
- [x] Update database schema
- [x] Implement checkout API
- [x] Implement webhook handler
- [x] Implement withdrawal system
- [x] Update frontend components
- [ ] Configure environment variables
- [ ] Test payment flow
- [ ] Deploy to production
- [ ] Monitor webhook delivery
- [ ] Update documentation

## Rollback Plan

If issues arise, you can quickly rollback by:
1. Reverting frontend to use `/api/stripe/checkout`
2. Switching environment variables back to Stripe
3. Database supports both providers, so no data loss

## Next Steps
1. Set up Xendit account and get API credentials
2. Configure environment variables
3. Test the complete payment and withdrawal flow
4. Deploy to production when ready

The migration provides better support for Philippine users while maintaining compatibility with existing Stripe infrastructure during the transition period.