from fastapi import FastAPI

from app.api.routes.recommendations import router as recommendations_router


app = FastAPI(
    title="CarMatch KZ API",
    description=(
        "Car recommendation service for the "
        "Kazakhstan used-car market."
    ),
    version="0.1.0",
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