# GP-Interface: AI-Powered Fraud Detection System

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/)
[![React](https://img.shields.io/badge/react-18.0+-61dafb.svg)](https://reactjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109+-009688.svg)](https://fastapi.tiangolo.com/)

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [System Architecture](#system-architecture)
- [Technology Stack](#technology-stack)
- [Installation](#installation)
- [Usage](#usage)
- [User Roles & Permissions](#user-roles--permissions)
- [API Documentation](#api-documentation)
- [Database Schema](#database-schema)
- [Security Features](#security-features)
- [Screenshots](#screenshots)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)

---

## 🎯 Overview

**GP-Interface** is an advanced AI-powered fraud detection and prevention platform developed as a graduation project at Abu Dhabi Polytechnic. The system provides real-time transaction monitoring, risk assessment, case management, and comprehensive reporting capabilities for financial institutions.

### Key Highlights

- **Real-time Monitoring**: Live transaction streaming with instant fraud detection
- **AI-Powered Risk Scoring**: Intelligent risk assessment algorithms
- **Role-Based Access Control**: Multi-level user permissions (Analyst, Admin, Superadmin)
- **Interactive Dashboards**: Beautiful visualizations and real-time charts
- **Case Management**: Complete workflow for fraud investigation
- **Comprehensive Reporting**: Detailed analytics with CSV export capabilities
- **Audit Logging**: Full trail of all system activities

---

## ✨ Features

### 🔍 Real-Time Transaction Monitoring

- **Live Transaction Stream**: Automatic generation and monitoring of transactions
- **Risk Visualization**: Color-coded risk indicators (Low, Medium, High)
- **Real-Time Chart**: Interactive graph showing fraud patterns and trends
- **Transaction Details**: Comprehensive view of all transaction attributes
- **Search & Filter**: Advanced filtering by risk level, merchant, country, etc.

### 📊 Advanced Analytics

- **Comprehensive Reports**: Detailed fraud detection analytics
- **Geographic Analysis**: Transaction patterns by country
- **Risk Distribution**: Visual breakdown of risk levels
- **Time Series Analysis**: Trend analysis over different time periods
- **Export Capabilities**: CSV export for further analysis (Admin only)

### 🎫 Case Management System

- **Automated Case Creation**: Cases generated for high-risk transactions
- **Investigation Workflow**: Track cases from creation to resolution
- **Status Management**: New, In Progress, Resolved, Closed
- **Notes System**: Add investigation notes and updates
- **Priority Levels**: Categorize cases by urgency
- **Assignment Tracking**: Monitor who's handling each case

### 👥 User Management

- **Role-Based Access**: Three-tier permission system
- **User Creation**: Admins can create new users with temporary passwords
- **Password Management**: Forced password change on first login
- **Activity Tracking**: Monitor user actions and login history
- **Account Management**: Enable/disable user accounts

### 🔐 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt encryption for password storage
- **Rate Limiting**: Protection against brute force attacks
- **CORS Protection**: Configured cross-origin resource sharing
- **Audit Logging**: Complete audit trail of all actions
- **Session Management**: Secure session handling

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                            │
│                    (React + Vite)                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │Dashboard │  │Transactions│ │  Cases   │  │ Reports  │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                    HTTPS/REST API
                            │
┌─────────────────────────────────────────────────────────────┐
│                         Backend                             │
│                    (FastAPI + Python)                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │   Auth   │  │   Fraud  │  │   Case   │  │ Reports  │  │
│  │ Service  │  │ Detection│  │Management│  │ Service  │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                    Database Connection
                            │
┌─────────────────────────────────────────────────────────────┐
│                    PostgreSQL Database                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │  Users   │  │Transactions│ │  Cases   │  │  Audit   │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Technology Stack

### Frontend
- **Framework**: React 18.3+
- **Build Tool**: Vite 7.x
- **Styling**: Tailwind CSS 3.x
- **Routing**: React Router 7.x
- **State Management**: React Hooks
- **HTTP Client**: Fetch API
- **Icons**: Lucide React

### Backend
- **Framework**: FastAPI 0.109+
- **Language**: Python 3.11+
- **ORM**: SQLAlchemy 2.x
- **Authentication**: JWT (PyJWT)
- **Password Hashing**: bcrypt
- **Migration**: Alembic
- **Rate Limiting**: SlowAPI
- **CORS**: FastAPI CORS middleware

### Database
- **Primary Database**: PostgreSQL 16+
- **Container**: Docker
- **Connection Pooling**: SQLAlchemy Engine

### DevOps & Tools
- **Containerization**: Docker & Docker Compose
- **Version Control**: Git
- **Package Manager**: npm (frontend), pip (backend)
- **Development Server**: Uvicorn (ASGI)

---

## 📦 Installation

### Prerequisites

- **Python**: 3.11 or higher
- **Node.js**: 18 or higher
- **Docker**: Latest version
- **Git**: Latest version
- **PostgreSQL**: 16+ (via Docker)

### Step 1: Clone the Repository

```bash
git clone https://github.com/rjneibi/GP-Interface.git
cd GP-Interface
git checkout emergent-v2
```

### Step 2: Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Additional required packages
pip install bcrypt --break-system-packages
pip install email-validator --break-system-packages
```

### Step 3: Database Setup

```bash
# Start PostgreSQL container
docker-compose up -d

# Wait for database to be ready (about 10 seconds)
# Then run migrations
alembic upgrade head

# Fix database schema (if needed)
docker exec -it fraud-db psql -U fraud -d frauddb -c "ALTER TABLE users ALTER COLUMN created_by TYPE VARCHAR(255);"

# Create initial users
python fix_users.py
```

**Default Users Created:**
- **Superadmin**: `superadmin` / `SuperAdmin123!`
- **Admin**: `admin` / `Admin123!`
- **Analyst**: `analyst` / `analyst123`

### Step 4: Frontend Setup

```bash
# Open new terminal and navigate to frontend
cd frontend

# Install dependencies
npm install

# Create .env file
echo "VITE_API_BASE=http://localhost:8000" > .env
```

### Step 5: Configuration

**Backend Environment Variables** (create `backend/.env`):
```env
DATABASE_URL=postgresql://fraud:fraud@localhost:5432/frauddb
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

**Frontend Environment Variables** (`frontend/.env`):
```env
VITE_API_BASE=http://localhost:8000
```

---

## 🚀 Usage

### Starting the Application

#### Terminal 1: Backend Server

```bash
cd backend

# Set environment variables (Windows PowerShell)
$env:DATABASE_URL = "postgresql://fraud:fraud@localhost:5432/frauddb"
$env:PYTHONPATH = "."

# Start FastAPI server
uvicorn app.main:app --reload
```

Backend will run on: **http://localhost:8000**

#### Terminal 2: Frontend Server

```bash
cd frontend

# Start Vite dev server
npm run dev
```

Frontend will run on: **http://localhost:3000**

### Accessing the Application

1. Open your browser and go to: **http://localhost:3000**
2. Login with one of the default user accounts
3. Start exploring the fraud detection system!

### Daily Startup Routine

```bash
# Start database
cd backend
docker-compose up -d

# Start backend (Terminal 1)
cd backend
$env:DATABASE_URL = "postgresql://fraud:fraud@localhost:5432/frauddb"
$env:PYTHONPATH = "."
uvicorn app.main:app --reload

# Start frontend (Terminal 2)
cd frontend
npm run dev
```

### Stopping the Application

```bash
# Stop backend: Ctrl+C in backend terminal
# Stop frontend: Ctrl+C in frontend terminal
# Stop database:
cd backend
docker-compose down
```

---

## 👤 User Roles & Permissions

### Analyst (Base Role)
- ✅ View dashboard and statistics
- ✅ View all transactions
- ✅ Create and manage cases
- ✅ Add investigation notes
- ✅ Generate reports (view only)
- ❌ Cannot export CSV reports
- ❌ Cannot create users
- ❌ Cannot modify system settings

### Admin
- ✅ All Analyst permissions
- ✅ Export reports as CSV
- ✅ Create and manage users
- ✅ View audit logs
- ✅ Assign cases to analysts
- ❌ Cannot delete users
- ❌ Cannot access super admin features

### Superadmin (Full Access)
- ✅ All Admin permissions
- ✅ Delete users
- ✅ Access system configuration
- ✅ View complete audit trails
- ✅ Override all permissions
- ✅ System-wide settings management

---

## 📚 API Documentation

### Base URL
```
http://localhost:8000
```

### Interactive API Docs
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### Main Endpoints

#### Authentication
```
POST   /api/auth/login              - User login
POST   /api/auth/change-password    - Change password
GET    /api/auth/me                 - Get current user
GET    /api/auth/users              - List all users (Admin+)
POST   /api/auth/users              - Create user (Admin+)
DELETE /api/auth/users/{id}         - Delete user (Superadmin)
```

#### Transactions
```
GET    /api/transactions/           - List transactions
POST   /api/transactions/           - Create transaction
GET    /api/transactions/{id}       - Get transaction details
DELETE /api/transactions/{id}       - Delete transaction
GET    /api/transactions/export/csv - Export transactions (Analyst+)
```

#### Cases
```
GET    /api/cases/                  - List cases
POST   /api/cases/                  - Create case
GET    /api/cases/{id}              - Get case details
PUT    /api/cases/{id}              - Update case
DELETE /api/cases/{id}              - Delete case
POST   /api/cases/{id}/notes        - Add case note
```

#### Reports
```
GET    /api/reports/comprehensive   - Generate comprehensive report
GET    /api/reports/quick-stats     - Get quick statistics
GET    /api/reports/export/csv      - Export report as CSV (Admin+)
```

#### Audit
```
GET    /api/audit/                  - Get audit logs (Admin+)
```

---

## 🗄️ Database Schema

### Users Table
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    must_change_password BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE,
    created_by VARCHAR(255)
);
```

### Transactions Table
```sql
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    tx_id VARCHAR(100) UNIQUE NOT NULL,
    user VARCHAR(100) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    country VARCHAR(50),
    merchant VARCHAR(100),
    channel VARCHAR(50),
    device VARCHAR(50),
    card_type VARCHAR(50),
    risk INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ts TIMESTAMP WITH TIME ZONE
);
```

### Cases Table
```sql
CREATE TABLE cases (
    id SERIAL PRIMARY KEY,
    case_id VARCHAR(100) UNIQUE NOT NULL,
    tx_id VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'new',
    priority VARCHAR(50) DEFAULT 'medium',
    assigned_to VARCHAR(100),
    resolution_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_by VARCHAR(100)
);
```

### Audit Logs Table
```sql
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    action VARCHAR(100) NOT NULL,
    user_id INTEGER,
    meta JSONB,
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 🔒 Security Features

### Authentication & Authorization
- **JWT Tokens**: Secure, stateless authentication
- **Password Hashing**: bcrypt with salt rounds
- **Role-Based Access Control (RBAC)**: Three-tier permission system
- **Token Expiration**: 30-minute token lifetime
- **Refresh Mechanism**: Automatic token refresh

### API Security
- **CORS Protection**: Configured allowed origins
- **Rate Limiting**: 100 requests per minute per IP
- **SQL Injection Prevention**: Parameterized queries via SQLAlchemy
- **XSS Protection**: Input sanitization
- **HTTPS Ready**: Supports SSL/TLS encryption

### Data Security
- **Password Requirements**: Minimum 8 characters with complexity
- **Encrypted Storage**: All passwords hashed with bcrypt
- **Audit Trails**: Complete logging of all actions
- **Session Management**: Secure session handling
- **Data Validation**: Pydantic models for input validation

### Security Best Practices
- Environment variables for sensitive data
- No hardcoded credentials
- Secure headers configuration
- Regular dependency updates
- Input validation on all endpoints

---

## 📸 Screenshots

### Dashboard
*Real-time overview of fraud detection metrics and recent activity*

### Transactions Page
*Live transaction monitoring with real-time fraud detection chart*

### Cases Management
*Complete case workflow from creation to resolution*

### Reports
*Comprehensive analytics and exportable reports*

### User Management
*Admin panel for user creation and role assignment*

---

## 📁 Project Structure

```
GP-Interface/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                 # FastAPI application entry
│   │   ├── db.py                   # Database configuration
│   │   ├── security.py             # Authentication & security
│   │   ├── models/                 # SQLAlchemy models
│   │   │   ├── user.py
│   │   │   ├── transaction.py
│   │   │   ├── case.py
│   │   │   ├── audit.py
│   │   │   └── note.py
│   │   ├── schemas/                # Pydantic schemas
│   │   │   ├── user.py
│   │   │   ├── transaction.py
│   │   │   ├── cases.py
│   │   │   └── reports.py
│   │   ├── routes/                 # API endpoints
│   │   │   ├── auth.py
│   │   │   ├── transactions.py
│   │   │   ├── cases.py
│   │   │   ├── reports.py
│   │   │   └── audit.py
│   │   ├── crud/                   # Database operations
│   │   │   ├── users.py
│   │   │   ├── transactions.py
│   │   │   ├── cases.py
│   │   │   └── reports.py
│   │   └── middleware/             # Custom middleware
│   │       └── security_middleware.py
│   ├── alembic/                    # Database migrations
│   │   ├── versions/
│   │   └── env.py
│   ├── docker-compose.yml          # PostgreSQL container
│   ├── requirements.txt            # Python dependencies
│   └── fix_users.py               # User creation script
│
├── frontend/
│   ├── src/
│   │   ├── main.jsx               # React entry point
│   │   ├── App.jsx                # Root component
│   │   ├── pages/                 # Page components
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Transactions.jsx
│   │   │   ├── Cases.jsx
│   │   │   ├── CaseDetails.jsx
│   │   │   ├── Reports.jsx
│   │   │   ├── Admin.jsx
│   │   │   ├── SuperAdmin.jsx
│   │   │   └── Login.jsx
│   │   ├── components/            # Reusable components
│   │   │   ├── RealTimeTransactionChart.jsx
│   │   │   └── ErrorBoundary.jsx
│   │   ├── layout/                # Layout components
│   │   │   └── AppLayout.jsx
│   │   ├── auth/                  # Authentication
│   │   │   ├── session.js
│   │   │   ├── ProtectedRoute.jsx
│   │   │   └── RequireRole.jsx
│   │   ├── services/              # API services
│   │   │   ├── apiClient.js
│   │   │   └── caseApi.js
│   │   └── utils/                 # Utilities
│   │       └── security.js
│   ├── public/                    # Static assets
│   ├── index.html                 # HTML template
│   ├── package.json               # npm dependencies
│   ├── vite.config.js            # Vite configuration
│   ├── tailwind.config.js        # Tailwind CSS config
│   └── .env                       # Environment variables
│
├── .gitignore
├── README.md
└── LICENSE
```

---

## 🧪 Testing

### Backend Testing
```bash
cd backend
pytest tests/
```

### Frontend Testing
```bash
cd frontend
npm test
```

### Manual Testing
1. **Authentication**: Test all three user roles
2. **Transactions**: Create, view, search, filter, delete
3. **Cases**: Create from high-risk transactions, update status
4. **Reports**: Generate various reports, test CSV export
5. **User Management**: Create/edit/delete users (as admin)

---

## 🐛 Troubleshooting

### Common Issues

#### Database Connection Error
```bash
# Restart PostgreSQL container
docker-compose down
docker-compose up -d
```

#### Port Already in Use
```bash
# Backend (8000)
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Frontend (3000)
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

#### Missing Dependencies
```bash
# Backend
pip install -r requirements.txt
pip install bcrypt email-validator --break-system-packages

# Frontend
cd frontend
npm install
```

#### Migration Issues
```bash
# Reset database
docker exec -it fraud-db psql -U fraud -d postgres -c "DROP DATABASE frauddb;"
docker exec -it fraud-db psql -U fraud -d postgres -c "CREATE DATABASE frauddb;"
alembic upgrade head
```

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Coding Standards
- **Python**: Follow PEP 8
- **JavaScript**: Follow ESLint configuration
- **Commits**: Use conventional commit messages
- **Documentation**: Update README for new features

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👨‍🎓 Project Information

**Institution**: Abu Dhabi Polytechnic  
**Program**: Information Security Engineering Technology  
**Project Type**: Graduation Project (GP)  
**Academic Year**: 2025-2026  

### Project Team
- **Developer**: Rashed Al Jneibi
- **GitHub**: [@rjneibi](https://github.com/rjneibi)

### Acknowledgments
- Abu Dhabi Polytechnic faculty for guidance and support
- Open-source community for excellent tools and libraries
- Project supervisor for valuable feedback

---

## 📞 Contact

**Rashed Al Jneibi**  
- GitHub: [@rjneibi](https://github.com/rjneibi)
- Project Repository: [GP-Interface](https://github.com/rjneibi/GP-Interface)

---

## 🔮 Future Enhancements

- [ ] Machine Learning model integration for fraud prediction
- [ ] Email notifications for high-risk transactions
- [ ] Advanced analytics with ML insights
- [ ] Mobile application (iOS/Android)
- [ ] Multi-language support
- [ ] Enhanced dashboard with more visualizations
- [ ] Integration with external fraud databases
- [ ] Automated report scheduling
- [ ] Two-factor authentication (2FA)
- [ ] Advanced user permissions customization

---

## ⭐ Star History

If you find this project helpful, please consider giving it a star! ⭐

---

**Abu Dhabi Polytechnic Graduation Project**
