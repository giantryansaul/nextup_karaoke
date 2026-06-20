from __future__ import annotations

import os
from typing import Optional

import redis.asyncio as aioredis

from models import QueueItem, SessionState, User

PARTY_TTL = 1200  # 20 minutes

_parties: dict[str, SessionState] = {}
_redis: Optional[aioredis.Redis] = None


def _party_key(code: str) -> str:
    return f"nextup:party:{code}"


async def init_redis() -> None:
    global _redis
    url = os.getenv("REDIS_URL")
    if url:
        _redis = aioredis.from_url(url, decode_responses=True)


async def party_exists(code: str) -> bool:
    if _redis:
        try:
            return bool(await _redis.exists(_party_key(code)))
        except Exception:
            return code in _parties
    return code in _parties


async def create_party(code: str) -> SessionState:
    state = SessionState()
    _parties[code] = state
    if _redis:
        try:
            await _redis.setex(_party_key(code), PARTY_TTL, state.model_dump_json())
        except Exception:
            pass
    return state


async def get_party_state(code: str) -> Optional[SessionState]:
    if code in _parties:
        return _parties[code]
    if _redis:
        try:
            raw = await _redis.get(_party_key(code))
            if raw:
                state = SessionState.model_validate_json(raw)
                _parties[code] = state
                return state
        except Exception:
            pass
    return None


async def delete_party(code: str) -> None:
    _parties.pop(code, None)
    if _redis:
        try:
            await _redis.delete(_party_key(code))
        except Exception:
            pass


def get_active_party_codes() -> list[str]:
    return list(_parties.keys())


def evict_from_cache(code: str) -> None:
    _parties.pop(code, None)


async def _persist(code: str) -> None:
    state = _parties.get(code)
    if not state:
        return
    if _redis:
        try:
            await _redis.setex(_party_key(code), PARTY_TTL, state.model_dump_json())
        except Exception:
            pass


async def add_user(code: str, user: User) -> SessionState:
    state = _parties[code]
    state.users[user.id] = user
    await _persist(code)
    return state


async def update_user(code: str, user_id: str, name: str, color: str) -> Optional[User]:
    state = _parties.get(code)
    if not state or user_id not in state.users:
        return None
    state.users[user_id].name = name
    state.users[user_id].color = color
    for item in state.queue:
        if item.added_by_id == user_id:
            item.added_by_name = name
            item.added_by_color = color
    await _persist(code)
    return state.users[user_id]


async def add_queue_item(code: str, item: QueueItem) -> SessionState:
    state = _parties[code]
    state.queue.append(item)
    if state.now_playing is None:
        state.now_playing = item.id
    await _persist(code)
    return state


async def remove_queue_item(code: str, item_id: str) -> bool:
    state = _parties.get(code)
    if not state:
        return False
    before = len(state.queue)
    state.queue = [i for i in state.queue if i.id != item_id]
    if state.now_playing == item_id:
        state.now_playing = state.queue[0].id if state.queue else None
    await _persist(code)
    return len(state.queue) < before


async def move_queue_item(code: str, item_id: str, direction: str) -> bool:
    state = _parties.get(code)
    if not state:
        return False
    idx = next((i for i, q in enumerate(state.queue) if q.id == item_id), None)
    if idx is None:
        return False
    q = state.queue
    if direction == "up" and idx > 0:
        q[idx], q[idx - 1] = q[idx - 1], q[idx]
    elif direction == "down" and idx < len(q) - 1:
        q[idx], q[idx + 1] = q[idx + 1], q[idx]
    elif direction == "top":
        q.insert(0, q.pop(idx))
    elif direction == "bottom":
        q.append(q.pop(idx))
    state.now_playing = q[0].id if q else None
    await _persist(code)
    return True


async def advance_queue(code: str) -> SessionState:
    state = _parties[code]
    if state.now_playing:
        state.queue = [i for i in state.queue if i.id != state.now_playing]
    state.now_playing = state.queue[0].id if state.queue else None
    state.is_paused = False
    await _persist(code)
    return state


async def restart_track(code: str) -> SessionState:
    state = _parties[code]
    state.restart_signal += 1
    await _persist(code)
    return state


async def set_paused(code: str, paused: bool) -> SessionState:
    state = _parties[code]
    state.is_paused = paused
    await _persist(code)
    return state


async def clear_queue(code: str) -> SessionState:
    state = _parties[code]
    state.queue = []
    state.now_playing = None
    state.is_paused = False
    await _persist(code)
    return state


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
