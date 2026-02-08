# Ultrahuman Ring - Home Assistant Integration

A custom Home Assistant integration for the [Ultrahuman Ring AIR](https://www.ultrahuman.com/) that fetches health and wellness data from the Ultrahuman Partner API.

## Features

This integration exposes the following sensors from your Ultrahuman Ring:

### Sleep
- **Sleep Score** - Overall sleep quality score
- **Total Sleep** - Total sleep duration in minutes
- **Sleep Efficiency** - Sleep efficiency percentage
- **Deep Sleep** - Deep sleep duration in minutes
- **REM Sleep** - REM sleep duration in minutes
- **Light Sleep** - Light sleep duration in minutes
- **Restorative Sleep** - Restorative sleep percentage
- **SpO2** - Blood oxygen saturation

### Heart
- **Heart Rate** - Latest heart rate reading (BPM)
- **Resting Heart Rate** - Resting heart rate average (BPM)
- **HRV** - Heart rate variability average (ms)

### Body
- **Skin Temperature** - Skin temperature reading (°C)
- **Steps** - Total daily steps

### Glucose & Metabolism
- **Metabolic Score** - Metabolic health score
- **Glucose Variability** - Glucose variability percentage
- **Average Glucose** - Average glucose level (mg/dL)
- **HbA1c** - Glycated hemoglobin percentage
- **Time in Target** - Time in target glucose range (%)

### Activity & Recovery
- **Recovery Index** - Recovery score
- **Movement Index** - Movement/activity score
- **VO2 Max** - Maximum oxygen uptake (mL/kg/min)

## Data Fetching & History

Data is automatically fetched from the Ultrahuman API **every 30 minutes**. All sensors support Home Assistant's long-term statistics, so you can track your health metrics over time — just like energy or power usage.

Use the **Statistics Graph** card to visualize trends:

```yaml
type: statistics-graph
title: "Health Trends"
entities:
  - sensor.ultrahuman_ring_sleep_score
  - sensor.ultrahuman_ring_hrv
days_to_show: 30
period: day
stat_types:
  - mean
```

You can also trigger a manual refresh at any time via the `homeassistant.update_entity` service or the refresh button in the UI.

## Installation

### HACS (Recommended)

1. Open HACS in your Home Assistant instance.
2. Go to **Integrations** > **Custom repositories**.
3. Add this repository URL: `https://github.com/tanujdargan/ultrahuman-ha`
4. Select **Integration** as the category.
5. Click **Download**.
6. Restart Home Assistant.

### Manual Installation

1. Copy the `custom_components/ultrahuman` folder into your Home Assistant `custom_components` directory.
2. Restart Home Assistant.

## Configuration

1. Go to **Settings** > **Devices & Services** > **Add Integration**.
2. Search for **Ultrahuman**.
3. Enter your **Ultrahuman Partner API key** and the **email address** associated with your Ultrahuman account.
4. The integration will validate your credentials and set up all available sensors.

## Requirements

- An Ultrahuman Ring AIR device
- An Ultrahuman Partner API key (contact Ultrahuman for access)
- Home Assistant 2024.1.0 or later

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
