"""Data update coordinator for Ultrahuman."""

from __future__ import annotations

import logging
from datetime import timedelta
from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed

from .api import UltrahumanApiClient, UltrahumanApiError, UltrahumanAuthError
from .const import DOMAIN

_LOGGER = logging.getLogger(__name__)


class UltrahumanDataUpdateCoordinator(DataUpdateCoordinator[dict[str, Any]]):
    """Coordinator that fetches data from the Ultrahuman API.

    Automatically polls every hour and also supports manual refresh via
    the homeassistant.update_entity service or the UI refresh button.
    """

    def __init__(
        self,
        hass: HomeAssistant,
        client: UltrahumanApiClient,
    ) -> None:
        """Initialize the coordinator."""
        super().__init__(
            hass,
            _LOGGER,
            name=DOMAIN,
            update_interval=timedelta(hours=1),
        )
        self.client = client

    async def _async_update_data(self) -> dict[str, Any]:
        """Fetch data from the Ultrahuman API."""
        try:
            response = await self.client.async_get_metrics()
        except UltrahumanAuthError as err:
            raise UpdateFailed(f"Authentication failed: {err}") from err
        except UltrahumanApiError as err:
            raise UpdateFailed(f"Error fetching data: {err}") from err

        if response.get("error") is not None:
            raise UpdateFailed(f"API returned error: {response['error']}")

        data = response.get("data", {})
        metric_data = data.get("metric_data", [])

        # Parse metric_data into a dict keyed by type for easy lookup
        parsed: dict[str, Any] = {}
        for metric in metric_data:
            metric_type = metric.get("type")
            metric_obj = metric.get("object", {})
            if metric_type:
                parsed[metric_type] = metric_obj

        return parsed
