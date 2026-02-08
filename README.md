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

## Data Fetching

**No data is stored in Home Assistant.** Data is fetched from the Ultrahuman API only when you explicitly request an update. There is no automatic polling interval. To refresh sensor data, use the `homeassistant.update_entity` service or press the refresh button in the UI.

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

## Dashboard Card

The integration includes a custom Lovelace card that displays all your Ultrahuman Ring metrics in a beautiful dark-themed layout with ring-shaped score visualizations.

### Card Features

- SVG ring graphic with animated score arcs for Sleep, Recovery, and Movement
- Organized sections: Sleep, Heart, Body & Activity, Glucose & Metabolism
- Built-in refresh button to fetch latest data on demand
- Responsive design for mobile and desktop
- Matches Ultrahuman's dark aesthetic and brand colors

### Setup

The card JS resource is auto-registered when the integration loads. If auto-registration doesn't work, add it manually:

1. Go to **Settings** > **Dashboards** > **Resources** (top right menu).
2. Click **Add Resource**.
3. Enter URL: `/ultrahuman/ultrahuman-ring-card.js`
4. Select **JavaScript Module**.

Then add the card to any dashboard:

```yaml
type: custom:ultrahuman-ring-card
entity_prefix: sensor.ultrahuman_ring_your_email_com
```

Replace `entity_prefix` with the common prefix of your sensor entities. Find this in **Developer Tools** > **States** by filtering for `ultrahuman`.

## Requirements

- An Ultrahuman Ring AIR device
- An Ultrahuman Partner API key (contact Ultrahuman for access)
- Home Assistant 2024.1.0 or later

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
