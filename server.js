// server.js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const twilio = require('twilio');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH);

app.post('/send-sos', async (req, res) => {
  const { contacts, message } = req.body;
  if (!contacts || !message) return res.json({ success: false, error: 'Invalid data' });

  try {
    for (let c of contacts) {
      await client.messages.create({
        from: process.env.TWILIO_PHONE,
        to: c.phone,
        body: message
      });
    }
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

const PORT = process.env.PORT || 3001; // 3001 ya koi bhi free port
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

