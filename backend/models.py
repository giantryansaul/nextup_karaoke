from __future__ import annotations

from typing import Optional
from pydantic import BaseModel, ConfigDict, Field
import uuid


def _uuid() -> str:
    return str(uuid.uuid4())


class User(BaseModel):
    model_config = ConfigDict(frozen=False)

    id: str = Field(default_factory=_uuid)
    name: str = Field(max_length=30)
    color: str


class QueueItem(BaseModel):
    model_config = ConfigDict(frozen=False)

    id: str = Field(default_factory=_uuid)
    video_id: str
    title: str
    channel: str
    thumbnail: str
    added_by_id: str
    added_by_name: str
    added_by_color: str


PLAYBACK_RATES = (0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0)


class SessionState(BaseModel):
    model_config = ConfigDict(frozen=False)

    queue: list[QueueItem] = Field(default_factory=list)
    now_playing: Optional[str] = None
    is_paused: bool = False
    restart_signal: int = 0
    playback_rate: float = 1.0
    users: dict[str, User] = Field(default_factory=dict)


# --- Request / Response shapes ---

class UserCreateRequest(BaseModel):
    name: str = Field(max_length=30)
    color: str


class UserUpdateRequest(BaseModel):
    name: str = Field(max_length=30)
    color: str


class AddQueueItemRequest(BaseModel):
    video_id: str
    title: str
    channel: str
    thumbnail: str
    user_id: str


class MoveQueueItemRequest(BaseModel):
    direction: str  # "up" | "down" | "top" | "bottom"


class SetPausedRequest(BaseModel):
    paused: bool


class SetPlaybackRateRequest(BaseModel):
    rate: float


class PartyCreateResponse(BaseModel):
    party_code: str
