// ============================================
// SEED DATA FOR SAFETY POINTS
// ============================================
// Run this file once to populate initial safety points in MongoDB
// node seed.js

const mongoose = require('mongoose');
require('dotenv').config();

const safetyPointSchema = new mongoose.Schema({
  type: { type: String, enum: ['police', 'hospital', 'market', 'mall'], required: true },
  name: String,
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  weight: { type: Number, default: 5 }
});

const SafetyPoint = mongoose.model('SafetyPoint', safetyPointSchema);

const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/suraksha-sathi';

mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(async () => {
  console.log('✅ Connected to MongoDB');
  
  // Clear existing data
  await SafetyPoint.deleteMany({});
  console.log('🗑️  Cleared existing safety points');
  
  // Sample safety points (Chandigarh area - adjust coordinates for your city)
  const safetyPoints = [
    // Police Stations
    { type: 'police', name: 'Sector 36 Police Station', lat: 30.5537, lng: 76.8243, weight: 5 },
    { type: 'police', name: 'Sector 17 Police Station', lat: 30.7392, lng: 76.7838, weight: 5 },
    { type: 'police', name: 'Sector 43 Police Station', lat: 30.6223, lng: 76.7693, weight: 5 },
    { type: 'police', name: 'Madhya Marg Police Station', lat: 30.7199, lng: 76.8089, weight: 5 },
    
    // Hospitals
    { type: 'hospital', name: 'Post Graduate Institute', lat: 30.7632, lng: 76.8432, weight: 4 },
    { type: 'hospital', name: 'Government Medical College Hospital', lat: 30.7490, lng: 76.7840, weight: 4 },
    { type: 'hospital', name: 'Fortis Hospital', lat: 30.7337, lng: 76.8236, weight: 4 },
    { type: 'hospital', name: 'Apollo Hospital', lat: 30.6890, lng: 76.8045, weight: 4 },
    
    // Markets
    { type: 'market', name: 'Sector 17 Market', lat: 30.7392, lng: 76.7838, weight: 3 },
    { type: 'market', name: 'Sector 35 Market', lat: 30.5641, lng: 76.8154, weight: 3 },
    { type: 'market', name: 'Elante Mall Market', lat: 30.6885, lng: 76.8045, weight: 3 },
    { type: 'market', name: 'VR Mall Market', lat: 30.7249, lng: 76.8267, weight: 3 },
    
    // Malls
    { type: 'mall', name: 'Elante Mall', lat: 30.6885, lng: 76.8045, weight: 3 },
    { type: 'mall', name: 'VR Punjab Mall', lat: 30.7249, lng: 76.8267, weight: 3 },
    { type: 'mall', name: 'Sahara Mall', lat: 30.7130, lng: 76.8120, weight: 3 },
    { type: 'mall', name: 'Paladi Mall', lat: 30.7082, lng: 76.8098, weight: 3 },
  ];
  
  // Insert data
  await SafetyPoint.insertMany(safetyPoints);
  console.log(`✅ Inserted ${safetyPoints.length} safety points into database`);
  
  console.log('\n📍 Safety Points Added:');
  console.log('- 4 Police Stations');
  console.log('- 4 Hospitals');
  console.log('- 4 Markets');
  console.log('- 4 Malls');
  
  process.exit(0);
})
.catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
