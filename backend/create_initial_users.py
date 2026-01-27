#!/usr/bin/env python3
"""
Create initial admin and superadmin users
"""
from app.db.session import SessionLocal
from app.models.user import User
from app.security import get_password_hash

def create_initial_users():
    db = SessionLocal()
    
    try:
        # Check if users already exist
        from sqlalchemy import select
        existing = db.execute(select(User)).scalars().all()
        
        if existing:
            print(f"✓ {len(existing)} users already exist in database")
            for user in existing:
                print(f"  - {user.username} ({user.role})")
            return
        
        # Create superadmin
        superadmin = User(
            username="superadmin",
            email="superadmin@frauddetection.com",
            hashed_password=get_password_hash("SuperAdmin123!"),
            role="superadmin",
            is_active=True,
            must_change_password=False,  # Initial setup user
            created_by="system"
        )
        
        # Create admin
        admin = User(
            username="admin",
            email="admin@frauddetection.com",
            hashed_password=get_password_hash("Admin123!"),
            role="admin",
            is_active=True,
            must_change_password=False,  # Initial setup user
            created_by="system"
        )
        
        db.add(superadmin)
        db.add(admin)
        db.commit()
        
        print("✅ Initial users created successfully!")
        print("")
        print("=" * 60)
        print("INITIAL LOGIN CREDENTIALS")
        print("=" * 60)
        print("")
        print("SUPERADMIN:")
        print("  Username: superadmin")
        print("  Password: SuperAdmin123!")
        print("  Email: superadmin@frauddetection.com")
        print("")
        print("ADMIN:")
        print("  Username: admin")
        print("  Password: Admin123!")
        print("  Email: admin@frauddetection.com")
        print("")
        print("=" * 60)
        print("⚠️  IMPORTANT: Change these passwords after first login!")
        print("=" * 60)
        
    except Exception as e:
        print(f"❌ Error creating initial users: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    create_initial_users()
