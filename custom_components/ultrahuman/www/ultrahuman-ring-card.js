/**
 * Ultrahuman Ring Card v4 - Custom Lovelace Cards for Home Assistant
 * Compact dashboard design with HA theme integration and sparkline graphs
 * Includes: all-in-one card + 6 individual metric cards
 */

const CARD_VERSION = "4.0.0";

/* ══════════════════════ SVG LOGO ══════════════════════ */
const UH_LOGO_SVG = `<svg viewBox="0 0 180 16" width="120" height="12" xmlns="http://www.w3.org/2000/svg">
  <text x="0" y="13" font-family="-apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif"
    font-size="13" font-weight="800" letter-spacing="3" fill="currentColor">ULTRAHUMAN</text>
</svg>`;

/* ══════════════════════ UTILITY FUNCTIONS ══════════════════════ */

function uhGetState(hass, prefix, key) {
  const entityId = `${prefix}_${key}`;
  const entity = hass?.states[entityId];
  if (!entity || entity.state === "unknown" || entity.state === "unavailable") {
    return null;
  }
  return entity.state;
}

function uhGetNumericState(hass, prefix, key) {
  const val = uhGetState(hass, prefix, key);
  if (val === null || val === "None") return null;
  const num = parseFloat(val);
  return isNaN(num) ? null : num;
}

function uhGetScoreColor(score) {
  if (score === null) return "var(--uh-muted)";
  if (score >= 80) return "var(--uh-green)";
  if (score >= 60) return "var(--uh-yellow)";
  if (score >= 40) return "var(--uh-orange)";
  return "var(--uh-red)";
}

function uhGetScoreColorRaw(score) {
  if (score === null) return "#46494D";
  if (score >= 80) return "#0EFF27";
  if (score >= 60) return "#FCDD00";
  if (score >= 40) return "#FD9400";
  return "#FF4500";
}

function uhGetScoreLabel(score) {
  if (score === null) return "";
  if (score >= 80) return "Optimal";
  if (score >= 60) return "Good";
  if (score >= 40) return "Needs attention";
  return "Low";
}

function uhFormatMinutesPlain(mins) {
  if (mins === null) return "--";
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return `${h}h ${m}m`;
}

/* ══════════════════════ SPARKLINE HELPERS ══════════════════════ */

const UH_HISTORY_CACHE = new Map();
const UH_HISTORY_TTL = 5 * 60 * 1000;

async function uhFetchHistory(hass, entityId) {
  const now = Date.now();
  const cached = UH_HISTORY_CACHE.get(entityId);
  if (cached && (now - cached.ts) < UH_HISTORY_TTL) return cached.data;

  try {
    const result = await hass.callWS({
      type: "history/history_during_period",
      start_time: new Date(now - 24 * 60 * 60 * 1000).toISOString(),
      end_time: new Date().toISOString(),
      entity_ids: [entityId],
      minimal_response: true,
      significant_changes_only: true,
    });
    const states = result?.[entityId] || [];
    const points = [];
    for (const s of states) {
      const val = parseFloat(s.s);
      if (!isNaN(val)) {
        points.push({ t: s.lu, v: val });
      }
    }
    UH_HISTORY_CACHE.set(entityId, { ts: now, data: points });
    return points;
  } catch {
    return [];
  }
}

function uhRenderSparklineSVG(points, color) {
  if (!points || points.length < 2) return "";
  const vals = points.map(p => p.v);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;
  const w = 300, h = 50;
  const coords = points.map((p, i) => {
    const x = (i / (points.length - 1)) * w;
    const y = h - ((p.v - min) / range) * (h - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");

  return `
  <svg viewBox="0 0 ${w} ${h}" class="sparkline" preserveAspectRatio="none">
    <polyline points="${coords}" fill="none" stroke="${color}" stroke-width="2"
      stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
  </svg>
  `;
}

/* ══════════════════════ METRIC ROW BUILDER ══════════════════════ */

function uhMetricRow(label, value, unit, scoreColor, statusLabel, sparklineHtml) {
  const badge = statusLabel
    ? `<span class="status-badge" style="color:${scoreColor};background:${scoreColor}22">${statusLabel}</span>`
    : "";
  return `
  <div class="metric-row">
    <div class="metric-header">
      <span class="metric-label">${label}</span>
      <span class="metric-value">${value}${unit ? `<span class="metric-unit"> ${unit}</span>` : ""}${badge}</span>
    </div>
    ${sparklineHtml ? `<div class="metric-graph">${sparklineHtml}</div>` : ""}
  </div>
  `;
}

/* ══════════════════════ SNAPSHOT PILL ══════════════════════ */

function uhSnapshotPill(iconName, value, unit) {
  const icons = {
    "thermometer": `<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M15 13V5c0-1.66-1.34-3-3-3S9 3.34 9 5v8c-1.21.91-2 2.37-2 4 0 2.76 2.24 5 5 5s5-2.24 5-5c0-1.63-.79-3.09-2-4m-4-8c0-.55.45-1 1-1s1 .45 1 1v3h-2V5z"/></svg>`,
    "oxygen": `<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2m0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8m-1-6.5c0 .83-.67 1.5-1.5 1.5S8 14.33 8 13.5v-3C8 9.67 8.67 9 9.5 9s1.5.67 1.5 1.5v3m5.5 0c0 .83-.67 1.5-1.5 1.5s-1.5-.67-1.5-1.5v-3c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5v3z"/></svg>`,
    "shoe-print": `<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2M9.8 8.9 7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3C14.8 12 16.8 13 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L6 8.3V13h2V9.6l1.8-.7"/></svg>`,
    "heart-pulse": `<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`,
    "wave": `<svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M3 12h4l3-9 4 18 3-9h4"/><path fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="M3 12h4l3-9 4 18 3-9h4"/></svg>`,
  };
  return `
  <div class="snapshot-pill">
    <div class="pill-icon">${icons[iconName] || ""}</div>
    <div class="pill-value">${value}</div>
    <div class="pill-unit">${unit}</div>
  </div>
  `;
}

/* ══════════════════════ CSS ══════════════════════ */

function uhStyles() {
  return `
    :host {
      --uh-card-bg: var(--ha-card-background, var(--card-background-color, #1a1a1a));
      --uh-text: var(--primary-text-color, #fff);
      --uh-text-secondary: var(--secondary-text-color, #999);
      --uh-surface: var(--secondary-background-color, rgba(255,255,255,0.06));
      --uh-border: var(--divider-color, rgba(255,255,255,0.06));
      --uh-border-radius: var(--ha-card-border-radius, 12px);
      --uh-muted: #46494D;
      --uh-green: #0EFF27;
      --uh-yellow: #FCDD00;
      --uh-orange: #FD9400;
      --uh-red: #FF4500;
    }

    ha-card {
      background: var(--uh-card-bg);
      border-radius: var(--uh-border-radius);
      overflow: hidden;
      font-family: var(--paper-font-body1_-_font-family, -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif);
      -webkit-font-smoothing: antialiased;
      color: var(--uh-text);
    }

    .uh-card { padding: 16px; }

    /* ── Header ── */
    .uh-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    .uh-brand {
      line-height: 0;
      color: var(--uh-text-secondary);
    }
    .uh-refresh-btn {
      background: none;
      border: none;
      color: var(--uh-text-secondary);
      cursor: pointer;
      padding: 6px;
      border-radius: 50%;
      display: flex;
      transition: all 0.2s;
    }
    .uh-refresh-btn:hover { color: var(--uh-green); background: rgba(14,255,39,0.08); }
    .uh-refresh-btn.spinning svg { animation: uhSpin 1s linear infinite; }
    @keyframes uhSpin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    /* ── Metric Row ── */
    .metric-row {
      background: var(--uh-surface);
      border-radius: 10px;
      padding: 10px 12px;
      margin-bottom: 8px;
    }
    .metric-row:last-child { margin-bottom: 0; }
    .metric-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .metric-label {
      font-size: 0.75em;
      color: var(--uh-text-secondary);
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .metric-value {
      font-size: 1em;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
    }
    .metric-unit {
      font-size: 0.7em;
      font-weight: 400;
      opacity: 0.7;
    }
    .status-badge {
      font-size: 0.7em;
      font-weight: 500;
      margin-left: 6px;
      padding: 2px 6px;
      border-radius: 4px;
    }
    .metric-graph {
      margin-top: 6px;
    }
    .sparkline {
      width: 100%;
      height: 40px;
      display: block;
    }

    /* ── Metric Grid (2-col) ── */
    .metric-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    .metric-grid .metric-row {
      margin-bottom: 0;
    }
    .metric-grid .metric-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 2px;
    }
    .metric-grid .metric-value {
      font-size: 1.1em;
    }

    /* ── Section ── */
    .section-gap { margin-top: 12px; }

    /* ── Ring Hero ── */
    .uh-ring-hero {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 4px 0 12px 0;
    }
    .ring-svg { width: 130px; height: 130px; }
    .arc { transition: stroke-dasharray 0.8s ease-out; }
    .ring-legend {
      display: flex;
      gap: 14px;
      margin-top: 6px;
    }
    .legend-item {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .legend-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .legend-label {
      font-size: 0.7em;
      color: var(--uh-text-secondary);
      font-weight: 500;
    }

    /* ── Snapshot ── */
    .uh-snapshot {
      margin-bottom: 12px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--uh-border);
    }
    .snapshot-title {
      font-size: 0.85em;
      font-weight: 600;
      color: var(--uh-text);
      margin-bottom: 8px;
    }
    .snapshot-row {
      display: flex;
      gap: 6px;
      overflow-x: auto;
      scrollbar-width: none;
      -ms-overflow-style: none;
      padding-bottom: 2px;
    }
    .snapshot-row::-webkit-scrollbar { display: none; }
    .snapshot-pill {
      flex: 0 0 auto;
      min-width: 62px;
      background: var(--uh-surface);
      border-radius: 12px;
      padding: 10px 10px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
    }
    .pill-icon {
      line-height: 0;
      color: var(--uh-text-secondary);
    }
    .pill-value {
      font-size: 0.9em;
      font-weight: 700;
      color: var(--uh-text);
      font-variant-numeric: tabular-nums;
    }
    .pill-unit {
      font-size: 0.65em;
      color: var(--uh-text-secondary);
      font-weight: 500;
    }

    /* ── Sleep Stage Bar ── */
    .sleep-bar {
      display: flex;
      height: 5px;
      border-radius: 3px;
      overflow: hidden;
      gap: 1px;
      margin-bottom: 6px;
    }
    .bar-seg { border-radius: 3px; min-width: 2px; }
    .bar-seg.deep { background: #4A6CF7; }
    .bar-seg.light { background: #0EFF27; }
    .bar-seg.rem { background: #00CFCF; }
    .bar-seg.awake { background: #555; }
    .sleep-stages {
      display: flex;
      flex-wrap: wrap;
      gap: 4px 10px;
      margin-bottom: 8px;
    }
    .stage {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 0.7em;
      color: var(--uh-text-secondary);
      font-weight: 500;
    }
    .stage-dot {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .stage-dot.deep { background: #4A6CF7; }
    .stage-dot.light { background: #0EFF27; }
    .stage-dot.rem { background: #00CFCF; }
    .stage-dot.awake { background: #555; }

    /* ── Footer ── */
    .uh-footer {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 6px;
      margin-top: 12px;
      padding-top: 10px;
      border-top: 1px solid var(--uh-border);
    }
    .footer-icon {
      line-height: 0;
      color: var(--uh-text-secondary);
    }
    .footer-text {
      font-size: 0.6em;
      letter-spacing: 1.5px;
      color: var(--uh-text-secondary);
      text-transform: uppercase;
      font-weight: 500;
    }

    /* ── No Data ── */
    .no-data {
      font-size: 0.85em;
      color: var(--uh-text-secondary);
      text-align: center;
      padding: 16px 0;
    }

    /* ── Responsive ── */
    @media (max-width: 360px) {
      .metric-grid { grid-template-columns: 1fr; }
      .ring-legend {
        flex-direction: column;
        gap: 3px;
        align-items: center;
      }
    }
  `;
}

/* ══════════════════════ RENDER HELPERS ══════════════════════ */

function uhRenderRingSVG(hass, prefix) {
  const sleep = uhGetNumericState(hass, prefix, "sleep_score");
  const recovery = uhGetNumericState(hass, prefix, "recovery_index");
  const movement = uhGetNumericState(hass, prefix, "movement_index");

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
      <filter id="rs"><feDropShadow dx="0" dy="3" stdDeviation="6" flood-color="#000" flood-opacity="0.4"/></filter>
      <filter id="ag"><feGaussianBlur stdDeviation="1.5" result="g"/><feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    </defs>
    <circle cx="100" cy="100" r="80" fill="none" stroke="url(#rg1)" stroke-width="22" filter="url(#rs)" opacity="0.35"/>
    <circle cx="100" cy="100" r="${r1}" fill="none" stroke="#1A1C1B" stroke-width="6"/>
    <circle cx="100" cy="100" r="${r2}" fill="none" stroke="#1A1C1B" stroke-width="6"/>
    <circle cx="100" cy="100" r="${r3}" fill="none" stroke="#1A1C1B" stroke-width="6"/>
    <circle cx="100" cy="100" r="${r1}" fill="none"
      stroke="${uhGetScoreColorRaw(sleep)}" stroke-width="6" stroke-linecap="round"
      stroke-dasharray="${d1} ${c1}" transform="rotate(-90 100 100)" filter="url(#ag)" class="arc"/>
    <circle cx="100" cy="100" r="${r2}" fill="none"
      stroke="${uhGetScoreColorRaw(recovery)}" stroke-width="6" stroke-linecap="round"
      stroke-dasharray="${d2} ${c2}" transform="rotate(-90 100 100)" filter="url(#ag)" class="arc"/>
    <circle cx="100" cy="100" r="${r3}" fill="none"
      stroke="${uhGetScoreColorRaw(movement)}" stroke-width="6" stroke-linecap="round"
      stroke-dasharray="${d3} ${c3}" transform="rotate(-90 100 100)" filter="url(#ag)" class="arc"/>
    <circle cx="100" cy="100" r="52" fill="#0A0A0A"/>
    <path d="M100 78 C108 78 114 84 114 92 L114 108 C114 116 108 122 100 122 C92 122 86 116 86 108 L86 92 C86 84 92 78 100 78Z" fill="none" stroke="#3A3A3A" stroke-width="1.5"/>
    <circle cx="100" cy="88" r="3" fill="#3A3A3A"/>
  </svg>
  <div class="ring-legend">
    <div class="legend-item"><span class="legend-dot" style="background:${uhGetScoreColorRaw(sleep)}"></span><span class="legend-label">Sleep ${sleep ?? "--"}</span></div>
    <div class="legend-item"><span class="legend-dot" style="background:${uhGetScoreColorRaw(recovery)}"></span><span class="legend-label">Recovery ${recovery ?? "--"}</span></div>
    <div class="legend-item"><span class="legend-dot" style="background:${uhGetScoreColorRaw(movement)}"></span><span class="legend-label">Movement ${movement ?? "--"}</span></div>
  </div>
  `;
}

function uhRenderSnapshot(hass, prefix) {
  const temp = uhGetNumericState(hass, prefix, "skin_temperature");
  const spo2 = uhGetNumericState(hass, prefix, "spo2");
  const steps = uhGetNumericState(hass, prefix, "steps");
  const hr = uhGetNumericState(hass, prefix, "heart_rate");
  const hrv = uhGetNumericState(hass, prefix, "hrv");

  return `
  <div class="snapshot-title">Snapshot</div>
  <div class="snapshot-row">
    ${uhSnapshotPill("thermometer", temp !== null ? parseFloat(temp).toFixed(1) : "--", "\u00B0C")}
    ${uhSnapshotPill("oxygen", spo2 ?? "--", "%")}
    ${uhSnapshotPill("shoe-print", steps !== null ? Math.round(steps).toLocaleString() : "--", "steps")}
    ${uhSnapshotPill("heart-pulse", hr ?? "--", "bpm")}
    ${uhSnapshotPill("wave", hrv ?? "--", "ms")}
  </div>
  `;
}

function uhRenderFooter() {
  return `
  <div class="uh-footer">
    <span class="footer-icon">
      <svg viewBox="0 0 24 24" width="14" height="14"><path d="M12 4C14.2 4 16 5.8 16 8L16 16C16 18.2 14.2 20 12 20C9.8 20 8 18.2 8 16L8 8C8 5.8 9.8 4 12 4Z" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="7" r="1.5" fill="currentColor"/></svg>
    </span>
    <span class="footer-text">Ultrahuman Ring AIR</span>
  </div>
  `;
}

/* ══════════════════════ BASE CARD CLASS ══════════════════════ */

class UltrahumanCardBase extends HTMLElement {
  static get properties() {
    return { hass: {}, config: {} };
  }

  constructor() {
    super();
    this._sparklines = {};
    this._sparklinesPending = false;
  }

  set hass(hass) {
    this._hass = hass;
    if (this._initialized) {
      this._updateValues();
      this._loadSparklines();
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
    this._loadSparklines();
  }

  get _prefix() {
    return this._config.entity_prefix;
  }

  _renderHeader() {
    return `
    <div class="uh-header">
      <span class="uh-brand">${UH_LOGO_SVG}</span>
      <button class="uh-refresh-btn" id="refreshBtn" title="Refresh data">
        <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M17.65 6.35A7.96 7.96 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>
      </button>
    </div>
    `;
  }

  _attachRefreshHandler() {
    const btn = this.shadowRoot ? this.shadowRoot.getElementById("refreshBtn") : null;
    if (btn) {
      btn.addEventListener("click", () => { this._refreshData(); });
    }
  }

  _refreshData() {
    if (!this._hass) return;
    const metrics = this._getRefreshMetrics();
    let foundEntityId = null;
    for (const key of metrics) {
      const entityId = `${this._prefix}_${key}`;
      if (this._hass.states[entityId]) {
        foundEntityId = entityId;
        break;
      }
    }
    if (foundEntityId) {
      this._hass.callService("homeassistant", "update_entity", { entity_id: foundEntityId });
    }
    for (const key of metrics) {
      UH_HISTORY_CACHE.delete(`${this._prefix}_${key}`);
    }
    const btn = this.shadowRoot ? this.shadowRoot.getElementById("refreshBtn") : null;
    if (btn) {
      btn.classList.add("spinning");
      setTimeout(() => {
        btn.classList.remove("spinning");
        this._loadSparklines();
      }, 1500);
    }
  }

  _getRefreshMetrics() {
    return [
      "sleep_score", "total_sleep", "sleep_efficiency", "deep_sleep",
      "rem_sleep", "light_sleep", "restorative_sleep", "spo2",
      "heart_rate", "resting_heart_rate", "hrv",
      "skin_temperature", "steps",
      "metabolic_score", "glucose_variability", "average_glucose",
      "hba1c", "time_in_target",
      "recovery_index", "movement_index", "vo2_max",
    ];
  }

  _getSparklineEntities() {
    return [];
  }

  async _loadSparklines() {
    if (!this._hass || this._sparklinesPending) return;
    const entities = this._getSparklineEntities();
    if (entities.length === 0) return;
    this._sparklinesPending = true;
    try {
      const results = await Promise.all(
        entities.map(key => uhFetchHistory(this._hass, `${this._prefix}_${key}`))
      );
      let changed = false;
      entities.forEach((key, i) => {
        const old = this._sparklines[key];
        const nw = results[i];
        if (!old || old.length !== nw.length || (nw.length > 0 && old[old.length-1]?.v !== nw[nw.length-1]?.v)) {
          this._sparklines[key] = nw;
          changed = true;
        }
      });
      if (changed) this._updateSparklines();
    } finally {
      this._sparklinesPending = false;
    }
  }

  _getSparklineHtml(key, color) {
    return uhRenderSparklineSVG(this._sparklines[key], color);
  }

  _render() {}
  _updateValues() {}
  _updateSparklines() { this._updateValues(); }
}

/* ══════════════════════ ALL-IN-ONE CARD ══════════════════════ */

class UltrahumanRingCard extends UltrahumanCardBase {
  static getConfigElement() { return document.createElement("ultrahuman-ring-card-editor"); }
  static getStubConfig() { return { entity_prefix: "sensor.ultrahuman_ring_your_email_com" }; }
  getCardSize() { return 10; }

  _getSparklineEntities() {
    return ["sleep_score", "movement_index", "recovery_index", "heart_rate", "metabolic_score"];
  }

  _render() {
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
    const root = this.shadowRoot;
    root.textContent = "";
    const card = document.createElement("ha-card");
    const style = document.createElement("style");
    style.textContent = uhStyles();
    card.appendChild(style);
    const container = document.createElement("div");
    container.className = "uh-card";
    container.id = "uhRoot";
    card.appendChild(container);
    root.appendChild(card);
    this._rebuildContent();
    this._attachRefreshHandler();
  }

  _rebuildContent() {
    const container = this.shadowRoot ? this.shadowRoot.getElementById("uhRoot") : null;
    if (!container) return;
    container.textContent = "";

    // Header
    const headerDiv = document.createElement("div");
    headerDiv.innerHTML = this._renderHeader();
    while (headerDiv.firstChild) container.appendChild(headerDiv.firstChild);

    // Ring hero
    const ringDiv = document.createElement("div");
    ringDiv.className = "uh-ring-hero";
    ringDiv.id = "ringHero";
    ringDiv.innerHTML = uhRenderRingSVG(this._hass, this._prefix);
    container.appendChild(ringDiv);

    // Snapshot
    const snapDiv = document.createElement("div");
    snapDiv.className = "uh-snapshot";
    snapDiv.id = "snapshot";
    snapDiv.innerHTML = uhRenderSnapshot(this._hass, this._prefix);
    container.appendChild(snapDiv);

    // Metrics
    const metricsDiv = document.createElement("div");
    metricsDiv.id = "metricsArea";
    metricsDiv.innerHTML = this._renderMetrics();
    container.appendChild(metricsDiv);

    // Footer
    const footerDiv = document.createElement("div");
    footerDiv.innerHTML = uhRenderFooter();
    while (footerDiv.firstChild) container.appendChild(footerDiv.firstChild);
  }

  _renderMetrics() {
    const h = this._hass, p = this._prefix;
    const sleep = uhGetNumericState(h, p, "sleep_score");
    const movement = uhGetNumericState(h, p, "movement_index");
    const recovery = uhGetNumericState(h, p, "recovery_index");
    const hr = uhGetNumericState(h, p, "heart_rate");
    const rhr = uhGetNumericState(h, p, "resting_heart_rate");
    const hrv = uhGetNumericState(h, p, "hrv");
    const spo2 = uhGetNumericState(h, p, "spo2");
    const metabolic = uhGetNumericState(h, p, "metabolic_score");

    return [
      uhMetricRow("SLEEP SCORE", sleep ?? "--", "", uhGetScoreColorRaw(sleep), uhGetScoreLabel(sleep), this._getSparklineHtml("sleep_score", uhGetScoreColorRaw(sleep))),
      uhMetricRow("MOVEMENT", movement ?? "--", "", uhGetScoreColorRaw(movement), uhGetScoreLabel(movement), this._getSparklineHtml("movement_index", uhGetScoreColorRaw(movement))),
      uhMetricRow("RECOVERY", recovery ?? "--", "", uhGetScoreColorRaw(recovery), uhGetScoreLabel(recovery), this._getSparklineHtml("recovery_index", uhGetScoreColorRaw(recovery))),
      uhMetricRow("HEART RATE", hr ?? "--", "bpm", uhGetScoreColorRaw(null), "", this._getSparklineHtml("heart_rate", "var(--uh-text-secondary)")),
      `<div class="metric-grid">`,
      uhMetricRow("RESTING HR", rhr ?? "--", "bpm", "", "", ""),
      uhMetricRow("HRV", hrv ?? "--", "ms", "", "", ""),
      uhMetricRow("SpO2", spo2 ?? "--", "%", "", "", ""),
      uhMetricRow("METABOLIC", metabolic ?? "--", "", uhGetScoreColorRaw(metabolic), uhGetScoreLabel(metabolic), ""),
      `</div>`,
    ].join("");
  }

  _updateValues() {
    if (!this.shadowRoot || !this._hass) return;
    const ring = this.shadowRoot.getElementById("ringHero");
    if (ring) ring.innerHTML = uhRenderRingSVG(this._hass, this._prefix);
    const snap = this.shadowRoot.getElementById("snapshot");
    if (snap) snap.innerHTML = uhRenderSnapshot(this._hass, this._prefix);
    const metrics = this.shadowRoot.getElementById("metricsArea");
    if (metrics) metrics.innerHTML = this._renderMetrics();
  }
}

/* ══════════════════════ OVERVIEW CARD ══════════════════════ */

class UltrahumanRingOverviewCard extends UltrahumanCardBase {
  static getConfigElement() { return document.createElement("ultrahuman-ring-overview-card-editor"); }
  static getStubConfig() { return { entity_prefix: "sensor.ultrahuman_ring_your_email_com" }; }
  getCardSize() { return 5; }

  _getRefreshMetrics() {
    return ["sleep_score", "recovery_index", "movement_index", "skin_temperature", "spo2", "steps", "heart_rate", "hrv"];
  }

  _render() {
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
    const root = this.shadowRoot;
    root.textContent = "";
    const card = document.createElement("ha-card");
    const style = document.createElement("style");
    style.textContent = uhStyles();
    card.appendChild(style);
    const container = document.createElement("div");
    container.className = "uh-card";
    card.appendChild(container);

    const headerDiv = document.createElement("div");
    headerDiv.innerHTML = this._renderHeader();
    while (headerDiv.firstChild) container.appendChild(headerDiv.firstChild);

    const ringDiv = document.createElement("div");
    ringDiv.className = "uh-ring-hero";
    ringDiv.id = "ringHero";
    ringDiv.innerHTML = uhRenderRingSVG(this._hass, this._prefix);
    container.appendChild(ringDiv);

    const snapDiv = document.createElement("div");
    snapDiv.className = "uh-snapshot";
    snapDiv.id = "snapshot";
    snapDiv.innerHTML = uhRenderSnapshot(this._hass, this._prefix);
    container.appendChild(snapDiv);

    const footerDiv = document.createElement("div");
    footerDiv.innerHTML = uhRenderFooter();
    while (footerDiv.firstChild) container.appendChild(footerDiv.firstChild);

    root.appendChild(card);
    this._attachRefreshHandler();
  }

  _updateValues() {
    if (!this.shadowRoot || !this._hass) return;
    const ring = this.shadowRoot.getElementById("ringHero");
    if (ring) ring.innerHTML = uhRenderRingSVG(this._hass, this._prefix);
    const snap = this.shadowRoot.getElementById("snapshot");
    if (snap) snap.innerHTML = uhRenderSnapshot(this._hass, this._prefix);
  }
}

/* ══════════════════════ SLEEP CARD ══════════════════════ */

class UltrahumanRingSleepCard extends UltrahumanCardBase {
  static getConfigElement() { return document.createElement("ultrahuman-ring-sleep-card-editor"); }
  static getStubConfig() { return { entity_prefix: "sensor.ultrahuman_ring_your_email_com" }; }
  getCardSize() { return 5; }

  _getRefreshMetrics() {
    return ["sleep_score", "total_sleep", "sleep_efficiency", "deep_sleep", "rem_sleep", "light_sleep", "restorative_sleep", "resting_heart_rate"];
  }
  _getSparklineEntities() { return ["sleep_score", "total_sleep", "sleep_efficiency"]; }

  _render() {
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
    const root = this.shadowRoot;
    root.textContent = "";
    const card = document.createElement("ha-card");
    const style = document.createElement("style");
    style.textContent = uhStyles();
    card.appendChild(style);
    const container = document.createElement("div");
    container.className = "uh-card";
    card.appendChild(container);

    const headerDiv = document.createElement("div");
    headerDiv.innerHTML = this._renderHeader();
    while (headerDiv.firstChild) container.appendChild(headerDiv.firstChild);

    const contentDiv = document.createElement("div");
    contentDiv.id = "contentArea";
    contentDiv.innerHTML = this._renderContent();
    container.appendChild(contentDiv);

    root.appendChild(card);
    this._attachRefreshHandler();
  }

  _renderContent() {
    const h = this._hass, p = this._prefix;
    const score = uhGetNumericState(h, p, "sleep_score");
    const total = uhGetNumericState(h, p, "total_sleep");
    const efficiency = uhGetNumericState(h, p, "sleep_efficiency");
    const deep = uhGetNumericState(h, p, "deep_sleep");
    const rem = uhGetNumericState(h, p, "rem_sleep");
    const light = uhGetNumericState(h, p, "light_sleep");
    const restorative = uhGetNumericState(h, p, "restorative_sleep");
    const rhr = uhGetNumericState(h, p, "resting_heart_rate");

    const noStage = deep == null && rem == null && light == null;
    const totalMin = noStage ? 0 : (deep || 0) + (rem || 0) + (light || 0);
    const deepPct = totalMin > 0 ? Math.round((deep || 0) / totalMin * 100) : 0;
    const remPct = totalMin > 0 ? Math.round((rem || 0) / totalMin * 100) : 0;
    const lightPct = totalMin > 0 ? Math.round((light || 0) / totalMin * 100) : 0;
    const awakePct = noStage ? 0 : Math.max(0, 100 - deepPct - remPct - lightPct);

    return [
      uhMetricRow("SLEEP SCORE", score ?? "--", "", uhGetScoreColorRaw(score), uhGetScoreLabel(score), this._getSparklineHtml("sleep_score", uhGetScoreColorRaw(score))),
      `<div class="sleep-bar">`,
      `<div class="bar-seg deep" style="width:${deepPct}%"></div>`,
      `<div class="bar-seg light" style="width:${lightPct}%"></div>`,
      `<div class="bar-seg rem" style="width:${remPct}%"></div>`,
      `<div class="bar-seg awake" style="width:${awakePct}%"></div>`,
      `</div>`,
      `<div class="sleep-stages">`,
      `<span class="stage"><span class="stage-dot deep"></span>Deep ${deepPct}%</span>`,
      `<span class="stage"><span class="stage-dot light"></span>Light ${lightPct}%</span>`,
      `<span class="stage"><span class="stage-dot rem"></span>REM ${remPct}%</span>`,
      `<span class="stage"><span class="stage-dot awake"></span>Awake ${awakePct}%</span>`,
      `</div>`,
      `<div class="metric-grid">`,
      uhMetricRow("TOTAL SLEEP", uhFormatMinutesPlain(total), "", "", score === null ? "" : score >= 70 ? "Optimal" : score >= 50 ? "Good" : "Low", this._getSparklineHtml("total_sleep", "var(--uh-text-secondary)")),
      uhMetricRow("EFFICIENCY", efficiency !== null ? efficiency + "%" : "--", "", "", efficiency === null ? "" : efficiency >= 90 ? "Optimal" : efficiency >= 80 ? "Good" : "Low", this._getSparklineHtml("sleep_efficiency", "var(--uh-text-secondary)")),
      uhMetricRow("RESTORATIVE", restorative !== null ? restorative + "%" : "--", "", "", restorative === null ? "" : restorative >= 35 ? "Good" : "Needs attention", ""),
      uhMetricRow("RESTING HR", rhr ?? "--", "bpm", "", "", ""),
      `</div>`,
    ].join("");
  }

  _updateValues() {
    if (!this.shadowRoot || !this._hass) return;
    const el = this.shadowRoot.getElementById("contentArea");
    if (el) el.innerHTML = this._renderContent();
  }
}

/* ══════════════════════ MOVEMENT CARD ══════════════════════ */

class UltrahumanRingMovementCard extends UltrahumanCardBase {
  static getConfigElement() { return document.createElement("ultrahuman-ring-movement-card-editor"); }
  static getStubConfig() { return { entity_prefix: "sensor.ultrahuman_ring_your_email_com" }; }
  getCardSize() { return 3; }

  _getRefreshMetrics() { return ["movement_index", "steps", "vo2_max"]; }
  _getSparklineEntities() { return ["movement_index", "steps"]; }

  _render() {
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
    const root = this.shadowRoot;
    root.textContent = "";
    const card = document.createElement("ha-card");
    const style = document.createElement("style");
    style.textContent = uhStyles();
    card.appendChild(style);
    const container = document.createElement("div");
    container.className = "uh-card";
    card.appendChild(container);
    const headerDiv = document.createElement("div");
    headerDiv.innerHTML = this._renderHeader();
    while (headerDiv.firstChild) container.appendChild(headerDiv.firstChild);
    const contentDiv = document.createElement("div");
    contentDiv.id = "contentArea";
    contentDiv.innerHTML = this._renderContent();
    container.appendChild(contentDiv);
    root.appendChild(card);
    this._attachRefreshHandler();
  }

  _renderContent() {
    const h = this._hass, p = this._prefix;
    const score = uhGetNumericState(h, p, "movement_index");
    const steps = uhGetNumericState(h, p, "steps");
    const vo2 = uhGetNumericState(h, p, "vo2_max");
    return [
      uhMetricRow("MOVEMENT SCORE", score ?? "--", "", uhGetScoreColorRaw(score), uhGetScoreLabel(score), this._getSparklineHtml("movement_index", uhGetScoreColorRaw(score))),
      `<div class="metric-grid">`,
      uhMetricRow("STEPS", steps !== null ? Math.round(steps).toLocaleString() : "--", "", "", "", this._getSparklineHtml("steps", "var(--uh-text-secondary)")),
      uhMetricRow("VO2 MAX", vo2 ?? "--", "mL/kg/min", "", "", ""),
      `</div>`,
    ].join("");
  }

  _updateValues() {
    if (!this.shadowRoot || !this._hass) return;
    const el = this.shadowRoot.getElementById("contentArea");
    if (el) el.innerHTML = this._renderContent();
  }
}

/* ══════════════════════ RECOVERY CARD ══════════════════════ */

class UltrahumanRingRecoveryCard extends UltrahumanCardBase {
  static getConfigElement() { return document.createElement("ultrahuman-ring-recovery-card-editor"); }
  static getStubConfig() { return { entity_prefix: "sensor.ultrahuman_ring_your_email_com" }; }
  getCardSize() { return 3; }

  _getRefreshMetrics() { return ["recovery_index", "hrv", "resting_heart_rate", "skin_temperature"]; }
  _getSparklineEntities() { return ["recovery_index", "hrv", "resting_heart_rate"]; }

  _render() {
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
    const root = this.shadowRoot;
    root.textContent = "";
    const card = document.createElement("ha-card");
    const style = document.createElement("style");
    style.textContent = uhStyles();
    card.appendChild(style);
    const container = document.createElement("div");
    container.className = "uh-card";
    card.appendChild(container);
    const headerDiv = document.createElement("div");
    headerDiv.innerHTML = this._renderHeader();
    while (headerDiv.firstChild) container.appendChild(headerDiv.firstChild);
    const contentDiv = document.createElement("div");
    contentDiv.id = "contentArea";
    contentDiv.innerHTML = this._renderContent();
    container.appendChild(contentDiv);
    root.appendChild(card);
    this._attachRefreshHandler();
  }

  _renderContent() {
    const h = this._hass, p = this._prefix;
    const score = uhGetNumericState(h, p, "recovery_index");
    const hrv = uhGetNumericState(h, p, "hrv");
    const rhr = uhGetNumericState(h, p, "resting_heart_rate");
    const temp = uhGetNumericState(h, p, "skin_temperature");
    return [
      uhMetricRow("RECOVERY SCORE", score ?? "--", "", uhGetScoreColorRaw(score), uhGetScoreLabel(score), this._getSparklineHtml("recovery_index", uhGetScoreColorRaw(score))),
      uhMetricRow("HRV AVERAGE", hrv ?? "--", "ms", "", "", this._getSparklineHtml("hrv", "var(--uh-text-secondary)")),
      uhMetricRow("RESTING HEART RATE", rhr ?? "--", "bpm", "", "", this._getSparklineHtml("resting_heart_rate", "var(--uh-text-secondary)")),
      uhMetricRow("SKIN TEMPERATURE", temp !== null ? parseFloat(temp).toFixed(1) : "--", "\u00B0C", "", "", ""),
    ].join("");
  }

  _updateValues() {
    if (!this.shadowRoot || !this._hass) return;
    const el = this.shadowRoot.getElementById("contentArea");
    if (el) el.innerHTML = this._renderContent();
  }
}

/* ══════════════════════ HEART CARD ══════════════════════ */

class UltrahumanRingHeartCard extends UltrahumanCardBase {
  static getConfigElement() { return document.createElement("ultrahuman-ring-heart-card-editor"); }
  static getStubConfig() { return { entity_prefix: "sensor.ultrahuman_ring_your_email_com" }; }
  getCardSize() { return 4; }

  _getRefreshMetrics() { return ["heart_rate", "resting_heart_rate", "hrv", "spo2"]; }
  _getSparklineEntities() { return ["heart_rate", "resting_heart_rate", "hrv", "spo2"]; }

  _render() {
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
    const root = this.shadowRoot;
    root.textContent = "";
    const card = document.createElement("ha-card");
    const style = document.createElement("style");
    style.textContent = uhStyles();
    card.appendChild(style);
    const container = document.createElement("div");
    container.className = "uh-card";
    card.appendChild(container);
    const headerDiv = document.createElement("div");
    headerDiv.innerHTML = this._renderHeader();
    while (headerDiv.firstChild) container.appendChild(headerDiv.firstChild);
    const contentDiv = document.createElement("div");
    contentDiv.id = "contentArea";
    contentDiv.innerHTML = this._renderContent();
    container.appendChild(contentDiv);
    root.appendChild(card);
    this._attachRefreshHandler();
  }

  _renderContent() {
    const h = this._hass, p = this._prefix;
    const hr = uhGetNumericState(h, p, "heart_rate");
    const rhr = uhGetNumericState(h, p, "resting_heart_rate");
    const hrv = uhGetNumericState(h, p, "hrv");
    const spo2 = uhGetNumericState(h, p, "spo2");
    return [
      uhMetricRow("HEART RATE", hr ?? "--", "bpm", "", "", this._getSparklineHtml("heart_rate", "#FF4500")),
      uhMetricRow("RESTING HR", rhr ?? "--", "bpm", "", "", this._getSparklineHtml("resting_heart_rate", "var(--uh-text-secondary)")),
      uhMetricRow("HRV", hrv ?? "--", "ms", "", "", this._getSparklineHtml("hrv", "#0EFF27")),
      uhMetricRow("SpO2", spo2 ?? "--", "%", "", "", this._getSparklineHtml("spo2", "var(--uh-text-secondary)")),
    ].join("");
  }

  _updateValues() {
    if (!this.shadowRoot || !this._hass) return;
    const el = this.shadowRoot.getElementById("contentArea");
    if (el) el.innerHTML = this._renderContent();
  }
}

/* ══════════════════════ GLUCOSE CARD ══════════════════════ */

class UltrahumanRingGlucoseCard extends UltrahumanCardBase {
  static getConfigElement() { return document.createElement("ultrahuman-ring-glucose-card-editor"); }
  static getStubConfig() { return { entity_prefix: "sensor.ultrahuman_ring_your_email_com" }; }
  getCardSize() { return 3; }

  _getRefreshMetrics() { return ["metabolic_score", "average_glucose", "glucose_variability", "hba1c", "time_in_target"]; }
  _getSparklineEntities() { return ["metabolic_score", "average_glucose"]; }

  _render() {
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
    const root = this.shadowRoot;
    root.textContent = "";
    const card = document.createElement("ha-card");
    const style = document.createElement("style");
    style.textContent = uhStyles();
    card.appendChild(style);
    const container = document.createElement("div");
    container.className = "uh-card";
    card.appendChild(container);
    const headerDiv = document.createElement("div");
    headerDiv.innerHTML = this._renderHeader();
    while (headerDiv.firstChild) container.appendChild(headerDiv.firstChild);
    const contentDiv = document.createElement("div");
    contentDiv.id = "contentArea";
    contentDiv.innerHTML = this._renderContent();
    container.appendChild(contentDiv);
    root.appendChild(card);
    this._attachRefreshHandler();
  }

  _renderContent() {
    const h = this._hass, p = this._prefix;
    const metabolic = uhGetNumericState(h, p, "metabolic_score");
    const avgGlucose = uhGetNumericState(h, p, "average_glucose");
    const variability = uhGetNumericState(h, p, "glucose_variability");
    const hba1c = uhGetNumericState(h, p, "hba1c");
    const timeInTarget = uhGetNumericState(h, p, "time_in_target");

    const hasData = metabolic != null || avgGlucose != null || variability != null || hba1c != null || timeInTarget != null;
    if (!hasData) return `<div class="no-data">No glucose data available</div>`;

    const parts = [];
    if (metabolic !== null) parts.push(uhMetricRow("METABOLIC SCORE", metabolic, "", uhGetScoreColorRaw(metabolic), uhGetScoreLabel(metabolic), this._getSparklineHtml("metabolic_score", uhGetScoreColorRaw(metabolic))));
    if (avgGlucose !== null) parts.push(uhMetricRow("AVG GLUCOSE", avgGlucose, "mg/dL", "", "", this._getSparklineHtml("average_glucose", "var(--uh-text-secondary)")));

    const gridItems = [];
    if (variability !== null) gridItems.push(uhMetricRow("VARIABILITY", variability, "%", "", "", ""));
    if (hba1c !== null) gridItems.push(uhMetricRow("HbA1c", hba1c, "%", "", "", ""));
    if (timeInTarget !== null) gridItems.push(uhMetricRow("IN TARGET", timeInTarget, "%", "", "", ""));
    if (gridItems.length > 0) {
      parts.push(`<div class="metric-grid">${gridItems.join("")}</div>`);
    }
    return parts.join("");
  }

  _updateValues() {
    if (!this.shadowRoot || !this._hass) return;
    const el = this.shadowRoot.getElementById("contentArea");
    if (el) el.innerHTML = this._renderContent();
  }
}

/* ══════════════════════ EDITOR ══════════════════════ */

class UltrahumanEditorBase extends HTMLElement {
  setConfig(config) {
    this._config = config;
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
  }

  _render() {
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
    const root = this.shadowRoot;
    root.textContent = "";

    const style = document.createElement("style");
    style.textContent = `
      .editor { padding: 8px 0; }
      .row { margin-bottom: 16px; }
      label { display: block; margin-bottom: 4px; font-weight: 600; font-size: 14px; }
      input {
        width: 100%; padding: 10px 12px; border: 1px solid var(--divider-color, #ccc);
        border-radius: 8px; box-sizing: border-box; font-size: 14px;
        background: var(--card-background-color, #fff); color: var(--primary-text-color, #000);
      }
      .hint { font-size: 12px; color: var(--secondary-text-color, #888); margin-top: 6px; line-height: 1.4; }
    `;
    root.appendChild(style);

    const editor = document.createElement("div");
    editor.className = "editor";
    const row = document.createElement("div");
    row.className = "row";

    const label = document.createElement("label");
    label.textContent = "Entity Prefix";
    row.appendChild(label);

    const input = document.createElement("input");
    input.id = "prefix";
    input.type = "text";
    input.value = this._config.entity_prefix || "";
    input.placeholder = "sensor.ultrahuman_ring_your_email_com";
    input.addEventListener("input", (e) => {
      this._config = { ...this._config, entity_prefix: e.target.value };
      this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this._config }, bubbles: true, composed: true }));
    });
    row.appendChild(input);

    const hint = document.createElement("div");
    hint.className = "hint";
    hint.textContent = "The common prefix for your Ultrahuman sensor entities. Find it in Developer Tools \u2192 States by filtering for \"ultrahuman\".";
    row.appendChild(hint);

    editor.appendChild(row);
    root.appendChild(editor);
  }
}

class UltrahumanRingCardEditor extends UltrahumanEditorBase {}
class UltrahumanRingOverviewCardEditor extends UltrahumanEditorBase {}
class UltrahumanRingSleepCardEditor extends UltrahumanEditorBase {}
class UltrahumanRingMovementCardEditor extends UltrahumanEditorBase {}
class UltrahumanRingRecoveryCardEditor extends UltrahumanEditorBase {}
class UltrahumanRingHeartCardEditor extends UltrahumanEditorBase {}
class UltrahumanRingGlucoseCardEditor extends UltrahumanEditorBase {}

/* ══════════════════════ REGISTER ══════════════════════ */

customElements.define("ultrahuman-ring-card", UltrahumanRingCard);
customElements.define("ultrahuman-ring-card-editor", UltrahumanRingCardEditor);
customElements.define("ultrahuman-ring-overview-card", UltrahumanRingOverviewCard);
customElements.define("ultrahuman-ring-overview-card-editor", UltrahumanRingOverviewCardEditor);
customElements.define("ultrahuman-ring-sleep-card", UltrahumanRingSleepCard);
customElements.define("ultrahuman-ring-sleep-card-editor", UltrahumanRingSleepCardEditor);
customElements.define("ultrahuman-ring-movement-card", UltrahumanRingMovementCard);
customElements.define("ultrahuman-ring-movement-card-editor", UltrahumanRingMovementCardEditor);
customElements.define("ultrahuman-ring-recovery-card", UltrahumanRingRecoveryCard);
customElements.define("ultrahuman-ring-recovery-card-editor", UltrahumanRingRecoveryCardEditor);
customElements.define("ultrahuman-ring-heart-card", UltrahumanRingHeartCard);
customElements.define("ultrahuman-ring-heart-card-editor", UltrahumanRingHeartCardEditor);
customElements.define("ultrahuman-ring-glucose-card", UltrahumanRingGlucoseCard);
customElements.define("ultrahuman-ring-glucose-card-editor", UltrahumanRingGlucoseCardEditor);

window.customCards = window.customCards || [];
window.customCards.push(
  { type: "ultrahuman-ring-card", name: "Ultrahuman Ring Card", description: "All-in-one compact dashboard with sparkline graphs", preview: true, documentationURL: "https://github.com/tanujdargan/ultrahuman-ha" },
  { type: "ultrahuman-ring-overview-card", name: "Ultrahuman Overview", description: "Ring SVG hero with score arcs and snapshot pills", preview: true, documentationURL: "https://github.com/tanujdargan/ultrahuman-ha" },
  { type: "ultrahuman-ring-sleep-card", name: "Ultrahuman Sleep", description: "Sleep score with stage bar, contributors, and sparklines", preview: true, documentationURL: "https://github.com/tanujdargan/ultrahuman-ha" },
  { type: "ultrahuman-ring-movement-card", name: "Ultrahuman Movement", description: "Movement score with steps, VO2 max, and sparklines", preview: true, documentationURL: "https://github.com/tanujdargan/ultrahuman-ha" },
  { type: "ultrahuman-ring-recovery-card", name: "Ultrahuman Recovery", description: "Recovery score with HRV, RHR, temp, and sparklines", preview: true, documentationURL: "https://github.com/tanujdargan/ultrahuman-ha" },
  { type: "ultrahuman-ring-heart-card", name: "Ultrahuman Heart", description: "Heart metrics with sparkline trends", preview: true, documentationURL: "https://github.com/tanujdargan/ultrahuman-ha" },
  { type: "ultrahuman-ring-glucose-card", name: "Ultrahuman Glucose", description: "Metabolic score with glucose metrics and sparklines", preview: true, documentationURL: "https://github.com/tanujdargan/ultrahuman-ha" },
);

console.info(
  `%c ULTRAHUMAN RING %c v${CARD_VERSION} `,
  "background: #0EFF27; color: #000; font-weight: bold; padding: 2px 8px; border-radius: 4px 0 0 4px;",
  "background: #1A1A1A; color: #0EFF27; font-weight: bold; padding: 2px 8px; border-radius: 0 4px 4px 0;"
);
