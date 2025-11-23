import * as React from 'react';
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Button,
  Hr,
  Heading,
} from '@react-email/components';

interface PendingTip {
  from: string;
  amount: string;
  date: string;
}

export interface PendingTipsProps {
  userName: string;
  tips: PendingTip[];
  totalValue: string;
  expiresIn: string;
  registerUrl: string;
}

export const PendingTipsEmail = ({
  userName,
  tips,
  totalValue,
  expiresIn,
  registerUrl,
}: PendingTipsProps) => {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Text style={emoji}>💸</Text>
          <Heading style={h1}>You Have Unclaimed Tips!</Heading>
          
          <Text style={text}>
            Hey {userName}, you have <strong>{tips.length} pending tip{tips.length > 1 ? 's' : ''}</strong> worth <strong>{totalValue}</strong> waiting for you!
          </Text>

          <Section style={tipsSection}>
            <Text style={sectionHeading}>Pending Tips</Text>
            
            {tips.map((tip, index) => (
              <React.Fragment key={index}>
                <Section style={tipItem}>
                  <Text style={tipFrom}>From: {tip.from}</Text>
                  <Text style={tipAmount}>{tip.amount}</Text>
                  <Text style={tipDate}>{tip.date}</Text>
                </Section>
                {index < tips.length - 1 && <Hr style={divider} />}
              </React.Fragment>
            ))}
          </Section>

          <Section style={urgencyBox}>
            <Text style={urgencyText}>⏰ Tips expire in {expiresIn}</Text>
            <Text style={urgencySubtext}>
              Register your wallet now to claim your SOL before it's returned to the senders!
            </Text>
          </Section>

          <Button href={registerUrl} style={button}>
            Register Wallet & Claim
          </Button>

          <Hr style={divider} />

          <Text style={howTo}>
            <strong>How to claim:</strong>
          </Text>
          <Text style={step}>
            1. Click the button above or use <code>/register-magic</code> in Discord
          </Text>
          <Text style={step}>
            2. Complete wallet registration (takes 2 minutes)
          </Text>
          <Text style={step}>
            3. Your tips will be automatically sent to your wallet
          </Text>

          <Hr style={divider} />

          <Text style={footer}>
            Sent via <strong>JustTheTip</strong> by TiltCheck
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
};

const container = {
  margin: '0 auto',
  padding: '20px 0 48px',
  maxWidth: '600px',
};

const emoji = {
  fontSize: '64px',
  textAlign: 'center' as const,
  margin: '20px 0',
};

const h1 = {
  color: '#1a1a1a',
  fontSize: '28px',
  fontWeight: 'bold',
  margin: '0 0 20px',
  padding: '0',
  textAlign: 'center' as const,
};

const text = {
  color: '#484848',
  fontSize: '16px',
  lineHeight: '26px',
  textAlign: 'center' as const,
  marginBottom: '24px',
};

const tipsSection = {
  backgroundColor: '#ffffff',
  border: '1px solid #e6e6e6',
  borderRadius: '8px',
  padding: '24px',
  margin: '24px 0',
};

const sectionHeading = {
  color: '#1a1a1a',
  fontSize: '18px',
  fontWeight: 'bold',
  marginBottom: '16px',
  marginTop: '0',
};

const tipItem = {
  margin: '8px 0',
};

const tipFrom = {
  color: '#666666',
  fontSize: '14px',
  margin: '0 0 4px',
};

const tipAmount = {
  color: '#1a1a1a',
  fontSize: '20px',
  fontWeight: 'bold',
  margin: '0 0 4px',
};

const tipDate = {
  color: '#999999',
  fontSize: '12px',
  margin: '0',
};

const divider = {
  borderColor: '#e6e6e6',
  margin: '16px 0',
};

const urgencyBox = {
  backgroundColor: '#fff3cd',
  border: '1px solid #ffc107',
  borderRadius: '8px',
  padding: '16px',
  textAlign: 'center' as const,
  margin: '24px 0',
};

const urgencyText = {
  color: '#856404',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0 0 8px',
};

const urgencySubtext = {
  color: '#856404',
  fontSize: '14px',
  margin: '0',
};

const button = {
  backgroundColor: '#28a745',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '14px 24px',
  margin: '24px auto',
  width: '250px',
};

const howTo = {
  color: '#1a1a1a',
  fontSize: '16px',
  fontWeight: 'bold',
  marginTop: '24px',
  marginBottom: '12px',
};

const step = {
  color: '#484848',
  fontSize: '14px',
  lineHeight: '24px',
  margin: '8px 0',
  paddingLeft: '12px',
};

const footer = {
  color: '#8898aa',
  fontSize: '14px',
  lineHeight: '24px',
  textAlign: 'center' as const,
  marginTop: '24px',
};

export default PendingTipsEmail;
