# Resend Email Integration Strategy for TiltCheck

## Overview
Resend is a developer-first email API that enables transactional and marketing emails with excellent deliverability, simple API, and React Email integration. This document outlines strategic use cases for integrating Resend into the TiltCheck ecosystem.

## Why Resend?

### Advantages
- **Modern API**: Simple REST API with TypeScript SDK
- **React Email**: Build emails with React components
- **High Deliverability**: Built-in DKIM, SPF, DMARC support
- **Developer Experience**: Beautiful dashboard, webhook events, testing tools
- **Free Tier**: 100 emails/day, 3,000/month (sufficient for early validation)
- **Pricing**: $20/mo for 50k emails (extremely affordable)

### Comparison to Alternatives
| Feature | Resend | SendGrid | AWS SES | Mailgun |
|---------|--------|----------|---------|---------|
| Free tier emails/mo | 3,000 | 100/day | None | 1,000 |
| Developer UX | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ |
| React Email support | Native | No | No | No |
| Setup complexity | Low | Medium | High | Medium |
| TypeScript SDK | Yes | Yes | Yes | Yes |

---

## 🎯 Strategic Use Cases for TiltCheck

### 1. **Transaction Notifications** (High Priority)

#### JustTheTip Transaction Receipts
**Problem**: Users want confirmation of tips/airdrops without staying in Discord
**Solution**: Email receipt after transaction confirms on-chain

```typescript
// Example: Email receipt for tip
await resend.emails.send({
  from: 'tips@tiltcheck.gg',
  to: userEmail,
  subject: '💰 Tip Sent Successfully',
  react: TipReceiptEmail({
    amount: '0.5 SOL',
    recipient: '@degenking',
    txSignature: 'abc123...',
    fee: '$0.07',
    timestamp: new Date(),
  }),
});
```

**Benefits**:
- Professional user experience
- Audit trail for users
- Reduces support inquiries ("Did my tip go through?")
- Marketing opportunity (footer links to other tools)

**Revenue Impact**: Builds trust → increases tip volume → more fees

---

### 2. **Security Alerts** (Critical Priority)

#### Suspicious Activity Notifications
**Problem**: Users need immediate alerts for suspicious account activity
**Solution**: Email alerts for wallet changes, large transactions, login from new location

```typescript
// Example: Wallet address change alert
await resend.emails.send({
  from: 'security@tiltcheck.gg',
  to: userEmail,
  subject: '🔐 Wallet Address Changed - Verify This Was You',
  react: SecurityAlertEmail({
    action: 'Wallet registration',
    newWallet: 'H8m2gN2...',
    walletType: 'Phantom',
    ipAddress: '192.168.1.1',
    timestamp: new Date(),
    verifyUrl: 'https://tiltcheck.gg/verify/abc123',
  }),
});
```

**Benefits**:
- Prevents account compromise
- Builds user confidence in security
- Regulatory compliance (audit logs)
- Early detection of scams

**Revenue Impact**: Security → trust → user retention → premium subscriptions

---

### 3. **Trust Score Change Notifications** (Medium Priority)

#### Degen Trust Engine Updates
**Problem**: Users don't know when their trust score changes
**Solution**: Weekly digest + immediate alerts for major changes

```typescript
// Weekly trust score digest
await resend.emails.send({
  from: 'trust@tiltcheck.gg',
  to: userEmail,
  subject: '📊 Your Weekly Trust Score Report',
  react: TrustScoreDigestEmail({
    currentScore: 78,
    previousScore: 72,
    changes: [
      { action: 'Verified bonus claim', delta: +5 },
      { action: 'Shared winning strategy', delta: +3 },
      { action: 'Cooldown violation', delta: -2 },
    ],
    rank: 'Diamond (Top 10%)',
    perks: ['Priority support', 'Beta access'],
  }),
});
```

**Benefits**:
- Gamification → engagement
- Transparency in trust scoring
- Encourages positive behavior
- Cross-promotion of other tools

**Revenue Impact**: Engagement → retention → premium upsells

---

### 4. **Pending Tip Reminders** (High Priority)

#### Unclaimed Tips Notifications
**Problem**: Users receive tips before registering wallets and forget to claim
**Solution**: Email reminder to register wallet and claim pending SOL

```typescript
// Pending tips reminder
await resend.emails.send({
  from: 'tips@tiltcheck.gg',
  to: userEmail,
  subject: '💸 You Have Unclaimed Tips Worth $12.50 SOL',
  react: PendingTipsEmail({
    tips: [
      { from: '@cryptowhale', amount: '0.5 SOL', date: '2025-11-15' },
      { from: '@degen420', amount: '0.25 SOL', date: '2025-11-18' },
    ],
    totalValue: '$12.50',
    expiresIn: '7 days',
    registerUrl: 'https://discord.com/channels/.../register',
  }),
});
```

**Benefits**:
- Recovers abandoned tips
- Increases wallet registrations
- Reduces expired tip refunds
- Re-engages dormant users

**Revenue Impact**: Recovered tips → more transaction volume → more fees

---

### 5. **Casino Risk Alerts** (Medium Priority)

#### SusLink & Trust Engine Warnings
**Problem**: Users click scam links before trust scores update in Discord
**Solution**: Email alert when user interacts with flagged casino/domain

```typescript
// Casino risk alert
await resend.emails.send({
  from: 'alerts@tiltcheck.gg',
  to: userEmail,
  subject: '⚠️ WARNING: Casino Risk Alert',
  react: CasinoRiskAlertEmail({
    casino: 'StakeClone.com',
    riskLevel: 'HIGH',
    reasons: [
      'Domain registered 2 days ago',
      'Mimics legitimate site (stake.com)',
      'No verifiable RTP data',
      'Reported by 12 users as scam',
    ],
    recommendedAction: 'DO NOT DEPOSIT',
    safeAlternatives: ['Stake.us', 'BC.Game'],
  }),
});
```

**Benefits**:
- Prevents user losses
- Demonstrates value of TiltCheck
- Builds authority in space
- Potential to save users thousands

**Revenue Impact**: Saved users become advocates → viral growth → premium subs

---

### 6. **Bonus Tracker Notifications** (Low Priority - Future)

#### FreeSpinScan Promo Alerts
**Problem**: Users miss time-sensitive promos relevant to their preferences
**Solution**: Personalized promo digest based on past claims

```typescript
// Personalized promo digest
await resend.emails.send({
  from: 'promos@tiltcheck.gg',
  to: userEmail,
  subject: '🎁 New Promos Matching Your Preferences',
  react: PromoDigestEmail({
    promos: [
      {
        casino: 'Stake.us',
        offer: '100 Free Spins on Sugar Rush',
        expiresIn: '48 hours',
        wagerReq: '1x',
        trustScore: 95,
        claimUrl: 'https://stake.us/promo/abc123',
      },
    ],
    matchReason: 'You claimed Stake.us promos 3 times last month',
  }),
});
```

**Benefits**:
- Increases promo claim rate
- Affiliate revenue opportunity
- Personalization → retention
- Data on user preferences

**Revenue Impact**: Affiliate commissions from casinos

---

### 7. **LockVault Unlock Reminders** (Medium Priority)

#### Time-Lock Wallet Notifications
**Problem**: Users forget when their self-exclusion lock expires
**Solution**: Email countdown + unlock confirmation

```typescript
// Lock expiring soon
await resend.emails.send({
  from: 'vault@tiltcheck.gg',
  to: userEmail,
  subject: '🔓 Your Lock Expires in 24 Hours',
  react: LockExpiryEmail({
    unlockDate: new Date('2025-11-25T00:00:00Z'),
    lockDuration: '7 days',
    fundsLocked: '2.5 SOL ($250)',
    extendUrl: 'https://discord.com/channels/.../vault-extend',
    emergencyContact: userEmergencyEmail, // If set
  }),
});
```

**Benefits**:
- Responsible gambling support
- Reduces support tickets
- Opportunity to extend lock (better outcomes)
- Premium feature for lock management

**Revenue Impact**: Premium LockVault features ($5/mo)

---

### 8. **Onboarding & Education** (Low Priority - Future)

#### New User Welcome Series
**Problem**: Users don't discover all TiltCheck tools
**Solution**: 5-email onboarding series introducing ecosystem

**Email 1**: Welcome + JustTheTip tutorial  
**Email 2**: Trust Engines explained  
**Email 3**: SusLink protection  
**Email 4**: LockVault & responsible gambling  
**Email 5**: Premium features offer

**Benefits**:
- Higher activation rate
- Cross-tool discovery
- Education → better user behavior
- Premium conversion funnel

**Revenue Impact**: Higher LTV per user

---

## 📊 Cost Analysis

### Expected Volume (6 months post-launch)
- **Active users**: 500
- **Transaction receipts**: 2,000/month (4 tips/user/month avg)
- **Security alerts**: 100/month (wallet changes, suspicious activity)
- **Trust digests**: 2,000/month (weekly for all users)
- **Pending tip reminders**: 500/month (1 reminder/user)
- **Casino risk alerts**: 300/month
- **Total**: ~5,000 emails/month

### Pricing Tiers
| Volume | Resend Plan | Cost/Month | Cost/Email |
|--------|-------------|------------|------------|
| 0-3,000 | Free | $0 | $0 |
| 3,000-50,000 | Pro | $20 | $0.0004 |
| 50,000-100,000 | Pro | $20 | $0.0004 |

**Projected Cost**: $20/month (after exceeding free tier)

### ROI Calculation
**Revenue from email-driven conversions**:
- Recovered pending tips: 20 tips/mo × $0.07 fee = **$1.40/mo**
- Security trust → premium subs: 5 new subs/mo × $5 = **$25/mo**
- Engagement → retention: Reduces churn by 10% = **~$50/mo** value

**Total value**: ~$76/month  
**Cost**: $20/month  
**ROI**: 280%

---

## 🛠️ Implementation Plan

### Phase 1: Core Notifications (Week 1-2)
1. ✅ Install Resend SDK: `pnpm add resend`
2. ✅ Set up React Email templates
3. ✅ Implement transaction receipts (JustTheTip)
4. ✅ Implement security alerts (wallet changes)
5. ✅ Test email deliverability

### Phase 2: Trust & Engagement (Week 3-4)
1. Weekly trust score digest
2. Pending tip reminders
3. Casino risk alerts
4. User email preferences system

### Phase 3: Advanced Features (Week 5-8)
1. Personalized promo digests
2. LockVault unlock reminders
3. Onboarding email series
4. A/B testing for email content

### Phase 4: Optimization (Ongoing)
1. Track open rates, click rates
2. Optimize send times
3. Implement unsubscribe management
4. Add email webhook events

---

## 🔧 Technical Implementation

### Package Setup
```bash
# Install dependencies
pnpm add resend react-email @react-email/components

# Add email templates to monorepo
mkdir -p packages/email-templates
```

### Email Template Example (React Email)
```tsx
// packages/email-templates/src/TipReceipt.tsx
import { Html, Head, Body, Container, Section, Text, Button } from '@react-email/components';

interface TipReceiptProps {
  amount: string;
  recipient: string;
  txSignature: string;
  fee: string;
  timestamp: Date;
}

export const TipReceiptEmail = ({ amount, recipient, txSignature, fee, timestamp }: TipReceiptProps) => (
  <Html>
    <Head />
    <Body style={main}>
      <Container style={container}>
        <Text style={heading}>💰 Tip Sent Successfully</Text>
        <Section style={section}>
          <Text><strong>Amount:</strong> {amount}</Text>
          <Text><strong>To:</strong> {recipient}</Text>
          <Text><strong>Fee:</strong> {fee}</Text>
          <Text><strong>Time:</strong> {timestamp.toLocaleString()}</Text>
        </Section>
        <Button href={`https://solscan.io/tx/${txSignature}`} style={button}>
          View Transaction
        </Button>
        <Text style={footer}>
          Sent via JustTheTip by TiltCheck
        </Text>
      </Container>
    </Body>
  </Html>
);

const main = { backgroundColor: '#f6f9fc', fontFamily: 'Arial, sans-serif' };
const container = { margin: '0 auto', padding: '20px', maxWidth: '600px' };
const heading = { fontSize: '24px', fontWeight: 'bold', marginBottom: '20px' };
const section = { backgroundColor: '#ffffff', padding: '20px', borderRadius: '8px' };
const button = { backgroundColor: '#5469d4', color: '#ffffff', padding: '12px 24px', borderRadius: '4px' };
const footer = { color: '#8898aa', fontSize: '12px', marginTop: '20px' };
```

### Resend Service Integration
```typescript
// packages/email-service/src/index.ts
import { Resend } from 'resend';
import { TipReceiptEmail } from '@tiltcheck/email-templates';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendTipReceipt(params: {
  userEmail: string;
  amount: string;
  recipient: string;
  txSignature: string;
  fee: string;
}) {
  if (!params.userEmail) {
    console.warn('[Email] No email for user, skipping receipt');
    return;
  }

  try {
    const { data, error } = await resend.emails.send({
      from: 'JustTheTip <tips@tiltcheck.gg>',
      to: params.userEmail,
      subject: `💰 Tip Sent: ${params.amount} to ${params.recipient}`,
      react: TipReceiptEmail({
        amount: params.amount,
        recipient: params.recipient,
        txSignature: params.txSignature,
        fee: params.fee,
        timestamp: new Date(),
      }),
    });

    if (error) {
      console.error('[Email] Failed to send tip receipt:', error);
      return;
    }

    console.log('[Email] Tip receipt sent:', data.id);
    return data;
  } catch (error) {
    console.error('[Email] Error sending tip receipt:', error);
  }
}

export function isEmailEnabled(): boolean {
  return !!process.env.RESEND_API_KEY;
}
```

### Event Router Integration
```typescript
// Integrate with existing event system
import { eventRouter } from '@tiltcheck/event-router';
import { sendTipReceipt } from '@tiltcheck/email-service';

// Subscribe to tip confirmed events
eventRouter.subscribe('tip.confirmed', 'email-service', async (event) => {
  const { userId, recipientId, amount, signature, fee } = event.data;
  
  // Get user email from database
  const userEmail = await getUserEmail(userId);
  
  if (userEmail) {
    await sendTipReceipt({
      userEmail,
      amount: `${amount} SOL`,
      recipient: `@${recipientId}`,
      txSignature: signature,
      fee: `$${fee.toFixed(2)}`,
    });
  }
});
```

### User Email Storage
Users need to opt-in to email notifications. Add email field to user profiles:

```typescript
// New slash command: /email-preferences
export const emailPreferencesCommand = {
  data: new SlashCommandBuilder()
    .setName('email-preferences')
    .setDescription('Manage your email notification preferences')
    .addStringOption(option =>
      option
        .setName('email')
        .setDescription('Your email address')
        .setRequired(false)
    )
    .addBooleanOption(option =>
      option
        .setName('transaction-receipts')
        .setDescription('Receive transaction receipts')
        .setRequired(false)
    )
    .addBooleanOption(option =>
      option
        .setName('security-alerts')
        .setDescription('Receive security alerts')
        .setRequired(false)
    ),
  
  async execute(interaction: ChatInputCommandInteraction) {
    const email = interaction.options.getString('email');
    
    if (email) {
      // Validate email
      if (!isValidEmail(email)) {
        return interaction.reply({
          content: '❌ Invalid email address',
          ephemeral: true,
        });
      }
      
      // Send verification email
      await sendVerificationEmail(interaction.user.id, email);
      
      return interaction.reply({
        content: `📧 Verification email sent to ${email}\nCheck your inbox and click the link to confirm.`,
        ephemeral: true,
      });
    }
    
    // Show current preferences
    const prefs = await getEmailPreferences(interaction.user.id);
    return interaction.reply({
      content: `📧 **Email Preferences**\n\n` +
        `Email: ${prefs.email || 'Not set'}\n` +
        `Transaction receipts: ${prefs.transactionReceipts ? '✅' : '❌'}\n` +
        `Security alerts: ${prefs.securityAlerts ? '✅' : '❌'}\n` +
        `Trust digests: ${prefs.trustDigests ? '✅' : '❌'}`,
      ephemeral: true,
    });
  },
};
```

---

## 🔐 Security & Privacy

### Email Verification
- **Required**: Users must verify email before notifications
- **Process**: Send verification link → user clicks → email activated
- **Storage**: Hash emails in database (GDPR compliance)

### Unsubscribe Management
- Every email includes unsubscribe link
- One-click unsubscribe (no login required)
- Granular control (disable specific notification types)
- Honor unsubscribe instantly

### Data Protection
- Never sell or share email addresses
- Encrypt emails at rest
- Regular audit logs
- GDPR/CCPA compliant
- User data export on request

---

## 📈 Success Metrics

### Email Performance KPIs
| Metric | Target | Measurement |
|--------|--------|-------------|
| Open rate | >30% | Resend analytics |
| Click rate | >10% | Link tracking |
| Bounce rate | <2% | Resend webhooks |
| Unsubscribe rate | <0.5% | Preference updates |
| Complaint rate | <0.1% | Spam reports |

### Business Impact KPIs
| Metric | Target | Measurement |
|--------|--------|-------------|
| Pending tips recovered | +25% | Tip engine analytics |
| Premium conversions from emails | 3%/month | Attribution tracking |
| User retention (email vs no email) | +15% | Cohort analysis |
| Support ticket reduction | -20% | Ticket volume |

---

## 🚀 Quick Start

### 1. Get Resend API Key
1. Sign up at https://resend.com
2. Create API key
3. Add to `.env`: `RESEND_API_KEY=re_...`

### 2. Install Dependencies
```bash
cd /Users/fullsail/Desktop/tiltcheck-monorepo/tiltcheck-monorepo
pnpm add resend react-email @react-email/components
```

### 3. Create Email Templates Package
```bash
mkdir -p packages/email-templates/src
cd packages/email-templates
pnpm init
```

### 4. Test Email Sending
```typescript
// Quick test script
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const { data, error } = await resend.emails.send({
  from: 'test@tiltcheck.gg',
  to: 'your-email@example.com',
  subject: 'TiltCheck Email Test',
  html: '<p>Hello from TiltCheck!</p>',
});

console.log('Email sent:', data);
```

---

## 🎯 Recommended Priority Order

1. **Security alerts** (prevents losses, builds trust)
2. **Transaction receipts** (professional UX, reduces support)
3. **Pending tip reminders** (direct revenue recovery)
4. **Trust score digests** (engagement, retention)
5. **Casino risk alerts** (value demonstration)
6. **LockVault reminders** (premium feature support)
7. **Promo digests** (affiliate revenue, future)
8. **Onboarding series** (long-term LTV, future)

---

## 💡 Next Steps

After reviewing this strategy, we should:
1. ✅ Confirm Resend API key is available (user mentioned it's in git secrets)
2. ✅ Decide which use cases to implement first (recommend: security + transactions)
3. ✅ Create email templates package structure
4. ✅ Build email service with event router integration
5. ✅ Add `/email-preferences` command to Discord bot
6. ✅ Test with small user group before full rollout

**Would you like me to proceed with implementing the email service package and templates?**
