from __future__ import annotations

import asyncio
import hashlib
import json
from typing import Any

import httpx
from fastapi import APIRouter, HTTPException, Query
from youtube_search import YoutubeSearch

import session as store

router = APIRouter(tags=["search"])

CACHE_TTL = 86400  # 24 hours


def _do_search(query: str) -> list[dict[str, Any]]:
    results = YoutubeSearch(f"{query} karaoke", max_results=10).to_dict()
    items: list[dict[str, Any]] = []
    for r in results:
        thumbnails = r.get("thumbnails", [])
        items.append(
            {
                "video_id": r.get("id", ""),
                "title": r.get("title", ""),
                "channel": r.get("channel", ""),
                "thumbnail": thumbnails[0] if thumbnails else "",
                "duration": r.get("duration", ""),
            }
        )
    return items


async def _is_embeddable(client: httpx.AsyncClient, video_id: str) -> bool:
    try:
        url = f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={video_id}&format=json"
        r = await client.get(url, timeout=5.0)
        return r.status_code == 200
    except Exception:
        return True  # assume embeddable on network error


@router.get("/search")
async def search_youtube(q: str = Query(..., min_length=1)) -> dict[str, Any]:
    cache_key = f"search:{hashlib.md5(q.lower().strip().encode()).hexdigest()}"

    cached = await store.cache_get(cache_key)
    if cached:
        return {"results": json.loads(cached)}

    try:
        loop = asyncio.get_event_loop()
        items = await loop.run_in_executor(None, _do_search, q)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"YouTube search failed: {exc}") from exc

    async with httpx.AsyncClient() as client:
        checks = await asyncio.gather(*[_is_embeddable(client, vid["video_id"]) for vid in items])

    results = [item for item, ok in zip(items, checks) if ok]

    await store.cache_set(cache_key, json.dumps(results), ttl=CACHE_TTL)

    return {"results": results}
