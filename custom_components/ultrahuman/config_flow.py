"""Config flow for Ultrahuman integration."""

from __future__ import annotations

import logging
from typing import Any

import aiohttp
import voluptuous as vol

from homeassistant.config_entries import ConfigFlow, ConfigFlowResult
from homeassistant.helpers.aiohttp_client import async_get_clientsession

from .api import UltrahumanApiClient, UltrahumanApiError, UltrahumanAuthError
from .const import CONF_API_KEY, CONF_EMAIL, DOMAIN

_LOGGER = logging.getLogger(__name__)

STEP_USER_DATA_SCHEMA = vol.Schema(
    {
        vol.Required(CONF_API_KEY): str,
        vol.Required(CONF_EMAIL): str,
    }
)


class UltrahumanConfigFlow(ConfigFlow, domain=DOMAIN):
    """Handle a config flow for Ultrahuman."""

    VERSION = 1

    async def async_step_user(
        self,
        user_input: dict[str, Any] | None = None,
    ) -> ConfigFlowResult:
        """Handle the initial step."""
        errors: dict[str, str] = {}

        if user_input is not None:
            # Check if this email is already configured
            await self.async_set_unique_id(user_input[CONF_EMAIL].lower())
            self._abort_if_unique_id_configured()

            session = async_get_clientsession(self.hass)
            client = UltrahumanApiClient(
                session=session,
                api_key=user_input[CONF_API_KEY],
                email=user_input[CONF_EMAIL],
            )

            try:
                await client.async_validate_credentials()
            except UltrahumanAuthError:
                errors["base"] = "invalid_auth"
            except (UltrahumanApiError, aiohttp.ClientError):
                errors["base"] = "cannot_connect"
            except Exception:
                _LOGGER.exception("Unexpected exception during setup")
                errors["base"] = "unknown"
            else:
                return self.async_create_entry(
                    title=f"Ultrahuman ({user_input[CONF_EMAIL]})",
                    data=user_input,
                )

        return self.async_show_form(
            step_id="user",
            data_schema=STEP_USER_DATA_SCHEMA,
            errors=errors,
        )
