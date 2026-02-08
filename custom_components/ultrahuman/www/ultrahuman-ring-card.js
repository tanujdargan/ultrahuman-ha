/**
 * Ultrahuman Ring Card - Custom Lovelace Card for Home Assistant
 * Displays health metrics from the Ultrahuman Ring integration
 */

const CARD_VERSION = "1.0.0";

class UltrahumanRingCard extends HTMLElement {
  static get properties() {
    return { hass: {}, config: {} };
  }

  set hass(hass) {
    this._hass = hass;
    if (this._initialized) {
      this._updateValues();
    }
  }

  setConfig(config) {
    if (!config.entity_prefix) {
      throw new Error("Please define entity_prefix (e.g. 'sensor.ultrahuman_ring')");
    }
    this._config = config;
    this._initialized = false;
    this._render();
    this._initialized = true;
  }

  getCardSize() {
    return 8;
  }

  _getEntityId(key) {
    return `${this._config.entity_prefix}_${key}`;
  }

  _getState(key) {
    const entityId = this._getEntityId(key);
    const entity = this._hass?.states[entityId];
    if (!entity || entity.state === "unknown" || entity.state === "unavailable") {
      return null;
    }
    return entity.state;
  }

  _getNumericState(key) {
    const val = this._getState(key);
    if (val === null || val === "None") return null;
    const num = parseFloat(val);
    return isNaN(num) ? null : num;
  }

  _formatMinutes(mins) {
    if (mins === null) return "--";
    const h = Math.floor(mins / 60);
    const m = Math.round(mins % 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }

  _getScoreColor(score, max = 100) {
    if (score === null) return "#46494D";
    const pct = score / max;
    if (pct >= 0.8) return "#0EFF27";
    if (pct >= 0.6) return "#FCDD00";
    if (pct >= 0.4) return "#FD9400";
    return "#FF4500";
  }

  _render() {
    if (!this.shadowRoot) {
      this.attachShadow({ mode: "open" });
    }

    this.shadowRoot.innerHTML = `
      <ha-card>
        <style>
          ${this._getStyles()}
        </style>
        <div class="uh-card">
          ${this._renderHeader()}
          <div class="uh-body">
            ${this._renderScoreRings()}
            ${this._renderSection("Sleep", "sleep", this._getSleepMetrics())}
            ${this._renderSection("Heart", "heart", this._getHeartMetrics())}
            ${this._renderSection("Body & Activity", "activity", this._getActivityMetrics())}
            ${this._renderSection("Glucose & Metabolism", "glucose", this._getGlucoseMetrics())}
          </div>
          <div class="uh-footer">
            <span class="uh-footer-text">Ultrahuman Ring AIR</span>
            <button class="uh-refresh" id="refreshBtn" title="Refresh data">
              <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M17.65 6.35A7.96 7.96 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>
            </button>
          </div>
        </div>
      </ha-card>
    `;

    this.shadowRoot.getElementById("refreshBtn")?.addEventListener("click", () => {
      this._refreshData();
    });
  }

  _refreshData() {
    if (!this._hass) return;
    const metrics = [
      "sleep_score", "total_sleep", "sleep_efficiency", "deep_sleep",
      "rem_sleep", "light_sleep", "restorative_sleep", "spo2",
      "heart_rate", "resting_heart_rate", "hrv",
      "skin_temperature", "steps",
      "metabolic_score", "glucose_variability", "average_glucose",
      "hba1c", "time_in_target",
      "recovery_index", "movement_index", "vo2_max",
    ];
    for (const key of metrics) {
      const entityId = this._getEntityId(key);
      if (this._hass.states[entityId]) {
        this._hass.callService("homeassistant", "update_entity", {
          entity_id: entityId,
        });
      }
    }
    const btn = this.shadowRoot.getElementById("refreshBtn");
    if (btn) {
      btn.classList.add("spinning");
      setTimeout(() => btn.classList.remove("spinning"), 1500);
    }
  }

  _renderHeader() {
    return `
      <div class="uh-header">
        <div class="uh-ring-container">
          ${this._renderRingSVG()}
        </div>
        <div class="uh-header-text">
          <div class="uh-brand">ULTRAHUMAN</div>
          <div class="uh-model">Ring AIR</div>
        </div>
      </div>
    `;
  }

  _renderRingSVG() {
    const sleepScore = this._getNumericState("sleep_score");
    const recoveryIndex = this._getNumericState("recovery_index");
    const movementIndex = this._getNumericState("movement_index");

    const sleepPct = sleepScore !== null ? sleepScore / 100 : 0;
    const recoveryPct = recoveryIndex !== null ? recoveryIndex / 100 : 0;
    const movementPct = movementIndex !== null ? movementIndex / 100 : 0;

    const sleepColor = this._getScoreColor(sleepScore);
    const recoveryColor = this._getScoreColor(recoveryIndex);
    const movementColor = this._getScoreColor(movementIndex);

    const sleepDash = sleepPct * 251.2;
    const recoveryDash = recoveryPct * 226.08;
    const movementDash = movementPct * 200.96;

    return `
    <svg viewBox="0 0 200 200" class="uh-ring-svg" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#2A2A2A;stop-opacity:1" />
          <stop offset="50%" style="stop-color:#1A1A1A;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#333333;stop-opacity:1" />
        </linearGradient>
        <linearGradient id="ringShine" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#555555;stop-opacity:0.6" />
          <stop offset="30%" style="stop-color:#333333;stop-opacity:0" />
          <stop offset="70%" style="stop-color:#333333;stop-opacity:0" />
          <stop offset="100%" style="stop-color:#555555;stop-opacity:0.3" />
        </linearGradient>
        <filter id="ringDropShadow">
          <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="#000" flood-opacity="0.5"/>
        </filter>
        <filter id="innerGlow">
          <feGaussianBlur stdDeviation="2" result="glow"/>
          <feMerge><feMergeNode in="glow"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      <!-- Physical ring body -->
      <circle cx="100" cy="100" r="78" fill="none" stroke="url(#ringGrad)" stroke-width="18" filter="url(#ringDropShadow)" opacity="0.4"/>
      <circle cx="100" cy="100" r="78" fill="none" stroke="url(#ringShine)" stroke-width="18" opacity="0.3"/>

      <!-- Score track backgrounds -->
      <circle cx="100" cy="100" r="78" fill="none" stroke="#1A1A1A" stroke-width="5" opacity="0.8"/>
      <circle cx="100" cy="100" r="68" fill="none" stroke="#1A1A1A" stroke-width="5" opacity="0.8"/>
      <circle cx="100" cy="100" r="58" fill="none" stroke="#1A1A1A" stroke-width="5" opacity="0.8"/>

      <!-- Inner ring surface -->
      <circle cx="100" cy="100" r="48" fill="#0D0D0D" stroke="#1A1A1A" stroke-width="1"/>

      <!-- Score arcs (sleep=outer, recovery=mid, movement=inner) -->
      <circle class="score-arc" cx="100" cy="100" r="78" fill="none"
        stroke="${sleepColor}" stroke-width="5" stroke-linecap="round"
        stroke-dasharray="${sleepDash} 251.2"
        transform="rotate(-90 100 100)" filter="url(#innerGlow)" opacity="0.9"/>

      <circle class="score-arc" cx="100" cy="100" r="68" fill="none"
        stroke="${recoveryColor}" stroke-width="5" stroke-linecap="round"
        stroke-dasharray="${recoveryDash} 226.08"
        transform="rotate(-90 100 100)" filter="url(#innerGlow)" opacity="0.9"/>

      <circle class="score-arc" cx="100" cy="100" r="58" fill="none"
        stroke="${movementColor}" stroke-width="5" stroke-linecap="round"
        stroke-dasharray="${movementDash} 200.96"
        transform="rotate(-90 100 100)" filter="url(#innerGlow)" opacity="0.9"/>

      <!-- Center icon -->
      <text x="100" y="93" text-anchor="middle" fill="#ffffff" font-size="18" font-weight="bold" font-family="Helvetica Neue, Arial, sans-serif" id="centerScore">
        ${sleepScore !== null ? sleepScore : "--"}
      </text>
      <text x="100" y="112" text-anchor="middle" fill="#888888" font-size="10" font-family="Helvetica Neue, Arial, sans-serif">
        SLEEP
      </text>
    </svg>
    `;
  }

  _renderScoreRings() {
    const sleep = this._getNumericState("sleep_score");
    const recovery = this._getNumericState("recovery_index");
    const movement = this._getNumericState("movement_index");

    return `
    <div class="uh-scores">
      ${this._renderMiniRing("Sleep", sleep, this._getScoreColor(sleep))}
      ${this._renderMiniRing("Recovery", recovery, this._getScoreColor(recovery))}
      ${this._renderMiniRing("Movement", movement, this._getScoreColor(movement))}
    </div>
    `;
  }

  _renderMiniRing(label, value, color) {
    const pct = value !== null ? value / 100 : 0;
    const dash = pct * 157.08;
    return `
    <div class="uh-mini-ring">
      <svg viewBox="0 0 60 60" class="uh-mini-svg">
        <circle cx="30" cy="30" r="25" fill="none" stroke="#1A1A1A" stroke-width="4"/>
        <circle cx="30" cy="30" r="25" fill="none" stroke="${color}" stroke-width="4"
          stroke-linecap="round" stroke-dasharray="${dash} 157.08"
          transform="rotate(-90 30 30)" opacity="0.9"/>
        <text x="30" y="33" text-anchor="middle" fill="#ffffff" font-size="12" font-weight="bold" font-family="Helvetica Neue, Arial, sans-serif">
          ${value !== null ? value : "--"}
        </text>
      </svg>
      <span class="uh-mini-label">${label}</span>
    </div>
    `;
  }

  _getSleepMetrics() {
    return [
      { key: "total_sleep", label: "Total Sleep", icon: "🛏️", format: (v) => this._formatMinutes(v) },
      { key: "sleep_efficiency", label: "Efficiency", icon: "✨", suffix: "%" },
      { key: "deep_sleep", label: "Deep Sleep", icon: "🌊", format: (v) => this._formatMinutes(v) },
      { key: "rem_sleep", label: "REM Sleep", icon: "🧠", format: (v) => this._formatMinutes(v) },
      { key: "light_sleep", label: "Light Sleep", icon: "🌙", format: (v) => this._formatMinutes(v) },
      { key: "restorative_sleep", label: "Restorative", icon: "💚", suffix: "%" },
      { key: "spo2", label: "SpO2", icon: "🫁", suffix: "%" },
    ];
  }

  _getHeartMetrics() {
    return [
      { key: "heart_rate", label: "Heart Rate", icon: "❤️", suffix: " bpm" },
      { key: "resting_heart_rate", label: "Resting HR", icon: "💗", suffix: " bpm" },
      { key: "hrv", label: "HRV", icon: "💓", suffix: " ms" },
    ];
  }

  _getActivityMetrics() {
    return [
      { key: "steps", label: "Steps", icon: "👟", format: (v) => v !== null ? Math.round(v).toLocaleString() : "--" },
      { key: "skin_temperature", label: "Temperature", icon: "🌡️", format: (v) => v !== null ? `${parseFloat(v).toFixed(1)}°C` : "--" },
      { key: "vo2_max", label: "VO2 Max", icon: "🏃", suffix: "" },
    ];
  }

  _getGlucoseMetrics() {
    return [
      { key: "metabolic_score", label: "Metabolic Score", icon: "📊" },
      { key: "average_glucose", label: "Avg Glucose", icon: "🩸", suffix: " mg/dL" },
      { key: "glucose_variability", label: "Variability", icon: "📈", suffix: "%" },
      { key: "hba1c", label: "HbA1c", icon: "🔬", suffix: "%" },
      { key: "time_in_target", label: "In Target", icon: "🎯", suffix: "%" },
    ];
  }

  _renderSection(title, sectionClass, metrics) {
    const rows = metrics.map(m => this._renderMetricRow(m)).join("");
    return `
    <div class="uh-section ${sectionClass}">
      <div class="uh-section-title">${title}</div>
      <div class="uh-metrics-grid">
        ${rows}
      </div>
    </div>
    `;
  }

  _renderMetricRow(metric) {
    const val = this._getNumericState(metric.key);
    let display;
    if (metric.format) {
      display = metric.format(val);
    } else if (val !== null) {
      display = `${val}${metric.suffix || ""}`;
    } else {
      display = "--";
    }

    return `
    <div class="uh-metric" data-entity="${this._getEntityId(metric.key)}">
      <span class="uh-metric-icon">${metric.icon}</span>
      <span class="uh-metric-label">${metric.label}</span>
      <span class="uh-metric-value">${display}</span>
    </div>
    `;
  }

  _updateValues() {
    if (!this.shadowRoot || !this._hass) return;

    // Update the main ring SVG
    const ringContainer = this.shadowRoot.querySelector(".uh-ring-container");
    if (ringContainer) {
      ringContainer.innerHTML = this._renderRingSVG();
    }

    // Update score rings
    const scoresContainer = this.shadowRoot.querySelector(".uh-scores");
    if (scoresContainer) {
      const sleep = this._getNumericState("sleep_score");
      const recovery = this._getNumericState("recovery_index");
      const movement = this._getNumericState("movement_index");
      scoresContainer.innerHTML = `
        ${this._renderMiniRing("Sleep", sleep, this._getScoreColor(sleep))}
        ${this._renderMiniRing("Recovery", recovery, this._getScoreColor(recovery))}
        ${this._renderMiniRing("Movement", movement, this._getScoreColor(movement))}
      `;
    }

    // Update all metric rows
    const allMetrics = [
      ...this._getSleepMetrics(),
      ...this._getHeartMetrics(),
      ...this._getActivityMetrics(),
      ...this._getGlucoseMetrics(),
    ];

    for (const metric of allMetrics) {
      const entityId = this._getEntityId(metric.key);
      const el = this.shadowRoot.querySelector(`.uh-metric[data-entity="${entityId}"]`);
      if (!el) continue;
      const val = this._getNumericState(metric.key);
      let display;
      if (metric.format) {
        display = metric.format(val);
      } else if (val !== null) {
        display = `${val}${metric.suffix || ""}`;
      } else {
        display = "--";
      }
      const valueEl = el.querySelector(".uh-metric-value");
      if (valueEl) valueEl.textContent = display;
    }
  }

  _getStyles() {
    return `
      :host {
        --uh-bg: #0D0D0D;
        --uh-card-bg: #161616;
        --uh-section-bg: #1A1A1A;
        --uh-border: #2A2A2A;
        --uh-text: #FFFFFF;
        --uh-text-secondary: #888888;
        --uh-text-dim: #555555;
        --uh-green: #0EFF27;
        --uh-yellow: #FCDD00;
        --uh-orange: #FD9400;
        --uh-red: #FF4500;
      }

      ha-card {
        background: var(--uh-bg) !important;
        border: 1px solid var(--uh-border) !important;
        border-radius: 16px !important;
        overflow: hidden;
        font-family: "Helvetica Neue", Arial, sans-serif;
      }

      .uh-card {
        padding: 0;
      }

      /* ── Header ── */
      .uh-header {
        display: flex;
        align-items: center;
        gap: 20px;
        padding: 24px 24px 8px 24px;
        background: linear-gradient(180deg, #161616 0%, #0D0D0D 100%);
      }

      .uh-ring-container {
        width: 140px;
        height: 140px;
        flex-shrink: 0;
      }

      .uh-ring-svg {
        width: 100%;
        height: 100%;
      }

      .score-arc {
        transition: stroke-dasharray 0.8s ease-out;
      }

      .uh-header-text {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .uh-brand {
        font-size: 22px;
        font-weight: 700;
        letter-spacing: 4px;
        color: var(--uh-text);
      }

      .uh-model {
        font-size: 14px;
        font-weight: 400;
        letter-spacing: 2px;
        color: var(--uh-text-secondary);
      }

      /* ── Score Rings Row ── */
      .uh-scores {
        display: flex;
        justify-content: space-around;
        padding: 8px 24px 16px 24px;
        border-bottom: 1px solid var(--uh-border);
      }

      .uh-mini-ring {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
      }

      .uh-mini-svg {
        width: 56px;
        height: 56px;
      }

      .uh-mini-label {
        font-size: 10px;
        font-weight: 600;
        letter-spacing: 1px;
        text-transform: uppercase;
        color: var(--uh-text-secondary);
      }

      /* ── Body ── */
      .uh-body {
        padding: 0 16px 8px 16px;
      }

      /* ── Sections ── */
      .uh-section {
        margin-top: 16px;
      }

      .uh-section-title {
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 2px;
        text-transform: uppercase;
        color: var(--uh-text-dim);
        padding: 0 8px 8px 8px;
      }

      .uh-metrics-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }

      .uh-metric {
        display: flex;
        align-items: center;
        gap: 8px;
        background: var(--uh-section-bg);
        border-radius: 12px;
        padding: 12px;
        border: 1px solid var(--uh-border);
        transition: border-color 0.2s;
        cursor: default;
      }

      .uh-metric:hover {
        border-color: #3A3A3A;
      }

      .uh-metric-icon {
        font-size: 16px;
        flex-shrink: 0;
        width: 20px;
        text-align: center;
      }

      .uh-metric-label {
        font-size: 11px;
        color: var(--uh-text-secondary);
        flex: 1;
        min-width: 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .uh-metric-value {
        font-size: 14px;
        font-weight: 700;
        color: var(--uh-text);
        white-space: nowrap;
        font-variant-numeric: tabular-nums;
      }

      /* ── Footer ── */
      .uh-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 24px;
        border-top: 1px solid var(--uh-border);
      }

      .uh-footer-text {
        font-size: 10px;
        letter-spacing: 2px;
        color: var(--uh-text-dim);
        text-transform: uppercase;
      }

      .uh-refresh {
        background: none;
        border: 1px solid var(--uh-border);
        border-radius: 8px;
        color: var(--uh-text-secondary);
        cursor: pointer;
        padding: 6px 8px;
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 10px;
        transition: all 0.2s;
      }

      .uh-refresh:hover {
        border-color: var(--uh-green);
        color: var(--uh-green);
      }

      .uh-refresh.spinning svg {
        animation: spin 1s linear infinite;
      }

      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }

      /* ── Responsive ── */
      @media (max-width: 400px) {
        .uh-metrics-grid {
          grid-template-columns: 1fr;
        }
        .uh-header {
          flex-direction: column;
          text-align: center;
        }
        .uh-ring-container {
          width: 120px;
          height: 120px;
        }
      }
    `;
  }
}

// ── Editor for card configuration UI ──
class UltrahumanRingCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = config;
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
  }

  _render() {
    if (!this.shadowRoot) {
      this.attachShadow({ mode: "open" });
    }
    this.shadowRoot.innerHTML = `
      <style>
        .editor-row {
          margin-bottom: 12px;
        }
        label {
          display: block;
          margin-bottom: 4px;
          font-weight: 500;
          font-size: 14px;
        }
        input {
          width: 100%;
          padding: 8px;
          border: 1px solid var(--divider-color, #ccc);
          border-radius: 4px;
          box-sizing: border-box;
        }
        .hint {
          font-size: 12px;
          color: var(--secondary-text-color, #888);
          margin-top: 4px;
        }
      </style>
      <div class="editor-row">
        <label for="prefix">Entity Prefix</label>
        <input id="prefix" type="text"
          value="${this._config.entity_prefix || ""}"
          placeholder="sensor.ultrahuman_ring_your_email_com"
        />
        <div class="hint">
          The common prefix for all Ultrahuman sensor entities. Check your entity IDs in Developer Tools → States.
        </div>
      </div>
    `;

    this.shadowRoot.getElementById("prefix").addEventListener("input", (e) => {
      this._config = { ...this._config, entity_prefix: e.target.value };
      this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this._config } }));
    });
  }
}

customElements.define("ultrahuman-ring-card", UltrahumanRingCard);
customElements.define("ultrahuman-ring-card-editor", UltrahumanRingCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "ultrahuman-ring-card",
  name: "Ultrahuman Ring Card",
  description: "Display health metrics from your Ultrahuman Ring AIR",
  preview: true,
  documentationURL: "https://github.com/tanujdargan/ultrahuman-ha",
});

console.info(
  `%c ULTRAHUMAN RING CARD %c v${CARD_VERSION} `,
  "background: #0EFF27; color: #000; font-weight: bold; padding: 2px 6px; border-radius: 4px 0 0 4px;",
  "background: #1A1A1A; color: #0EFF27; font-weight: bold; padding: 2px 6px; border-radius: 0 4px 4px 0;"
);
