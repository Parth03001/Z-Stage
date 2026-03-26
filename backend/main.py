import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config.config import get_settings
from app.connectors.state_db_manager import StateDBManager
from routers import layouts, station_boxes, bypass_icons, connections, input_records

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

settings = get_settings()

# ── Database initialisation ───────────────────────────────────────────────────

db_manager = StateDBManager()
db_manager.initialize_database()
db_manager.create_tables_if_not_exists()

# ── FastAPI app ───────────────────────────────────────────────────────────────

app = FastAPI(
    title="Z-Stage API",
    description="Backend API for Z-Stage layout builder and dashboard",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(layouts.router)
app.include_router(station_boxes.router)
app.include_router(bypass_icons.router)
app.include_router(connections.router)
app.include_router(input_records.router)


@app.get("/health", tags=["health"])
def health_check():
    return {"status": "ok", "database": settings.POSTGRES_DB}
