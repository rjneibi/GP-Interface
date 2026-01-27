# AI-Based Fraud Detection & Explainability Platform

## Product Overview
A production-ready, full-stack fraud detection platform with real-time transaction analysis, case management, and comprehensive reporting.

## Tech Stack
- **Backend**: FastAPI, PostgreSQL, SQLAlchemy, Alembic, JWT Authentication
- **Frontend**: React, Vite, TailwindCSS
- **Database**: PostgreSQL (SQLAlchemy ORM)

## Core Features

### Authentication & Authorization
- JWT-based authentication system
- Role-based access control (Analyst, Admin, Superadmin)
- User management with random password generation
- First-login password change requirement

### Transaction Management
- Real-time transaction monitoring
- Risk scoring algorithm (rule-based)
- Transaction streaming simulation
- Search and filter functionality
- **Export CSV** - Download transactions as CSV
- **Clear All** - Bulk delete transactions

### Case Management
- Automatic case creation for high-risk transactions (risk >= 70)
- Case status workflow (NEW, IN_REVIEW, ESCALATED, CLOSED)
- Bulk actions for cases
- Case details view

### Reports
- Quick stats (Today, 7 days, 30 days, All time)
- Comprehensive report generation
- Transaction metrics, risk analysis, case metrics
- Geographic and merchant analysis
- CSV export functionality

### User Management (Admin)
- Create users with random secure passwords
- View all users with roles and status
- Reset user passwords
- Delete users

### Theme System
- **Dark Mode** (default): Slate/dark backgrounds with proper contrast
- **Light Mode**: Gray/white backgrounds with dark text
- Theme toggle in sidebar (persists to localStorage)
- All pages support both themes

## Database Schema

### Users
- id, username, email, hashed_password, role, is_active, must_change_password, created_at, updated_at, last_login, created_by

### Transactions
- id, tx_id, user, amount, country, device, channel, merchant, card_type, ts, risk, explanation, created_at

### Cases
- id, tx_id, status, severity, assigned_to, decision, created_at, resolved_at

### Notes
- id, tx_id, case_id, body, author, created_at

### Audit Logs
- id, action, user_id, details, created_at

## API Endpoints

### Authentication
- POST /api/auth/login - Login
- POST /api/auth/users - Create user (Admin)
- GET /api/auth/users - List users (Admin)
- DELETE /api/auth/users/{id} - Delete user (Admin)
- POST /api/auth/users/{id}/reset-password - Reset password (Admin)
- POST /api/auth/change-password - Change own password

### Transactions
- GET /api/transactions/ - List transactions
- POST /api/transactions/ - Create transaction
- DELETE /api/transactions/{tx_id} - Delete transaction
- GET /api/transactions/export/csv - Export as CSV

### Cases
- GET /api/cases/ - List cases
- GET /api/cases/{id} - Get case details
- PATCH /api/cases/{id} - Update case

### Reports
- GET /api/reports/quick-stats - Quick statistics
- GET /api/reports/comprehensive - Full report
- GET /api/reports/export/csv - Export report as CSV

## Security Features
- Rate limiting (slowapi)
- Security headers middleware
- Password hashing (bcrypt)
- JWT token authentication
- CORS configuration

## Test Credentials
- Admin: username=`admin`, password=`Admin123!`
- Superadmin: username=`superadmin`, password=`SuperAdmin123!`

## Completed Features
- [x] Backend setup with PostgreSQL
- [x] JWT authentication system
- [x] Role-based access control
- [x] Transaction CRUD operations
- [x] Risk scoring algorithm
- [x] Automatic case creation
- [x] User management
- [x] Export CSV functionality
- [x] Clear transactions functionality
- [x] Reports with statistics
- [x] Theme toggle (Dark/Light mode)
- [x] Consistent UI across all pages

## Pages
1. **Dashboard** - KPIs, alerts, recent transactions
2. **Transactions** - Transaction list with search/filter
3. **Cases** - Case management
4. **Intelligence** - Network visualization (pending)
5. **Decision Assistant** - AI recommendations (pending)
6. **Pattern Explorer** - Pattern analysis (pending)
7. **Performance** - Analyst metrics (pending)
8. **Reports** - Analytics and reporting
9. **Admin** - User management
10. **SuperAdmin** - System settings

## Upcoming Tasks
- [ ] Intelligence page with Three.js visualization
- [ ] Decision Assistant with AI integration
- [ ] Pattern Explorer functionality
- [ ] Performance metrics page
- [ ] SLA timers on Cases page
- [ ] Enhanced reporting with charts
