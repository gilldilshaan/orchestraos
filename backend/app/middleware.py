from __future__ import annotations

import time
import uuid
from collections.abc import Awaitable, Callable

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.config import settings
from app.exceptions import OrchestraOSError
from app.logging_ import get_logger

logger = get_logger("middleware")


class RequestIDMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable[[Request], Awaitable[Response]]) -> Response:
        request_id = str(uuid.uuid4())
        trace_id = request.headers.get("X-Trace-Id", str(uuid.uuid4()))
        request.state.request_id = request_id
        request.state.trace_id = trace_id

        start_time = time.monotonic()

        response = await call_next(request)

        duration_ms = int((time.monotonic() - start_time) * 1000)
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Trace-ID"] = trace_id
        response.headers["X-Duration-MS"] = str(duration_ms)

        logger.info(
            "request.completed",
            request_id=request_id,
            trace_id=trace_id,
            method=request.method,
            path=request.url.path,
            status_code=response.status_code,
            duration_ms=duration_ms,
        )

        return response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable[[Request], Awaitable[Response]]) -> Response:
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response


def setup_middleware(app: FastAPI) -> None:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins.split(","),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(RequestIDMiddleware)


def setup_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(OrchestraOSError)
    async def orchestraos_error_handler(request: Request, exc: OrchestraOSError) -> JSONResponse:
        trace_id = getattr(request.state, "trace_id", str(uuid.uuid4()))
        logger.error(
            "orchestraos_error",
            trace_id=trace_id,
            code=exc.code,
            message=exc.message,
        )
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": {
                    "code": exc.code,
                    "message": exc.message,
                    "details": exc.details,
                    "trace_id": trace_id,
                }
            },
        )

    @app.exception_handler(Exception)
    async def unhandled_error_handler(request: Request, exc: Exception) -> JSONResponse:
        trace_id = getattr(request.state, "trace_id", str(uuid.uuid4()))
        logger.error(
            "unhandled_error",
            trace_id=trace_id,
            error=str(exc),
        )
        return JSONResponse(
            status_code=500,
            content={
                "error": {
                    "code": "E-000",
                    "message": "Internal server error",
                    "details": [],
                    "trace_id": trace_id,
                }
            },
        )
