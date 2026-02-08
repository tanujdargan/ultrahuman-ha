"""API client for Ultrahuman Partner API."""

from __future__ import annotations

import logging
from datetime import date
from typing import Any

import aiohttp

from .const import API_METRICS_ENDPOINT

_LOGGER = logging.getLogger(__name__)


class UltrahumanApiError(Exception):
    """Exception for Ultrahuman API errors."""


class UltrahumanAuthError(UltrahumanApiError):
    """Exception for authentication errors."""


class UltrahumanApiClient:
    """Client for the Ultrahuman Partner API."""

    def __init__(
        self,
        session: aiohttp.ClientSession,
        api_key: str,
        email: str,
    ) -> None:
        """Initialize the API client."""
        self._session = session
        self._api_key = api_key
        self._email = email

    async def async_get_metrics(
        self, query_date: date | None = None
    ) -> dict[str, Any]:
        """Fetch metrics from the Ultrahuman API for a given date.

        Args:
            query_date: The date to query metrics for. Defaults to today.

        Returns:
            The parsed JSON response from the API.

        Raises:
            UltrahumanAuthError: If authentication fails.
            UltrahumanApiError: If the API request fails.
        """
        if query_date is None:
            query_date = date.today()

        params = {
            "email": self._email,
            "date": query_date.isoformat(),
        }
        headers = {
            "Authorization": f"Bearer {self._api_key}",
        }

        try:
            async with self._session.get(
                API_METRICS_ENDPOINT,
                params=params,
                headers=headers,
            ) as response:
                if response.status == 401:
                    raise UltrahumanAuthError("Invalid API key")
                if response.status == 403:
                    raise UltrahumanAuthError("Access forbidden - check API key")
                if response.status != 200:
                    raise UltrahumanApiError(
                        f"API request failed with status {response.status}"
                    )
                data: dict[str, Any] = await response.json()
                return data
        except aiohttp.ClientError as err:
            raise UltrahumanApiError(f"Error communicating with API: {err}") from err

    async def async_validate_credentials(self) -> bool:
        """Validate the API credentials by making a test request.

        Returns:
            True if credentials are valid.

        Raises:
            UltrahumanAuthError: If authentication fails.
            UltrahumanApiError: If the API request fails.
        """
        await self.async_get_metrics()
        return True
