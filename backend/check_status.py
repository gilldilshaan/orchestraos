import sys, os, asyncio
sys.path.insert(0, ".")

from app.database.session import async_session_factory

async def check():
    async with async_session_factory() as session:
        from sqlalchemy import text
        rows = await session.execute(
            text("SELECT id, status, current_stage FROM objectives ORDER BY created_at DESC")
        )
        for r in rows.fetchall():
            print(f"ID: {r[0]}  Status: {r[1]}  Stage: {r[2]}")
        
        # Check specific one
        row = await session.execute(
            text("SELECT id, status, current_stage FROM objectives WHERE id = '019faed9-1940-754e-8763-c251badae2dc'")
        )
        r = row.fetchone()
        if r:
            print(f"\nPipeline target: ID={r[0]} Status={r[1]} Stage={r[2]}")
        else:
            print("\nPipeline target not found")

asyncio.run(check())
