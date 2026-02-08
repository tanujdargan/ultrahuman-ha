"""The Ultrahuman integration."""

from __future__ import annotations

import logging
from pathlib import Path

from homeassistant.components.frontend import async_register_built_in_panel
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant
from homeassistant.helpers.aiohttp_client import async_get_clientsession

from .api import UltrahumanApiClient
from .const import CONF_API_KEY, CONF_EMAIL, DOMAIN
from .coordinator import UltrahumanDataUpdateCoordinator

_LOGGER = logging.getLogger(__name__)

PLATFORMS: list[Platform] = [Platform.SENSOR]

CARD_JS_URL = "/ultrahuman/ultrahuman-ring-card.js"
CARD_JS_PATH = Path(__file__).parent / "www" / "ultrahuman-ring-card.js"


async def async_setup(hass: HomeAssistant, config: dict) -> bool:
    """Register the static path for the custom card."""
    hass.http.register_static_path(
        CARD_JS_URL,
        str(CARD_JS_PATH),
        cache_headers=False,
    )

    # Register the card as a Lovelace resource
    await _async_register_card_resource(hass)

    return True


async def _async_register_card_resource(hass: HomeAssistant) -> None:
    """Register the card JS as a Lovelace resource if not already present."""
    # We use the lovelace resources collection if available
    try:
        resources = hass.data.get("lovelace", {})
        if hasattr(resources, "resources"):
            # Managed mode: check if our resource is already registered
            collection = resources.resources
            existing = [
                r
                for r in collection.async_items()
                if r.get("url", "").endswith("ultrahuman-ring-card.js")
            ]
            if not existing:
                await collection.async_create_item(
                    {"res_type": "module", "url": CARD_JS_URL}
                )
                _LOGGER.debug("Registered Ultrahuman card as Lovelace resource")
    except Exception:
        _LOGGER.debug(
            "Could not auto-register Lovelace resource. "
            "You may need to add it manually: %s",
            CARD_JS_URL,
        )


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up Ultrahuman from a config entry."""
    session = async_get_clientsession(hass)
    client = UltrahumanApiClient(
        session=session,
        api_key=entry.data[CONF_API_KEY],
        email=entry.data[CONF_EMAIL],
    )

    coordinator = UltrahumanDataUpdateCoordinator(hass, client)

    # Perform an initial data fetch so sensors have data
    await coordinator.async_config_entry_first_refresh()

    hass.data.setdefault(DOMAIN, {})
    hass.data[DOMAIN][entry.entry_id] = coordinator

    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)

    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a config entry."""
    if unload_ok := await hass.config_entries.async_unload_platforms(entry, PLATFORMS):
        hass.data[DOMAIN].pop(entry.entry_id)

    return unload_ok
