"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { fetchReport } from "../../../lib/data";
import s from "./report.module.css";

const SYMBOLS = ["NQ", "ES", "CL", "GC"];
const LEVELS = [
  { label: "All", value: null },
  { label: "PDH", value: "pdh" },
  { label: "PDL", value: "pdl" },
  { label: "PDC", value: "pdc" },
];
const LOOKBACKS = [30, 90];
const DAYS = [
  { label: "All", value: null },
  { label: "Mon", value: 0 },
  { label: "Tue", value: 1 },
  { label: "Wed", value: 2 },
  { label: "Thu", value: 3 },
  { label: "Fri", value: 4 },
];
const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

const pct = (v) => (v != null ? `${Math.round(v * 100)}%` : "—");
const pts = (v) => (v != null && !isNaN(v) ? parseFloat(v).toFixed(2) : "—");
const mins = (v) => (v != null ? `${Math.round(v)} min` : "—");

function heatColor(value) {
  if (value == null) return "#1e1e2e";
  const c = Math.max(0, Math.min(1, value));
  if (c >= 0.7) return `rgba(16, 185, 129, ${0.25 + c * 0.55})`;
  if (c >= 0.5) return `rgba(245, 158, 11, ${0.2 + c * 0.4})`;
  return `rgba(244, 63, 94, ${0.2 + c * 0.5})`;
}

export default function PriorDayLevelsReportPage() {
  const [symbol, setSymbol] = useState("NQ");
  const [level, setLevel] = useState(null);
  const [lookback, setLookback] = useState(90);
  const [dayFilter, setDayFilter] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters = { day_of_week: dayFilter, level: level };
      const result = await fetchReport("prior_day_levels", symbol, filters, lookback);
      setData(result);
    } catch (e) {
      setError(e.message);
      setData(null);
    }
    setLoading(false);
  }, [symbol, level, lookback, dayFilter]);

  useEffect(() => { loadReport(); }, [loadReport]);

  const bias = data?.bias || {};
  const levels = data?.levels || {};
  const heatmap = data?.heatmap || {};
  const recent = data?.recent_sessions || [];

  return (
    <div className={s.page}>
      <div className={s.nav}>
        <Link href="/" className={s.backLink}>
          ← <span className={s.backLogo}><span style={{ color: "var(--accent)" }}>Level</span>Sight</span>
        </Link>
      </div>

      <header className={s.header}>
        <div>
          <h1 className={s.title}>Prior Day Levels</h1>
          <p className={s.question}>Will this level hold or break?</p>
        </div>
        <div className={s.meta}>
          {data && (
            <span className={s.sampleBadge}>
              {data.sample_size} of {data.total_sessions} sessions
            </span>
          )}
        </div>
      </header>

      <div className={s.filterBar}>
        <FilterGroup label="Ticker">
          {SYMBOLS.map((sym) => (
            <button key={sym} onClick={() => setSymbol(sym)}
              className={`${s.filterBtn} ${symbol === sym ? s.filterBtnActive : ""}`}>
              {sym}
            </button>
          ))}
        </FilterGroup>
        <FilterGroup label="Level">
          {LEVELS.map((lv) => (
            <button key={lv.label} onClick={() => setLevel(lv.value)}
              className={`${s.filterBtn} ${level === lv.value ? s.filterBtnActive : ""}`}>
              {lv.label}
            </button>
          ))}
        </FilterGroup>
        <FilterGroup label="Lookback">
          {LOOKBACKS.map((l) => (
            <button key={l} onClick={() => setLookback(l)}
              className={`${s.filterBtn} ${lookback === l ? s.filterBtnActive : ""}`}>
              {l}d
            </button>
          ))}
        </FilterGroup>
        <FilterGroup label="Day">
          {DAYS.map((d) => (
            <button key={d.label} onClick={() => setDayFilter(d.value)}
              className={`${s.filterBtn} ${dayFilter === d.value ? s.filterBtnActive : ""}`}>
              {d.label}
            </button>
          ))}
        </FilterGroup>
      </div>

      {loading && (
        <div className={s.stateBox}><div className={s.spinner} /><p className={s.stateText}>Loading report...</p></div>
      )}
      {error && (
        <div className={s.stateBox}>
          <p className={s.stateText} style={{ color: "var(--red)" }}>Unable to load data</p>
          <p className={s.stateSubtext}>Please try again later.</p>
        </div>
      )}
      {!loading && !error && !data && (
        <div className={s.stateBox}><p className={s.stateText}>No data available for these filters.</p></div>
      )}

      {!loading && !error && data && (
        <div style={{ animation: "fadeIn 0.3s ease-out" }}>
          {/* Hero */}
          <div className={s.heroSection}>
            <div className={s.heroNumber}>{pct(bias.test_rate)}</div>
            <div className={s.heroLabel}>{level ? level.toUpperCase() : "PDH"} test rate</div>
            <div className={s.heroContext}>
              {symbol} · {pct(bias.bounce_rate)} bounce · {pct(bias.break_rate)} break
              {bias.avg_test_time_min != null ? ` · Avg test at ${mins(bias.avg_test_time_min)}` : ""}
            </div>
          </div>

          {/* Action Cards */}
          <div className={s.cardRow}>
            <div className={s.actionCard}>
              <div className={s.actionHeader}>
                <span className={s.actionIcon} style={{ color: "var(--green)" }}>⎆</span>
                <span className={s.actionTitle}>Entry</span>
              </div>
              <div className={s.actionStat} style={{ color: "var(--green)" }}>
                {pct(bias.first_touch_bounce_rate)}
              </div>
              <div className={s.actionStatLabel}>first touch bounce rate</div>
              <div className={s.actionDesc}>
                First touch breaks: {pct(bias.first_touch_break_rate)}.
                {bias.avg_test_time_min != null ? ` Level typically tested at ${mins(bias.avg_test_time_min)} into session.` : ""}
              </div>
            </div>

            <div className={s.actionCard}>
              <div className={s.actionHeader}>
                <span className={s.actionIcon} style={{ color: "var(--accent)" }}>◎</span>
                <span className={s.actionTitle}>Target</span>
              </div>
              <div className={s.actionStat} style={{ color: "var(--accent)" }}>
                {pts(bias.avg_bounce_move)}
              </div>
              <div className={s.actionStatLabel}>avg bounce move (pts)</div>
              <div className={s.actionDesc}>
                Avg move after break: {pts(bias.avg_break_move)} pts.
                {bias.avg_hold_duration_min != null ? ` Breaks hold for ~${mins(bias.avg_hold_duration_min)} on avg.` : ""}
              </div>
            </div>

            <div className={s.actionCard}>
              <div className={s.actionHeader}>
                <span className={s.actionIcon} style={{ color: "var(--red)" }}>⊘</span>
                <span className={s.actionTitle}>Invalidation</span>
              </div>
              <div className={s.actionStat} style={{ color: "var(--red)" }}>
                {pct(bias.break_rate)}
              </div>
              <div className={s.actionStatLabel}>break rate</div>
              <div className={s.actionDesc}>
                {bias.avg_hold_duration_min != null
                  ? `If price holds beyond the level for ${mins(bias.avg_hold_duration_min)}, the break is likely real.`
                  : "Monitor hold duration after level break for confirmation."}
              </div>
            </div>
          </div>

          {/* Per-Level Breakdown */}
          {Object.keys(levels).length > 1 && (
            <div className={s.section}>
              <h3 className={s.sectionTitle}>Level Breakdown</h3>
              <div className={s.compRow}>
                {["pdh", "pdl", "pdc"].map((lv) => {
                  const lvData = levels[lv];
                  if (!lvData) return null;
                  const isActive = level === lv;
                  return (
                    <div key={lv} className={`${s.compCard} ${isActive ? s.compCardActive : ""}`}>
                      <div className={s.compPeriod}>{lv.toUpperCase()}</div>
                      <div className={s.compStat}>{pct(lvData.test_rate)}</div>
                      <div className={s.compLabel}>test rate</div>
                      <div className={s.compTrap} style={{
                        color: lvData.bounce_rate > 0.5 ? "var(--green)" : "var(--red)"
                      }}>
                        {pct(lvData.bounce_rate)} bounce
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Heatmap */}
          <div className={s.section}>
            <h3 className={s.sectionTitle}>Day of Week — Bounce Rate</h3>
            <div className={s.heatmapRow}>
              {DAY_LABELS.map((label, i) => {
                const val = heatmap[String(i)];
                return (
                  <div key={i} className={s.heatmapCell}>
                    <div className={s.heatmapBlock} style={{ backgroundColor: heatColor(val) }}>{pct(val)}</div>
                    <div className={s.heatmapLabel}>{label}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Sessions */}
          {recent.length > 0 && (
            <div className={s.section}>
              <h3 className={s.sectionTitle}>Last {recent.length} Sessions</h3>
              <div className={s.streakRow}>
                {recent.map((sess, i) => {
                  const primaryLevel = level || "pdh";
                  const tested = sess[`${primaryLevel}_tested`];
                  const result = sess[`${primaryLevel}_result`];
                  return (
                    <div key={i} className={s.streakCard}>
                      <div className={s.streakDate}>{sess.date?.slice(5) || "—"}</div>
                      <div className={s.streakDir} style={{
                        color: tested ? "var(--text-primary)" : "var(--text-dim)"
                      }}>
                        {tested ? "tested" : "no test"}
                      </div>
                      <div className={s.streakResult}>
                        {result === "bounce"
                          ? <span style={{ color: "var(--green)" }}>✓ bounce</span>
                          : result === "break"
                          ? <span style={{ color: "var(--red)" }}>✗ break</span>
                          : <span style={{ color: "var(--text-dim)" }}>—</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className={s.footer}>
            Last computed: {data.computed_at ? new Date(data.computed_at).toLocaleString() : "—"}
          </div>
        </div>
      )}
    </div>
  );
}

function FilterGroup({ label, children }) {
  return (
    <div className={s.filterGroup}>
      <span className={s.filterLabel}>{label}</span>
      <div className={s.filterBtns}>{children}</div>
    </div>
  );
}
