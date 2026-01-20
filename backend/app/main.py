from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import transactions, notes, audit, cases

app = FastAPI(title="GP-Interface API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # MVP
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(transactions.router)
app.include_router(notes.router)
app.include_router(audit.router)
app.include_router(cases.router)


@app.get("/health")
def health():
    return {"status": "ok"}
