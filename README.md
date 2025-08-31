# Secure Web Application with Two-Factor Authentication

A Node.js web application implementing secure session management with email-based two-factor authentication.

## 📋 Features

- **Primary Authentication**: Username and password validation
- **Two-Factor Authentication**: Email-based OTP with 60-second expiration
- **Secure Session Management**: Express sessions with timeout
- **Input Validation**: Client and server-side validation
- **Responsive Design**: Modern, mobile-friendly UI
- **Auto-cleanup**: Expired OTP automatic removal

## 🚀 Quick Start

### Prerequisites

- Node.js (v14 or higher)
- Gmail account for sending OTP emails
- Git (for version control)

### Installation

1. **Clone or create project directory:**
   ```bash
   mkdir secure-2fa-app
   cd secure-2fa-app
   ```

2. **Initialize the project:**
   ```bash
   npm init -y
   ```

3. **Install dependencies:**
   ```bash
   npm install express express-session ejs nodemailer crypto
   npm install --save-dev nodemon
   ```

4. **Create project structure:**
   ```
   secure-2fa-app/
   ├── app.js
   ├── package.json
   ├── views/
   │   ├── login.ejs
   │   ├── verify-otp.ejs
   │   └── dashboard.ejs
   └── public/
       └── (optional: static files)
   ```

5. **Create the views directory:**
   ```bash
   mkdir views
   mkdir public
   ```

## 📧 Email Configuration

### Gmail Setup (Recommended)

1. **Enable 2-Step Verification** on your Gmail account:
   - Go to Google Account settings
   - Security → 2-Step Verification → Turn on

2. **Generate App Password**:
   - Security → 2-Step Verification → App passwords
   - Select "Mail" and your device
   - Copy the 16-character password

3. **Update app.js** with your credentials:
   ```javascript
   const transporter = nodemailer.createTransporter({
     service: 'gmail',
     auth: {
       user: 'your-email@gmail.com',        // Your Gmail address
       pass: 'your-16-char-app-password'    // App password (not regular password)
     }
   });
   ```

### Alternative Email Services

For other email providers, update the transporter configuration:

```javascript
// Example for Outlook/Hotmail
const transporter = nodemailer.createTransporter({
  service: 'hotmail',
  auth: {
    user: 'your-email@outlook.com',
    pass: 'your-password'
  }
});

// Example for custom SMTP
const transporter = nodemailer.createTransporter({
  host: 'smtp.your-provider.com',
  port: 587,
  secure: false,
  auth: {
    user: 'your-email@domain.com',
    pass: 'your-password'
  }
});
```

## 🔧 Configuration

### Security Settings

1. **Change session secret** in `app.js`:
   ```javascript
   app.use(session({
     secret: 'your-super-secret-key-change-this', // Change this!
     // ... other settings
   }));
   ```

2. **Update test email** (currently set to `sh.kinugasa@gmail.com`):
   ```javascript
   sendOTPEmail('your-test-email@gmail.com', otp)
   ```

### Environment Variables (Recommended)

Create a `.env` file for sensitive data:

```env
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
SESSION_SECRET=your-super-secret-key
TEST_EMAIL=your-test-email@gmail.com
PORT=3000
```

Then update `app.js`:
```javascript
require('dotenv').config();

// Use environment variables
const transporter = nodemailer.createTransporter({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});
```

## 🏃‍♂️ Running the Application

### Development Mode
```bash
npm run dev
# or
nodemon app.js
```

### Production Mode
```bash
npm start
# or
node app.js
```

### Access the Application
Open your browser and go to: `http://localhost:3000`

## 🔐 Testing the Application

### Login Credentials
- **Username**: Any string under 20 characters (e.g., "testuser")
- **Password**: Any 4-digit number (e.g., "1234")

### Testing Flow
1. Enter username and password on login page
2. Check email (`sh.kinugasa@gmail.com`) for 4-digit OTP
3. Enter OTP within 60 seconds
4. Access dashboard upon successful verification

## 📁 Project Structure

```
secure-2fa-app/
├── app.js                 # Main Express server
├── package.json          # Project dependencies
├── views/
│   ├── login.ejs         # Login page template
│   ├── verify-otp.ejs    # OTP verification page
│   └── dashboard.ejs     # Main dashboard page
├── public/               # Static files (optional)
├── .env                  # Environment variables (create this)
├── .gitignore           # Git ignore file
└── README.md            # This file
```

## 🛡️ Security Features

- **Session Management**: Secure sessions with configurable timeout
- **Input Validation**: Client and server-side validation
- **OTP Expiration**: 60-second timeout for one-time passwords
- **Memory Storage**: OTPs stored temporarily in memory (use database in production)
- **CSRF Protection**: Can be easily added with `csurf` middleware
- **Rate Limiting**: Can be implemented with `express-rate-limit`

## 🚀 Production Deployment

### Environment Setup
1. Set `NODE_ENV=production`
2. Use HTTPS (set `cookie.secure: true` in session config)
3. Use proper database for OTP storage (Redis recommended)
4. Implement rate limiting
5. Add logging and monitoring
6. Use process managers like PM2

### Recommended Enhancements
- Add database integration (MongoDB, PostgreSQL)
- Implement user registration
- Add password hashing (bcrypt)
- Add CSRF protection
- Implement rate limiting
- Add comprehensive logging
- Set up monitoring and alerts

## 🔧 Troubleshooting

### Common Issues

1. **Email not sending**:
   - Check Gmail App Password setup
   - Verify 2-Step Verification is enabled
   - Check firewall/antivirus settings

2. **Session issues**:
   - Clear browser cookies
   - Check session secret configuration
   - Verify session middleware setup

3. **OTP expiration**:
   - Check system clock synchronization
   - Verify 60-second timeout logic

### Debug Mode
Add debugging to see what's happening:

```javascript
// Add to app.js for debugging
console.log('OTP generated:', otp);
console.log('OTP stored for:', username);
console.log('Session data:', req.session);
```

## 📝 License

MIT License - feel free to use this project for learning and development purposes.

## 🤝 Contributing

This is a learning project. Feel free to fork and modify according to your needs.

---

**Note**: This application is designed for local testing and learning purposes. For production use, implement additional security measures and proper database storage.