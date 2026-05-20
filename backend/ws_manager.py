from __future__ import annotations

import json
from fastapi import WebSocket
from models import SessionState


class ConnectionManager:
    def __init__(self) -> None:
        self.party_connections: dict[str, list[WebSocket]] = {}

    async def connect(self, ws: WebSocket, party_code: str) -> None:
        await ws.accept()
        self.party_connections.setdefault(party_code, []).append(ws)

    def disconnect(self, ws: WebSocket, party_code: str) -> None:
        conns = self.party_connections.get(party_code, [])
        self.party_connections[party_code] = [c for c in conns if c is not ws]

    async def broadcast(self, party_code: str, state: SessionState) -> None:
        payload = json.dumps({"type": "state_update", "data": state.model_dump()})
        await self._send_to_party(party_code, payload)

    async def broadcast_event(self, party_code: str, event_type: str) -> None:
        payload = json.dumps({"type": event_type})
        await self._send_to_party(party_code, payload)

    async def _send_to_party(self, party_code: str, payload: str) -> None:
        conns = self.party_connections.get(party_code, [])
        dead: list[WebSocket] = []
        for ws in conns:
            try:
                await ws.send_text(payload)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws, party_code)

    async def send(self, ws: WebSocket, state: SessionState) -> None:
        payload = json.dumps({"type": "state_update", "data": state.model_dump()})
        await ws.send_text(payload)


manager = ConnectionManager()
