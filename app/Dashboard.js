'use client';

import { useState, useEffect, useCallback, useRef } from "react";

// --- Session time constants (Eastern Time) ---
const RTH_OPEN_H = 9, RTH_OPEN_M = 30;
const RTH_CLOSE_H = 16, RTH_CLOSE_M = 0;
const GLOBEX_OPEN_H = 18, GLOBEX_OPEN_M = 0;

// --- Helpers ---
function toET(date) {
  const str = date.toLocaleString("en-US", { timeZone: "America/New_York" });
  return new Date(str);
}

function parseBarTime(t) {
  if (typeof t === "string") return new Date(t);
  if (typeof t === "number") return new Date(t);
  return new Date();
}

function classifyBar(barTime) {
  const et = toET(barTime);
  const h = et.getHours(), m = et.getMinutes();
  const mins = h * 60 + m;
  const rthOpen = RTH_OPEN_H * 60 + RTH_OPEN_M;
  const rthClose = RTH_CLOSE_H * 60 + RTH_CLOSE_M;
  if (mins >= rthOpen && mins < rthClose) return "rth";
  return "globex";
}

function getSessionStart() {
  const now = toET(new Date());
  const h = now.getHours();
  const sessionOpen = new Date(now);
  sessionOpen.setHours(GLOBEX_OPEN_H, 0, 0, 0);
  if (h < GLOBEX_OPEN_H) sessionOpen.setDate(sessionOpen.getDate() - 1);
  return sessionOpen;
}

function getTodayRTHStart() {
  const now = toET(new Date());
  const rthStart = new Date(now);
  rthStart.setHours(RTH_OPEN_H, RTH_OPEN_M, 0, 0);
  return rthStart;
}

function getYesterdayRTH() {
  const now = toET(new Date());
  const end = new Date(now);
  end.setHours(RTH_CLOSE_H, RTH_CLOSE_M, 0, 0);
  if (now.getHours() < RTH_CLOSE_H) end.setDate(end.getDate() - 1);
  const start = new Date(end);
  start.setHours(RTH_OPEN_H, RTH_OPEN_M, 0, 0);
  return { start, end };
}

// --- Level Calculations ---
function calcPriorDayLevels(rthBars) {
  if (!rthBars || rthBars.length === 0) return {};
  return {
    prior_high: Math.max(...rthBars.map((b) => b.h)),
    prior_low: Math.min(...rthBars.map((b) => b.l)),
    prior_close: rthBars[rthBars.length - 1].c,
    prior_open: rthBars[0].o,
  };
}

function calcOvernightLevels(globexBars) {
  if (!globexBars || globexBars.length === 0) return {};
  return {
    overnight_high: Math.max(...globexBars.map((b) => b.h)),
    overnight_low: Math.min(...globexBars.map((b) => b.l)),
  };
}

function calcOpeningRange(rthBars, minutes) {
  if (!rthBars || rthBars.length === 0) return {};
  const firstTime = parseBarTime(rthBars[0].t).getTime();
  const cutoff = firstTime + minutes * 60 * 1000;
  const orBars = rthBars.filter((b) => parseBarTime(b.t).getTime() < cutoff);
  if (orBars.length === 0) return {};
  return {
    [`or${minutes}_high`]: Math.max(...orBars.map((b) => b.h)),
    [`or${minutes}_low`]: Math.min(...orBars.map((b) => b.l)),
  };
}

function calcVWAP(bars) {
  if (!bars || bars.length === 0) return {};
  let cumPV = 0, cumVol = 0;
  const vwaps = [];
  const typicals = [];
  for (const b of bars) {
    const tp = (b.h + b.l + b.c) / 3;
    cumPV += tp * (b.v || 0);
    cumVol += b.v || 0;
    if (cumVol > 0) {
      vwaps.push(cumPV / cumVol);
      typicals.push(tp);
    }
  }
  if (vwaps.length === 0) return {};
  const vwap = vwaps[vwaps.length - 1];
  const devs = typicals.map((p) => (p - vwap) ** 2);
  const stdDev = Math.sqrt(devs.reduce((a, b) => a + b, 0) / devs.length);
  return {
    vwap: Math.round(vwap * 100) / 100,
    vwap_upper_1: Math.round((vwap + stdDev) * 100) / 100,
    vwap_lower_1: Math.round((vwap - stdDev) * 100) / 100,
    vwap_upper_2: Math.round((vwap + 2 * stdDev) * 100) / 100,
    vwap_lower_2: Math.round((vwap - 2 * stdDev) * 100) / 100,
  };
}

function calcAllLevels(priorRTH, overnight, todayRTH, sessionBars) {
  const levels = {};
  Object.assign(levels, calcPriorDayLevels(priorRTH));
  Object.assign(levels, calcOvernightLevels(overnight));
  Object.assign(levels, calcOpeningRange(todayRTH, 15));
  Object.assign(levels, calcOpeningRange(todayRTH, 30));
  Object.assign(levels, calcOpeningRange(todayRTH, 60));
  Object.assign(levels, calcVWAP(sessionBars));
  return levels;
}

// --- Session clock ---
// CME Futures schedule (Eastern Time):
//   • Opens Sunday 6:00 PM ET
//   • Daily maintenance halt 5:00 PM – 6:00 PM ET (Mon–Thu)
//   • Closes Friday 5:00 PM ET
//   • RTH: 9:30 AM – 4:00 PM ET
const DAILY_HALT_H = 17; // 5:00 PM ET close/halt
const WEEKLY_CLOSE_H = 17; // Friday 5:00 PM ET

function isMarketOpen() {
  const now = toET(new Date());
  const day = now.getDay(); // 0=Sun, 5=Fri, 6=Sat
  const h = now.getHours(), m = now.getMinutes();
  const mins = h * 60 + m;
  const haltStart = DAILY_HALT_H * 60; // 5:00 PM = 1020

  // Saturday: always closed
  if (day === 6) return { open: false, reason: "WEEKEND" };

  // Sunday: closed until 6:00 PM ET
  if (day === 0) {
    if (mins < GLOBEX_OPEN_H * 60) return { open: false, reason: "WEEKEND" };
    return { open: true };
  }

  // Friday: closed after 5:00 PM ET
  if (day === 5 && mins >= haltStart) return { open: false, reason: "WEEKEND" };

  // Mon–Fri: daily halt 5:00 PM – 6:00 PM ET
  if (mins >= haltStart && mins < GLOBEX_OPEN_H * 60) return { open: false, reason: "DAILY_HALT" };

  return { open: true };
}

function getNextOpenTime() {
  const now = toET(new Date());
  const day = now.getDay();
  const h = now.getHours(), m = now.getMinutes();
  const mins = h * 60 + m;

  // Daily halt Mon–Thu: reopens at 6:00 PM same day
  if (day >= 1 && day <= 4 && mins >= DAILY_HALT_H * 60 && mins < GLOBEX_OPEN_H * 60) {
    return { label: "Reopens today 6:00 PM ET", minutesUntil: GLOBEX_OPEN_H * 60 - mins };
  }

  // Friday after 5 PM, all Saturday, Sunday before 6 PM → reopens Sunday 6 PM ET
  let daysUntilSunday;
  if (day === 5) daysUntilSunday = 2;
  else if (day === 6) daysUntilSunday = 1;
  else if (day === 0 && mins < GLOBEX_OPEN_H * 60) daysUntilSunday = 0;
  else daysUntilSunday = 7 - day; // fallback

  const minsLeftToday = 1440 - mins;
  const minutesUntil = minsLeftToday + (daysUntilSunday > 0 ? (daysUntilSunday - 1) * 1440 : 0) + GLOBEX_OPEN_H * 60;
  return { label: "Reopens Sunday 6:00 PM ET", minutesUntil };
}

function getSessionInfo() {
  const market = isMarketOpen();
  if (!market.open) {
    const next = getNextOpenTime();
    return {
      session: "CLOSED",
      reason: market.reason,
      minutesIn: 0,
      minutesLeft: 0,
      pctComplete: 0,
      nextOpen: next,
    };
  }

  const now = toET(new Date());
  const h = now.getHours(), m = now.getMinutes();
  const mins = h * 60 + m;
  const rthOpen = RTH_OPEN_H * 60 + RTH_OPEN_M;
  const rthClose = RTH_CLOSE_H * 60 + RTH_CLOSE_M;
  const globexOpen = GLOBEX_OPEN_H * 60;

  if (mins >= rthOpen && mins < rthClose) {
    return {
      session: "RTH",
      minutesIn: mins - rthOpen,
      minutesLeft: rthClose - mins,
      pctComplete: ((mins - rthOpen) / (rthClose - rthOpen)) * 100,
    };
  } else if (mins >= globexOpen || mins < rthOpen) {
    let minsIn;
    if (mins >= globexOpen) minsIn = mins - globexOpen;
    else minsIn = (1440 - globexOpen) + mins;
    const totalGlobex = (1440 - globexOpen) + rthOpen;
    return {
      session: "GLOBEX",
      minutesIn: minsIn,
      minutesLeft: totalGlobex - minsIn,
      pctComplete: (minsIn / totalGlobex) * 100,
    };
  }
  return { session: "CLOSED", minutesIn: 0, minutesLeft: 0, pctComplete: 0 };
}

// --- Mock Economic Calendar (FRED/ForexFactory would be external) ---
function getMockCalendar() {
  return [
    { time: "08:30", impact: "high", event: "CPI m/m", forecast: "0.3%", previous: "0.4%", actual: null },
    { time: "08:30", impact: "high", event: "Core CPI m/m", forecast: "0.3%", previous: "0.3%", actual: null },
    { time: "10:00", impact: "medium", event: "Consumer Sentiment", forecast: "76.5", previous: "76.9", actual: null },
    { time: "10:30", impact: "low", event: "Crude Oil Inventories", forecast: "-1.2M", previous: "2.6M", actual: null },
    { time: "13:00", impact: "medium", event: "30-Year Bond Auction", forecast: "—", previous: "4.74%", actual: null },
  ];
}

// ============================================================================
// MOCK DATA ENGINE
// Simulates what the TopstepX API would return
// In production, replace with actual API calls
// ============================================================================

const INSTRUMENTS = [
  { symbol: "NQ", name: "E-Mini Nasdaq", contractId: "CON.F.US.ENQ.M25", tickSize: 0.25, tickValue: 5.0 },
  { symbol: "ES", name: "E-Mini S&P 500", contractId: "CON.F.US.EP.M25", tickSize: 0.25, tickValue: 12.5 },
  { symbol: "CL", name: "Crude Oil", contractId: "CON.F.US.CL.M25", tickSize: 0.01, tickValue: 10.0 },
  { symbol: "GC", name: "Gold", contractId: "CON.F.US.GC.M25", tickSize: 0.1, tickValue: 10.0 },
];

function generateMockBars(basePrice, volatility, count) {
  const bars = [];
  let price = basePrice;
  const now = Date.now();
  for (let i = count; i > 0; i--) {
    const change = (Math.random() - 0.49) * volatility;
    const o = price;
    const c = price + change;
    const h = Math.max(o, c) + Math.random() * volatility * 0.3;
    const l = Math.min(o, c) - Math.random() * volatility * 0.3;
    const v = Math.floor(500 + Math.random() * 3000);
    bars.push({
      t: new Date(now - i * 60000).toISOString(),
      o: Math.round(o * 100) / 100,
      h: Math.round(h * 100) / 100,
      l: Math.round(l * 100) / 100,
      c: Math.round(c * 100) / 100,
      v,
    });
    price = c;
  }
  return bars;
}

function generateInstrumentData(inst) {
  const bases = { NQ: 20150, ES: 5840, CL: 61.5, GC: 3285 };
  const vols = { NQ: 15, ES: 5, CL: 0.3, GC: 8 };
  const base = bases[inst.symbol] || 1000;
  const vol = vols[inst.symbol] || 1;

  const allBars = generateMockBars(base, vol, 600);
  const priorRTH = allBars.slice(0, 200);
  const overnight = allBars.slice(200, 350);
  const todayRTH = allBars.slice(350);
  const sessionBars = allBars.slice(200);

  const levels = calcAllLevels(priorRTH, overnight, todayRTH, sessionBars);
  const last = allBars[allBars.length - 1].c;
  const prevClose = levels.prior_close || base;
  const change = last - prevClose;

  return {
    symbol: inst.symbol,
    name: inst.name,
    last,
    change,
    change_pct: prevClose ? (change / prevClose) * 100 : 0,
    levels,
    tickSize: inst.tickSize,
  };
}

// ============================================================================
// COMPONENTS
// ============================================================================

const COLORS = {
  bg: "#06080d",
  card: "#0c1019",
  cardBorder: "#151c2c",
  cardHover: "#111827",
  text: "#c9d1d9",
  textDim: "#4a5568",
  textMuted: "#2d3748",
  accent: "#22d3ee",
  accentDim: "#0e7490",
  green: "#10b981",
  greenDim: "#065f46",
  red: "#ef4444",
  redDim: "#7f1d1d",
  gold: "#f59e0b",
  goldDim: "#92400e",
  blue: "#3b82f6",
  purple: "#8b5cf6",
  orange: "#f97316",
  separator: "#1a2332",
};

function PriceLocation({ price, levels }) {
  if (!price || !levels?.vwap) return null;
  const dist = price - levels.vwap;
  const absDist = Math.abs(dist);
  let label, color;
  if (absDist < 2) { label = "At VWAP"; color = COLORS.gold; }
  else if (price > (levels.vwap_upper_1 || Infinity)) { label = `${absDist.toFixed(1)} above +1σ`; color = COLORS.green; }
  else if (price < (levels.vwap_lower_1 || -Infinity)) { label = `${absDist.toFixed(1)} below -1σ`; color = COLORS.red; }
  else if (dist > 0) { label = `${absDist.toFixed(1)} above VWAP`; color = COLORS.green; }
  else { label = `${absDist.toFixed(1)} below VWAP`; color = COLORS.red; }
  return <span style={{ fontSize: 10, color, fontWeight: 600, letterSpacing: "0.04em" }}>{label}</span>;
}

function LevelRow({ label, value, color, highlight, proximity }) {
  const isClose = proximity !== undefined && proximity < 3;
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "5px 0",
      borderLeft: isClose ? `2px solid ${color || COLORS.accent}` : "2px solid transparent",
      paddingLeft: isClose ? 8 : 10,
      background: highlight ? "rgba(34,211,238,0.04)" : "transparent",
      borderRadius: 2, transition: "all 0.3s ease",
    }}>
      <span style={{ color: COLORS.textDim, fontSize: 11, fontWeight: 500, fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
      <span style={{
        color: color || COLORS.text, fontFamily: "'JetBrains Mono', monospace",
        fontSize: 12, fontWeight: 600, letterSpacing: "0.02em",
      }}>
        {value != null ? value.toFixed(2) : "—"}
        {isClose && <span style={{ marginLeft: 6, fontSize: 9, color: COLORS.accent, fontWeight: 700 }}>◄ NEAR</span>}
      </span>
    </div>
  );
}

function SectionHeader({ label, color, icon }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 6,
      marginTop: 14, marginBottom: 4, paddingBottom: 4,
      borderBottom: `1px solid ${color}22`,
    }}>
      {icon && <span style={{ fontSize: 10 }}>{icon}</span>}
      <span style={{
        fontSize: 9, fontWeight: 700, color,
        textTransform: "uppercase", letterSpacing: "0.12em",
        fontFamily: "'JetBrains Mono', monospace",
      }}>{label}</span>
    </div>
  );
}

function MiniChart({ data }) {
  if (!data || !data.levels) return null;
  const levels = data.levels;
  const allVals = [
    levels.prior_high, levels.prior_low, levels.overnight_high,
    levels.overnight_low, levels.vwap, data.last,
    levels.or15_high, levels.or15_low,
  ].filter(Boolean);
  if (allVals.length < 2) return null;

  const min = Math.min(...allVals);
  const max = Math.max(...allVals);
  const range = max - min || 1;
  const h = 120, w = 200, pad = 8;

  const yPos = (v) => pad + ((max - v) / range) * (h - pad * 2);

  const levelLines = [
    { val: levels.prior_high, color: COLORS.blue, label: "PH" },
    { val: levels.prior_low, color: COLORS.blue, label: "PL" },
    { val: levels.overnight_high, color: COLORS.orange, label: "ONH" },
    { val: levels.overnight_low, color: COLORS.orange, label: "ONL" },
    { val: levels.vwap, color: COLORS.gold, label: "VP" },
  ].filter((l) => l.val != null);

  const priceY = yPos(data.last);

  return (
    <svg width={w} height={h} style={{ display: "block", margin: "8px auto 4px" }}>
      <defs>
        <linearGradient id={`grad-${data.symbol}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={data.change >= 0 ? COLORS.green : COLORS.red} stopOpacity="0.15" />
          <stop offset="100%" stopColor="transparent" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect x={0} y={0} width={w} height={h} fill="transparent" rx={4} />
      {levelLines.map((l, i) => {
        const y = yPos(l.val);
        return (
          <g key={i}>
            <line x1={30} y1={y} x2={w - 4} y2={y} stroke={l.color} strokeWidth={0.7} strokeDasharray="3,3" opacity={0.5} />
            <text x={2} y={y + 3} fill={l.color} fontSize={7} fontFamily="monospace" opacity={0.7}>{l.label}</text>
          </g>
        );
      })}
      <line x1={30} y1={priceY} x2={w - 4} y2={priceY} stroke={data.change >= 0 ? COLORS.green : COLORS.red} strokeWidth={1.5} opacity={0.8} />
      <circle cx={w - 8} cy={priceY} r={3} fill={data.change >= 0 ? COLORS.green : COLORS.red}>
        <animate attributeName="opacity" values="1;0.4;1" dur="2s" repeatCount="indefinite" />
      </circle>
      <text x={w - 14} y={priceY - 6} fill={data.change >= 0 ? COLORS.green : COLORS.red} fontSize={8} fontFamily="monospace" fontWeight="bold" textAnchor="end">
        {data.last?.toFixed(2)}
      </text>
    </svg>
  );
}

function InstrumentCard({ data }) {
  if (!data) return null;
  const isPos = data.change >= 0;
  const accent = isPos ? COLORS.green : COLORS.red;
  const levels = data.levels || {};

  const proximities = {};
  if (data.last) {
    for (const [k, v] of Object.entries(levels)) {
      if (typeof v === "number") proximities[k] = Math.abs(data.last - v);
    }
  }

  return (
    <div style={{
      background: COLORS.card, border: `1px solid ${COLORS.cardBorder}`,
      borderRadius: 10, padding: "16px 18px", position: "relative",
      overflow: "hidden", transition: "border-color 0.3s ease",
    }}
    onMouseEnter={(e) => e.currentTarget.style.borderColor = accent + "44"}
    onMouseLeave={(e) => e.currentTarget.style.borderColor = COLORS.cardBorder}
    >
      {/* Glow accent */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg, transparent, ${accent}88, transparent)`,
      }} />

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 2 }}>
        <div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontSize: 18, fontWeight: 800, color: "#fff", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "-0.02em" }}>{data.symbol}</span>
            <span style={{ fontSize: 10, color: COLORS.textDim, fontWeight: 500 }}>{data.name}</span>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 4 }}>
            <span style={{ fontSize: 28, fontWeight: 800, color: "#fff", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "-0.03em" }}>
              {data.last?.toFixed(2)}
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: accent, fontFamily: "'JetBrains Mono', monospace" }}>
              {isPos ? "+" : ""}{data.change?.toFixed(2)}
              <span style={{ opacity: 0.7, marginLeft: 4, fontSize: 11 }}>
                ({isPos ? "+" : ""}{data.change_pct?.toFixed(2)}%)
              </span>
            </span>
          </div>
          <PriceLocation price={data.last} levels={levels} />
        </div>
        <div style={{
          width: 8, height: 8, borderRadius: "50%", background: accent,
          boxShadow: `0 0 8px ${accent}66`, marginTop: 4,
          animation: "pulse 2s infinite",
        }} />
      </div>

      <MiniChart data={data} />

      {/* Prior Day */}
      <SectionHeader label="Prior Day" color={COLORS.blue} icon="📊" />
      <LevelRow label="High" value={levels.prior_high} color={COLORS.blue} proximity={proximities.prior_high} />
      <LevelRow label="Low" value={levels.prior_low} color={COLORS.blue} proximity={proximities.prior_low} />
      <LevelRow label="Close" value={levels.prior_close} proximity={proximities.prior_close} />

      {/* Overnight */}
      <SectionHeader label="Overnight / Globex" color={COLORS.orange} icon="🌙" />
      <LevelRow label="Globex High" value={levels.overnight_high} color={COLORS.orange} proximity={proximities.overnight_high} />
      <LevelRow label="Globex Low" value={levels.overnight_low} color={COLORS.orange} proximity={proximities.overnight_low} />

      {/* Session Ranges */}
      <SectionHeader label="Session Ranges" color={COLORS.accent} icon="📐" />
      <LevelRow label="OR 15m High" value={levels.or15_high} proximity={proximities.or15_high} />
      <LevelRow label="OR 15m Low" value={levels.or15_low} proximity={proximities.or15_low} />
      <LevelRow label="OR 30m High" value={levels.or30_high} proximity={proximities.or30_high} />
      <LevelRow label="OR 30m Low" value={levels.or30_low} proximity={proximities.or30_low} />
      <LevelRow label="IB High" value={levels.or60_high} color={COLORS.purple} proximity={proximities.or60_high} />
      <LevelRow label="IB Low" value={levels.or60_low} color={COLORS.purple} proximity={proximities.or60_low} />

      {/* VWAP */}
      <SectionHeader label="VWAP" color={COLORS.gold} icon="⚡" />
      <LevelRow label="VWAP" value={levels.vwap} color={COLORS.gold} highlight proximity={proximities.vwap} />
      <LevelRow label="+1σ" value={levels.vwap_upper_1} color={COLORS.goldDim} proximity={proximities.vwap_upper_1} />
      <LevelRow label="−1σ" value={levels.vwap_lower_1} color={COLORS.goldDim} proximity={proximities.vwap_lower_1} />
      <LevelRow label="+2σ" value={levels.vwap_upper_2} color={COLORS.textDim} proximity={proximities.vwap_upper_2} />
      <LevelRow label="−2σ" value={levels.vwap_lower_2} color={COLORS.textDim} proximity={proximities.vwap_lower_2} />
    </div>
  );
}

function SessionClock() {
  const [info, setInfo] = useState(getSessionInfo());
  useEffect(() => {
    const iv = setInterval(() => setInfo(getSessionInfo()), 1000);
    return () => clearInterval(iv);
  }, []);

  const sessionColors = { RTH: COLORS.green, GLOBEX: COLORS.orange, CLOSED: COLORS.textDim };
  const color = sessionColors[info.session] || COLORS.textDim;

  const formatTime = (mins) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  return (
    <div style={{
      background: COLORS.card, border: `1px solid ${COLORS.cardBorder}`,
      borderRadius: 10, padding: "14px 18px",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, boxShadow: `0 0 6px ${color}66` }} />
          <span style={{ fontSize: 13, fontWeight: 700, color, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.08em" }}>
            {info.session}
          </span>
          {info.session === "CLOSED" && info.reason && (
            <span style={{ fontSize: 9, color: COLORS.textDim, fontFamily: "'JetBrains Mono', monospace" }}>
              {info.reason === "WEEKEND" ? "WEEKEND" : "DAILY HALT"}
            </span>
          )}
        </div>
        <span style={{ fontSize: 11, color: COLORS.textDim, fontFamily: "'JetBrains Mono', monospace" }}>
          {new Date().toLocaleTimeString("en-US", { timeZone: "America/New_York", hour: "2-digit", minute: "2-digit", second: "2-digit" })} ET
        </span>
      </div>
      {info.session === "CLOSED" ? (
        <div style={{ fontSize: 11, color: COLORS.textDim, fontFamily: "'JetBrains Mono', monospace", textAlign: "center", padding: "6px 0" }}>
          {info.nextOpen ? (
            <>
              <span style={{ color: COLORS.text }}>{info.nextOpen.label}</span>
              <span style={{ marginLeft: 8, color: COLORS.textDim }}>({formatTime(info.nextOpen.minutesUntil)})</span>
            </>
          ) : (
            "Markets closed"
          )}
        </div>
      ) : (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: COLORS.textDim, marginBottom: 6, fontFamily: "'JetBrains Mono', monospace" }}>
            <span>{formatTime(info.minutesIn)} in</span>
            <span>{formatTime(info.minutesLeft)} left</span>
          </div>
          <div style={{ height: 4, background: COLORS.separator, borderRadius: 2, overflow: "hidden" }}>
            <div style={{
              height: "100%", width: `${info.pctComplete}%`, background: `linear-gradient(90deg, ${color}, ${color}aa)`,
              borderRadius: 2, transition: "width 1s linear",
            }} />
          </div>
        </>
      )}
    </div>
  );
}

function EconCalendar({ events }) {
  const displayEvents = events && events.length > 0 ? events : getMockCalendar();
  const impactColors = { high: COLORS.red, medium: COLORS.gold, low: COLORS.textDim };
  const impactLabels = { high: "HIGH", medium: "MED", low: "LOW" };

  return (
    <div style={{
      background: COLORS.card, border: `1px solid ${COLORS.cardBorder}`,
      borderRadius: 10, padding: "14px 18px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 14 }}>📅</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#fff", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.04em" }}>
          ECONOMIC CALENDAR
        </span>
        <span style={{ fontSize: 10, color: COLORS.textDim, marginLeft: "auto", fontFamily: "'JetBrains Mono', monospace" }}>
          {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
        </span>
      </div>
      {displayEvents.map((evt, i) => (
        <div key={i} style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "7px 0", borderBottom: i < displayEvents.length - 1 ? `1px solid ${COLORS.separator}` : "none",
        }}>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: COLORS.textDim,
            minWidth: 42, fontWeight: 600,
          }}>{evt.time}</span>
          <span style={{
            fontSize: 8, fontWeight: 800, color: impactColors[evt.impact],
            border: `1px solid ${impactColors[evt.impact]}44`,
            borderRadius: 3, padding: "1px 4px", minWidth: 30, textAlign: "center",
            fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.08em",
          }}>{impactLabels[evt.impact]}</span>
          <span style={{ color: COLORS.text, fontSize: 12, flex: 1, fontWeight: 500 }}>{evt.event}</span>
          <div style={{ display: "flex", gap: 12, fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}>
            <span style={{ color: COLORS.textDim }}>F: <span style={{ color: COLORS.text }}>{evt.forecast}</span></span>
            <span style={{ color: COLORS.textDim }}>P: <span style={{ color: COLORS.text }}>{evt.previous}</span></span>
            {evt.actual && <span style={{ color: COLORS.green }}>A: {evt.actual}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}


// ============================================================================
// MAIN DASHBOARD
// ============================================================================

// Read from environment variables — set in Vercel dashboard or .env.local
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

async function supabaseGet(table, params = "") {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${params}`;
  const resp = await fetch(url, {
    headers: {
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
    },
    signal: AbortSignal.timeout(5000),
  });
  if (!resp.ok) throw new Error(`Supabase ${table}: ${resp.status}`);
  return resp.json();
}

export default function MarketStructureDashboard() {
  const [instrumentData, setInstrumentData] = useState({});
  const [calendar, setCalendar] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(null);

  const loadData = useCallback(async () => {
    try {
      // Fetch levels directly from Supabase
      const levels = await supabaseGet("levels_cache", "select=*&order=symbol.asc");

      if (!levels || levels.length === 0) throw new Error("No levels data");

      const newData = {};
      for (const row of levels) {
        const sym = row.symbol;
        const inst = INSTRUMENTS.find(i => i.symbol === sym);
        let levelsData = row.levels_json;
        if (typeof levelsData === "string") levelsData = JSON.parse(levelsData);
        newData[sym] = {
          symbol: sym,
          name: inst?.name || sym,
          last: parseFloat(row.last_price) || 0,
          change: parseFloat(row.change) || 0,
          change_pct: parseFloat(row.change_pct) || 0,
          levels: levelsData || {},
          tickSize: inst?.tickSize || 0.25,
        };
      }
      setInstrumentData(newData);

      // Fetch calendar
      try {
        const today = new Date().toISOString().split("T")[0];
        const events = await supabaseGet("econ_events", `select=*&date=eq.${today}&order=time_et.asc`);
        setCalendar((events || []).map(e => ({
          time: e.time_et || "",
          impact: e.impact || "low",
          event: e.event_name || "",
          forecast: e.forecast || "",
          previous: e.previous || "",
          actual: e.actual || null,
        })));
      } catch(e) { /* calendar fetch failed, keep existing */ }

      setLastUpdate(new Date());
    } catch (e) {
      // Supabase not reachable or no data — fall back to simulated
      console.log("Supabase not reachable, using simulated data:", e.message);
      const newData = {};
      for (const inst of INSTRUMENTS) {
        newData[inst.symbol] = generateInstrumentData(inst);
      }
      setInstrumentData(newData);
      setCalendar(getMockCalendar());
      setLastUpdate(new Date());
    }
  }, []);

  useEffect(() => {
    loadData();
    const iv = setInterval(loadData, 15000);
    return () => clearInterval(iv);
  }, [loadData]);

  return (
    <div style={{
      minHeight: "100vh", background: COLORS.bg,
      fontFamily: "'Segoe UI', 'Helvetica Neue', sans-serif",
      color: COLORS.text,
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700;800&display=swap');
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: ${COLORS.bg}; }
        ::-webkit-scrollbar-thumb { background: ${COLORS.separator}; border-radius: 3px; }
      `}</style>

      {/* Header */}
      <div style={{
        padding: "16px 24px", borderBottom: `1px solid ${COLORS.separator}`,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        background: `linear-gradient(180deg, ${COLORS.card}, ${COLORS.bg})`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 17, fontWeight: 800, color: "#fff", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "-0.02em" }}>
              MARKET STRUCTURE
            </span>
            <span style={{ fontSize: 10, color: COLORS.textDim, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em", marginTop: 2 }}>
              KEY LEVELS DASHBOARD
            </span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {lastUpdate && (
            <span style={{ fontSize: 10, color: COLORS.textDim, fontFamily: "'JetBrains Mono', monospace" }}>
              Updated {lastUpdate.toLocaleTimeString()}
            </span>
          )}
          <button onClick={loadData} style={{
            background: "rgba(34,211,238,0.1)", border: `1px solid ${COLORS.accentDim}`,
            borderRadius: 6, padding: "6px 14px", cursor: "pointer",
            color: COLORS.accent, fontSize: 11, fontWeight: 700,
            fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.06em",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => { e.target.style.background = "rgba(34,211,238,0.2)"; }}
          onMouseLeave={(e) => { e.target.style.background = "rgba(34,211,238,0.1)"; }}
          >
            ↻ REFRESH
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "16px 24px", maxWidth: 1400, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16 }}>
          {/* Instruments Grid */}
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))",
            gap: 14, alignContent: "start",
          }}>
            {INSTRUMENTS.map((inst, i) => (
              <div key={inst.symbol} style={{ animation: `fadeIn 0.4s ease ${i * 0.08}s both` }}>
                <InstrumentCard data={instrumentData[inst.symbol]} />
              </div>
            ))}
          </div>

          {/* Sidebar */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <SessionClock />
            <EconCalendar events={calendar} />
          </div>
        </div>
      </div>
    </div>
  );
}
