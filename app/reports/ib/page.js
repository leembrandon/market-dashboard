"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { fetchReport } from "../../../lib/data";
import s from "./report.module.css";

const SYMBOLS = ["NQ", "ES", "CL", "GC"];
const IB_SIZES = [
  { label: "All", value: null },
  { label: "Narrow", value: "narrow" },
  { label: "Average", value: "average" },
  { label: "Wide", value: "wide" },
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
const mult = (v) => (v != null && !isNaN(v) ? `${parseFloat(v).toFixed(1)}x` : "—");
const mins = (v) => (v != null ? `${Math.round(v)} min` : "—");

function heatColor(value) {
  if (value == null) return "#1e1e2e";
  const c = Math.max(0, Math.min(1, value));
  if (c >= 0.7) return `rgba(16, 185, 129, ${0.25 + c * 0.55})`;
  if (c >= 0.5) return `rgba(245, 158, 11, ${0.2 + c * 0.4})`;
  return `rgba(244, 63, 94, ${0.2 + c * 0.5})`;
}

export default function IBReportPage() {
  const [symbol, setSymbol] = useState("NQ");
  const [ibSize, setIbSize] = useState(null);
  const [lookback, setLookback] = useState(90);
  const [dayFilter, setDayFilter] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters = { day_of_week: dayFilter, ib_size: ibSize };
      const result = await fetchReport("ib", symbol, filters, lookback);
      setData(result);
    } catch (e) {
      setError(e.message);
      setData(null);
    }
    setLoading(false);
  }, [symbol, ibSize, lookback, dayFilter]);

  useEffect(() => { loadReport(); }, [loadReport]);

  const bias = data?.bias || {};
  const entry = data?.entry || {};
  const target = data?.target || {};
  const inv = data?.invalidation || {};
  const heatmap = data?.heatmap || {};
  const recent = data?.recent_sessions || [];

  const totalExtRate = ((bias.ext_above_rate || 0) + (bias.ext_below_rate || 0));

  return (
    <div className={s.page}>
      <div className={s.nav}>
        <Link href="/" className={s.backLink}>
          ← <span className={s.backLogo}><span style={{ color: "var(--accent)" }}>Level</span>Sight</span>
        </Link>
      </div>

      <header className={s.header}>
        <div>
          <h1 className={s.title}>Initial Balance</h1>
          <p className={s.question}>Is today a trend day or a chop day?</p>
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
        <FilterGroup label="IB Size">
          {IB_SIZES.map((sz) => (
            <button key={sz.label} onClick={() => setIbSize(sz.value)}
              className={`${s.filterBtn} ${ibSize === sz.value ? s.filterBtnActive : ""}`}>
              {sz.label}
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
            <div className={s.heroNumber}>{pct(totalExtRate)}</div>
            <div className={s.heroLabel}>IB extension rate</div>
            <div className={s.heroContext}>
              {symbol} · {pct(bias.ext_above_rate)} extend above · {pct(bias.ext_below_rate)} extend below
              · {pct(bias.stay_inside_rate)} stay inside
              {bias.avg_ib_range ? ` · Avg IB: ${pts(bias.avg_ib_range)} pts` : ""}
            </div>
          </div>

          {/* Action Cards */}
          <div className={s.cardRow}>
            <div className={s.actionCard}>
              <div className={s.actionHeader}>
                <span className={s.actionIcon} style={{ color: "var(--green)" }}>⎆</span>
                <span className={s.actionTitle}>Entry</span>
              </div>
              <div className={s.actionStat} style={{ color: "var(--green)" }}>{pct(entry.first_ext_reliability)}</div>
              <div className={s.actionStatLabel}>first extension reliability</div>
              <div className={s.actionDesc}>
                {entry.avg_ext_time_min != null
                  ? `First extension at ~${mins(entry.avg_ext_time_min)} after IB sets.`
                  : ""}
                {` ${pct(entry.retest_rate)} retest the IB edge after extending.`}
              </div>
            </div>

            <div className={s.actionCard}>
              <div className={s.actionHeader}>
                <span className={s.actionIcon} style={{ color: "var(--accent)" }}>◎</span>
                <span className={s.actionTitle}>Target</span>
              </div>
              <div className={s.actionStat} style={{ color: "var(--accent)" }}>{mult(target.avg_ext_multiple)}</div>
              <div className={s.actionStatLabel}>avg extension multiple</div>
              <div className={s.actionDesc}>
                Above: {mult(target.avg_ext_multiple_above)} ({pts(target.avg_ext_above_pts)} pts)
                · Below: {mult(target.avg_ext_multiple_below)} ({pts(target.avg_ext_below_pts)} pts)
              </div>
            </div>

            <div className={s.actionCard}>
              <div className={s.actionHeader}>
                <span className={s.actionIcon} style={{ color: "var(--red)" }}>⊘</span>
                <span className={s.actionTitle}>Invalidation</span>
              </div>
              <div className={s.actionStat} style={{ color: "var(--red)" }}>{pct(inv.failed_ext_rate)}</div>
              <div className={s.actionStatLabel}>failed extension rate</div>
              <div className={s.actionDesc}>
                Double break rate: {pct(bias.double_break_rate)}.
                {inv.late_ext_rate != null ? ` Late extensions (after 60 min) only ${pct(inv.late_ext_rate)} of the time.` : ""}
              </div>
            </div>
          </div>

          {/* IB Size Comparison */}
          <div className={s.section}>
            <h3 className={s.sectionTitle}>IB Size Context</h3>
            <div className={s.compRow}>
              <div className={`${s.compCard} ${ibSize === "narrow" ? s.compCardActive : ""}`}>
                <div className={s.compPeriod}>Narrow</div>
                <div className={s.compStat}>{pct(bias.narrow_ext_rate)}</div>
                <div className={s.compLabel}>extension rate</div>
              </div>
              <div className={`${s.compCard} ${ibSize === "wide" ? s.compCardActive : ""}`}>
                <div className={s.compPeriod}>Wide</div>
                <div className={s.compStat}>{pct(bias.wide_ext_rate)}</div>
                <div className={s.compLabel}>extension rate</div>
              </div>
            </div>
          </div>

          {/* Heatmap */}
          <div className={s.section}>
            <h3 className={s.sectionTitle}>Day of Week — Extension Rate</h3>
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
                      color: sess.extended === "above" ? "var(--green)"
                        : sess.extended === "below" ? "var(--red)"
                        : "var(--text-muted)"
                    }}>
                      {sess.extended === "above" ? "▲ above"
                        : sess.extended === "below" ? "▼ below"
                        : "— inside"}
                    </div>
                    <div className={s.streakResult}>
                      {sess.double_break
                        ? <span style={{ color: "var(--amber)" }}>⚠ double</span>
                        : <span style={{ color: "var(--text-dim)" }}>close: {sess.close || "—"}</span>}
                    </div>
                    <div className={s.streakMove}>
                      {sess.ib_range != null ? `${Number(sess.ib_range).toFixed(1)} pts` : "—"}
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
