# 🛡️ SURAKSHA SATHI - BACKEND SETUP GUIDE

## ⚡ Quick Start

Mujhe pure backend ka setup kar diya hai. Ab tu sirf ye steps follow kar:

### **Step 1: Install Dependencies**
```bash
cd "c:\Users\shrey\Downloads\Suraksha Sathi\Safe-Route-Finder-for-Women"
npm install
```

### **Step 2: Setup MongoDB**

**Option A: Local MongoDB (Recommended for testing)**
- Download: https://www.mongodb.com/try/download/community
- Install and run MongoDB
- Default: `mongodb://localhost:27017/suraksha-sathi`

**Option B: MongoDB Atlas (Cloud - Free)**
- Go to: https://www.mongodb.com/cloud/atlas
- Sign up for free
- Create a cluster
- Get connection string: `mongodb+srv://username:password@cluster.mongodb.net/suraksha-sathi`
- Update in `.env` file

### **Step 3: Configure Environment Variables**

Update the `.env` file:
```
# Database
MONGODB_URI=mongodb://localhost:27017/suraksha-sathi

# Server
PORT=3001
NODE_ENV=development

# JWT Secret
JWT_SECRET=suraksha_sathi_super_secret_key_change_in_production

# Twilio (optional for SOS SMS)
TWILIO_SID=your_twilio_account_sid
TWILIO_AUTH=your_twilio_auth_token
TWILIO_PHONE=+1234567890

# Frontend
FRONTEND_URL=http://localhost:5000
```

### **Step 4: Seed Database with Safety Points**

```bash
node seed.js
```

This will add:
- 4 Police Stations
- 4 Hospitals
- 4 Markets
- 4 Malls

### **Step 5: Start Server**

```bash
npm start
```

या development mode ke liye:
```bash
npm run dev
```

Server start ho jayega port 3001 pe! 🎉

---

## 📋 API ENDPOINTS (पूरा reference)

### **Authentication**

#### Signup
```
POST /api/auth/signup
Body: { name, email, password, phone }
Response: { token, user }
```

#### Login
```
POST /api/auth/login
Body: { email, password }
Response: { token, user }
```

### **User Profile**

#### Get Profile
```
GET /api/user/profile
Headers: Authorization: Bearer {token}
```

#### Update Profile
```
PUT /api/user/profile
Headers: Authorization: Bearer {token}
Body: { name, phone, emergencyContacts: ["+91xxxxxxxxxx"] }
```

#### Get User's Reports
```
GET /api/user/reports
Headers: Authorization: Bearer {token}
```

### **Reports**

#### Submit Report
```
POST /api/reports
Headers: Authorization: Bearer {token}
Body: {
  type: "assault|theft|harassment|suspicious|other",
  lat: 30.7199,
  lng: 76.789,
  note: "Description"
}
```

#### Get All Reports
```
GET /api/reports?skip=0&limit=50
```

#### Get Nearby Reports
```
GET /api/reports/nearby?lat=30.7199&lng=76.789
```

### **Safety Points**

#### Get All Safety Points
```
GET /api/safety-points
```

#### Get Points by Type
```
GET /api/safety-points/{type}
(type: police, hospital, market, mall)
```

### **Safe Route Calculation**

#### Calculate Safety Score
```
POST /api/routes/safety-score
Body: {
  coordinates: [
    { lat: 30.7, lng: 76.8 },
    { lat: 30.71, lng: 76.81 }
  ]
}
Response: { score: 3.5 }
```

### **SOS Alert**

#### Send SOS
```
POST /api/sos
Headers: Authorization: Bearer {token}
Body: {
  lat: 30.7199,
  lng: 76.789,
  message: "I need help!" (optional)
}
```

#### Get SOS History
```
GET /api/user/sos-history
Headers: Authorization: Bearer {token}
```

### **Health Check**

#### Test Server
```
GET /api/health
```

---

## 🗄️ DATABASE STRUCTURE

### **Users Collection**
```json
{
  "_id": "ObjectId",
  "name": "Shreya",
  "email": "shreya@example.com",
  "password": "bcrypt_hash",
  "phone": "+91XXXXXXXXXX",
  "emergencyContacts": ["+91YYYYYYYYYY"],
  "reportsCount": 5,
  "sosCount": 1,
  "createdAt": "2026-01-28T10:30:00Z"
}
```

### **Reports Collection**
```json
{
  "_id": "ObjectId",
  "userId": "ObjectId",
  "userName": "Shreya",
  "userPhone": "+91XXXXXXXXXX",
  "type": "assault",
  "lat": 30.7199,
  "lng": 76.789,
  "note": "Description of incident",
  "timestamp": "2026-01-28T10:30:00Z"
}
```

### **Safety Points Collection**
```json
{
  "_id": "ObjectId",
  "type": "police",
  "name": "Police Station XYZ",
  "lat": 30.7199,
  "lng": 76.789,
  "weight": 5
}
```

### **SOS Logs Collection**
```json
{
  "_id": "ObjectId",
  "userId": "ObjectId",
  "lat": 30.7199,
  "lng": 76.789,
  "message": "Emergency alert message",
  "contactsNotified": ["+91XXXXXXXXXX"],
  "timestamp": "2026-01-28T10:30:00Z"
}
```

---

## 🔑 KEY FEATURES

### **1. Real-time Reports**
- User reports unsafe areas
- Report count increases in profile
- Data permanently stored in MongoDB
- All reports visible on community map

### **2. Safe Routes**
- Algorithm checks:
  - Proximity to police stations (+5 points)
  - Proximity to hospitals (+4 points)
  - Proximity to markets/malls (+3 points)
  - Proximity to user reports (-3 points)
- Score normalized to 1-5 scale
- Safest route highlighted

### **3. SOS Alert**
- User clicks SOS button
- Geolocation captured
- SMS sent to emergency contacts (via Twilio)
- SOS logged in database
- Can view history anytime

### **4. Authentication**
- JWT token-based
- Secure password hashing (bcryptjs)
- Token expires in 7 days
- Profile data personalized

---

## 🧪 TESTING

### Test API with cURL (Command Prompt)

**Signup:**
```bash
curl -X POST http://localhost:3001/api/auth/signup ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"Test User\",\"email\":\"test@example.com\",\"password\":\"password123\"}"
```

**Login:**
```bash
curl -X POST http://localhost:3001/api/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"test@example.com\",\"password\":\"password123\"}"
```

**Get Profile:**
```bash
curl -X GET http://localhost:3001/api/user/profile ^
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## ⚠️ IMPORTANT NOTES

1. **Frontend Linking**: main.js already updated with API_URL = 'http://localhost:3001/api'
2. **CORS Enabled**: Cross-origin requests working
3. **Error Handling**: All endpoints have try-catch
4. **Authentication**: Protected endpoints check JWT token
5. **Twilio Optional**: SOS works without Twilio (logs locally)

---

## 🚀 DEPLOYMENT NOTES

For production:
1. Change `JWT_SECRET` to strong random value
2. Use MongoDB Atlas (not local)
3. Deploy to Heroku/Railway/Render
4. Update `API_URL` in main.js to production URL
5. Setup Twilio for real SMS alerts
6. Enable HTTPS

---

**Ab server start kar aur test kar! 🎉**
