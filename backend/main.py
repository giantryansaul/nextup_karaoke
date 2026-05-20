from __future__ import annotations

import asyncio
import json
import os
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

import session as store
from routes import queue, search, users
from routes import parties
from ws_manager import manager

load_dotenv()


async def _party_expiry_checker() -> None:
    while True:
        await asyncio.sleep(60)
        for code in store.get_active_party_codes():
            if not await store.party_exists(code):
                await manager.broadcast_event(code, "party_expired")
                store.evict_from_cache(code)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    await store.init_redis()
    task = asyncio.create_task(_party_expiry_checker())
    yield
    task.cancel()


app = FastAPI(title="NextUp Karaoke", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL", "*")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(parties.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(queue.router, prefix="/api")
app.include_router(search.router, prefix="/api")


@app.websocket("/ws/{party_code}")
async def websocket_endpoint(websocket: WebSocket, party_code: str) -> None:
    code = party_code.upper()
    state = await store.get_party_state(code)
    if state is None:
        await websocket.accept()
        await websocket.send_text(json.dumps({"type": "party_not_found"}))
        await websocket.close()
        return

    await manager.connect(websocket, code)
    await manager.send(websocket, state)
    try:
        while True:
            # Keep the connection alive; all mutations happen via REST
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, code)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
