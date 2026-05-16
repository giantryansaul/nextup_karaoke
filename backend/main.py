from __future__ import annotations

import json
import os
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

import session as store
from routes import queue, search, users
from ws_manager import manager

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    await store.init_redis()
    yield


app = FastAPI(title="NextUp Karaoke", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL", "*")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router, prefix="/api")
app.include_router(queue.router, prefix="/api")
app.include_router(search.router, prefix="/api")


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    await manager.connect(websocket)
    # Send the current state immediately so newly connected clients are in sync
    await manager.send(websocket, store.get_state())
    try:
        while True:
            # Keep the connection alive; all mutations happen via REST
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
