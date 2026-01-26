# Fraud Detection System - Quick Access Guide

## 🌐 Application URL

**Access the application here:**
https://transact-shield-2.preview.emergentagent.com

## 🔑 Login Credentials

### Analyst Account
- **Username**: `analyst`
- **Password**: `analyst123`
- **Permissions**: View transactions, cases; add notes; update assigned cases

### Admin Account
- **Username**: `admin`
- **Password**: `admin123`
- **Permissions**: All analyst permissions + user management + settings

### Superadmin Account
- **Username**: `superadmin`
- **Password**: `super123`
- **Permissions**: All permissions + system-level controls

## 📋 Quick Start Guide

1. **Login**: Visit the URL above and use any of the credentials listed
2. **Dashboard**: View key metrics, recent high-risk transactions, and case statistics
3. **Transactions**: Create new transactions and watch automatic risk scoring in action
4. **Cases**: View auto-generated cases for high-risk transactions

## 🧪 Try It Out: Create a High-Risk Transaction

To see the system in action:

1. Navigate to **Transactions** page
2. Click "Create Transaction"
3. Enter these values to trigger **high-risk** detection:
   - **Amount**: `85000` (>$50k triggers +40 points)
   - **Country**: `NG` (Nigeria - high-risk country +30 points)
   - **Device**: `Unknown` (+15 points)
   - **Merchant**: `Crypto Exchange` (+25 points)
   - **Hour**: `2` (unusual time +10 points)
   - **Channel**: `ATM` (+5 points)

4. **Expected Result**:
   - Risk Score: **100** (RED)
   - Auto-case created with RED severity
   - Explanation: Lists all risk factors

## ✅ Key Features to Test

### 1. Risk Scoring
- Low-risk example: $500, UAE, iPhone, Amazon, 2 PM → Risk: 0 (GREEN)
- Medium-risk: $15,000, USA, Mobile, Regular merchant → Risk: ~25 (ORANGE)
- High-risk: See example above → Risk: 100 (RED)

### 2. Auto-Case Creation
- Any transaction with **Risk ≥ 70** automatically creates a case
- **Risk ≥ 90**: RED severity
- **Risk 70-89**: ORANGE severity

### 3. Case Management
- View all cases in the **Cases** page
- Click on a case to view details
- Assign cases to analysts
- Update status (NEW → IN_PROGRESS → RESOLVED → CLOSED)
- Add decision (APPROVE/REJECT with reason)

### 4. Notes
- Add investigation notes to transactions
- Track analyst comments
- View note history

### 5. Audit Trail
- All actions are logged
- View in **Admin** panel
- Immutable audit records

## 🎯 System Capabilities

**Risk Factors Analyzed:**
- ✅ Transaction amount
- ✅ Country (high-risk detection)
- ✅ Device type (new/unknown)
- ✅ Merchant category
- ✅ Transaction time
- ✅ Channel (ATM, Mobile, etc.)

**Automatic Actions:**
- ✅ Risk score calculation (0-100)
- ✅ Human-readable explanations
- ✅ Case creation for high-risk
- ✅ Severity assignment (RED/ORANGE/GREEN)
- ✅ Audit logging

## 📊 Dashboard Metrics

- Total transactions processed
- Number of active cases
- Risk distribution
- Recent high-risk alerts
- Case resolution statistics

## 🔧 Technical Details

- **Backend**: FastAPI + PostgreSQL
- **Frontend**: React 19 + Vite + TailwindCSS
- **Database**: PostgreSQL 15
- **API Documentation**: http://127.0.0.1:8001/docs

## 💡 Tips

1. **Test different risk levels**: Try various combinations to see how risk scores change
2. **Role-based testing**: Login with different accounts to see permission differences
3. **Case workflow**: Create high-risk transaction → View auto-created case → Assign → Update status → Add decision
4. **Notes**: Add investigation notes to document your analysis
5. **Audit trail**: Check Admin panel to see all logged actions

## 🆘 Troubleshooting

If you encounter any issues:
1. Refresh the page
2. Try logging out and back in
3. Clear browser cache if needed
4. Check that you're using the correct credentials

---

**Enjoy exploring the Fraud Detection System!** 🚀
