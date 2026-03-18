from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import engine
import models
from routers import layouts, station_boxes, bypass_icons

# Create tables on startup
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Z-Stage API",
    description="Backend API for Z-Stage layout builder and dashboard",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(layouts.router)
app.include_router(station_boxes.router)
app.include_router(bypass_icons.router)


@app.get("/health")
def health_check():
    return {"status": "ok"}
