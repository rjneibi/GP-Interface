

# GP-Interface

**AI-Based Fraud Detection & Explainability Platform**

A full-stack fraud detection system combining a modern React dashboard with a FastAPI backend, PostgreSQL database, and explainable AI concepts.
Designed as an academic Graduation Project (GP), focusing on **risk scoring, explainability, auditability, and role-based access control**.

---

## 🚀 Project Overview

GP-Interface is an end-to-end fraud monitoring platform that simulates and analyzes financial transactions in real time.
It demonstrates how AI-driven risk scoring can be combined with **human-readable explanations**, **audit logs**, and **admin governance**.

The system is split into:

* **Frontend**: React + Vite + TailwindCSS
* **Backend**: FastAPI + SQLAlchemy
* **Database**: PostgreSQL (Dockerized)
* **Explainability**: Rule-based + feature-level reasoning (SHAP-ready design)
* **Audit & Governance**: Persistent audit logs and admin actions

---

## 🧠 Key Features

### 🔐 Authentication & Roles

* Login simulation with role-based access:

  * `analyst`
  * `admin`
  * `superadmin`
* UI adapts dynamically based on role

### 💳 Transactions

* Create and view transactions
* Persistent storage in PostgreSQL
* Unique transaction IDs enforced at DB level
* Real-time risk classification:

  * **GREEN** – Low risk
  * **ORANGE** – Medium risk (Review)
  * **RED** – High risk (Block)

### 📊 Risk Scoring & Explainability

* Risk score (0–100)
* Human-readable reasons:

  * High amount
  * Foreign country
  * New device
  * High velocity
* Designed to be easily replaced with a real ML model (e.g., SHAP / XGBoost)

### 📝 Notes System

* Analysts can attach notes to transactions
* Notes stored and linked to transaction IDs
* Supports investigation workflows

### 🧾 Audit Logs

* Automatic audit trail for:

  * Transaction creation
  * Admin actions
  * System events
* Immutable log records with timestamps

### 🛠 Admin Panel

* User management
* Threshold configuration
* View system-wide audit logs
* Persistent admin state

---

## 🏗 System Architecture

```
GP-Interface/
├── frontend/              # React (Vite + Tailwind)
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── services/
│   │   └── layouts/
│   └── package.json
│
├── backend/               # FastAPI backend
│   ├── app/
│   │   ├── main.py
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── routes/
│   │   ├── crud/
│   │   └── db/
│   ├── alembic/
│   ├── docker-compose.yml
│   └── requirements.txt
│
└── README.md
```

---

## 🧰 Tech Stack

### Frontend

* React (Vite)
* TailwindCSS
* React Router
* Local state persistence (localStorage)

### Backend

* FastAPI
* SQLAlchemy ORM
* Alembic migrations
* Pydantic schemas
* Uvicorn ASGI server

### Database

* PostgreSQL 15
* Docker & Docker Compose

---

## 🐳 Backend Setup (Docker + FastAPI)

### 1️⃣ Start PostgreSQL

```bash
cd backend
docker compose up -d
```

### 2️⃣ Install Python dependencies

```bash
pip install -r requirements.txt
```

### 3️⃣ Run migrations

```bash
python -m alembic upgrade head
```

### 4️⃣ Start backend server

```bash
uvicorn app.main:app --reload
```

* API: `http://127.0.0.1:8000`
* Docs: `http://127.0.0.1:8000/docs`

---

## 🌐 Frontend Setup (React)

```bash
cd frontend
npm install
npm run dev
```

* Frontend: `http://localhost:5173`

---

## 🔄 Frontend ↔ Backend Integration

* Frontend calls:

  * `/api/transactions`
  * `/api/notes`
  * `/api/audit`
* CORS configured for Vite dev server
* Transactions and audits persist across reloads

---

## 🧪 Example Transaction Flow

1. Analyst creates a transaction
2. Backend:

   * Stores transaction
   * Computes risk score
   * Generates explanation
   * Writes audit log
3. Frontend:

   * Displays badge (GREEN / ORANGE / RED)
   * Shows reasons and actions
4. Admin:

   * Reviews audit logs
   * Adjusts thresholds if needed

---

## 🔮 Future Enhancements

* Real ML model integration (XGBoost + SHAP)
* JWT authentication
* Real-time streaming (Kafka / WebSockets)
* Advanced dashboards & charts
* Model drift detection

---

## 👨‍🎓 Academic Context

This project was developed as part of a **Graduation Project (GP)**, focusing on:

* Explainable AI (XAI)
* Secure system design
* Auditability and compliance
* Full-stack integration

---

## 📄 License

This project is for **academic and educational purposes**.


