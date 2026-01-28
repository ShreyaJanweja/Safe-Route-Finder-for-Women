# 🚀 QUICK START - Test Profile Page (5 Minutes)

## Prerequisites ✅
- Backend running: `node server.js` on port 3001
- MongoDB running: on port 27017
- Frontend served: http://localhost:5000
- Fully logged in with valid JWT token

---

## 5-Minute Demo

### Step 1: Open Browser (30 sec)
```
URL: http://localhost:5000
Status: Should show homepage with "Safe Route Finder"
```

### Step 2: Signup New Account (1 min)
```
Click: "Get Started" or "Sign Up"
Fill form:
  Email: test123@example.com
  Username: testuser123
  Password: Test@12345 (must have uppercase, digit, symbol)
  Phone: 9876543210

Click "Sign Up"
→ Success! Redirected to login
```

### Step 3: Login (30 sec)
```
Email: test123@example.com
Password: Test@12345
Click "Login"
→ Success! Redirected to profile page
```

### Step 4: Profile Page Loads (30 sec)
```
Should see:
✓ User avatar (initials in circle)
✓ Username: testuser123
✓ Email: test123@example.com
✓ Join date: Today's date
✓ Stats: 0 Routes, 0 Reports, 0 Alerts
✓ Recent Activity: List of dummy activities
```

### Step 5: Add Emergency Contact (1.5 min)
```
Click: "Manage Emergency Contacts" (pink button)
Modal opens with form:

Fill form:
  Name: Mom
  Country: 🇮🇳 IN +91 (India)
  Phone: 9876543210
  Relation: Mother
  
Click: "Save" button

Result:
  ✓ Contact appears in modal list
  ✓ Contact appears in inline list below
  ✓ Form clears

Add another contact:
  Name: Sister
  Country: 🇮🇳 IN +91 (India)
  Phone: 8765432109
  Relation: Sister
  
Click: "Save"
  ✓ Both contacts now visible
```

### Step 6: Verify Persistence (30 sec)
```
Press: F5 (refresh page)
Wait: Page reloads with fresh data fetch from API
Check: Emergency contacts STILL there!
  ✓ Mom is still listed
  ✓ Sister is still listed
  ✓ Data survived refresh = MongoDB working!
```

### Step 7: Voice SOS Setup (1 min)
```
Scroll down: Find "Voice SOS" section

Step A: Set Command
  Input: "help me 123"
  Click: "Save Command" button
  Result: Status changes to "Status: command saved"

Step B: Start Listening
  Click: "Start Voice Listener" button
  Allow: Microphone permission (popup)
  Result: Status changes to "Listening..."
```

### Step 8: Trigger Voice SOS (1.5 min)
```
Prerequisites:
  ✓ Command saved: "help me 123"
  ✓ Listener started
  ✓ Browser has microphone access
  ✓ Emergency contacts added

Action:
  Speak clearly: "help me 123"
  
Expected Result:
  ✓ Heard transcript appears: "help me 123"
  ✓ Red overlay flashes entire screen
  ✓ Alarm sound plays (beep beep beep)
  ✓ Modal popup: "Emergency triggered!"
  ✓ SMS composer opens (browser/OS default)
  ✓ SMS has pre-filled message with location

Click: "Stop Alarm" button
  ✓ Red overlay disappears
  ✓ Alarm sound stops
  ✓ Status shows "Alarm stopped"
```

---

## Expected Results Table

| Action | Expected | Actual | ✓/✗ |
|--------|----------|--------|-----|
| Page loads | Profile data from API | ... | ✓ |
| Add contact | Appears in list | ... | ✓ |
| Refresh page | Contact persists | ... | ✓ |
| Set voice cmd | Status: saved | ... | ✓ |
| Say command | Heard: transcript | ... | ✓ |
| Command match | Alarm triggers | ... | ✓ |
| Red overlay | Flashes screen | ... | ✓ |
| Beep sound | Plays continuously | ... | ✓ |
| SMS modal | Opens for contact | ... | ✓ |
| Stop alarm | All effects cease | ... | ✓ |

---

## Troubleshooting Quick Fixes

### Problem: "Redirected to login"
**Solution**: 
```
Check: Are you logged in?
  → Open DevTools (F12)
  → Console tab
  → Type: localStorage.getItem('authToken')
  → Should show a long JWT token string

If empty:
  → Go back and login again
  → Then try profile page
```

### Problem: Profile page blank
**Solution**:
```
Check: Browser console for errors (F12)
  → Look for red error messages
  → Likely: Backend not running

Fix:
  → Open terminal
  → Run: node server.js
  → Wait for: "✅ MongoDB connected"
  → Refresh page
```

### Problem: Emergency contacts not saving
**Solution**:
```
Check: Network tab (F12 → Network tab)
  → Add a contact
  → Look for "PUT" request to "/api/user/profile"
  → Check if status is 200 (green)

If red (error):
  → Backend might not be running
  → Or API might have issue
  → Check server console for errors
```

### Problem: Voice SOS not working
**Solution**:
```
Requirements:
  ✓ Modern browser (Chrome, Edge, Opera)
  ✓ Microphone connected & working
  ✓ Voice command set and saved
  ✓ Listener started (button says "Stop")
  ✓ Speaking clearly in English

Test:
  1. Open console (F12)
  2. Type: navigator.microphone // should exist
  3. Check: "Microphone permission" notification
     (grant access if asked)
  4. Try again: Speak the command clearly
```

### Problem: SMS composer not opening
**Solution**:
```
Note: This depends on your OS
  • Windows: Default SMS app (if any)
  • Android: Native SMS app opens
  • iOS: iMessage/SMS app opens
  • Mac: Messages app

If not working:
  → Check browser console for errors
  → Verify you added emergency contacts
  → Try: Click "Start Voice Listener" first
```

---

## Backend Health Check

### Verify Backend Running

**Terminal Check**:
```powershell
curl http://localhost:3001/api/health
```

Expected response:
```json
{"success":true,"message":"Server is running"}
```

### MongoDB Health Check

**Terminal Check**:
```powershell
curl http://localhost:3001/api/user/profile
# (Will fail without auth, but shows if API responds)
```

Expected:
```
Error response (401 Unauthorized)
→ This is OK! Shows API is running
```

**Console Check**:
```javascript
// In DevTools Console:
fetch('http://localhost:3001/api/health')
  .then(r => r.json())
  .then(d => console.log(d))

// Should show: 
// {success: true, message: "Server is running"}
```

---

## File Locations Reference

| Component | File | Path |
|-----------|------|------|
| Profile Page | profile.html | /profile.html |
| Restore Docs | PROFILE_RESTORE_COMPLETE.md | Root folder |
| Features List | PROFILE_FEATURES_SUMMARY.md | Root folder |
| Backend | server.js | /server.js |
| Config | .env | /.env |
| Logs | Check Terminal | Node terminal |

---

## Success Indicators ✅

### All of These Should Be True
```
✓ Profile page loads without redirect to login
✓ User data shows correctly (name, email, date)
✓ Can add emergency contact without errors
✓ Contact appears in modal list
✓ Contact appears in inline profile section
✓ Refresh page → contact still there
✓ Can set voice command
✓ Voice listener starts without errors
✓ Microphone captures voice
✓ Spoken words appear as transcript
✓ Voice command match triggers alarm
✓ Red overlay flashes visible
✓ Alarm sound plays
✓ Stop button hides overlay
✓ Settings toggles work
✓ Dark mode toggle changes theme
```

If ALL of these are true → **Profile Page is 100% Functional!** 🎉

---

## Performance Notes

### Expected Response Times
- **Profile load**: < 500ms (from API)
- **Add contact**: < 1 sec (API + database)
- **Refresh with data**: < 1 sec
- **Voice recognition**: Real-time (depends on browser)
- **Alarm trigger**: Instant (< 100ms)

### What to Expect
- First load might be slightly slower (cold start)
- Database queries might cache after first use
- Voice recognition dependent on OS microphone

---

## Next Steps After Testing

### If Everything Works ✓
1. **Demo Ready**: You can demo this at hackathon
2. **Deploy**: Follow deployment guide in SETUP_COMPLETE.md
3. **Customize**: Add more features as needed

### If Something Breaks ✗
1. Check troubleshooting section above
2. Look at browser console (F12)
3. Check server terminal for errors
4. Read BACKEND_COMPLETE.md for API details

---

## Sample Test Data

Use these for quick testing:

```
Account 1:
  Email: sjainnn@example.com
  Password: Sjain@12345
  
Account 2:
  Email: demo@example.com
  Password: Demo@12345

Emergency Contact:
  Name: Mom
  Phone: 9876543210
  Country: +91
  Relation: Mother

Voice Command:
  "help me 123"
  OR
  "help"
  OR
  "emergency"
```

---

## Demo Tips for Hackathon 🎯

### 1. Pre-load Everything
```
✓ Open http://localhost:5000 beforehand
✓ Login with test account
✓ Add sample contacts
✓ Set voice command
✓ Get to profile page ready
```

### 2. Practice Voice Command
```
✓ Test microphone volume levels
✓ Practice speaking clearly
✓ Test multiple times before demo
✓ Have backup contact ready
```

### 3. Show Data Persistence
```
✓ Add contact
✓ Refresh page → show it's still there
✓ Say "This is saved in MongoDB!"
✓ Shows backend integration
```

### 4. Show Voice SOS Flow
```
✓ Set command
✓ Start listener
✓ Say command clearly
✓ Point to red screen flashing
✓ Point to beep sound
✓ "Now SMS opens to contacts"
```

---

## Final Checklist Before Hackathon

- [ ] Backend running on :3001
- [ ] MongoDB connected and working
- [ ] Frontend accessible at :5000
- [ ] Can login with valid account
- [ ] Profile page loads all data
- [ ] Can add emergency contacts
- [ ] Contacts persist after refresh
- [ ] Voice SOS works (if microphone available)
- [ ] Alarm visual effects work
- [ ] Settings toggles work
- [ ] Browser console shows no red errors
- [ ] Server terminal shows no errors

✅ **All checked?** → You're ready for demo! 🚀

---

**Questions?** Check the detailed docs:
- PROFILE_RESTORE_COMPLETE.md → Full feature list
- PROFILE_FEATURES_SUMMARY.md → Architecture details
- BACKEND_COMPLETE.md → API reference
- server.js → Read the code directly
