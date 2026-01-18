from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func

from app.db import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    action = Column(String, nullable=False)
    meta = Column(JSONB, nullable=True)

    # ✅ required by your insert returning clause
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
