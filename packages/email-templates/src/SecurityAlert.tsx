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

export interface SecurityAlertProps {
  userName: string;
  action: string;
  details: {
    newWallet?: string;
    walletType?: string;
    ipAddress?: string;
    location?: string;
  };
  timestamp: Date;
  verifyUrl?: string;
}

export const SecurityAlertEmail = ({
  userName,
  action,
  details,
  timestamp,
  verifyUrl,
}: SecurityAlertProps) => {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Section style={alertBanner}>
            <Text style={alertEmoji}>🔐</Text>
            <Heading style={h1}>Security Alert</Heading>
          </Section>
          
          <Text style={text}>
            Hey {userName}, we detected an important account change:
          </Text>

          <Section style={warningSection}>
            <Text style={actionText}>{action}</Text>
            
            <Hr style={divider} />
            
            {details.newWallet && (
              <>
                <Text style={detailLabel}>New Wallet Address</Text>
                <Text style={detailValue}>{details.newWallet}</Text>
              </>
            )}
            
            {details.walletType && (
              <>
                <Text style={detailLabel}>Wallet Type</Text>
                <Text style={detailValue}>{details.walletType}</Text>
              </>
            )}
            
            {details.ipAddress && (
              <>
                <Hr style={divider} />
                <Text style={detailLabel}>IP Address</Text>
                <Text style={detailValue}>{details.ipAddress}</Text>
              </>
            )}
            
            {details.location && (
              <>
                <Text style={detailLabel}>Location</Text>
                <Text style={detailValue}>{details.location}</Text>
              </>
            )}
            
            <Hr style={divider} />
            
            <Text style={detailLabel}>Time</Text>
            <Text style={detailValue}>{timestamp.toLocaleString()}</Text>
          </Section>

          <Text style={warningText}>
            ⚠️ If this wasn't you, contact support immediately.
          </Text>

          {verifyUrl && (
            <Button href={verifyUrl} style={button}>
              Verify This Was You
            </Button>
          )}

          <Hr style={divider} />

          <Text style={footer}>
            This is an automated security alert from <strong>TiltCheck</strong>
          </Text>
          
          <Text style={disclaimer}>
            Never share your wallet private keys or seed phrases with anyone, including TiltCheck support.
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

const alertBanner = {
  backgroundColor: '#fff3cd',
  border: '1px solid #ffc107',
  borderRadius: '8px',
  padding: '16px',
  textAlign: 'center' as const,
  marginBottom: '24px',
};

const alertEmoji = {
  fontSize: '48px',
  margin: '0',
};

const h1 = {
  color: '#856404',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '8px 0 0',
  padding: '0',
};

const text = {
  color: '#484848',
  fontSize: '16px',
  lineHeight: '26px',
};

const warningSection = {
  backgroundColor: '#ffffff',
  border: '2px solid #ffc107',
  borderRadius: '8px',
  padding: '24px',
  margin: '24px 0',
};

const actionText = {
  color: '#1a1a1a',
  fontSize: '18px',
  fontWeight: 'bold',
  marginBottom: '16px',
};

const detailLabel = {
  color: '#666666',
  fontSize: '12px',
  fontWeight: '600',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  marginBottom: '4px',
  marginTop: '12px',
};

const detailValue = {
  color: '#1a1a1a',
  fontSize: '14px',
  fontFamily: 'monospace',
  backgroundColor: '#f5f5f5',
  padding: '8px',
  borderRadius: '4px',
  marginTop: '4px',
  marginBottom: '8px',
  wordBreak: 'break-all' as const,
};

const divider = {
  borderColor: '#e6e6e6',
  margin: '16px 0',
};

const warningText = {
  color: '#dc3545',
  fontSize: '16px',
  fontWeight: 'bold',
  textAlign: 'center' as const,
  margin: '24px 0',
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
  padding: '0 20px',
};

export default SecurityAlertEmail;
