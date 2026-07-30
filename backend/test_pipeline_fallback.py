import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

for k in ['OPENROUTER_API_KEY', 'GROQ_API_KEY', 'OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'GOOGLE_API_KEY', 'LITELLM_MASTER_KEY']:
    os.environ.pop(k, None)

from app.config import settings as _s
_s.openrouter_api_key = None
_s.groq_api_key = None
_s.openai_api_key = None
_s.anthropic_api_key = None
_s.google_api_key = None
_s.litellm_master_key = None

import asyncio
from app.database.session import async_session_factory
from app.services.objective_compiler import ObjectiveCompilerService
from sqlalchemy import text

async def main():
    async with async_session_factory() as session:
        svc = ObjectiveCompilerService(session)
        result = await svc.run_full_pipeline('019faed9-1940-754e-8763-c251badae2dc')
        status = result.get('status')
        pipeline = result.get('pipeline', {})
        ps = pipeline.get('status')
        print(f"Status: {status}")
        print(f"Pipeline status: {ps}")
        if "errors" in result.get("pipeline", {}):
            errors = result["pipeline"]["errors"]
            print(f"Errors: {errors}")
        print(f"Summary keys: {[k for k in result.keys() if k != 'pipeline']}")
        await session.commit()
        print("Session committed")

    # Verify persisted state
    async with async_session_factory() as session:
        row = await session.execute(text("SELECT status, current_stage FROM objectives WHERE id = '019faed9-1940-754e-8763-c251badae2dc'"))
        r = row.fetchone()
        print(f"DB status: {r[0]}, stage: {r[1]}")

asyncio.run(main())
