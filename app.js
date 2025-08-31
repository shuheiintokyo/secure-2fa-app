// app.js - Main Express Server
const express = require('express');
const session = require('express-session');
const nodemailer = require('nodemailer');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));

// Session configuration
app.use(session({
  secret: 'your-secret-key-change-this-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false, // Set to true in production with HTTPS
    maxAge: 30 * 60 * 1000 // 30 minutes
  }
}));

// Set EJS as template engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Email configuration (Gmail example)
const transporter = nodemailer.createTransporter({
  service: 'gmail',
  auth: {
    user: 'your-email@gmail.com', // Replace with your email
    pass: 'your-app-password' // Use App Password for Gmail
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
    from: 'your-email@gmail.com',
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
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
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

  // Send OTP email
  sendOTPEmail('sh.kinugasa@gmail.com', otp)
    .then(success => {
      if (success) {
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
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
    }
    res.redirect('/login');
  });
});

// Clean up expired OTPs every minute
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of otpStore.entries()) {
    if (now > value.expires) {
      otpStore.delete(key);
    }
  }
}, 60000);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// Export app for testing
module.exports = app;