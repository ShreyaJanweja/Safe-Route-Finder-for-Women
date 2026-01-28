// ============================================
// SURAKSHA SATHI - BACKEND SERVER
// ============================================

const express = require('express');
const mongoose = require('mongoose');
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const bodyParser = require('body-parser');
const twilio = require('twilio');
require('dotenv').config();

// ============================================
// DATABASE CONNECTION
// ============================================
const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/suraksha-sathi';
mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB connected'))
.catch(err => console.error('❌ MongoDB error:', err));

// ============================================
// DATABASE SCHEMAS
// ============================================

// User Schema
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  phone: String,
  emergencyContacts: [String],
  reportsCount: { type: Number, default: 0 },
  sosCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

// Report Schema
const reportSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  userName: String,
  userPhone: String,
  type: { type: String, enum: ['assault', 'theft', 'harassment', 'suspicious', 'other'], required: true },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  note: String,
  timestamp: { type: Date, default: Date.now }
});

// Safety Points (Police, Hospital, Market, Mall)
const safetyPointSchema = new mongoose.Schema({
  type: { type: String, enum: ['police', 'hospital', 'market', 'mall'], required: true },
  name: String,
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  weight: { type: Number, default: 5 }
});

// SOS Log Schema
const sosLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  message: String,
  contactsNotified: [String],
  timestamp: { type: Date, default: Date.now }
});

// Models
const User = mongoose.model('User', userSchema);
const Report = mongoose.model('Report', reportSchema);
const SafetyPoint = mongoose.model('SafetyPoint', safetyPointSchema);
const SOSLog = mongoose.model('SOSLog', sosLogSchema);

// ============================================
// MIDDLEWARE
// ============================================

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Auth Middleware
const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, error: 'No token provided' });
  
  jwt.verify(token, process.env.JWT_SECRET || 'super_secret_key', (err, user) => {
    if (err) return res.status(403).json({ success: false, error: 'Invalid token' });
    req.user = user;
    next();
  });
};

// ============================================
// AUTH ROUTES
// ============================================

// SIGNUP
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    
    // Validation
    if (!email || !password || !name) {
      return res.status(400).json({ success: false, error: 'Name, email, and password required' });
    }
    
    // Check if user exists
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ success: false, error: 'Email already exists' });
    }
    
    // Hash password
    const hashedPassword = await bcryptjs.hash(password, 10);
    
    // Create user
    const user = new User({
      name,
      email,
      password: hashedPassword,
      phone: phone || ''
    });
    
    await user.save();
    
    // Generate token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET || 'super_secret_key',
      { expiresIn: '7d' }
    );
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: { id: user._id, name: user.name, email: user.email }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// LOGIN
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password required' });
    }
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
    
    const isPasswordValid = await bcryptjs.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
    
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET || 'super_secret_key',
      { expiresIn: '7d' }
    );
    
    res.json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================
// USER ROUTES
// ============================================

// Get user profile
app.get('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password');
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update user profile
app.put('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    const { name, phone, emergencyContacts } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { name, phone, emergencyContacts },
      { new: true }
    ).select('-password');
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get user's reports
app.get('/api/user/reports', authenticateToken, async (req, res) => {
  try {
    const reports = await Report.find({ userId: req.user.userId }).sort({ timestamp: -1 });
    res.json({ success: true, reports });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================
// REPORT ROUTES
// ============================================

// Submit new report
app.post('/api/reports', authenticateToken, async (req, res) => {
  try {
    const { type, lat, lng, note } = req.body;
    
    if (!type || lat === undefined || lng === undefined) {
      return res.status(400).json({ success: false, error: 'Type, lat, lng required' });
    }
    
    const user = await User.findById(req.user.userId);
    
    const report = new Report({
      userId: req.user.userId,
      userName: user.name,
      userPhone: user.phone,
      type,
      lat,
      lng,
      note: note || ''
    });
    
    await report.save();
    
    // Increment user's report count
    user.reportsCount += 1;
    await user.save();
    
    res.status(201).json({
      success: true,
      message: 'Report submitted successfully',
      report
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get all reports (with pagination)
app.get('/api/reports', async (req, res) => {
  try {
    const { skip = 0, limit = 50 } = req.query;
    const reports = await Report.find()
      .sort({ timestamp: -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit));
    
    const total = await Report.countDocuments();
    
    res.json({
      success: true,
      reports,
      total,
      skip: parseInt(skip),
      limit: parseInt(limit)
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get reports near a location (for map display)
app.get('/api/reports/nearby', async (req, res) => {
  try {
    const { lat, lng, radius = 5000 } = req.query;
    
    if (!lat || !lng) {
      return res.status(400).json({ success: false, error: 'lat and lng required' });
    }
    
    const reports = await Report.find({
      lat: { $gte: parseFloat(lat) - 0.1, $lte: parseFloat(lat) + 0.1 },
      lng: { $gte: parseFloat(lng) - 0.1, $lte: parseFloat(lng) + 0.1 }
    }).sort({ timestamp: -1 });
    
    res.json({ success: true, reports });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================
// SAFETY POINTS ROUTES
// ============================================

// Get all safety points (Police, Hospitals, etc.)
app.get('/api/safety-points', async (req, res) => {
  try {
    const points = await SafetyPoint.find();
    res.json({ success: true, points });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get safety points by type
app.get('/api/safety-points/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const points = await SafetyPoint.find({ type });
    res.json({ success: true, points });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================
// SAFE ROUTE CALCULATION
// ============================================

// Calculate safety score for a route
app.post('/api/routes/safety-score', async (req, res) => {
  try {
    const { coordinates } = req.body;
    
    if (!coordinates || coordinates.length === 0) {
      return res.status(400).json({ success: false, error: 'Coordinates required' });
    }
    
    // Fetch all reports and safety points
    const reports = await Report.find();
    const safetyPoints = await SafetyPoint.find();
    
    let score = 0;
    let coordinateCount = 0;
    
    // Check each coordinate
    coordinates.forEach(coord => {
      const lat = coord.lat || coord[0];
      const lng = coord.lng || coord[1];
      
      coordinateCount++;
      
      // Add points for nearby safety points
      safetyPoints.forEach(sp => {
        const distance = calculateDistance(lat, lng, sp.lat, sp.lng);
        if (distance < 0.25) { // 250 meters
          score += sp.weight;
        }
      });
      
      // Subtract points for nearby reports (unsafe areas)
      reports.forEach(report => {
        const distance = calculateDistance(lat, lng, report.lat, report.lng);
        if (distance < 0.25) {
          score -= 3;
        }
      });
    });
    
    // Normalize score between 1-5
    const normalizedScore = Math.max(1, Math.min(5, ((score / Math.max(1, coordinateCount)) + 3)));
    
    res.json({
      success: true,
      score: parseFloat(normalizedScore.toFixed(2)),
      scoreDetails: {
        rawScore: score,
        coordinatesChecked: coordinateCount
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Helper function to calculate distance between two lat/lng points
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ============================================
// SOS ROUTES
// ============================================

// Initialize Twilio only if credentials are valid
let twilioClient = null;
if (process.env.TWILIO_SID && process.env.TWILIO_AUTH && 
    process.env.TWILIO_SID.startsWith('AC') && 
    process.env.TWILIO_SID !== 'your_twilio_account_sid') {
  twilioClient = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH);
  console.log('✅ Twilio configured for SMS alerts');
} else {
  console.log('⚠️  Twilio not configured - SOS will log locally');
}

// Send SOS alert
app.post('/api/sos', authenticateToken, async (req, res) => {
  try {
    const { lat, lng, message } = req.body;
    
    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ success: false, error: 'lat and lng required' });
    }
    
    const user = await User.findById(req.user.userId);
    
    if (!user.emergencyContacts || user.emergencyContacts.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'No emergency contacts added to profile' 
      });
    }
    
    // Create SOS log
    const sosLog = new SOSLog({
      userId: req.user.userId,
      lat,
      lng,
      message: message || `Emergency SOS from ${user.name}`,
      contactsNotified: user.emergencyContacts
    });
    
    await sosLog.save();
    
    // Send SMS to emergency contacts (if Twilio is configured)
    if (process.env.TWILIO_SID && process.env.TWILIO_AUTH) {
      const smsMessage = `🚨 EMERGENCY ALERT from ${user.name}: ${message || 'I need help!'} Location: https://maps.google.com/?q=${lat},${lng}`;
      
      for (const contact of user.emergencyContacts) {
        try {
          await twilioClient.messages.create({
            from: process.env.TWILIO_PHONE,
            to: contact,
            body: smsMessage
          });
        } catch (smsErr) {
          console.error(`Failed to send SMS to ${contact}:`, smsErr.message);
        }
      }
    }
    
    // Increment SOS count
    user.sosCount += 1;
    await user.save();
    
    res.json({
      success: true,
      message: 'SOS alert sent successfully',
      sosLog
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get user's SOS history
app.get('/api/user/sos-history', authenticateToken, async (req, res) => {
  try {
    const sosLogs = await SOSLog.find({ userId: req.user.userId }).sort({ timestamp: -1 });
    res.json({ success: true, sosLogs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================
// HEALTH CHECK
// ============================================

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Server is running' });
});

// ============================================
// SERVER START
// ============================================

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║   SURAKSHA SATHI SERVER STARTED ✅     ║
║   Port: ${PORT}                           ║
╚════════════════════════════════════════╝
  `);
});

