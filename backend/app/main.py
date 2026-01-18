from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import transactions, notes, audit

app = FastAPI(title="Fraud GP API", version="1.0")

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"status": "ok"}

app.include_router(transactions.router, prefix="/api/transactions", tags=["transactions"])
app.include_router(notes.router, prefix="/api/notes", tags=["notes"])
app.include_router(audit.router, prefix="/api/audit", tags=["audit"])
