# 🧪 COMPLETE TESTING GUIDE - JWT Authentication & User Management

## ✅ Step-by-Step Testing Instructions

### 1. **Test Login with Real Authentication**

**Access the application:**
```
https://transact-shield-2.preview.emergentagent.com
```

**Login Credentials:**
```
Admin:
  Username: admin
  Password: Admin123!

Superadmin:
  Username: superadmin
  Password: SuperAdmin123!
```

**Expected Behavior:**
- ✅ You should see a proper login form (not auto-login)
- ✅ Wrong password should show error message
- ✅ Correct credentials should log you in
- ✅ You should see a JWT token stored in browser localStorage

---

### 2. **Verify User Authentication**

**Open Browser Dev Tools (F12):**
1. Go to **Application** tab → **Local Storage**
2. Look for your domain
3. You should see:
   - `access_token`: JWT token (long string)
   - `user`: JSON object with user details

**Check the token contains:**
```json
{
  "id": 1,
  "username": "admin",
  "email": "admin@frauddetection.com",
  "role": "admin",
  "is_active": true,
  "must_change_password": false,
  ...
}
```

---

### 3. **Test User Creation (Admin Function)**

**Steps:**
1. Login as `admin` or `superadmin`
2. Navigate to **Admin** page (in sidebar)
3. Click **"+ Create New User"** button
4. Fill in the form:
   - Username: `analyst1`
   - Email: `analyst1@company.com`
   - Role: `analyst`
5. Click **"Create User"**

**Expected Result:**
- ✅ Alert popup showing: **"User created! Temporary Password: [RandomPassword]"**
- ✅ The password will look like: `aB3!xYz9pQ2@`
- ✅ **IMPORTANT:** Copy this password immediately!
- ✅ User should appear in the users table below

**Example Success Message:**
```
User created!
Temporary Password: Qw9#Rt2pM!aX

Please save this password and share it securely with the user.
```

---

### 4. **Test First-Time Login (Password Change Required)**

**Steps:**
1. **Logout** (if logged in)
2. Login with the newly created user:
   - Username: `analyst1`
   - Password: `[the random password you copied]`

**Expected Behavior:**
- ✅ After successful login, you should be **automatically redirected** to `/change-password`
- ✅ You **cannot access dashboard** until you change password
- ✅ Page shows: "⚠️ Required: You must change your password before continuing"

**Change Password:**
1. Enter **Current Password**: (the temporary one)
2. Enter **New Password**: `Analyst123!` (or any password meeting requirements)
3. Enter **Confirm New Password**: `Analyst123!`
4. Click **"Change Password"**

**Expected Result:**
- ✅ Success message: "Password changed successfully!"
- ✅ Redirected to `/dashboard`
- ✅ Now you can access all pages normally

---

### 5. **Verify Database Records**

**Check users in database:**
```bash
sudo -u postgres psql frauddb -c "SELECT id, username, email, role, must_change_password, last_login FROM users;"
```

**Expected Output:**
```
 id |  username   |            email             |    role    | must_change_password |         last_login         
----+-------------+------------------------------+------------+----------------------+----------------------------
  1 | superadmin  | superadmin@frauddetection.com| superadmin | f                    | 2025-01-26 12:30:00.123456
  2 | admin       | admin@frauddetection.com     | admin      | f                    | 2025-01-26 12:35:00.123456
  3 | analyst1    | analyst1@company.com         | analyst    | f                    | 2025-01-26 12:40:00.123456
```

**Explanation:**
- `must_change_password`: `f` (false) after password change
- `last_login`: Updated after each login

---

### 6. **Test Password Reset (Admin Function)**

**Steps:**
1. Login as `admin`
2. Go to **Admin** page
3. Find `analyst1` in the users table
4. Click **"Reset Password"**
5. Confirm the action

**Expected Result:**
- ✅ Alert showing new temporary password: `Xy7!Pq3mN@tK`
- ✅ Copy this password
- ✅ User's `must_change_password` flag is set back to `true`

**Verify:**
1. Logout
2. Login as `analyst1` with **OLD password** → Should FAIL
3. Login as `analyst1` with **NEW temporary password** → Should work
4. Should be redirected to change password page again

---

### 7. **Test User Deletion**

**Steps:**
1. Login as `admin`
2. Go to **Admin** page
3. Find a test user
4. Click **"Delete"**
5. Confirm deletion

**Expected Result:**
- ✅ Confirmation dialog
- ✅ User removed from table
- ✅ User cannot login anymore
- ✅ Cannot delete yourself (admin) - should show error

---

### 8. **View Database Schema**

**Using API:**
```bash
# Get your token from browser localStorage
TOKEN="your_jwt_token_here"

# View all tables
curl -H "Authorization: Bearer $TOKEN" \
  https://transact-shield-2.preview.emergentagent.com/api/database/tables

# View users table schema
curl -H "Authorization: Bearer $TOKEN" \
  https://transact-shield-2.preview.emergentagent.com/api/database/tables/users
```

**Or use the helper script:**
```bash
bash /tmp/db_access.sh
```

---

### 9. **Test Reports Generation**

**Steps:**
1. Login as any user
2. Navigate to **Reports** page
3. Click **"Generate Report"**
4. Select date range (optional)
5. Click **"Generate"**

**Expected Result:**
- ✅ Comprehensive report showing:
  - Total transactions processed
  - Risk distribution
  - Case metrics
  - Model performance
  - Geographic analysis
  - Merchant analysis
  - Time series data

**Export CSV (Admin only):**
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "https://transact-shield-2.preview.emergentagent.com/api/reports/export/csv" \
  -o fraud_report.csv
```

---

## 🔍 Troubleshooting Common Issues

### Issue 1: "Still auto-login without password"
**Solution:** Clear browser cache and localStorage
```javascript
// In browser console (F12):
localStorage.clear();
location.reload();
```

### Issue 2: "Token expired" error
**Solution:** Login again to get a new token (tokens expire after 8 hours)

### Issue 3: "Cannot see generated password"
**Solution:** Make sure you're copying the password from the alert popup immediately after user creation

### Issue 4: "Stuck on change password page"
**Solution:** 
- Make sure new password meets all requirements
- Check browser console for errors
- Try refreshing the page

---

## 📊 Expected User Flow Diagram

```
1. Admin creates user
   ↓
2. System generates random password (e.g., "Qw9#Rt2pM!aX")
   ↓
3. Admin receives password in alert popup
   ↓
4. Admin shares password securely with analyst
   ↓
5. Analyst logs in with temporary password
   ↓
6. System detects must_change_password = true
   ↓
7. Analyst redirected to /change-password
   ↓
8. Analyst creates new secure password
   ↓
9. System updates: must_change_password = false
   ↓
10. Analyst can now access all features
```

---

## 🎯 Testing Checklist

**Authentication:**
- [ ] Login with correct credentials works
- [ ] Login with wrong password fails
- [ ] Logout clears session
- [ ] Token is stored in localStorage
- [ ] Token is included in API requests

**User Management:**
- [ ] Admin can create users
- [ ] Random password is generated and displayed
- [ ] Password meets security requirements (8+ chars, uppercase, lowercase, digit, special)
- [ ] New users must change password on first login
- [ ] Admin can reset user passwords
- [ ] Admin can delete users (except themselves)
- [ ] Superadmin can do everything admin can

**Password Change:**
- [ ] First-time login redirects to change password
- [ ] Cannot access other pages until password changed
- [ ] Password validation works (shows errors)
- [ ] After changing password, can access all pages
- [ ] Old password no longer works

**Security:**
- [ ] Cannot access protected routes without login
- [ ] Expired tokens redirect to login
- [ ] Role-based access control works (analyst vs admin)
- [ ] Passwords are never shown in plain text (except initial generation)

**Database:**
- [ ] Users table exists with correct schema
- [ ] User records are created correctly
- [ ] must_change_password flag works
- [ ] last_login is updated on each login
- [ ] Audit logs track all user actions

---

## 🚀 Quick Test Script

Run this to test the entire flow:

```bash
#!/bin/bash

echo "=== AUTHENTICATION SYSTEM TEST ==="
echo ""

# Test 1: Login
echo "1. Testing login..."
curl -X POST https://transact-shield-2.preview.emergentagent.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Admin123!"}' \
  -s | python3 -m json.tool > /tmp/login_response.json

if grep -q "access_token" /tmp/login_response.json; then
    echo "   ✅ Login successful"
    TOKEN=$(cat /tmp/login_response.json | python3 -c "import sys, json; print(json.load(sys.stdin)['access_token'])")
else
    echo "   ❌ Login failed"
    exit 1
fi

# Test 2: Get current user
echo ""
echo "2. Testing get current user..."
curl -H "Authorization: Bearer $TOKEN" \
  https://transact-shield-2.preview.emergentagent.com/api/auth/me \
  -s | python3 -m json.tool > /tmp/user_info.json

if grep -q "username" /tmp/user_info.json; then
    echo "   ✅ User info retrieved"
    cat /tmp/user_info.json
else
    echo "   ❌ Failed to get user info"
fi

# Test 3: List users
echo ""
echo "3. Testing list users..."
curl -H "Authorization: Bearer $TOKEN" \
  https://transact-shield-2.preview.emergentagent.com/api/auth/users \
  -s | python3 -m json.tool > /tmp/users_list.json

USER_COUNT=$(cat /tmp/users_list.json | python3 -c "import sys, json; print(len(json.load(sys.stdin)))")
echo "   ✅ Found $USER_COUNT users"

echo ""
echo "=== ALL TESTS PASSED ✅ ==="
```

---

## 📝 Summary

You now have:
1. ✅ **Real JWT authentication** (no more fake login)
2. ✅ **User management** system
3. ✅ **Random password generation**
4. ✅ **Forced password change** on first login
5. ✅ **Password reset** functionality
6. ✅ **Database schema viewer**
7. ✅ **Comprehensive reporting**

**Next Steps:**
- Test all the flows above
- Create some test users
- Generate reports
- View database schema

**Need Help?**
- Check browser console (F12) for errors
- Check backend logs: `tail -f /var/log/supervisor/backend.out.log`
- View database: `sudo -u postgres psql frauddb`
