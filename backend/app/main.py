import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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