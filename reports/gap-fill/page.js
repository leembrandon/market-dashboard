"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { fetchReport } from "../../../lib/data";
import s from "./report.module.css";

const SYMBOLS = ["NQ", "ES", "CL", "GC"];
const DIRECTIONS = [
  { label: "Both", value: null },
  { label: "Gap Up", value: "up" },
  { label: "Gap Down", value: "down" },
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

export default function GapFillReportPage() {
  const [symbol, setSymbol] = useState("NQ");
  const [direction, setDirection] = useState(null);
  const [lookback, setLookback] = useState(90);
  const [dayFilter, setDayFilter] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters = { day_of_week: dayFilter, direction: direction };
      const result = await fetchReport("gap_fill", symbol, filters, lookback);
      setData(result);
    } catch (e) {
      setError(e.message);
      setData(null);
    }
    setLoading(false);
  }, [symbol, direction, lookback, dayFilter]);

  useEffect(() => { loadReport(); }, [loadReport]);

  const bias = data?.bias || {};
  const entry = data?.entry || {};
  const target = data?.target || {};
  const inv = data?.invalidation || {};
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
          <h1 className={s.title}>Gap Fill</h1>
          <p className={s.question}>Should I fade this gap or ride it?</p>
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
        <FilterGroup label="Direction">
          {DIRECTIONS.map((d) => (
            <button key={d.label} onClick={() => setDirection(d.value)}
              className={`${s.filterBtn} ${direction === d.value ? s.filterBtnActive : ""}`}>
              {d.label}
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
            <div className={s.heroNumber}>{pct(bias.fill_rate)}</div>
            <div className={s.heroLabel}>Gap fill rate</div>
            <div className={s.heroContext}>
              {symbol} · {pct(bias.continuation_rate)} continuation
              · Gaps up fill {pct(bias.fill_rate_up)} · Gaps down fill {pct(bias.fill_rate_down)}
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
                {entry.avg_fill_time_min != null ? mins(entry.avg_fill_time_min) : "—"}
              </div>
              <div className={s.actionStatLabel}>avg fill time</div>
              <div className={s.actionDesc}>
                {pct(entry.pct_filled_in_30)} fill within 30 min · {pct(entry.pct_filled_in_60)} within 60 min.
                {entry.late_fill_rate != null ? ` After 60 min, only ${pct(entry.late_fill_rate)} still fill.` : ""}
              </div>
            </div>

            <div className={s.actionCard}>
              <div className={s.actionHeader}>
                <span className={s.actionIcon} style={{ color: "var(--accent)" }}>◎</span>
                <span className={s.actionTitle}>Target</span>
              </div>
              <div className={s.actionStat} style={{ color: "var(--accent)" }}>
                {target.avg_gap_size_pct != null ? `${target.avg_gap_size_pct.toFixed(2)}%` : "—"}
              </div>
              <div className={s.actionStatLabel}>avg gap size</div>
              <div className={s.actionDesc}>
                Avg overshoot past fill: {pts(target.avg_overshoot)} pts.
                When gap doesn't fill, avg continuation: {pts(target.avg_continuation_move)} pts.
              </div>
            </div>

            <div className={s.actionCard}>
              <div className={s.actionHeader}>
                <span className={s.actionIcon} style={{ color: "var(--red)" }}>⊘</span>
                <span className={s.actionTitle}>Invalidation</span>
              </div>
              <div className={s.actionStat} style={{ color: "var(--red)" }}>
                {pct(inv.large_gap_fill_rate)}
              </div>
              <div className={s.actionStatLabel}>large gap fill rate</div>
              <div className={s.actionDesc}>
                Small gaps fill {pct(inv.small_gap_fill_rate)} of the time.
                Avg max adverse excursion before fill: {pts(inv.avg_max_adverse)} pts.
              </div>
            </div>
          </div>

          {/* Heatmap */}
          <div className={s.section}>
            <h3 className={s.sectionTitle}>Day of Week — Gap Fill Rate</h3>
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
                {recent.map((sess, i) => (
                  <div key={i} className={s.streakCard}>
                    <div className={s.streakDate}>{sess.date?.slice(5) || "—"}</div>
                    <div className={s.streakDir} style={{
                      color: sess.direction === "up" ? "var(--green)" : "var(--red)"
                    }}>
                      {sess.direction === "up" ? "▲ up" : "▼ down"}
                    </div>
                    <div className={s.streakResult}>
                      {sess.filled
                        ? <span style={{ color: "var(--green)" }}>✓ filled</span>
                        : <span style={{ color: "var(--red)" }}>✗ unfilled</span>}
                    </div>
                    <div className={s.streakMove}>
                      {sess.gap_pct != null ? `${Number(sess.gap_pct).toFixed(2)}%` : "—"}
                    </div>
                  </div>
                ))}
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
