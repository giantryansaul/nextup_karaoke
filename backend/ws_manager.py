from __future__ import annotations

import json
from fastapi import WebSocket
from models import SessionState


class ConnectionManager:
    def __init__(self) -> None:
        self.active: list[WebSocket] = []

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        self.active.append(ws)

    def disconnect(self, ws: WebSocket) -> None:
        self.active = [c for c in self.active if c is not ws]

    async def broadcast(self, state: SessionState) -> None:
        payload = json.dumps({"type": "state_update", "data": state.model_dump()})
        dead: list[WebSocket] = []
        for ws in self.active:
            try:
                await ws.send_text(payload)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)

    async def send(self, ws: WebSocket, state: SessionState) -> None:
        payload = json.dumps({"type": "state_update", "data": state.model_dump()})
        await ws.send_text(payload)


manager = ConnectionManager()
