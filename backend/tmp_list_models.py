import httpx, asyncio
from app.config import settings

async def test():
    async with httpx.AsyncClient() as client:
        r = await client.get(
            "https://api.anthropic.com/v1/models",
            headers={
                "x-api-key": settings.anthropic_api_key,
                "anthropic-version": "2023-06-01"
            }
        )
        data = r.json()
        for m in data["data"]:
            print(f"  {m['id']}")

asyncio.run(test())
