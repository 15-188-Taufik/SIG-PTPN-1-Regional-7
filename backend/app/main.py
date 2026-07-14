from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from contextlib import asynccontextmanager
from app.config import settings
from app.routers import auth, kebun
from app.routers.kebun import GeoJSONFallback


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Preload fallback GeoJSON data on startup to eliminate first-request latency
    GeoJSONFallback.load_all()
    yield


app = FastAPI(
    title="SIG PTPN API",
    description="Sistem Informasi Geografis Kebun PTPN Regional 7 Lampung",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_cors_origins(),
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000)

app.include_router(auth.router, prefix="/api")
app.include_router(kebun.router, prefix="/api")


@app.get("/", tags=["Root"])
def root():
    return {"message": "SIG PTPN API berjalan", "docs": "/docs"}


@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "ok", "service": "SIG PTPN API", "version": "1.0.0"}
