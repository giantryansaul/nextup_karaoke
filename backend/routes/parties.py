from __future__ import annotations

import random
import string

from fastapi import APIRouter, HTTPException
from fastapi import Response

import session as store
from models import PartyCreateResponse
from ws_manager import manager

router = APIRouter(tags=["parties"])

BAD_WORDS = {
    "SHIT", "FUCK", "CUNT", "DICK", "ARSE", "PISS", "SLUT", "DAMN",
    "CRAP", "COCK", "TITS", "TWAT", "WANK", "KNOB", "FART", "BUTT",
    "PORN", "RAPE", "KILL", "DEAD", "DRUG", "METH", "BOMB", "SHOT",
    "HATE", "NAZI", "ANAL", "ORGY", "SMUT",
}


async def _generate_code() -> str:
    while True:
        code = "".join(random.choices(string.ascii_uppercase, k=4))
        if code not in BAD_WORDS and not await store.party_exists(code):
            return code


@router.post("/parties", response_model=PartyCreateResponse, status_code=201)
async def create_party() -> PartyCreateResponse:
    code = await _generate_code()
    await store.create_party(code)
    return PartyCreateResponse(party_code=code)


@router.delete("/parties/{code}", status_code=204)
async def end_party(code: str) -> Response:
    code = code.upper()
    if not await store.party_exists(code):
        raise HTTPException(status_code=404, detail="Party not found")
    await manager.broadcast_event(code, "party_ended")
    await store.delete_party(code)
    return Response(status_code=204)
