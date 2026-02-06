"""Data update coordinator for Ultrahuman."""

from __future__ import annotations

import logging
from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed

from .api import UltrahumanApiClient, UltrahumanApiError, UltrahumanAuthError
from .const import DOMAIN

_LOGGER = logging.getLogger(__name__)


class UltrahumanDataUpdateCoordinator(DataUpdateCoordinator[dict[str, Any]]):
    """Coordinator that fetches data from Ultrahuman API on demand.

    No automatic polling interval is set - data is only fetched when
    the user explicitly requests an update via the homeassistant.update_entity
    service or the UI refresh button.
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
            # No update_interval - only fetch when explicitly requested
            update_interval=None,
        )
        self.client = client

    async def _async_update_data(self) -> dict[str, Any]:
        """Fetch data from the Ultrahuman API.

        This is called when the user requests a manual update.
        """
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
