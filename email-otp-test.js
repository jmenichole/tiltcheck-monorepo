/**
 * Email OTP Test
 * Simple test to verify email OTP functionality
 */

import express from 'express';
import cors from 'cors';
import crypto from 'crypto';

const app = express();
const PORT = 6001;

// Middleware
app.use(cors());
app.use(express.json());

// Simple OTP storage
const otpSessions = new Map();

// Generate OTP function
function generateOTP() {
  return crypto.randomInt(100000, 999999).toString();
}

// Mock email function (in production, use real email service)
async function sendOTPEmail(params) {
  console.log(`📧 Sending OTP ${params.otpCode} to ${params.userEmail}`);
  console.log(`   Purpose: ${params.purpose}`);
  
  // Simulate email sending
  return { success: true, data: { id: 'mock-email-id' } };
}

// Send OTP endpoint
app.post('/auth/email/send-otp', async (req, res) => {
  try {
    const { email, purpose = 'login', discordId } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email address is required' });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    
    // Generate new OTP
    const code = generateOTP();
    const sessionId = crypto.randomBytes(32).toString('hex');
    const expires = Date.now() + (10 * 60 * 1000); // 10 minutes
    
    // Store OTP session
    const otpSession = {
      code,
      email,
      expires,
      attempts: 0,
      purpose,
      discordId
    };
    
    otpSessions.set(sessionId, otpSession);
    
    // Send OTP email
    const result = await sendOTPEmail({
      userEmail: email,
      otpCode: code,
      purpose
    });
    
    if (!result.success) {
      return res.status(500).json({ 
        error: 'Failed to send OTP email',
        reason: result.reason 
      });
    }
    
    res.json({ 
      success: true, 
      sessionId,
      expiresIn: 10 * 60,
      message: `OTP sent to ${email}` 
    });
    
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

// Verify OTP endpoint
app.post('/auth/email/verify-otp', async (req, res) => {
  try {
    const { sessionId, code } = req.body;
    
    if (!sessionId || !code) {
      return res.status(400).json({ error: 'Session ID and OTP code are required' });
    }
    
    const session = otpSessions.get(sessionId);
    if (!session) {
      return res.status(400).json({ error: 'Invalid or expired session' });
    }
    
    // Check if expired
    if (session.expires < Date.now()) {
      otpSessions.delete(sessionId);
      return res.status(400).json({ error: 'OTP expired' });
    }
    
    // Check attempts
    if (session.attempts >= 3) {
      otpSessions.delete(sessionId);
      return res.status(400).json({ error: 'Too many attempts' });
    }
    
    // Verify code
    if (session.code !== code) {
      session.attempts++;
      return res.status(400).json({ 
        error: 'Invalid OTP code',
        attemptsRemaining: 3 - session.attempts
      });
    }
    
    // Clean up session
    otpSessions.delete(sessionId);
    
    res.json({ 
      success: true, 
      message: 'OTP verified successfully',
      email: session.email
    });
    
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ error: 'Failed to verify OTP' });
  }
});

// Simple test page
app.get('/test-otp', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Email OTP Test</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
        .form-group { margin: 15px 0; }
        input { width: 100%; padding: 10px; margin: 5px 0; }
        button { background: #00d4aa; color: white; padding: 10px 20px; border: none; cursor: pointer; }
        .result { margin: 15px 0; padding: 10px; background: #f5f5f5; }
      </style>
    </head>
    <body>
      <h1>🎯 TiltCheck Email OTP Test</h1>
      
      <div class="form-group">
        <input type="email" id="email" placeholder="Your email address" />
        <button onclick="sendOTP()">Send OTP</button>
      </div>
      
      <div class="form-group" id="otpSection" style="display: none;">
        <input type="text" id="otp" placeholder="Enter 6-digit code" maxlength="6" />
        <button onclick="verifyOTP()">Verify OTP</button>
      </div>
      
      <div id="result" class="result"></div>
      
      <script>
        let sessionId = null;
        
        async function sendOTP() {
          const email = document.getElementById('email').value;
          if (!email) {
            document.getElementById('result').innerHTML = '❌ Please enter email';
            return;
          }
          
          try {
            const response = await fetch('/auth/email/send-otp', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email, purpose: 'login' })
            });
            
            const result = await response.json();
            
            if (result.success) {
              sessionId = result.sessionId;
              document.getElementById('otpSection').style.display = 'block';
              document.getElementById('result').innerHTML = '✅ OTP sent! Check console for code.';
            } else {
              document.getElementById('result').innerHTML = '❌ ' + (result.error || 'Failed');
            }
          } catch (error) {
            document.getElementById('result').innerHTML = '❌ Network error';
          }
        }
        
        async function verifyOTP() {
          const code = document.getElementById('otp').value;
          if (!code || !sessionId) {
            document.getElementById('result').innerHTML = '❌ Enter OTP code';
            return;
          }
          
          try {
            const response = await fetch('/auth/email/verify-otp', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sessionId, code })
            });
            
            const result = await response.json();
            
            if (result.success) {
              document.getElementById('result').innerHTML = '✅ ' + result.message;
            } else {
              document.getElementById('result').innerHTML = '❌ ' + (result.error || 'Verification failed');
            }
          } catch (error) {
            document.getElementById('result').innerHTML = '❌ Network error';
          }
        }
      </script>
    </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log(`🎯 Email OTP Test server running on port ${PORT}`);
  console.log(`📧 Test page: http://localhost:${PORT}/test-otp`);
});