from __future__ import annotations

from fastapi import APIRouter, HTTPException

import session as store
from models import User, UserCreateRequest, UserUpdateRequest
from ws_manager import manager

router = APIRouter(tags=["users"])


@router.post("/parties/{code}/users", response_model=User, status_code=201)
async def create_user(code: str, body: UserCreateRequest) -> User:
    code = code.upper()
    state = await store.get_party_state(code)
    if state is None:
        raise HTTPException(status_code=404, detail="Party not found")
    user = User(name=body.name, color=body.color)
    updated = await store.add_user(code, user)
    await manager.broadcast(code, updated)
    return user


@router.put("/parties/{code}/users/{user_id}", response_model=User)
async def update_user(code: str, user_id: str, body: UserUpdateRequest) -> User:
    code = code.upper()
    user = await store.update_user(code, user_id, body.name, body.color)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    state = await store.get_party_state(code)
    if state:
        await manager.broadcast(code, state)
    return user
