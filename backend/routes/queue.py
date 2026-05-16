from __future__ import annotations

from fastapi import APIRouter, HTTPException
from fastapi import Response

import session as store
from models import AddQueueItemRequest, MoveQueueItemRequest, QueueItem, SessionState, SetPausedRequest
from ws_manager import manager

router = APIRouter(tags=["queue"])


@router.get("/queue", response_model=SessionState)
async def get_queue() -> SessionState:
    return store.get_state()


# All fixed-path routes must be registered BEFORE /queue/{item_id} routes

@router.post("/queue/advance", response_model=SessionState)
async def advance_queue() -> SessionState:
    updated = await store.advance_queue()
    await manager.broadcast(updated)
    return updated


@router.post("/queue/pause", response_model=SessionState)
async def set_paused(body: SetPausedRequest) -> SessionState:
    updated = await store.set_paused(body.paused)
    await manager.broadcast(updated)
    return updated


@router.delete("/queue", response_model=SessionState)
async def clear_queue() -> SessionState:
    updated = await store.clear_queue()
    await manager.broadcast(updated)
    return updated


@router.post("/queue", response_model=SessionState, status_code=201)
async def add_to_queue(body: AddQueueItemRequest) -> SessionState:
    state = store.get_state()
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
    await store.add_queue_item(item)
    updated = store.get_state()
    await manager.broadcast(updated)
    return updated


@router.delete("/queue/{item_id}", status_code=204)
async def remove_from_queue(item_id: str) -> Response:
    found = await store.remove_queue_item(item_id)
    if not found:
        raise HTTPException(status_code=404, detail="Item not found")
    await manager.broadcast(store.get_state())
    return Response(status_code=204)


@router.post("/queue/{item_id}/move", response_model=SessionState)
async def move_queue_item(item_id: str, body: MoveQueueItemRequest) -> SessionState:
    if body.direction not in {"up", "down", "top", "bottom"}:
        raise HTTPException(status_code=422, detail="Invalid direction")
    found = await store.move_queue_item(item_id, body.direction)
    if not found:
        raise HTTPException(status_code=404, detail="Item not found")
    updated = store.get_state()
    await manager.broadcast(updated)
    return updated
