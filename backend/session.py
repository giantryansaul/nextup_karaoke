from __future__ import annotations

import os
from typing import Optional

import redis.asyncio as aioredis

from models import QueueItem, SessionState, User

REDIS_KEY = "nextup:session"

_state: SessionState = SessionState()
_redis: Optional[aioredis.Redis] = None


async def init_redis() -> None:
    global _redis, _state
    url = os.getenv("REDIS_URL")
    if url:
        _redis = aioredis.from_url(url, decode_responses=True)
        try:
            raw = await _redis.get(REDIS_KEY)
            if raw:
                _state = SessionState.model_validate_json(raw)
        except Exception:
            pass  # Redis unavailable on startup — start with empty state


async def _persist() -> None:
    if _redis:
        try:
            await _redis.set(REDIS_KEY, _state.model_dump_json())
        except Exception:
            pass


def get_state() -> SessionState:
    return _state


async def add_user(user: User) -> None:
    _state.users[user.id] = user
    await _persist()


async def update_user(user_id: str, name: str, color: str) -> Optional[User]:
    if user_id not in _state.users:
        return None
    _state.users[user_id].name = name
    _state.users[user_id].color = color
    # Sync name/color into every queue item this user added
    for item in _state.queue:
        if item.added_by_id == user_id:
            item.added_by_name = name
            item.added_by_color = color
    await _persist()
    return _state.users[user_id]


async def add_queue_item(item: QueueItem) -> None:
    _state.queue.append(item)
    if _state.now_playing is None:
        _state.now_playing = item.id
    await _persist()


async def remove_queue_item(item_id: str) -> bool:
    before = len(_state.queue)
    _state.queue = [i for i in _state.queue if i.id != item_id]
    if _state.now_playing == item_id:
        _state.now_playing = _state.queue[0].id if _state.queue else None
    await _persist()
    return len(_state.queue) < before


async def move_queue_item(item_id: str, direction: str) -> bool:
    idx = next((i for i, q in enumerate(_state.queue) if q.id == item_id), None)
    if idx is None:
        return False
    q = _state.queue
    if direction == "up" and idx > 0:
        q[idx], q[idx - 1] = q[idx - 1], q[idx]
    elif direction == "down" and idx < len(q) - 1:
        q[idx], q[idx + 1] = q[idx + 1], q[idx]
    elif direction == "top":
        q.insert(0, q.pop(idx))
    elif direction == "bottom":
        q.append(q.pop(idx))
    # Ensure now_playing tracks the first item after reorder
    _state.now_playing = q[0].id if q else None
    await _persist()
    return True


async def advance_queue() -> SessionState:
    if _state.now_playing:
        _state.queue = [i for i in _state.queue if i.id != _state.now_playing]
    _state.now_playing = _state.queue[0].id if _state.queue else None
    _state.is_paused = False
    await _persist()
    return _state


async def set_paused(paused: bool) -> SessionState:
    _state.is_paused = paused
    await _persist()
    return _state


async def clear_queue() -> SessionState:
    _state.queue = []
    _state.now_playing = None
    _state.is_paused = False
    await _persist()
    return _state


async def cache_get(key: str) -> Optional[str]:
    if not _redis:
        return None
    try:
        return await _redis.get(key)
    except Exception:
        return None


async def cache_set(key: str, value: str, ttl: int = 86400) -> None:
    if not _redis:
        return
    try:
        await _redis.set(key, value, ex=ttl)
    except Exception:
        pass
