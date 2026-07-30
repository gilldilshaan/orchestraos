import sys
import traceback
from app.database.session import async_session_factory
from app.services.objective_compiler import ObjectiveCompilerService
from app.repositories.objective_repository import ObjectiveRepository
from app.models.objective import Objective

async def main():
    async with async_session_factory() as session:
        svc = ObjectiveCompilerService(session)
        repo = ObjectiveRepository(session)

        obj = Objective(raw_input="Test pipeline fix for new objective")
        obj = await repo.create(obj)
        new_id = obj.id
        print(f"Created objective: {new_id}")

        try:
            result = await svc.run_full_pipeline(new_id)
            status = result.get("status", "unknown")
            pipeline = result.get("pipeline", {})
            print(f"Status: {status}")
            print(f"Pipeline status: {pipeline.get('status')}")
            if pipeline.get("errors"):
                for e in pipeline["errors"]:
                    print(f"  Error: {e['step']}: {e['error']}")
        except Exception:
            print(f"Exception: {traceback.format_exc()}")

        obj2 = await repo.get(new_id)
        print(f"Final status: {obj2.status}, stage: {obj2.current_stage}")
        await session.commit()

import asyncio
asyncio.run(main())
