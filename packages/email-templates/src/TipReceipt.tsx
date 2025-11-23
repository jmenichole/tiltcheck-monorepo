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

export interface TipReceiptProps {
  recipientName: string;
  amount: string;
  recipient: string;
  txSignature: string;
  fee: string;
  timestamp: Date;
  solscanUrl?: string;
}

export const TipReceiptEmail = ({
  recipientName,
  amount,
  recipient,
  txSignature,
  fee,
  timestamp,
  solscanUrl = `https://solscan.io/tx/${txSignature}`,
}: TipReceiptProps) => {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>💰 Tip Sent Successfully</Heading>
          
          <Text style={text}>
            Hey {recipientName}, your tip was sent successfully!
          </Text>

          <Section style={infoSection}>
            <Text style={infoLabel}>Amount Sent</Text>
            <Text style={infoValue}>{amount}</Text>
            
            <Hr style={divider} />
            
            <Text style={infoLabel}>To</Text>
            <Text style={infoValue}>{recipient}</Text>
            
            <Hr style={divider} />
            
            <Text style={infoLabel}>Transaction Fee</Text>
            <Text style={infoValue}>{fee}</Text>
            
            <Hr style={divider} />
            
            <Text style={infoLabel}>Time</Text>
            <Text style={infoValue}>{timestamp.toLocaleString()}</Text>
          </Section>

          <Button href={solscanUrl} style={button}>
            View on Solscan
          </Button>

          <Hr style={divider} />

          <Text style={footer}>
            Sent via <strong>JustTheTip</strong> by TiltCheck
          </Text>
          
          <Text style={disclaimer}>
            This is a non-custodial transaction. TiltCheck never holds your funds.
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

const h1 = {
  color: '#1a1a1a',
  fontSize: '28px',
  fontWeight: 'bold',
  margin: '40px 0 20px',
  padding: '0',
  textAlign: 'center' as const,
};

const text = {
  color: '#484848',
  fontSize: '16px',
  lineHeight: '26px',
  textAlign: 'center' as const,
};

const infoSection = {
  backgroundColor: '#ffffff',
  border: '1px solid #e6e6e6',
  borderRadius: '8px',
  padding: '24px',
  margin: '24px 0',
};

const infoLabel = {
  color: '#666666',
  fontSize: '12px',
  fontWeight: '600',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  marginBottom: '4px',
};

const infoValue = {
  color: '#1a1a1a',
  fontSize: '16px',
  fontWeight: '500',
  marginTop: '0',
  marginBottom: '16px',
};

const divider = {
  borderColor: '#e6e6e6',
  margin: '16px 0',
};

const button = {
  backgroundColor: '#5469d4',
  borderRadius: '6px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '14px 24px',
  margin: '24px auto',
  width: '200px',
};

const footer = {
  color: '#8898aa',
  fontSize: '14px',
  lineHeight: '24px',
  textAlign: 'center' as const,
  marginTop: '24px',
};

const disclaimer = {
  color: '#999999',
  fontSize: '12px',
  lineHeight: '20px',
  textAlign: 'center' as const,
  marginTop: '12px',
};

export default TipReceiptEmail;
