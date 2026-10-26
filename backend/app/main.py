import os

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.api.routes.recommendations import (
    router as recommendations_router,
)


app = FastAPI(
    title="CarMatch KZ API",
    description="Car recommendation service for Kazakhstan",
    version="0.1.0",
)

default_origins = (
    "http://localhost:5173,"
    "http://127.0.0.1:5173"
)

cors_origins = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS",
        default_origins,
    ).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

app.include_router(recommendations_router)


@app.get("/", tags=["General"])
def read_root():
    return {
        "message": "Welcome to CarMatch KZ API",
        "version": "0.1.0",
        "docs": "/docs",
    }


@app.get("/health", tags=["Health"])
def health_check():
    return {
        "status": "ok",
        "service": "carmatch-kz-api",
    }


@app.get("/ready", tags=["Health"])
def readiness_check(db: Session = Depends(get_db)):
    """Confirm the API can reach its database and serve requests."""

    try:
        db.execute(text("SELECT 1"))
    except SQLAlchemyError as error:
        raise HTTPException(
            status_code=503,
            detail="Database is unavailable",
        ) from error

    return {
        "status": "ready",
        "database": "ok",
    }
