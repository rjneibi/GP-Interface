from passlib.context import CryptContext
from sqlalchemy import create_engine, text

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
engine = create_engine("postgresql://fraud:fraud@localhost:5432/frauddb")

with engine.connect() as conn:
    conn.execute(text("DELETE FROM users"))
    
    users = [
        ("superadmin", "superadmin@fraud.com", pwd_context.hash("SuperAdmin123!"), "superadmin"),
        ("admin", "admin@fraud.com", pwd_context.hash("Admin123!"), "admin"),
        ("analyst", "analyst@fraud.com", pwd_context.hash("analyst123"), "analyst"),
    ]
    
    for username, email, hashed_pw, role in users:
        conn.execute(
            text("INSERT INTO users (username, email, hashed_password, role, is_active) VALUES (:u, :e, :p, :r, true)"),
            {"u": username, "e": email, "p": hashed_pw, "r": role}
        )
    conn.commit()
    print("✅ Users created with correct passwords!")