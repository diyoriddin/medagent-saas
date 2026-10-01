#!/usr/bin/env python3
"""
MedAgent SaaS - Production-Ready Medical Booking System
Main FastAPI Application Entry Point
"""

import logging
import os
import redis.asyncio as redis
from contextlib import asynccontextmanager
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app.prisma_client import get_prisma, close_prisma

# Load environment variables
load_dotenv()

# ===== LOGGING SETUP =====
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# ===== CONFIG =====
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
DEBUG = os.getenv("DEBUG", "false").lower() == "true"
API_VERSION = os.getenv("API_VERSION", "v1")
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/medagent_db")
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:3001").split(",")

if not os.getenv("DATABASE_URL"):
    logger.warning("⚠️ DATABASE_URL not explicitly set, using default connection string")

# ===== LIFESPAN MANAGEMENT =====

# Global Redis client
redis_client: redis.Redis = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """App startup and shutdown logic"""
    global redis_client
    logger.info(f"🚀 MedAgent SaaS Starting (Environment: {ENVIRONMENT})")
    
    # Initialize Prisma client
    try:
        await get_prisma()
        logger.info("✅ Prisma client connected")
    except Exception as e:
        logger.error(f"❌ Failed to connect Prisma: {e}")
        raise
    
    # Initialize Redis client
    try:
        redis_client = redis.from_url(REDIS_URL, encoding="utf-8", decode_responses=True)
        await redis_client.ping()
        logger.info("✅ Redis client connected")
    except Exception as e:
        logger.warning(f"⚠️ Redis connection failed (continuing without Redis): {e}")
        redis_client = None
    
    yield
    
    logger.info("🛑 MedAgent SaaS Shutting down...")
    # Close Prisma connection
    await close_prisma()
    logger.info("✅ Prisma client disconnected")
    
    # Close Redis connection
    if redis_client:
        await redis_client.close()
        logger.info("✅ Redis client disconnected")

# ===== FASTAPI APP INITIALIZATION =====

app = FastAPI(
    title="MedAgent SaaS API",
    description="Production-Ready Medical Clinic Booking System with AI",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url=f"/api/openapi.json",
    lifespan=lifespan
)

# ===== MIDDLEWARE SETUP =====

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Trusted Host Middleware (Security)
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["localhost", "127.0.0.1"] if DEBUG else ["yourdomain.com"]
)

# ===== MODELS =====

class HealthResponse(BaseModel):
    status: str
    environment: str
    version: str

class ErrorResponse(BaseModel):
    detail: str
    code: Optional[str] = None

# ===== HEALTH CHECK =====

@app.get("/health", response_model=HealthResponse, tags=["System"])
async def health_check():
    """System health check endpoint"""
    return {
        "status": "healthy",
        "environment": ENVIRONMENT,
        "version": "1.0.0"
    }

# ===== ERROR HANDLERS =====

@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "detail": exc.detail,
            "code": "HTTP_ERROR"
        }
    )

# ===== API ROUTES PLACEHOLDER =====

@app.get(f"/api/{API_VERSION}/", tags=["Root"])
async def root():
    """API Root endpoint"""
    return {
        "message": "Welcome to MedAgent SaaS API",
        "version": API_VERSION,
        "docs": "/api/docs"
    }

# Import and include routers
from app.routes import auth, doctors, appointments, telegram_webhook, admin

# --- Auth Routes ---
app.include_router(auth.router, prefix=f"/api/{API_VERSION}/auth", tags=["Auth"])

# --- Doctor Routes ---
app.include_router(doctors.router, prefix=f"/api/{API_VERSION}/doctors", tags=["Doctors"])

# --- Appointment Routes (Slot hold, Booking, Status) ---
app.include_router(appointments.router, prefix=f"/api/{API_VERSION}/appointments", tags=["Appointments"])

# --- Telegram Webhook Router (AI Function Calling) ---
app.include_router(telegram_webhook.router, prefix=f"/api/{API_VERSION}/tg", tags=["Telegram Webhook"])

# --- Admin Dashboard Routes (Live Queue, No-Show, Takeover) ---
app.include_router(admin.router, prefix=f"/api/{API_VERSION}/admin", tags=["Admin Dashboard"])

# ===== STARTUP MESSAGES =====

@app.on_event("startup")
async def startup_event():
    logger.info("✅ FastAPI Application Started")
    logger.info(f"📚 API Documentation: http://localhost:8000/api/docs")
    logger.info(f"🔒 Environment: {ENVIRONMENT}")

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("❌ FastAPI Application Stopped")

# ===== RUN COMMAND =====

if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=DEBUG,
        log_level="info" if not DEBUG else "debug"
    )
