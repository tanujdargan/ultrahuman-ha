/**
 * Ultrahuman Ring Card v2 - Custom Lovelace Card for Home Assistant
 * Faithful recreation of the Ultrahuman app dashboard aesthetic
 */

const CARD_VERSION = "2.0.0";

class UltrahumanRingCard extends HTMLElement {
  static get properties() {
    return { hass: {}, config: {} };
  }

  static getConfigElement() {
    return document.createElement("ultrahuman-ring-card-editor");
  }

  static getStubConfig() {
    return { entity_prefix: "sensor.ultrahuman_ring_your_email_com" };
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
    return 12;
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
    return `${h}<span class="unit">h</span> ${m}<span class="unit">m</span>`;
  }

  _formatMinutesPlain(mins) {
    if (mins === null) return "--";
    const h = Math.floor(mins / 60);
    const m = Math.round(mins % 60);
    return `${h}h ${m}m`;
  }

  _getScoreColor(score) {
    if (score === null) return "#46494D";
    if (score >= 80) return "#0EFF27";
    if (score >= 60) return "#FCDD00";
    if (score >= 40) return "#FD9400";
    return "#FF4500";
  }

  _getScoreLabel(score) {
    if (score === null) return "";
    if (score >= 80) return "Optimal";
    if (score >= 60) return "Good";
    if (score >= 40) return "Needs attention";
    return "Low";
  }

  _render() {
    if (!this.shadowRoot) {
      this.attachShadow({ mode: "open" });
    }

    this.shadowRoot.innerHTML = `
      <ha-card>
        <style>${this._getStyles()}</style>
        <div class="uh-card">
          ${this._renderHeader()}
          <div class="uh-snapshot-section" id="snapshotSection">
            ${this._renderSnapshot()}
          </div>
          <div class="uh-core-title">Core Metrics</div>
          <div class="uh-body">
            <div id="sleepCard">${this._renderSleepCard()}</div>
            <div id="movementCard">${this._renderMovementCard()}</div>
            <div id="recoveryCard">${this._renderRecoveryCard()}</div>
            <div id="heartCard">${this._renderHeartCard()}</div>
            <div id="glucoseCard">${this._renderGlucoseCard()}</div>
          </div>
          ${this._renderFooter()}
        </div>
      </ha-card>
    `;

    this.shadowRoot.getElementById("refreshBtn")?.addEventListener("click", () => {
      this._refreshData();
    });
  }

  /* ── Header with ring SVG ── */
  _renderHeader() {
    return `
      <div class="uh-header">
        <div class="uh-header-top">
          <span class="uh-brand">ULTRAHUMAN</span>
          <button class="uh-refresh-btn" id="refreshBtn" title="Refresh data">
            <svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M17.65 6.35A7.96 7.96 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>
          </button>
        </div>
        <div class="uh-ring-hero">
          ${this._renderRingSVG()}
        </div>
      </div>
    `;
  }

  _renderRingSVG() {
    const sleep = this._getNumericState("sleep_score");
    const recovery = this._getNumericState("recovery_index");
    const movement = this._getNumericState("movement_index");

    const r1 = 86, r2 = 74, r3 = 62;
    const c1 = 2 * Math.PI * r1, c2 = 2 * Math.PI * r2, c3 = 2 * Math.PI * r3;
    const d1 = (sleep !== null ? sleep / 100 : 0) * c1;
    const d2 = (recovery !== null ? recovery / 100 : 0) * c2;
    const d3 = (movement !== null ? movement / 100 : 0) * c3;

    return `
    <svg viewBox="0 0 200 200" class="ring-svg" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="rg1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#2A2D2B"/>
          <stop offset="50%" stop-color="#1A1C1B"/>
          <stop offset="100%" stop-color="#2E3230"/>
        </linearGradient>
        <filter id="rs"><feDropShadow dx="0" dy="3" stdDeviation="6" flood-color="#000" flood-opacity="0.6"/></filter>
        <filter id="ag"><feGaussianBlur stdDeviation="1.5" result="g"/><feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>

      <!-- Ring body -->
      <circle cx="100" cy="100" r="80" fill="none" stroke="url(#rg1)" stroke-width="22" filter="url(#rs)" opacity="0.35"/>

      <!-- Track backgrounds -->
      <circle cx="100" cy="100" r="${r1}" fill="none" stroke="#1A1C1B" stroke-width="6"/>
      <circle cx="100" cy="100" r="${r2}" fill="none" stroke="#1A1C1B" stroke-width="6"/>
      <circle cx="100" cy="100" r="${r3}" fill="none" stroke="#1A1C1B" stroke-width="6"/>

      <!-- Score arcs -->
      <circle cx="100" cy="100" r="${r1}" fill="none"
        stroke="${this._getScoreColor(sleep)}" stroke-width="6" stroke-linecap="round"
        stroke-dasharray="${d1} ${c1}" transform="rotate(-90 100 100)" filter="url(#ag)" class="arc"/>
      <circle cx="100" cy="100" r="${r2}" fill="none"
        stroke="${this._getScoreColor(recovery)}" stroke-width="6" stroke-linecap="round"
        stroke-dasharray="${d2} ${c2}" transform="rotate(-90 100 100)" filter="url(#ag)" class="arc"/>
      <circle cx="100" cy="100" r="${r3}" fill="none"
        stroke="${this._getScoreColor(movement)}" stroke-width="6" stroke-linecap="round"
        stroke-dasharray="${d3} ${c3}" transform="rotate(-90 100 100)" filter="url(#ag)" class="arc"/>

      <!-- Inner surface -->
      <circle cx="100" cy="100" r="52" fill="#0A0A0A"/>

      <!-- Ring icon -->
      <path d="M100 78 C108 78 114 84 114 92 L114 108 C114 116 108 122 100 122 C92 122 86 116 86 108 L86 92 C86 84 92 78 100 78Z" fill="none" stroke="#3A3A3A" stroke-width="1.5"/>
      <circle cx="100" cy="88" r="3" fill="#3A3A3A"/>
    </svg>
    <div class="ring-legend">
      <div class="legend-item"><span class="legend-dot" style="background:${this._getScoreColor(sleep)}"></span><span class="legend-label">Sleep ${sleep ?? "--"}</span></div>
      <div class="legend-item"><span class="legend-dot" style="background:${this._getScoreColor(recovery)}"></span><span class="legend-label">Recovery ${recovery ?? "--"}</span></div>
      <div class="legend-item"><span class="legend-dot" style="background:${this._getScoreColor(movement)}"></span><span class="legend-label">Movement ${movement ?? "--"}</span></div>
    </div>
    `;
  }

  /* ── Snapshot quick-glance pills ── */
  _renderSnapshot() {
    const temp = this._getNumericState("skin_temperature");
    const spo2 = this._getNumericState("spo2");
    const steps = this._getNumericState("steps");
    const hr = this._getNumericState("heart_rate");
    const hrv = this._getNumericState("hrv");

    return `
    <div class="snapshot-title">Snapshot</div>
    <div class="snapshot-row">
      ${this._snapshotPill("thermometer", temp !== null ? parseFloat(temp).toFixed(1) : "--", "°C")}
      ${this._snapshotPill("oxygen", spo2 ?? "--", "%")}
      ${this._snapshotPill("shoe-print", steps !== null ? Math.round(steps).toLocaleString() : "--", "steps")}
      ${this._snapshotPill("heart-pulse", hr ?? "--", "bpm")}
      ${this._snapshotPill("wave", hrv ?? "--", "ms")}
    </div>
    `;
  }

  _snapshotPill(iconName, value, unit) {
    const icons = {
      "thermometer": `<svg viewBox="0 0 24 24" width="18" height="18"><path fill="#888" d="M15 13V5c0-1.66-1.34-3-3-3S9 3.34 9 5v8c-1.21.91-2 2.37-2 4 0 2.76 2.24 5 5 5s5-2.24 5-5c0-1.63-.79-3.09-2-4m-4-8c0-.55.45-1 1-1s1 .45 1 1v3h-2V5z"/></svg>`,
      "oxygen": `<svg viewBox="0 0 24 24" width="18" height="18"><path fill="#888" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2m0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8m-1-6.5c0 .83-.67 1.5-1.5 1.5S8 14.33 8 13.5v-3C8 9.67 8.67 9 9.5 9s1.5.67 1.5 1.5v3m5.5 0c0 .83-.67 1.5-1.5 1.5s-1.5-.67-1.5-1.5v-3c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5v3z"/></svg>`,
      "shoe-print": `<svg viewBox="0 0 24 24" width="18" height="18"><path fill="#888" d="M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2M9.8 8.9 7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3C14.8 12 16.8 13 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L6 8.3V13h2V9.6l1.8-.7"/></svg>`,
      "heart-pulse": `<svg viewBox="0 0 24 24" width="18" height="18"><path fill="#888" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`,
      "wave": `<svg viewBox="0 0 24 24" width="18" height="18"><path fill="#888" d="M3 12h4l3-9 4 18 3-9h4"/><path fill="none" stroke="#888" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M3 12h4l3-9 4 18 3-9h4"/></svg>`,
    };
    return `
    <div class="snapshot-pill">
      <div class="pill-icon">${icons[iconName] || ""}</div>
      <div class="pill-value">${value}</div>
      <div class="pill-unit">${unit}</div>
    </div>
    `;
  }

  /* ── Sleep Card (green-tinted) ── */
  _renderSleepCard() {
    const score = this._getNumericState("sleep_score");
    const total = this._getNumericState("total_sleep");
    const efficiency = this._getNumericState("sleep_efficiency");
    const deep = this._getNumericState("deep_sleep");
    const rem = this._getNumericState("rem_sleep");
    const light = this._getNumericState("light_sleep");
    const restorative = this._getNumericState("restorative_sleep");
    const rhr = this._getNumericState("resting_heart_rate");
    const hrv = this._getNumericState("hrv");

    // Calculate sleep stage percentages
    const totalMin = (deep || 0) + (rem || 0) + (light || 0);
    const deepPct = totalMin > 0 ? Math.round((deep || 0) / totalMin * 100) : 0;
    const remPct = totalMin > 0 ? Math.round((rem || 0) / totalMin * 100) : 0;
    const lightPct = totalMin > 0 ? Math.round((light || 0) / totalMin * 100) : 0;
    const awakePct = Math.max(0, 100 - deepPct - remPct - lightPct);

    const scoreColor = this._getScoreColor(score);
    const label = this._getScoreLabel(score);

    return `
    <div class="core-card sleep-card">
      <div class="card-badge">SLEEP</div>
      <div class="card-score" style="color:${scoreColor}">${score ?? "--"}</div>
      <div class="card-subtitle">${label ? `${label}` : ""}</div>

      <div class="sleep-timeline">
        <div class="sleep-bar-container">
          <div class="sleep-bar">
            <div class="bar-segment deep" style="width:${deepPct}%"></div>
            <div class="bar-segment light" style="width:${lightPct}%"></div>
            <div class="bar-segment rem" style="width:${remPct}%"></div>
            <div class="bar-segment awake" style="width:${awakePct}%"></div>
          </div>
        </div>
        <div class="sleep-stages">
          <span class="stage"><span class="stage-dot deep"></span>Deep &middot; ${deepPct}%</span>
          <span class="stage"><span class="stage-dot light"></span>Light &middot; ${lightPct}%</span>
          <span class="stage"><span class="stage-dot rem"></span>REM &middot; ${remPct}%</span>
          <span class="stage"><span class="stage-dot awake"></span>Awake &middot; ${awakePct}%</span>
        </div>
      </div>

      <div class="card-divider"></div>

      <div class="contributors-title">Contributors</div>
      <div class="contributor-grid">
        ${this._contributorTile(this._formatMinutesPlain(total), "TOTAL SLEEP", score >= 70 ? "Optimal" : score >= 50 ? "Good" : "Low")}
        ${this._contributorTile(efficiency !== null ? `${efficiency}%` : "--", "EFFICIENCY", efficiency >= 90 ? "Optimal" : efficiency >= 80 ? "Good" : "Low")}
        ${this._contributorTile(restorative !== null ? `${restorative}%` : "--", "RESTORATIVE SLEEP", restorative >= 35 ? "Good" : "Needs attention")}
        ${this._contributorTile(rhr !== null ? `${rhr}` : "--", "RESTING HR", null, "bpm")}
      </div>
    </div>
    `;
  }

  _contributorTile(value, label, tag, unit) {
    const tagColor = !tag ? "" : tag === "Optimal" ? "#0EFF27" : tag === "Good" ? "#E3CD77" : "#FF4564";
    const tagBg = !tag ? "" : tag === "Optimal" ? "rgba(14,255,39,0.12)" : tag === "Good" ? "rgba(227,205,119,0.12)" : "rgba(255,69,100,0.12)";
    return `
    <div class="contributor-tile">
      <div class="contrib-value">${value}${unit ? `<span class="contrib-unit">${unit}</span>` : ""}</div>
      <div class="contrib-label">${label}</div>
      ${tag ? `<div class="contrib-tag" style="color:${tagColor};background:${tagBg}">${tag}</div>` : ""}
    </div>
    `;
  }

  /* ── Movement Card ── */
  _renderMovementCard() {
    const score = this._getNumericState("movement_index");
    const steps = this._getNumericState("steps");
    const vo2 = this._getNumericState("vo2_max");
    const scoreColor = this._getScoreColor(score);

    return `
    <div class="core-card movement-card">
      <div class="card-badge">MOVEMENT</div>
      <div class="card-score" style="color:${scoreColor}">${score ?? "--"}</div>
      <div class="card-divider"></div>
      <div class="stat-row">
        <div class="stat-block">
          <div class="stat-value">${steps !== null ? Math.round(steps).toLocaleString() : "--"}</div>
          <div class="stat-label">TOTAL STEPS</div>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-block">
          <div class="stat-value">${vo2 ?? "--"}<span class="stat-unit"> mL/kg/min</span></div>
          <div class="stat-label">VO2 MAX</div>
        </div>
      </div>
    </div>
    `;
  }

  /* ── Recovery Card ── */
  _renderRecoveryCard() {
    const score = this._getNumericState("recovery_index");
    const hrv = this._getNumericState("hrv");
    const rhr = this._getNumericState("resting_heart_rate");
    const temp = this._getNumericState("skin_temperature");
    const scoreColor = this._getScoreColor(score);

    return `
    <div class="core-card recovery-card">
      <div class="card-badge">DYNAMIC RECOVERY</div>
      <div class="card-score" style="color:${scoreColor}">${score ?? "--"}</div>
      <div class="card-divider"></div>
      <div class="recovery-metrics">
        ${this._recoveryRow("HRV Average", hrv !== null ? `${hrv} ms` : "--")}
        ${this._recoveryRow("Resting Heart Rate", rhr !== null ? `${rhr} bpm` : "--")}
        ${this._recoveryRow("Skin Temperature", temp !== null ? `${parseFloat(temp).toFixed(1)}°C` : "--")}
      </div>
    </div>
    `;
  }

  _recoveryRow(label, value) {
    return `
    <div class="recovery-row">
      <span class="recovery-label">${label}</span>
      <span class="recovery-value">${value}</span>
    </div>
    `;
  }

  /* ── Heart Card ── */
  _renderHeartCard() {
    const hr = this._getNumericState("heart_rate");
    const rhr = this._getNumericState("resting_heart_rate");
    const hrv = this._getNumericState("hrv");
    const spo2 = this._getNumericState("spo2");

    return `
    <div class="core-card heart-card">
      <div class="card-badge">HEART</div>
      <div class="heart-grid">
        <div class="heart-metric">
          <div class="heart-val">${hr ?? "--"}<span class="heart-unit"> bpm</span></div>
          <div class="heart-label">HEART RATE</div>
        </div>
        <div class="heart-metric">
          <div class="heart-val">${rhr ?? "--"}<span class="heart-unit"> bpm</span></div>
          <div class="heart-label">RESTING HR</div>
        </div>
        <div class="heart-metric">
          <div class="heart-val">${hrv ?? "--"}<span class="heart-unit"> ms</span></div>
          <div class="heart-label">HRV</div>
        </div>
        <div class="heart-metric">
          <div class="heart-val">${spo2 ?? "--"}<span class="heart-unit">%</span></div>
          <div class="heart-label">SpO2</div>
        </div>
      </div>
    </div>
    `;
  }

  /* ── Glucose Card ── */
  _renderGlucoseCard() {
    const metabolic = this._getNumericState("metabolic_score");
    const avgGlucose = this._getNumericState("average_glucose");
    const variability = this._getNumericState("glucose_variability");
    const hba1c = this._getNumericState("hba1c");
    const timeInTarget = this._getNumericState("time_in_target");

    const hasData = metabolic || avgGlucose || variability || hba1c || timeInTarget;

    return `
    <div class="core-card glucose-card">
      <div class="card-badge">GLUCOSE &amp; METABOLISM</div>
      ${!hasData ? `<div class="no-data">No glucose data available</div>` : `
        ${metabolic !== null ? `<div class="card-score" style="color:${this._getScoreColor(metabolic)}">${metabolic}</div><div class="card-subtitle">Metabolic Score</div><div class="card-divider"></div>` : ""}
        <div class="glucose-grid">
          ${this._glucoseMetric(avgGlucose, "mg/dL", "AVG GLUCOSE")}
          ${this._glucoseMetric(variability, "%", "VARIABILITY")}
          ${this._glucoseMetric(hba1c, "%", "HbA1c")}
          ${this._glucoseMetric(timeInTarget, "%", "IN TARGET")}
        </div>
      `}
    </div>
    `;
  }

  _glucoseMetric(value, unit, label) {
    return `
    <div class="glucose-item">
      <div class="glucose-val">${value ?? "--"}<span class="glucose-unit">${unit}</span></div>
      <div class="glucose-label">${label}</div>
    </div>
    `;
  }

  /* ── Footer ── */
  _renderFooter() {
    return `
    <div class="uh-footer">
      <div class="footer-ring-icon">
        <svg viewBox="0 0 24 24" width="16" height="16"><path d="M12 4C14.2 4 16 5.8 16 8L16 16C16 18.2 14.2 20 12 20C9.8 20 8 18.2 8 16L8 8C8 5.8 9.8 4 12 4Z" fill="none" stroke="#555" stroke-width="1.5"/><circle cx="12" cy="7" r="1.5" fill="#555"/></svg>
      </div>
      <span class="footer-text">Ultrahuman Ring AIR</span>
    </div>
    `;
  }

  /* ── Refresh ── */
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
        this._hass.callService("homeassistant", "update_entity", { entity_id: entityId });
      }
    }
    const btn = this.shadowRoot.getElementById("refreshBtn");
    if (btn) {
      btn.classList.add("spinning");
      setTimeout(() => btn.classList.remove("spinning"), 1500);
    }
  }

  /* ── Update (reactive) ── */
  _updateValues() {
    if (!this.shadowRoot || !this._hass) return;
    const ring = this.shadowRoot.querySelector(".uh-ring-hero");
    if (ring) ring.innerHTML = this._renderRingSVG();
    const snap = this.shadowRoot.getElementById("snapshotSection");
    if (snap) snap.innerHTML = this._renderSnapshot();
    const ids = ["sleepCard", "movementCard", "recoveryCard", "heartCard", "glucoseCard"];
    const renderers = [
      () => this._renderSleepCard(),
      () => this._renderMovementCard(),
      () => this._renderRecoveryCard(),
      () => this._renderHeartCard(),
      () => this._renderGlucoseCard(),
    ];
    ids.forEach((id, i) => {
      const el = this.shadowRoot.getElementById(id);
      if (el) el.innerHTML = renderers[i]();
    });
  }

  /* ══════════════════════ STYLES ══════════════════════ */
  _getStyles() {
    return `
      :host {
        --bg: #000000;
        --card-bg-sleep: linear-gradient(165deg, #0A2012 0%, #071A0E 40%, #050F08 100%);
        --card-bg-movement: linear-gradient(165deg, #0A2012 0%, #071A0E 40%, #050F08 100%);
        --card-bg-recovery: linear-gradient(165deg, #1A1708 0%, #12100A 40%, #0A0A06 100%);
        --card-bg-heart: linear-gradient(165deg, #1A0A0A 0%, #120808 40%, #0A0505 100%);
        --card-bg-glucose: linear-gradient(165deg, #0F0A1A 0%, #0A0812 40%, #06050A 100%);
        --card-border: rgba(255,255,255,0.06);
        --pill-bg: #1A1A1A;
        --text: #FFFFFF;
        --text-2: #999999;
        --text-3: #555555;
        --green: #0EFF27;
      }

      ha-card {
        background: var(--bg) !important;
        border: none !important;
        border-radius: 0 !important;
        overflow: hidden;
        font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif;
        -webkit-font-smoothing: antialiased;
      }

      .uh-card { padding: 0; }

      /* ── Header ── */
      .uh-header {
        padding: 20px 20px 0 20px;
      }
      .uh-header-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      }
      .uh-brand {
        font-size: 13px;
        font-weight: 800;
        letter-spacing: 3px;
        color: var(--text-2);
      }
      .uh-refresh-btn {
        background: none;
        border: none;
        color: var(--text-3);
        cursor: pointer;
        padding: 8px;
        border-radius: 50%;
        display: flex;
        transition: all 0.2s;
      }
      .uh-refresh-btn:hover { color: var(--green); background: rgba(14,255,39,0.08); }
      .uh-refresh-btn.spinning svg { animation: spin 1s linear infinite; }

      .uh-ring-hero {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 8px 0 16px 0;
      }
      .ring-svg { width: 150px; height: 150px; }
      .arc { transition: stroke-dasharray 0.8s ease-out; }

      .ring-legend {
        display: flex;
        gap: 16px;
        margin-top: 8px;
      }
      .legend-item {
        display: flex;
        align-items: center;
        gap: 5px;
      }
      .legend-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        flex-shrink: 0;
      }
      .legend-label {
        font-size: 11px;
        color: var(--text-2);
        font-weight: 500;
      }

      /* ── Snapshot ── */
      .uh-snapshot-section {
        padding: 0 20px 16px 20px;
        border-bottom: 1px solid var(--card-border);
      }
      .snapshot-title {
        font-size: 20px;
        font-weight: 700;
        color: var(--text);
        margin-bottom: 12px;
      }
      .snapshot-row {
        display: flex;
        gap: 8px;
        overflow-x: auto;
        scrollbar-width: none;
        -ms-overflow-style: none;
        padding-bottom: 4px;
      }
      .snapshot-row::-webkit-scrollbar { display: none; }

      .snapshot-pill {
        flex: 0 0 auto;
        min-width: 72px;
        background: var(--pill-bg);
        border-radius: 16px;
        padding: 14px 12px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        border: 1px solid var(--card-border);
      }
      .pill-icon { line-height: 0; }
      .pill-value {
        font-size: 18px;
        font-weight: 700;
        color: var(--text);
        font-variant-numeric: tabular-nums;
      }
      .pill-unit {
        font-size: 11px;
        color: var(--text-3);
        font-weight: 500;
      }

      /* ── Core Metrics ── */
      .uh-core-title {
        font-size: 22px;
        font-weight: 700;
        color: var(--text);
        padding: 20px 20px 12px 20px;
      }
      .uh-body {
        padding: 0 12px 12px 12px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      /* ── Card base ── */
      .core-card {
        border-radius: 20px;
        padding: 20px;
        border: 1px solid var(--card-border);
      }
      .sleep-card { background: var(--card-bg-sleep); }
      .movement-card { background: var(--card-bg-movement); }
      .recovery-card { background: var(--card-bg-recovery); }
      .heart-card { background: var(--card-bg-heart); }
      .glucose-card { background: var(--card-bg-glucose); }

      .card-badge {
        display: inline-block;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 1.5px;
        color: var(--text);
        background: rgba(255,255,255,0.08);
        padding: 5px 12px;
        border-radius: 8px;
        margin-bottom: 12px;
      }
      .card-score {
        font-size: 52px;
        font-weight: 800;
        line-height: 1;
        margin-bottom: 4px;
        font-variant-numeric: tabular-nums;
      }
      .card-subtitle {
        font-size: 13px;
        color: var(--text-2);
        margin-bottom: 8px;
      }
      .card-divider {
        height: 1px;
        background: var(--card-border);
        margin: 16px 0;
      }

      /* ── Sleep stages bar ── */
      .sleep-timeline { margin-top: 16px; }
      .sleep-bar-container { padding: 0 0 10px 0; }
      .sleep-bar {
        display: flex;
        height: 6px;
        border-radius: 3px;
        overflow: hidden;
        gap: 2px;
      }
      .bar-segment { border-radius: 3px; min-width: 2px; }
      .bar-segment.deep { background: #4A6CF7; }
      .bar-segment.light { background: #0EFF27; }
      .bar-segment.rem { background: #00CFCF; }
      .bar-segment.awake { background: #555555; }

      .sleep-stages {
        display: flex;
        flex-wrap: wrap;
        gap: 6px 14px;
      }
      .stage {
        display: flex;
        align-items: center;
        gap: 5px;
        font-size: 12px;
        color: var(--text-2);
        font-weight: 500;
      }
      .stage-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        flex-shrink: 0;
      }
      .stage-dot.deep { background: #4A6CF7; }
      .stage-dot.light { background: #0EFF27; }
      .stage-dot.rem { background: #00CFCF; }
      .stage-dot.awake { background: #555555; }

      /* ── Contributors ── */
      .contributors-title {
        font-size: 15px;
        font-weight: 600;
        color: var(--text);
        margin-bottom: 12px;
      }
      .contributor-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }
      .contributor-tile {
        background: rgba(255,255,255,0.04);
        border: 1px solid var(--card-border);
        border-radius: 14px;
        padding: 14px;
      }
      .contrib-value {
        font-size: 22px;
        font-weight: 700;
        color: var(--text);
        line-height: 1.2;
        font-variant-numeric: tabular-nums;
      }
      .contrib-unit {
        font-size: 13px;
        font-weight: 400;
        color: var(--text-2);
      }
      .contrib-label {
        font-size: 10px;
        font-weight: 600;
        letter-spacing: 0.5px;
        color: var(--text-3);
        margin-top: 4px;
        text-transform: uppercase;
      }
      .contrib-tag {
        display: inline-block;
        font-size: 11px;
        font-weight: 600;
        padding: 2px 8px;
        border-radius: 6px;
        margin-top: 6px;
      }

      /* ── Movement stats row ── */
      .stat-row {
        display: flex;
        align-items: center;
        background: rgba(255,255,255,0.04);
        border-radius: 14px;
        padding: 16px;
        border: 1px solid var(--card-border);
      }
      .stat-block {
        flex: 1;
        text-align: center;
      }
      .stat-value {
        font-size: 22px;
        font-weight: 700;
        color: var(--text);
        font-variant-numeric: tabular-nums;
      }
      .stat-unit {
        font-size: 11px;
        font-weight: 400;
        color: var(--text-2);
      }
      .stat-label {
        font-size: 10px;
        font-weight: 600;
        letter-spacing: 0.5px;
        color: var(--text-3);
        margin-top: 2px;
        text-transform: uppercase;
      }
      .stat-divider {
        width: 1px;
        height: 32px;
        background: var(--card-border);
        margin: 0 8px;
      }

      /* ── Recovery metrics ── */
      .recovery-metrics {
        display: flex;
        flex-direction: column;
        gap: 0;
      }
      .recovery-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 0;
        border-bottom: 1px solid var(--card-border);
      }
      .recovery-row:last-child { border-bottom: none; }
      .recovery-label {
        font-size: 13px;
        color: var(--text-2);
      }
      .recovery-value {
        font-size: 14px;
        font-weight: 600;
        color: var(--text);
        font-variant-numeric: tabular-nums;
      }

      /* ── Heart grid ── */
      .heart-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
        margin-top: 4px;
      }
      .heart-metric {
        background: rgba(255,255,255,0.04);
        border: 1px solid var(--card-border);
        border-radius: 14px;
        padding: 14px;
      }
      .heart-val {
        font-size: 22px;
        font-weight: 700;
        color: var(--text);
        font-variant-numeric: tabular-nums;
      }
      .heart-unit {
        font-size: 12px;
        font-weight: 400;
        color: var(--text-2);
      }
      .heart-label {
        font-size: 10px;
        font-weight: 600;
        letter-spacing: 0.5px;
        color: var(--text-3);
        margin-top: 4px;
        text-transform: uppercase;
      }

      /* ── Glucose ── */
      .glucose-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
      }
      .glucose-item {
        background: rgba(255,255,255,0.04);
        border: 1px solid var(--card-border);
        border-radius: 14px;
        padding: 14px;
      }
      .glucose-val {
        font-size: 20px;
        font-weight: 700;
        color: var(--text);
        font-variant-numeric: tabular-nums;
      }
      .glucose-unit {
        font-size: 11px;
        font-weight: 400;
        color: var(--text-2);
      }
      .glucose-label {
        font-size: 10px;
        font-weight: 600;
        letter-spacing: 0.5px;
        color: var(--text-3);
        margin-top: 4px;
        text-transform: uppercase;
      }
      .no-data {
        font-size: 14px;
        color: var(--text-3);
        text-align: center;
        padding: 20px 0;
      }

      /* ── Footer ── */
      .uh-footer {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 8px;
        padding: 16px 20px 20px 20px;
      }
      .footer-ring-icon { line-height: 0; }
      .footer-text {
        font-size: 10px;
        letter-spacing: 2px;
        color: var(--text-3);
        text-transform: uppercase;
        font-weight: 500;
      }

      /* ── Animations ── */
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }

      /* ── Responsive ── */
      @media (max-width: 360px) {
        .contributor-grid,
        .heart-grid,
        .glucose-grid {
          grid-template-columns: 1fr;
        }
        .ring-legend {
          flex-direction: column;
          gap: 4px;
          align-items: center;
        }
      }

      .unit {
        font-size: 0.7em;
        font-weight: 400;
        color: var(--text-2);
      }
    `;
  }
}

/* ══════════════════════ EDITOR ══════════════════════ */
class UltrahumanRingCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = config;
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
  }

  _render() {
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML = `
      <style>
        .editor { padding: 8px 0; }
        .row { margin-bottom: 16px; }
        label { display: block; margin-bottom: 4px; font-weight: 600; font-size: 14px; }
        input {
          width: 100%; padding: 10px 12px; border: 1px solid var(--divider-color, #ccc);
          border-radius: 8px; box-sizing: border-box; font-size: 14px;
          background: var(--card-background-color, #fff); color: var(--primary-text-color, #000);
        }
        .hint { font-size: 12px; color: var(--secondary-text-color, #888); margin-top: 6px; line-height: 1.4; }
      </style>
      <div class="editor">
        <div class="row">
          <label>Entity Prefix</label>
          <input id="prefix" type="text" value="${this._config.entity_prefix || ""}"
            placeholder="sensor.ultrahuman_ring_your_email_com"/>
          <div class="hint">
            The common prefix for your Ultrahuman sensor entities.<br>
            Find it in <strong>Developer Tools &rarr; States</strong> by filtering for "ultrahuman".
          </div>
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
  description: "Display health metrics from your Ultrahuman Ring AIR — faithful to the Ultrahuman app design",
  preview: true,
  documentationURL: "https://github.com/tanujdargan/ultrahuman-ha",
});

console.info(
  `%c ULTRAHUMAN RING %c v${CARD_VERSION} `,
  "background: #0EFF27; color: #000; font-weight: bold; padding: 2px 8px; border-radius: 4px 0 0 4px;",
  "background: #1A1A1A; color: #0EFF27; font-weight: bold; padding: 2px 8px; border-radius: 0 4px 4px 0;"
);
