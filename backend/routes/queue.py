from __future__ import annotations

from fastapi import APIRouter, HTTPException
from fastapi import Response

import session as store
from models import AddQueueItemRequest, MoveQueueItemRequest, QueueItem, SessionState, SetPausedRequest
from ws_manager import manager

router = APIRouter(tags=["queue"])


@router.get("/parties/{code}/queue", response_model=SessionState)
async def get_queue(code: str) -> SessionState:
    code = code.upper()
    state = await store.get_party_state(code)
    if state is None:
        raise HTTPException(status_code=404, detail="Party not found")
    return state


# Fixed-path routes must be registered BEFORE /queue/{item_id} routes

@router.post("/parties/{code}/queue/advance", response_model=SessionState)
async def advance_queue(code: str) -> SessionState:
    code = code.upper()
    if not await store.party_exists(code):
        raise HTTPException(status_code=404, detail="Party not found")
    updated = await store.advance_queue(code)
    await manager.broadcast(code, updated)
    return updated


@router.post("/parties/{code}/queue/restart", response_model=SessionState)
async def restart_track(code: str) -> SessionState:
    code = code.upper()
    if not await store.party_exists(code):
        raise HTTPException(status_code=404, detail="Party not found")
    updated = await store.restart_track(code)
    await manager.broadcast(code, updated)
    return updated


@router.post("/parties/{code}/queue/pause", response_model=SessionState)
async def set_paused(code: str, body: SetPausedRequest) -> SessionState:
    code = code.upper()
    if not await store.party_exists(code):
        raise HTTPException(status_code=404, detail="Party not found")
    updated = await store.set_paused(code, body.paused)
    await manager.broadcast(code, updated)
    return updated


@router.delete("/parties/{code}/queue", response_model=SessionState)
async def clear_queue(code: str) -> SessionState:
    code = code.upper()
    if not await store.party_exists(code):
        raise HTTPException(status_code=404, detail="Party not found")
    updated = await store.clear_queue(code)
    await manager.broadcast(code, updated)
    return updated


@router.post("/parties/{code}/queue", response_model=SessionState, status_code=201)
async def add_to_queue(code: str, body: AddQueueItemRequest) -> SessionState:
    code = code.upper()
    state = await store.get_party_state(code)
    if state is None:
        raise HTTPException(status_code=404, detail="Party not found")
    if body.user_id not in state.users:
        raise HTTPException(status_code=404, detail="User not found")
    user = state.users[body.user_id]
    item = QueueItem(
        video_id=body.video_id,
        title=body.title,
        channel=body.channel,
        thumbnail=body.thumbnail,
        added_by_id=user.id,
        added_by_name=user.name,
        added_by_color=user.color,
    )
    updated = await store.add_queue_item(code, item)
    await manager.broadcast(code, updated)
    return updated


@router.delete("/parties/{code}/queue/{item_id}", status_code=204)
async def remove_from_queue(code: str, item_id: str) -> Response:
    code = code.upper()
    found = await store.remove_queue_item(code, item_id)
    if not found:
        raise HTTPException(status_code=404, detail="Item not found")
    state = await store.get_party_state(code)
    if state:
        await manager.broadcast(code, state)
    return Response(status_code=204)


@router.post("/parties/{code}/queue/{item_id}/move", response_model=SessionState)
async def move_queue_item(code: str, item_id: str, body: MoveQueueItemRequest) -> SessionState:
    code = code.upper()
    if body.direction not in {"up", "down", "top", "bottom"}:
        raise HTTPException(status_code=422, detail="Invalid direction")
    found = await store.move_queue_item(code, item_id, body.direction)
    if not found:
        raise HTTPException(status_code=404, detail="Item not found")
    state = await store.get_party_state(code)
    if state is None:
        raise HTTPException(status_code=404, detail="Party not found")
    await manager.broadcast(code, state)
    return state
