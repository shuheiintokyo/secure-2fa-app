// Load environment variables first
require('dotenv').config();

// app.js - Main Express Server
const express = require('express');
const session = require('express-session');
const nodemailer = require('nodemailer');
const path = require('path');
const crypto = require('crypto');

const app = express();

// Environment Variables Validation
function validateEnvVars() {
  const required = ['EMAIL_USER', 'EMAIL_PASS', 'SESSION_SECRET', 'TEST_EMAIL'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing);
    console.error('Please check your .env file and ensure all required variables are set.');
    process.exit(1);
  }
  
  console.log('✅ All required environment variables are loaded');
}

// Validate environment variables on startup
validateEnvVars();

// Configuration object using environment variables
const config = {
  server: {
    port: process.env.PORT || 3000,
    nodeEnv: process.env.NODE_ENV || 'development'
  },
  email: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
    testEmail: process.env.TEST_EMAIL
  },
  session: {
    secret: process.env.SESSION_SECRET,
    secure: process.env.NODE_ENV === 'production' // Use secure cookies in production
  }
};

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));

// Session configuration using environment variables
app.use(session({
  secret: config.session.secret,
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: config.session.secure, // Secure cookies in production
    maxAge: 30 * 60 * 1000 // 30 minutes
  }
}));

// Set EJS as template engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Email configuration using environment variables
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: config.email.user,
    pass: config.email.pass
  }
});

// Test email configuration on startup
transporter.verify(function(error, success) {
  if (error) {
    console.error('❌ Email configuration error:', error.message);
  } else {
    console.log('✅ Email server is ready to send messages');
  }
});

// In-memory storage for OTPs (use database in production)
const otpStore = new Map();

// Helper function to generate 4-digit OTP
function generateOTP() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

// Helper function to send OTP email
async function sendOTPEmail(email, otp) {
  const mailOptions = {
    from: config.email.user,
    to: email,
    subject: 'Your Login OTP',
    html: `
      <h2>Your One-Time Password</h2>
      <p>Your OTP for login is: <strong style="font-size: 24px; color: #007bff;">${otp}</strong></p>
      <p>This OTP will expire in 60 seconds.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`📧 OTP sent successfully to ${email}`);
    return true;
  } catch (error) {
    console.error('❌ Error sending email:', error);
    return false;
  }
}

// Middleware to check authentication
function requireAuth(req, res, next) {
  if (req.session.authenticated) {
    next();
  } else {
    res.redirect('/login');
  }
}

// Routes
// Home route - redirect to login if not authenticated
app.get('/', (req, res) => {
  if (req.session.authenticated) {
    res.redirect('/dashboard');
  } else {
    res.redirect('/login');
  }
});

// Login page
app.get('/login', (req, res) => {
  if (req.session.authenticated) {
    return res.redirect('/dashboard');
  }
  res.render('login', { error: null });
});

// Handle login submission
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  // Validate input
  if (!username || !password) {
    return res.render('login', { error: 'Username and password are required' });
  }

  if (username.length >= 20) {
    return res.render('login', { error: 'Username must be less than 20 characters' });
  }

  if (!/^\d{4}$/.test(password)) {
    return res.render('login', { error: 'Password must be exactly 4 digits' });
  }

  // Store user info in session for OTP verification
  req.session.pendingAuth = {
    username: username,
    timestamp: Date.now()
  };

  // Generate and send OTP
  const otp = generateOTP();
  const otpKey = `${username}_${Date.now()}`;
  
  // Store OTP with expiration (60 seconds)
  otpStore.set(otpKey, {
    otp: otp,
    expires: Date.now() + 60000, // 60 seconds
    username: username
  });

  req.session.otpKey = otpKey;

  // Send OTP email to configured test email
  sendOTPEmail(config.email.testEmail, otp)
    .then(success => {
      if (success) {
        console.log(`🔐 OTP generated for user: ${username}`);
        res.redirect('/verify-otp');
      } else {
        res.render('login', { error: 'Failed to send OTP. Please try again.' });
      }
    });
});

// OTP verification page
app.get('/verify-otp', (req, res) => {
  if (!req.session.pendingAuth) {
    return res.redirect('/login');
  }
  res.render('verify-otp', { error: null });
});

// Handle OTP verification
app.post('/verify-otp', (req, res) => {
  const { otp } = req.body;
  const otpKey = req.session.otpKey;

  if (!req.session.pendingAuth || !otpKey) {
    return res.redirect('/login');
  }

  const storedOTPData = otpStore.get(otpKey);

  if (!storedOTPData) {
    return res.render('verify-otp', { error: 'OTP not found or expired' });
  }

  // Check if OTP has expired
  if (Date.now() > storedOTPData.expires) {
    otpStore.delete(otpKey);
    req.session.pendingAuth = null;
    req.session.otpKey = null;
    return res.render('verify-otp', { error: 'OTP has expired. Please login again.' });
  }

  // Verify OTP
  if (otp !== storedOTPData.otp) {
    return res.render('verify-otp', { error: 'Invalid OTP. Please try again.' });
  }

  // Success - authenticate user
  req.session.authenticated = true;
  req.session.username = req.session.pendingAuth.username;
  req.session.loginTime = new Date();

  console.log(`✅ User authenticated successfully: ${req.session.username}`);

  // Clean up
  otpStore.delete(otpKey);
  req.session.pendingAuth = null;
  req.session.otpKey = null;

  res.redirect('/dashboard');
});

// Dashboard (main page)
app.get('/dashboard', requireAuth, (req, res) => {
  res.render('dashboard', { 
    username: req.session.username,
    loginTime: req.session.loginTime
  });
});

// Logout
app.post('/logout', (req, res) => {
  const username = req.session.username;
  req.session.destroy((err) => {
    if (err) {
      console.error('❌ Error destroying session:', err);
    } else {
      console.log(`👋 User logged out: ${username}`);
    }
    res.redirect('/login');
  });
});

// Clean up expired OTPs every minute
setInterval(() => {
  const now = Date.now();
  let cleanedCount = 0;
  for (const [key, value] of otpStore.entries()) {
    if (now > value.expires) {
      otpStore.delete(key);
      cleanedCount++;
    }
  }
  if (cleanedCount > 0) {
    console.log(`🧹 Cleaned up ${cleanedCount} expired OTP(s)`);
  }
}, 60000);

// Start server
app.listen(config.server.port, () => {
  console.log('🚀 ================================');
  console.log(`📡 Server running on http://localhost:${config.server.port}`);
  console.log(`🌍 Environment: ${config.server.nodeEnv}`);
  console.log(`📧 Email configured: ${config.email.user}`);
  console.log(`📨 Test emails sent to: ${config.email.testEmail}`);
  console.log('🚀 ================================');
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Export app for testing
module.exports = app;