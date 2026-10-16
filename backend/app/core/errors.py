"""Standardized application exceptions and exception handlers."""
from typing import Any, Optional
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
from app.core.logging import logger


class AppException(Exception):
    """Base class for all domain-specific application exceptions."""

    def __init__(
        self,
        message: str,
        code: str = "APPLICATION_ERROR",
        status_code: int = status.HTTP_400_BAD_REQUEST,
        details: Optional[Any] = None,
    ):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details


class MediaValidationError(AppException):
    """Raised when an uploaded image fails MIME type, size, or header validation."""

    def __init__(self, message: str, details: Optional[Any] = None):
        super().__init__(
            message=message,
            code="MEDIA_VALIDATION_ERROR",
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            details=details,
        )


class PayloadSizeError(AppException):
    """Raised when an upload exceeds the maximum allowable file size."""

    def __init__(self, message: str, details: Optional[Any] = None):
        super().__init__(
            message=message,
            code="PAYLOAD_TOO_LARGE",
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            details=details,
        )


class ServiceNotConfiguredError(AppException):
    """Raised when an AI service or optional module is not configured or in development."""

    def __init__(self, service_name: str, message: Optional[str] = None, details: Optional[Any] = None):
        msg = message or f"Service '{service_name}' is not configured or currently in development."
        super().__init__(
            message=msg,
            code="SERVICE_NOT_CONFIGURED",
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            details=details or {"service": service_name},
        )


class AIProviderError(AppException):
    """Raised when an upstream AI model call fails or times out."""

    def __init__(self, message: str, is_timeout: bool = False, details: Optional[Any] = None):
        status_code = status.HTTP_504_GATEWAY_TIMEOUT if is_timeout else status.HTTP_502_BAD_GATEWAY
        code = "AI_TIMEOUT" if is_timeout else "AI_PROVIDER_ERROR"
        super().__init__(
            message=message,
            code=code,
            status_code=status_code,
            details=details,
        )


class ResourceNotFoundError(AppException):
    """Raised when a requested resource is not found."""

    def __init__(self, resource: str, identifier: Any):
        super().__init__(
            message=f"{resource} '{identifier}' not found.",
            code="NOT_FOUND",
            status_code=status.HTTP_404_NOT_FOUND,
            details={"resource": resource, "identifier": identifier},
        )


def register_exception_handlers(app: FastAPI) -> None:
    """Register uniform JSON error handlers on the FastAPI application."""

    @app.exception_handler(AppException)
    async def app_exception_handler(request: Request, exc: AppException):
        logger.warning(f"AppException [{exc.code}] on {request.method} {request.url.path}: {exc.message}")
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": {
                    "code": exc.code,
                    "message": exc.message,
                    "details": exc.details,
                }
            },
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        logger.info(f"Request validation error on {request.method} {request.url.path}: {exc.errors()}")
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": "Invalid request parameters or payload structure.",
                    "details": exc.errors(),
                }
            },
        )

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException):
        logger.info(f"HTTP {exc.status_code} on {request.method} {request.url.path}: {exc.detail}")
        code = "NOT_FOUND" if exc.status_code == 404 else "HTTP_ERROR"
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": {
                    "code": code,
                    "message": str(exc.detail),
                    "details": None,
                }
            },
        )

    @app.exception_handler(Exception)
    async def general_exception_handler(request: Request, exc: Exception):
        logger.error(f"Unhandled server error on {request.method} {request.url.path}: {str(exc)}", exc_info=True)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": {
                    "code": "INTERNAL_SERVER_ERROR",
                    "message": "An unexpected error occurred while processing your request.",
                    "details": None,
                }
            },
        )
