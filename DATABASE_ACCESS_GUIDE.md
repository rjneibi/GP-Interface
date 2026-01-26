# DATABASE ACCESS GUIDE

## 🔍 Quick Database Access

### Method 1: Using the Helper Script
```bash
bash /tmp/db_access.sh
```
This script shows:
- All table schemas
- Current data counts
- Sample records
- Risk distribution
- Audit log summary

### Method 2: Direct PostgreSQL Access
```bash
sudo -u postgres psql -d frauddb
```

## 📊 Database Schema Overview

### Tables in the System

1. **transactions** - All financial transactions with risk scores
2. **cases** - Fraud investigation cases (auto-created for high-risk)
3. **notes** - Investigation notes attached to transactions/cases
4. **audit_logs** - Immutable audit trail of all actions
5. **alembic_version** - Database migration tracking

## 🔎 Useful Database Queries

### View All Transactions with Risk Scores
```sql
SELECT tx_id, user, amount, country, risk, explanation 
FROM transactions 
ORDER BY created_at DESC;
```

### View High-Risk Transactions Only
```sql
SELECT tx_id, amount, country, risk, explanation 
FROM transactions 
WHERE risk >= 70 
ORDER BY risk DESC;
```

### View All Cases with Transaction Details
```sql
SELECT 
    c.id as case_id,
    c.tx_id,
    c.status,
    c.severity,
    t.amount,
    t.risk,
    t.country,
    c.created_at
FROM cases c
JOIN transactions t ON c.tx_id = t.tx_id
ORDER BY c.created_at DESC;
```

### View Audit Trail
```sql
SELECT action, meta, created_at 
FROM audit_logs 
ORDER BY created_at DESC 
LIMIT 20;
```

### Risk Distribution Statistics
```sql
SELECT 
    CASE 
        WHEN risk >= 90 THEN 'CRITICAL (>=90)'
        WHEN risk >= 70 THEN 'HIGH (70-89)'
        WHEN risk >= 40 THEN 'MEDIUM (40-69)'
        ELSE 'LOW (<40)'
    END as risk_category,
    COUNT(*) as count,
    AVG(amount)::numeric(10,2) as avg_amount
FROM transactions 
GROUP BY risk_category 
ORDER BY risk_category;
```

### Cases by Status
```sql
SELECT 
    status, 
    severity,
    COUNT(*) as count,
    MIN(created_at) as oldest,
    MAX(created_at) as newest
FROM cases 
GROUP BY status, severity 
ORDER BY status, severity;
```

### Transactions with Associated Cases
```sql
SELECT 
    t.tx_id,
    t.amount,
    t.country,
    t.risk,
    c.id as case_id,
    c.severity,
    c.status
FROM transactions t
LEFT JOIN cases c ON t.tx_id = c.tx_id
ORDER BY t.created_at DESC;
```

## 🛠️ Database Management Commands

### View Table Structure
```sql
\d transactions     -- Transaction table schema
\d cases           -- Cases table schema
\d notes           -- Notes table schema
\d audit_logs      -- Audit logs table schema
```

### Count Records
```sql
SELECT 'Transactions' as table_name, COUNT(*) FROM transactions
UNION ALL
SELECT 'Cases', COUNT(*) FROM cases
UNION ALL
SELECT 'Notes', COUNT(*) FROM notes
UNION ALL
SELECT 'Audit Logs', COUNT(*) FROM audit_logs;
```

### Check Foreign Key Relationships
```sql
SELECT 
    conname as constraint_name,
    conrelid::regclass as table_name,
    confrelid::regclass as referenced_table
FROM pg_constraint 
WHERE contype = 'f';
```

## 📈 Real-Time Monitoring Queries

### Recent High-Risk Activity
```sql
SELECT 
    t.tx_id,
    t.amount,
    t.country,
    t.merchant,
    t.risk,
    t.created_at,
    c.id as case_id,
    c.severity
FROM transactions t
LEFT JOIN cases c ON t.tx_id = c.tx_id
WHERE t.risk >= 70
ORDER BY t.created_at DESC
LIMIT 10;
```

### Today's Transaction Summary
```sql
SELECT 
    COUNT(*) as total_transactions,
    COUNT(CASE WHEN risk >= 70 THEN 1 END) as high_risk,
    COUNT(CASE WHEN risk >= 40 AND risk < 70 THEN 1 END) as medium_risk,
    COUNT(CASE WHEN risk < 40 THEN 1 END) as low_risk,
    SUM(amount)::numeric(12,2) as total_amount,
    AVG(risk)::numeric(5,2) as avg_risk
FROM transactions 
WHERE created_at >= CURRENT_DATE;
```

## 🧪 Testing Queries

### Insert Test Transaction (High Risk)
```sql
-- This will be handled by the API, but for reference:
-- The backend will automatically calculate risk and create cases
```

### View Auto-Created Cases
```sql
SELECT 
    al.action,
    al.meta->>'tx_id' as tx_id,
    al.meta->>'risk' as risk_score,
    al.meta->>'severity' as severity,
    al.created_at
FROM audit_logs al
WHERE action = 'case.auto_created'
ORDER BY created_at DESC;
```

## 💾 Database Backup

### Export Data
```bash
# Export all data
pg_dump -U fraud -d frauddb > /tmp/frauddb_backup.sql

# Export specific table
pg_dump -U fraud -d frauddb -t transactions > /tmp/transactions_backup.sql
```

### Import Data
```bash
psql -U fraud -d frauddb < /tmp/frauddb_backup.sql
```

## 🔧 Connection Details

- **Host**: localhost
- **Port**: 5432
- **Database**: frauddb
- **Username**: fraud
- **Password**: fraud

## 📝 Current Database State

Based on the latest query:
- **Total Transactions**: 4
- **Total Cases**: 3 (all auto-created for high-risk transactions)
- **Risk Distribution**: 3 High-risk (>=70), 1 Low-risk (<40)
- **All Cases**: RED severity (risk = 100)

## 🎯 Example Data in System

### Sample Transaction (High Risk)
- **TX ID**: TX-SYSTEM-TEST-001
- **Amount**: $95,000
- **Country**: Nigeria (NG)
- **Risk**: 100 (RED)
- **Explanation**: Very high amount, high-risk country, unknown device, high-risk merchant, unusual time, ATM transaction
- **Case Created**: Yes (RED severity)

### Sample Transaction (Low Risk)
- **TX ID**: TX-LOW-RISK-001
- **Amount**: $500
- **Country**: UAE
- **Risk**: 0 (GREEN)
- **Explanation**: Low risk transaction
- **Case Created**: No

## 🚀 Quick Start

To explore the database right now:
```bash
sudo -u postgres psql -d frauddb
```

Then try:
```sql
SELECT * FROM transactions;
SELECT * FROM cases;
SELECT * FROM audit_logs;
```

Exit with: `\q`
