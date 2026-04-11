"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { fetchReport } from "../../../lib/data";
import s from "./orb.module.css";

const SYMBOLS = ["NQ", "ES", "CL", "GC"];
const OR_PERIODS = [5, 15, 30];
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

export default function ORBReportPage() {
  const [symbol, setSymbol] = useState("NQ");
  const [orPeriod, setOrPeriod] = useState(15);
  const [lookback, setLookback] = useState(90);
  const [dayFilter, setDayFilter] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters = { day_of_week: dayFilter, or_period: orPeriod };
      const result = await fetchReport("orb", symbol, filters, lookback);
      setData(result);
    } catch (e) {
      setError(e.message);
      setData(null);
    }
    setLoading(false);
  }, [symbol, orPeriod, lookback, dayFilter]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const bias = data?.bias || {};
  const entry = data?.entry || {};
  const target = data?.target || {};
  const inv = data?.invalidation || {};
  const heatmap = data?.heatmap || {};
  const recent = data?.recent_sessions || [];
  const comparison = entry.or_period_comparison || {};

  return (
    <div className={s.page}>
      {/* Nav */}
      <div className={s.nav}>
        <Link href="/" className={s.backLink}>
          ← <span className={s.backLogo}><span style={{ color: "var(--accent)" }}>Level</span>Sight</span>
        </Link>
      </div>

      {/* Header */}
      <header className={s.header}>
        <div>
          <h1 className={s.title}>Opening Range Breakout</h1>
          <p className={s.question}>Should I trade the first breakout or wait?</p>
        </div>
        <div className={s.meta}>
          {data && (
            <span className={s.sampleBadge}>
              {data.sample_size} of {data.total_sessions} sessions
            </span>
          )}
        </div>
      </header>

      {/* Filters */}
      <div className={s.filterBar}>
        <FilterGroup label="Ticker">
          {SYMBOLS.map((sym) => (
            <button key={sym} onClick={() => setSymbol(sym)}
              className={`${s.filterBtn} ${symbol === sym ? s.filterBtnActive : ""}`}>
              {sym}
            </button>
          ))}
        </FilterGroup>
        <FilterGroup label="OR Period">
          {OR_PERIODS.map((p) => (
            <button key={p} onClick={() => setOrPeriod(p)}
              className={`${s.filterBtn} ${orPeriod === p ? s.filterBtnActive : ""}`}>
              {p}m
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

      {/* States */}
      {loading && (
        <div className={s.stateBox}>
          <div className={s.spinner} />
          <p className={s.stateText}>Loading report...</p>
        </div>
      )}
      {error && (
        <div className={s.stateBox}>
          <p className={s.stateText} style={{ color: "var(--red)" }}>Error: {error}</p>
          <p className={s.stateSubtext}>Check that the API proxy and database are running.</p>
        </div>
      )}
      {!loading && !error && !data && (
        <div className={s.stateBox}>
          <p className={s.stateText}>No data for these filters.</p>
          <p className={s.stateSubtext}>
            Run <code>python backfill.py</code> and <code>python stats_engine.py</code> to seed data.
          </p>
        </div>
      )}

      {/* Report Content */}
      {!loading && !error && data && (
        <div style={{ animation: "fadeIn 0.3s ease-out" }}>

          {/* Hero */}
          <div className={s.heroSection}>
            <div className={s.heroNumber}>{pct(bias.first_break_reliability)}</div>
            <div className={s.heroLabel}>First break = real direction</div>
            <div className={s.heroContext}>
              {symbol} {orPeriod}-min OR · {pct(bias.breakout_rate)} break the range
              · {pct(bias.bullish_pct)} bullish / {pct(bias.bearish_pct)} bearish
            </div>
          </div>

          {/* Action Cards */}
          <div className={s.cardRow}>
            <div className={s.actionCard}>
              <div className={s.actionHeader}>
                <span className={s.actionIcon} style={{ color: "var(--green)" }}>⎆</span>
                <span className={s.actionTitle}>Entry</span>
              </div>
              <div className={s.actionStat} style={{ color: "var(--green)" }}>{pct(entry.trap_rate)}</div>
              <div className={s.actionStatLabel}>trap rate</div>
              <div className={s.actionDesc}>
                {entry.avg_break_time_min != null
                  ? `Avg first break at ${mins(entry.avg_break_time_min)} after OR sets.`
                  : "Awaiting more data for timing stats."}
              </div>
            </div>

            <div className={s.actionCard}>
              <div className={s.actionHeader}>
                <span className={s.actionIcon} style={{ color: "var(--accent)" }}>◎</span>
                <span className={s.actionTitle}>Target</span>
              </div>
              <div className={s.actionStat} style={{ color: "var(--accent)" }}>{pts(target.avg_total_move)}</div>
              <div className={s.actionStatLabel}>avg move (pts)</div>
              <div className={s.actionDesc}>
                A-move: {pts(target.avg_a_move)} pts · B-move: {pts(target.avg_b_move)} pts
                · {target.avg_move_multiple != null ? target.avg_move_multiple.toFixed(1) : "—"}x OR range
              </div>
            </div>

            <div className={s.actionCard}>
              <div className={s.actionHeader}>
                <span className={s.actionIcon} style={{ color: "var(--red)" }}>⊘</span>
                <span className={s.actionTitle}>Invalidation</span>
              </div>
              <div className={s.actionStat} style={{ color: "var(--red)" }}>{pct(inv.midpoint_retest_fail_rate)}</div>
              <div className={s.actionStatLabel}>midpoint retest fails</div>
              <div className={s.actionDesc}>
                {inv.trap_reveal_time_min != null
                  ? `Traps reveal in ~${inv.trap_reveal_time_min} min. Small OR trap rate: ${pct(inv.small_or_trap_rate)}.`
                  : `Small OR trap rate: ${pct(inv.small_or_trap_rate)}.`}
              </div>
            </div>
          </div>

          {/* OR Period Comparison */}
          {Object.keys(comparison).length > 0 && (
            <div className={s.section}>
              <h3 className={s.sectionTitle}>OR Period Comparison</h3>
              <div className={s.compRow}>
                {["5", "15", "30"].map((p) => {
                  const c = comparison[p];
                  if (!c) return null;
                  const isActive = parseInt(p) === orPeriod;
                  return (
                    <div key={p} className={`${s.compCard} ${isActive ? s.compCardActive : ""}`}>
                      <div className={s.compPeriod}>{p}m</div>
                      <div className={s.compStat}>{pct(c.reliability)}</div>
                      <div className={s.compLabel}>reliability</div>
                      <div className={s.compTrap} style={{
                        color: c.trap_rate > 0.3 ? "var(--red)" : c.trap_rate > 0.2 ? "var(--amber)" : "var(--green)"
                      }}>
                        {pct(c.trap_rate)} traps
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Heatmap */}
          <div className={s.section}>
            <h3 className={s.sectionTitle}>Day of Week — First Break Reliability</h3>
            <div className={s.heatmapRow}>
              {DAY_LABELS.map((label, i) => {
                const val = heatmap[String(i)];
                return (
                  <div key={i} className={s.heatmapCell}>
                    <div className={s.heatmapBlock} style={{ backgroundColor: heatColor(val) }}>
                      {pct(val)}
                    </div>
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
                      color: sess.first_break === "above" ? "var(--green)" : "var(--red)"
                    }}>
                      {sess.first_break === "above" ? "▲" : "▼"} {sess.first_break || "—"}
                    </div>
                    <div className={s.streakResult}>
                      {sess.held
                        ? <span style={{ color: "var(--green)" }}>✓ held</span>
                        : sess.trapped
                        ? <span style={{ color: "var(--red)" }}>✗ trapped</span>
                        : <span style={{ color: "var(--amber)" }}>✗ failed</span>}
                    </div>
                    <div className={s.streakMove}>
                      {sess.move != null ? `${sess.move > 0 ? "+" : ""}${sess.move.toFixed(2)}%` : "—"}
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

/* ─── Helper Components ─── */

function FilterGroup({ label, children }) {
  return (
    <div className={s.filterGroup}>
      <span className={s.filterLabel}>{label}</span>
      <div className={s.filterBtns}>{children}</div>
    </div>
  );
}
