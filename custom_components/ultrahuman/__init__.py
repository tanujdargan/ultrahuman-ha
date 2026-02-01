"""The Ultrahuman integration."""

from __future__ import annotations

from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant
from homeassistant.helpers.aiohttp_client import async_get_clientsession

from .api import UltrahumanApiClient
from .const import CONF_API_KEY, CONF_EMAIL, DOMAIN
from .coordinator import UltrahumanDataUpdateCoordinator

PLATFORMS: list[Platform] = [Platform.SENSOR]


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
