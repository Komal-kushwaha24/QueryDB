from __future__ import annotations

import json
import logging
import os
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

DEFAULT_SCHEMA_URL = "http://localhost:3000/api/schema"
DEFAULT_SCHEMA_TIMEOUT_SECONDS = 10.0


class SchemaLoaderError(RuntimeError):
    pass


class SchemaConnectionError(SchemaLoaderError):
    pass


class SchemaHTTPError(SchemaLoaderError):
    pass


class SchemaResponseError(SchemaLoaderError):
    pass


def _is_loopback_url(url: str) -> bool:
    try:
        parsed = urllib.parse.urlparse(url)
        hostname = (parsed.hostname or "").lower()
        return hostname in {"localhost", "127.0.0.1", "::1", "0.0.0.0"}
    except Exception:
        return False


def _build_default_opener(url: str) -> Any:
    if _is_loopback_url(url):
        # Bypasses proxies for localhost/loopback addresses.
        # Python urllib on Windows does not bypass localhost by default when system/env
        # proxies are present, which causes HTTP 403 or 10s connection timeouts.
        return urllib.request.build_opener(urllib.request.ProxyHandler({}))
    return urllib.request.build_opener()


def _default_opener_call(request: urllib.request.Request, timeout: float) -> Any:
    target_url = getattr(request, "full_url", str(request))
    director = _build_default_opener(target_url)
    return director.open(request, timeout=timeout)


def _validate_table(table: Any, index: int) -> None:
    if not isinstance(table, dict):
        raise SchemaResponseError(f"tables[{index}] must be an object")
    if not isinstance(table.get("name"), str) or not table["name"].strip():
        raise SchemaResponseError(f"tables[{index}].name must be a non-empty string")

    columns = table.get("columns")
    if not isinstance(columns, list):
        raise SchemaResponseError(f"tables[{index}].columns must be a list")
    for column_index, column in enumerate(columns):
        if not isinstance(column, dict):
            raise SchemaResponseError(f"tables[{index}].columns[{column_index}] must be an object")
        for field in ("name", "dataType"):
            if not isinstance(column.get(field), str) or not column[field].strip():
                raise SchemaResponseError(
                    f"tables[{index}].columns[{column_index}].{field} must be a non-empty string"
                )
        for field in ("isNullable", "isPrimaryKey"):
            if not isinstance(column.get(field), bool):
                raise SchemaResponseError(
                    f"tables[{index}].columns[{column_index}].{field} must be a boolean"
                )

    primary_keys = table.get("primaryKeyColumns")
    if not isinstance(primary_keys, list) or not all(isinstance(value, str) for value in primary_keys):
        raise SchemaResponseError(f"tables[{index}].primaryKeyColumns must be a list of strings")

    foreign_keys = table.get("foreignKeys")
    if not isinstance(foreign_keys, list):
        raise SchemaResponseError(f"tables[{index}].foreignKeys must be a list")
    foreign_key_fields = ("sourceTable", "sourceColumn", "referencedTable", "referencedColumn")
    for foreign_key_index, foreign_key in enumerate(foreign_keys):
        if not isinstance(foreign_key, dict):
            raise SchemaResponseError(f"tables[{index}].foreignKeys[{foreign_key_index}] must be an object")
        for field in foreign_key_fields:
            if not isinstance(foreign_key.get(field), str) or not foreign_key[field].strip():
                raise SchemaResponseError(
                    f"tables[{index}].foreignKeys[{foreign_key_index}].{field} must be a non-empty string"
                )


def validate_schema_response(payload: Any) -> dict[str, Any]:
    if not isinstance(payload, dict):
        raise SchemaResponseError("schema response must be a JSON object")
    if not isinstance(payload.get("schema"), str) or not payload["schema"].strip():
        raise SchemaResponseError("schema must be a non-empty string")
    tables = payload.get("tables")
    if not isinstance(tables, list):
        raise SchemaResponseError("tables must be a list")
    for index, table in enumerate(tables):
        _validate_table(table, index)
    return payload


class SchemaLoader:
    def __init__(
        self,
        api_url: str | None = None,
        timeout_seconds: float | None = None,
        opener: Any | None = None,
    ) -> None:
        self._configured_api_url = api_url.strip() if api_url else None

        if timeout_seconds is not None:
            try:
                configured_timeout = float(timeout_seconds)
            except (TypeError, ValueError) as exc:
                raise ValueError("schema timeout must be a number") from exc
            if configured_timeout <= 0:
                raise ValueError("schema timeout must be positive")
            self._configured_timeout = configured_timeout
        else:
            self._configured_timeout = None
            env_timeout = os.getenv("SCHEMA_API_TIMEOUT_SECONDS")
            if env_timeout is not None:
                try:
                    parsed_timeout = float(env_timeout)
                    if parsed_timeout <= 0:
                        raise ValueError("schema timeout must be positive")
                except (TypeError, ValueError) as exc:
                    raise ValueError("SCHEMA_API_TIMEOUT_SECONDS must be a number") from exc

        self.opener = opener if opener is not None else _default_opener_call

    @property
    def api_url(self) -> str:
        if self._configured_api_url:
            return self._configured_api_url
        return os.getenv("SCHEMA_API_URL", DEFAULT_SCHEMA_URL).strip()

    @api_url.setter
    def api_url(self, value: str | None) -> None:
        self._configured_api_url = value.strip() if value else None

    @property
    def timeout_seconds(self) -> float:
        if self._configured_timeout is not None:
            return self._configured_timeout
        env_timeout = os.getenv("SCHEMA_API_TIMEOUT_SECONDS")
        if env_timeout is not None:
            try:
                val = float(env_timeout)
                if val <= 0:
                    raise ValueError("schema timeout must be positive")
                return val
            except (TypeError, ValueError) as exc:
                raise ValueError("SCHEMA_API_TIMEOUT_SECONDS must be a number") from exc
        return DEFAULT_SCHEMA_TIMEOUT_SECONDS

    @timeout_seconds.setter
    def timeout_seconds(self, value: float) -> None:
        try:
            val = float(value)
        except (TypeError, ValueError) as exc:
            raise ValueError("schema timeout must be a number") from exc
        if val <= 0:
            raise ValueError("schema timeout must be positive")
        self._configured_timeout = val

    def load(self) -> dict[str, Any]:
        target_url = self.api_url
        if not target_url:
            raise SchemaConnectionError("schema API URL cannot be empty")

        parsed = urllib.parse.urlparse(target_url)
        if parsed.scheme not in ("http", "https") or not parsed.netloc:
            raise SchemaConnectionError(f"invalid schema API URL: '{target_url}' (must be http or https)")

        timeout = self.timeout_seconds
        logger.info("Loading database schema from %s (timeout=%ss)", target_url, timeout)

        request = urllib.request.Request(
            target_url,
            headers={
                "Accept": "application/json",
                "User-Agent": "QueryDB-AI-Service/1.0",
            },
        )

        try:
            with self.opener(request, timeout=timeout) as response:
                status = getattr(response, "status", 200)
                if status >= 400:
                    raise SchemaHTTPError(f"schema API returned HTTP {status}")
                raw_body = response.read()
        except urllib.error.HTTPError as exc:
            raise SchemaHTTPError(f"schema API returned HTTP {exc.code}") from exc
        except TimeoutError as exc:
            logger.warning("Schema request timed out after %ss: %s", timeout, target_url)
            raise SchemaConnectionError(f"schema API timed out after {timeout}s") from exc
        except urllib.error.URLError as exc:
            reason = exc.reason
            if isinstance(reason, TimeoutError) or "timed out" in str(reason).lower():
                logger.warning("Schema request timed out after %ss: %s", timeout, target_url)
                raise SchemaConnectionError(f"schema API timed out after {timeout}s") from exc
            raise SchemaConnectionError(f"unable to connect to schema API: {exc}") from exc
        except OSError as exc:
            raise SchemaConnectionError(f"unable to connect to schema API: {exc}") from exc

        try:
            payload = json.loads(raw_body.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise SchemaResponseError("schema API returned malformed JSON") from exc

        return validate_schema_response(payload)

