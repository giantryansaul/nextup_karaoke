from __future__ import annotations

from fastapi import APIRouter, HTTPException

import session as store
from models import User, UserCreateRequest, UserUpdateRequest
from ws_manager import manager

router = APIRouter(tags=["users"])


@router.post("/users", response_model=User, status_code=201)
async def create_user(body: UserCreateRequest) -> User:
    user = User(name=body.name, color=body.color)
    await store.add_user(user)
    return user


@router.put("/users/{user_id}", response_model=User)
async def update_user(user_id: str, body: UserUpdateRequest) -> User:
    user = await store.update_user(user_id, body.name, body.color)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    await manager.broadcast(store.get_state())
    return user
