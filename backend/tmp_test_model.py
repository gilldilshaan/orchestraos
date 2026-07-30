import httpx, asyncio
from app.config import settings

async def test():
    async with httpx.AsyncClient() as client:
        r = await client.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": settings.anthropic_api_key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json"
            },
            json={
                "model": "claude-haiku-4-5-20251001",
                "max_tokens": 50,
                "messages": [{"role": "user", "content": "Say hello in one word"}]
            }
        )
        d = r.json()
        if "content" in d:
            print("SUCCESS:", d["content"][0]["text"])
        else:
            print("ERROR:", d)

asyncio.run(test())
