from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import inspect, text

from app.db import get_db
from app.routes.auth import require_role
from app.schemas.user import UserOut

router = APIRouter(prefix="/api/database", tags=["database"])


@router.get("/schema")
async def get_database_schema(
    current_user: UserOut = Depends(require_role(["admin", "superadmin"])),
    db: Session = Depends(get_db)
):
    """
    Get complete database schema information
    Shows all tables, columns, types, constraints
    """
    inspector = inspect(db.bind)
    schema_info = {}
    
    for table_name in inspector.get_table_names():
        columns = []
        for column in inspector.get_columns(table_name):
            columns.append({
                "name": column["name"],
                "type": str(column["type"]),
                "nullable": column["nullable"],
                "default": str(column["default"]) if column["default"] else None,
                "primary_key": column.get("primary_key", False)
            })
        
        # Get foreign keys
        foreign_keys = []
        for fk in inspector.get_foreign_keys(table_name):
            foreign_keys.append({
                "constrained_columns": fk["constrained_columns"],
                "referred_table": fk["referred_table"],
                "referred_columns": fk["referred_columns"]
            })
        
        # Get indexes
        indexes = []
        for idx in inspector.get_indexes(table_name):
            indexes.append({
                "name": idx["name"],
                "columns": idx["column_names"],
                "unique": idx["unique"]
            })
        
        schema_info[table_name] = {
            "columns": columns,
            "foreign_keys": foreign_keys,
            "indexes": indexes
        }
    
    return schema_info


@router.get("/tables")
async def get_tables(
    current_user: UserOut = Depends(require_role(["admin", "superadmin"])),
    db: Session = Depends(get_db)
):
    """Get list of all tables with row counts"""
    inspector = inspect(db.bind)
    tables = []
    
    for table_name in inspector.get_table_names():
        # Get row count
        result = db.execute(text(f"SELECT COUNT(*) FROM {table_name}"))
        count = result.scalar()
        
        tables.append({
            "name": table_name,
            "row_count": count
        })
    
    return {"tables": tables}


@router.get("/tables/{table_name}")
async def get_table_details(
    table_name: str,
    current_user: UserOut = Depends(require_role(["admin", "superadmin"])),
    db: Session = Depends(get_db)
):
    """Get detailed information about a specific table"""
    inspector = inspect(db.bind)
    
    if table_name not in inspector.get_table_names():
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Table not found")
    
    # Get columns
    columns = inspector.get_columns(table_name)
    
    # Get primary keys
    pk = inspector.get_pk_constraint(table_name)
    
    # Get foreign keys
    fks = inspector.get_foreign_keys(table_name)
    
    # Get indexes
    indexes = inspector.get_indexes(table_name)
    
    # Get row count
    result = db.execute(text(f"SELECT COUNT(*) FROM {table_name}"))
    row_count = result.scalar()
    
    # Get sample data (first 5 rows)
    result = db.execute(text(f"SELECT * FROM {table_name} LIMIT 5"))
    sample_data = [dict(row._mapping) for row in result]
    
    return {
        "table_name": table_name,
        "row_count": row_count,
        "columns": columns,
        "primary_key": pk,
        "foreign_keys": fks,
        "indexes": indexes,
        "sample_data": sample_data
    }
