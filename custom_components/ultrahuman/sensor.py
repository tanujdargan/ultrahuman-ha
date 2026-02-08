"""Sensor platform for Ultrahuman integration."""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from typing import Any

from homeassistant.components.sensor import (
    SensorDeviceClass,
    SensorEntity,
    SensorEntityDescription,
    SensorStateClass,
)
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import (
    PERCENTAGE,
    UnitOfTemperature,
    UnitOfTime,
)
from homeassistant.core import HomeAssistant
from homeassistant.helpers.device_registry import DeviceEntryType
from homeassistant.helpers.entity import DeviceInfo
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .const import CONF_EMAIL, DOMAIN
from .coordinator import UltrahumanDataUpdateCoordinator


@dataclass(frozen=True, kw_only=True)
class UltrahumanSensorEntityDescription(SensorEntityDescription):
    """Describe an Ultrahuman sensor entity."""

    value_fn: Callable[[dict[str, Any]], Any]


def _get_sleep_score(data: dict[str, Any]) -> Any:
    sleep = data.get("Sleep", {})
    sleep_score = sleep.get("sleep_score", {})
    return sleep_score.get("score")


def _get_total_sleep_minutes(data: dict[str, Any]) -> Any:
    sleep = data.get("Sleep", {})
    total_sleep = sleep.get("total_sleep", {})
    return total_sleep.get("minutes")


def _get_sleep_efficiency(data: dict[str, Any]) -> Any:
    sleep = data.get("Sleep", {})
    efficiency = sleep.get("sleep_efficiency", {})
    return efficiency.get("percentage")


def _get_deep_sleep_minutes(data: dict[str, Any]) -> Any:
    sleep = data.get("Sleep", {})
    deep = sleep.get("deep_sleep", {})
    return deep.get("minutes")


def _get_rem_sleep_minutes(data: dict[str, Any]) -> Any:
    sleep = data.get("Sleep", {})
    rem = sleep.get("rem_sleep", {})
    return rem.get("minutes")


def _get_light_sleep_minutes(data: dict[str, Any]) -> Any:
    sleep = data.get("Sleep", {})
    light = sleep.get("light_sleep", {})
    return light.get("minutes")


def _get_restorative_sleep(data: dict[str, Any]) -> Any:
    sleep = data.get("Sleep", {})
    restorative = sleep.get("restorative_sleep", {})
    return restorative.get("percentage")


def _get_resting_hr(data: dict[str, Any]) -> Any:
    rhr = data.get("night_rhr", {})
    return rhr.get("avg")


def _get_heart_rate(data: dict[str, Any]) -> Any:
    hr = data.get("hr", {})
    return hr.get("last_reading")


def _get_hrv(data: dict[str, Any]) -> Any:
    hrv = data.get("hrv", {})
    return hrv.get("avg")


def _get_temperature(data: dict[str, Any]) -> Any:
    temp = data.get("temp", {})
    return temp.get("last_reading")


def _get_steps(data: dict[str, Any]) -> Any:
    steps = data.get("steps", {})
    return steps.get("total")


def _get_recovery_index(data: dict[str, Any]) -> Any:
    recovery = data.get("recovery_index", {})
    return recovery.get("value")


def _get_movement_index(data: dict[str, Any]) -> Any:
    movement = data.get("movement_index", {})
    return movement.get("value")


def _get_vo2_max(data: dict[str, Any]) -> Any:
    vo2 = data.get("vo2_max", {})
    return vo2.get("value")


def _get_metabolic_score(data: dict[str, Any]) -> Any:
    metabolic = data.get("metabolic_score", {})
    return metabolic.get("value")


def _get_glucose_variability(data: dict[str, Any]) -> Any:
    gv = data.get("glucose_variability", {})
    return gv.get("value")


def _get_average_glucose(data: dict[str, Any]) -> Any:
    ag = data.get("average_glucose", {})
    return ag.get("value")


def _get_hba1c(data: dict[str, Any]) -> Any:
    hba1c = data.get("hba1c", {})
    return hba1c.get("value")


def _get_time_in_target(data: dict[str, Any]) -> Any:
    tit = data.get("time_in_target", {})
    return tit.get("value")


def _get_spo2(data: dict[str, Any]) -> Any:
    sleep = data.get("Sleep", {})
    spo2 = sleep.get("spo2", {})
    if spo2:
        return spo2.get("value")
    return None


SENSOR_DESCRIPTIONS: tuple[UltrahumanSensorEntityDescription, ...] = (
    # Sleep sensors
    UltrahumanSensorEntityDescription(
        key="sleep_score",
        translation_key="sleep_score",
        native_unit_of_measurement="score",
        state_class=SensorStateClass.MEASUREMENT,
        suggested_display_precision=0,
        icon="mdi:sleep",
        value_fn=_get_sleep_score,
    ),
    UltrahumanSensorEntityDescription(
        key="total_sleep",
        translation_key="total_sleep",
        native_unit_of_measurement=UnitOfTime.MINUTES,
        device_class=SensorDeviceClass.DURATION,
        state_class=SensorStateClass.MEASUREMENT,
        suggested_display_precision=0,
        icon="mdi:bed-clock",
        value_fn=_get_total_sleep_minutes,
    ),
    UltrahumanSensorEntityDescription(
        key="sleep_efficiency",
        translation_key="sleep_efficiency",
        native_unit_of_measurement=PERCENTAGE,
        state_class=SensorStateClass.MEASUREMENT,
        suggested_display_precision=1,
        icon="mdi:sleep",
        value_fn=_get_sleep_efficiency,
    ),
    UltrahumanSensorEntityDescription(
        key="deep_sleep",
        translation_key="deep_sleep",
        native_unit_of_measurement=UnitOfTime.MINUTES,
        device_class=SensorDeviceClass.DURATION,
        state_class=SensorStateClass.MEASUREMENT,
        suggested_display_precision=0,
        icon="mdi:power-sleep",
        value_fn=_get_deep_sleep_minutes,
    ),
    UltrahumanSensorEntityDescription(
        key="rem_sleep",
        translation_key="rem_sleep",
        native_unit_of_measurement=UnitOfTime.MINUTES,
        device_class=SensorDeviceClass.DURATION,
        state_class=SensorStateClass.MEASUREMENT,
        suggested_display_precision=0,
        icon="mdi:head-sync",
        value_fn=_get_rem_sleep_minutes,
    ),
    UltrahumanSensorEntityDescription(
        key="light_sleep",
        translation_key="light_sleep",
        native_unit_of_measurement=UnitOfTime.MINUTES,
        device_class=SensorDeviceClass.DURATION,
        state_class=SensorStateClass.MEASUREMENT,
        suggested_display_precision=0,
        icon="mdi:weather-night",
        value_fn=_get_light_sleep_minutes,
    ),
    UltrahumanSensorEntityDescription(
        key="restorative_sleep",
        translation_key="restorative_sleep",
        native_unit_of_measurement=PERCENTAGE,
        state_class=SensorStateClass.MEASUREMENT,
        suggested_display_precision=1,
        icon="mdi:heart-pulse",
        value_fn=_get_restorative_sleep,
    ),
    UltrahumanSensorEntityDescription(
        key="spo2",
        translation_key="spo2",
        native_unit_of_measurement=PERCENTAGE,
        state_class=SensorStateClass.MEASUREMENT,
        suggested_display_precision=1,
        icon="mdi:water-percent",
        value_fn=_get_spo2,
    ),
    # Heart Rate sensors
    UltrahumanSensorEntityDescription(
        key="heart_rate",
        translation_key="heart_rate",
        native_unit_of_measurement="bpm",
        state_class=SensorStateClass.MEASUREMENT,
        suggested_display_precision=0,
        icon="mdi:heart-pulse",
        value_fn=_get_heart_rate,
    ),
    UltrahumanSensorEntityDescription(
        key="resting_heart_rate",
        translation_key="resting_heart_rate",
        native_unit_of_measurement="bpm",
        state_class=SensorStateClass.MEASUREMENT,
        suggested_display_precision=0,
        icon="mdi:heart",
        value_fn=_get_resting_hr,
    ),
    # HRV
    UltrahumanSensorEntityDescription(
        key="hrv",
        translation_key="hrv",
        native_unit_of_measurement="ms",
        state_class=SensorStateClass.MEASUREMENT,
        suggested_display_precision=0,
        icon="mdi:heart-flash",
        value_fn=_get_hrv,
    ),
    # Temperature
    UltrahumanSensorEntityDescription(
        key="skin_temperature",
        translation_key="skin_temperature",
        native_unit_of_measurement=UnitOfTemperature.CELSIUS,
        device_class=SensorDeviceClass.TEMPERATURE,
        state_class=SensorStateClass.MEASUREMENT,
        suggested_display_precision=1,
        icon="mdi:thermometer",
        value_fn=_get_temperature,
    ),
    # Steps
    UltrahumanSensorEntityDescription(
        key="steps",
        translation_key="steps",
        native_unit_of_measurement="steps",
        state_class=SensorStateClass.TOTAL_INCREASING,
        suggested_display_precision=0,
        icon="mdi:walk",
        value_fn=_get_steps,
    ),
    # Glucose
    UltrahumanSensorEntityDescription(
        key="metabolic_score",
        translation_key="metabolic_score",
        native_unit_of_measurement="score",
        state_class=SensorStateClass.MEASUREMENT,
        suggested_display_precision=0,
        icon="mdi:chart-arc",
        value_fn=_get_metabolic_score,
    ),
    UltrahumanSensorEntityDescription(
        key="glucose_variability",
        translation_key="glucose_variability",
        native_unit_of_measurement=PERCENTAGE,
        state_class=SensorStateClass.MEASUREMENT,
        suggested_display_precision=1,
        icon="mdi:chart-line-variant",
        value_fn=_get_glucose_variability,
    ),
    UltrahumanSensorEntityDescription(
        key="average_glucose",
        translation_key="average_glucose",
        native_unit_of_measurement="mg/dL",
        state_class=SensorStateClass.MEASUREMENT,
        suggested_display_precision=0,
        icon="mdi:diabetes",
        value_fn=_get_average_glucose,
    ),
    UltrahumanSensorEntityDescription(
        key="hba1c",
        translation_key="hba1c",
        native_unit_of_measurement=PERCENTAGE,
        state_class=SensorStateClass.MEASUREMENT,
        suggested_display_precision=1,
        icon="mdi:blood-bag",
        value_fn=_get_hba1c,
    ),
    UltrahumanSensorEntityDescription(
        key="time_in_target",
        translation_key="time_in_target",
        native_unit_of_measurement=PERCENTAGE,
        state_class=SensorStateClass.MEASUREMENT,
        suggested_display_precision=1,
        icon="mdi:target",
        value_fn=_get_time_in_target,
    ),
    # Recovery & Movement
    UltrahumanSensorEntityDescription(
        key="recovery_index",
        translation_key="recovery_index",
        native_unit_of_measurement="score",
        state_class=SensorStateClass.MEASUREMENT,
        suggested_display_precision=0,
        icon="mdi:meditation",
        value_fn=_get_recovery_index,
    ),
    UltrahumanSensorEntityDescription(
        key="movement_index",
        translation_key="movement_index",
        native_unit_of_measurement="score",
        state_class=SensorStateClass.MEASUREMENT,
        suggested_display_precision=0,
        icon="mdi:run",
        value_fn=_get_movement_index,
    ),
    # VO2 Max
    UltrahumanSensorEntityDescription(
        key="vo2_max",
        translation_key="vo2_max",
        native_unit_of_measurement="mL/kg/min",
        state_class=SensorStateClass.MEASUREMENT,
        suggested_display_precision=1,
        icon="mdi:lungs",
        value_fn=_get_vo2_max,
    ),
)


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up Ultrahuman sensors from a config entry."""
    coordinator: UltrahumanDataUpdateCoordinator = hass.data[DOMAIN][entry.entry_id]

    async_add_entities(
        UltrahumanSensor(coordinator, description, entry)
        for description in SENSOR_DESCRIPTIONS
    )


class UltrahumanSensor(
    CoordinatorEntity[UltrahumanDataUpdateCoordinator], SensorEntity
):
    """Representation of an Ultrahuman sensor."""

    entity_description: UltrahumanSensorEntityDescription
    _attr_has_entity_name = True

    def __init__(
        self,
        coordinator: UltrahumanDataUpdateCoordinator,
        description: UltrahumanSensorEntityDescription,
        entry: ConfigEntry,
    ) -> None:
        """Initialize the sensor."""
        super().__init__(coordinator)
        self.entity_description = description
        self._attr_unique_id = f"{entry.entry_id}_{description.key}"
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, entry.entry_id)},
            name=f"Ultrahuman Ring ({entry.data[CONF_EMAIL]})",
            manufacturer="Ultrahuman",
            model="Ring AIR",
            entry_type=DeviceEntryType.SERVICE,
        )

    @property
    def native_value(self) -> Any:
        """Return the sensor value."""
        if self.coordinator.data is None:
            return None
        return self.entity_description.value_fn(self.coordinator.data)
