"use client";
import { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { fetchSession, fetchSessionList } from "../../lib/data";
import s from "./session.module.css";

const SYMBOLS = ["NQ", "ES", "CL", "GC"];
const SESSIONS = [
  { label: "Asia", value: "asia" },
  { label: "London", value: "london" },
  { label: "NY", value: "ny" },
];
const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri"];

const f = (v) => (v != null && !isNaN(v) ? parseFloat(v).toFixed(2) : "—");
const f1 = (v) => (v != null && !isNaN(v) ? parseFloat(v).toFixed(1) : "—");
const pct = (v) => (v != null && !isNaN(v) ? `${(parseFloat(v) * 100).toFixed(2)}%` : "—");
const mins = (v) => (v != null ? `${v} min` : "—");
const bool = (v) => (v === true ? "Yes" : v === false ? "No" : "—");
const dir = (v) => (v === "above" || v === "up" ? "▲" : v === "below" || v === "down" ? "▼" : "—");

function ResultBadge({ value, positiveValues = [] }) {
  if (!value) return <span className={s.badgeNeutral}>—</span>;
  const isPositive = positiveValues.includes(value);
  return (
    <span className={isPositive ? s.badgeGreen : s.badgeRed}>
      {value}
    </span>
  );
}

function StatRow({ label, value, color, sub }) {
  return (
    <div className={s.statRow}>
      <span className={s.statLabel}>{label}</span>
      <div className={s.statRight}>
        <span className={s.statValue} style={color ? { color } : undefined}>{value}</span>
        {sub && <span className={s.statSub}>{sub}</span>}
      </div>
    </div>
  );
}

function Section({ title, icon, color, children }) {
  return (
    <div className={s.section}>
      <div className={s.sectionHeader}>
        <span className={s.sectionIcon} style={{ color }}>{icon}</span>
        <h3 className={s.sectionTitle}>{title}</h3>
      </div>
      <div className={s.sectionBody}>{children}</div>
    </div>
  );
}

export default function SessionDetailPage() {
  return (
    <Suspense fallback={<div className={s.page}><div className={s.stateBox}><div className={s.spinner} /><p className={s.stateText}>Loading session...</p></div></div>}>
      <SessionDetailInner />
    </Suspense>
  );
}

function SessionDetailInner() {
  const searchParams = useSearchParams();
  const [symbol, setSymbol] = useState(searchParams.get("symbol") || "NQ");
  const [sessionType, setSessionType] = useState(searchParams.get("session") || "ny");
  const [date, setDate] = useState(searchParams.get("date") || "");
  const [data, setData] = useState(null);
  const [dates, setDates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load date list
  useEffect(() => {
    fetchSessionList(symbol, sessionType, 30)
      .then((rows) => {
        const d = rows.map((r) => r.trade_date).filter(Boolean);
        setDates(d);
        if (!date && d.length > 0) setDate(d[0]);
      })
      .catch(() => setDates([]));
  }, [symbol, sessionType]);

  // Load session data
  const loadSession = useCallback(async () => {
    if (!date) return;
    setLoading(true);
    setError(null);
    try {
      const r = await fetchSession(symbol, date, sessionType);
      setData(r);
    } catch (e) {
      setError(e.message);
      setData(null);
    }
    setLoading(false);
  }, [symbol, date, sessionType]);

  useEffect(() => { loadSession(); }, [loadSession]);

  const navDate = (dir) => {
    const idx = dates.indexOf(date);
    if (idx < 0) return;
    const next = dir === "prev" ? idx + 1 : idx - 1;
    if (next >= 0 && next < dates.length) setDate(dates[next]);
  };

  const d = data || {};
  const orb = d.orb_data || {};
  const dateObj = date ? new Date(date + "T12:00:00") : null;
  const dateDisplay = dateObj
    ? dateObj.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })
    : "—";
  const sessionRange = d.rth_high && d.rth_low ? `${f(d.rth_high)} — ${f(d.rth_low)}` : "—";
  const sessionRangeSize = d.rth_high && d.rth_low ? f(d.rth_high - d.rth_low) : "—";

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
          <h1 className={s.title}>Session Detail</h1>
          <p className={s.question}>Every classified data point for a single session</p>
        </div>
      </header>

      {/* Filters */}
      <div className={s.filterBar}>
        <FG label="Ticker">
          {SYMBOLS.map((v) => <FB key={v} a={symbol === v} o={() => { setSymbol(v); setDate(""); }}>{v}</FB>)}
        </FG>
        <FG label="Session">
          {SESSIONS.map((v) => <FB key={v.value} a={sessionType === v.value} o={() => { setSessionType(v.value); setDate(""); }}>{v.label}</FB>)}
        </FG>
      </div>

      {/* Date navigator */}
      <div className={s.dateNav}>
        <button className={s.dateArrow} onClick={() => navDate("prev")} disabled={dates.indexOf(date) >= dates.length - 1}>←</button>
        <div className={s.dateCenter}>
          <select className={s.dateSelect} value={date} onChange={(e) => setDate(e.target.value)}>
            {dates.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <span className={s.dateDisplay}>{dateDisplay}</span>
        </div>
        <button className={s.dateArrow} onClick={() => navDate("next")} disabled={dates.indexOf(date) <= 0}>→</button>
      </div>

      {/* Loading / Error / Empty */}
      {loading && <div className={s.stateBox}><div className={s.spinner} /><p className={s.stateText}>Loading session...</p></div>}
      {error && <div className={s.stateBox}><p className={s.stateText} style={{ color: "var(--red)" }}>Unable to load data</p></div>}
      {!loading && !error && !data && <div className={s.stateBox}><p className={s.stateText}>No session data for this date.</p></div>}

      {/* Session data */}
      {!loading && !error && data && (
        <div style={{ animation: "fadeIn 0.3s ease-out" }}>

          {/* Session Overview Hero */}
          <div className={s.heroGrid}>
            <div className={s.heroCard}>
              <span className={s.heroLabel}>Open</span>
              <span className={s.heroValue}>{f(d.rth_open)}</span>
            </div>
            <div className={s.heroCard}>
              <span className={s.heroLabel}>High</span>
              <span className={s.heroValue} style={{ color: "var(--green)" }}>{f(d.rth_high)}</span>
            </div>
            <div className={s.heroCard}>
              <span className={s.heroLabel}>Low</span>
              <span className={s.heroValue} style={{ color: "var(--red)" }}>{f(d.rth_low)}</span>
            </div>
            <div className={s.heroCard}>
              <span className={s.heroLabel}>Close</span>
              <span className={s.heroValue}>{f(d.rth_close)}</span>
            </div>
            <div className={s.heroCard}>
              <span className={s.heroLabel}>Range</span>
              <span className={s.heroValue}>{sessionRangeSize} pts</span>
            </div>
            <div className={s.heroCard}>
              <span className={s.heroLabel}>Volume</span>
              <span className={s.heroValue}>{d.rth_volume ? Number(d.rth_volume).toLocaleString() : "—"}</span>
            </div>
          </div>

          <div className={s.detailGrid}>

            {/* Gap Section */}
            <Section title="Gap" icon="⇅" color="var(--accent)">
              <StatRow label="Direction" value={d.gap_direction ? `${dir(d.gap_direction)} ${d.gap_direction}` : "—"} color={d.gap_direction === "up" ? "var(--green)" : "var(--red)"} />
              <StatRow label="Size" value={`${f(d.gap_size)} pts`} sub={pct(d.gap_pct)} />
              <StatRow label="Prior Close" value={f(d.prior_close)} />
              <StatRow label="Filled" value={bool(d.gap_filled)} color={d.gap_filled ? "var(--green)" : "var(--red)"} />
              {d.gap_filled && <StatRow label="Fill Time" value={mins(d.gap_fill_time_min)} />}
              {d.gap_filled && <StatRow label="Overshoot" value={`${f(d.gap_fill_overshoot)} pts`} />}
              {d.gap_filled && <StatRow label="Max Adverse" value={`${f(d.gap_max_adverse)} pts`} />}
              {!d.gap_filled && d.gap_continuation_move && <StatRow label="Continuation" value={`${f(d.gap_continuation_move)} pts`} />}
            </Section>

            {/* Opening Range Section */}
            <Section title="Opening Range" icon="⧖" color="var(--accent)">
              {[5, 15, 30].map((p) => (
                <div key={p} className={s.orBlock}>
                  <div className={s.orBlockHeader}>{p}-min OR</div>
                  <StatRow label="Range" value={`${f(d[`or${p}_high`])} — ${f(d[`or${p}_low`])}`} sub={`${f(d[`or${p}_range`])} pts`} />
                  {orb[String(p)] && (
                    <>
                      <StatRow label="First Break" value={orb[String(p)].first_break_direction ? `${dir(orb[String(p)].first_break_direction)} ${orb[String(p)].first_break_direction}` : "—"} color={orb[String(p)].first_break_direction === "above" ? "var(--green)" : "var(--red)"} />
                      <StatRow label="Break Time" value={mins(orb[String(p)].first_break_time_min)} />
                      <StatRow label="Held" value={bool(orb[String(p)].first_break_held)} color={orb[String(p)].first_break_held ? "var(--green)" : "var(--red)"} />
                      <StatRow label="Trapped" value={bool(orb[String(p)].trapped)} color={orb[String(p)].trapped ? "var(--red)" : "var(--green)"} />
                      <StatRow label="A-Move" value={`${f(orb[String(p)].a_move)} pts`} />
                      <StatRow label="B-Move" value={`${f(orb[String(p)].b_move)} pts`} />
                      <StatRow label="Total Move" value={`${f(orb[String(p)].total_move)} pts`} sub={pct(orb[String(p)].move_pct)} />
                      <StatRow label="Close vs OR" value={orb[String(p)].close_vs_or || "—"} />
                    </>
                  )}
                </div>
              ))}
            </Section>

            {/* Initial Balance Section */}
            <Section title="Initial Balance" icon="⬌" color="var(--amber)">
              <StatRow label="IB Range" value={`${f(d.ib_high)} — ${f(d.ib_low)}`} sub={`${f(d.ib_range)} pts`} />
              <StatRow label="Extended Above" value={bool(d.ib_extended_above)} color={d.ib_extended_above ? "var(--green)" : undefined} />
              <StatRow label="Extended Below" value={bool(d.ib_extended_below)} color={d.ib_extended_below ? "var(--red)" : undefined} />
              <StatRow label="Stayed Inside" value={bool(d.ib_stayed_inside)} color={d.ib_stayed_inside ? "var(--amber)" : undefined} />
              {(d.ib_extended_above || d.ib_extended_below) && (
                <>
                  <StatRow label="First Extension" value={d.ib_first_ext_direction ? `${dir(d.ib_first_ext_direction)} ${d.ib_first_ext_direction}` : "—"} color={d.ib_first_ext_direction === "above" ? "var(--green)" : "var(--red)"} />
                  <StatRow label="Extension Time" value={mins(d.ib_first_ext_time_min)} />
                  {d.ib_max_ext_above && <StatRow label="Max Ext Above" value={`${f(d.ib_max_ext_above)} pts`} sub={d.ib_ext_multiple_above ? `${f1(d.ib_ext_multiple_above)}x IB` : undefined} />}
                  {d.ib_max_ext_below && <StatRow label="Max Ext Below" value={`${f(d.ib_max_ext_below)} pts`} sub={d.ib_ext_multiple_below ? `${f1(d.ib_ext_multiple_below)}x IB` : undefined} />}
                </>
              )}
              <StatRow label="Retested Edge" value={bool(d.ib_retested_edge)} />
              <StatRow label="Double Break" value={bool(d.ib_double_break)} color={d.ib_double_break ? "var(--amber)" : undefined} />
              <StatRow label="Close vs IB" value={d.ib_close_vs_ib || "—"} />
            </Section>

            {/* Prior Day Levels Section */}
            <Section title="Prior Day Levels" icon="☰" color="var(--green)">
              <div className={s.pdlSubsection}>
                <div className={s.pdlHeader}>PDH — {f(d.prior_high)}</div>
                <StatRow label="Tested" value={bool(d.pdh_tested)} color={d.pdh_tested ? "var(--text-primary)" : "var(--text-dim)"} />
                {d.pdh_tested && <StatRow label="Test Time" value={mins(d.pdh_test_time_min)} />}
                {d.pdh_tested && <StatRow label="Result" value={d.pdh_result || "—"} color={d.pdh_result === "bounce" ? "var(--green)" : "var(--red)"} />}
                {d.pdh_tested && <StatRow label="First Touch" value={d.pdh_first_touch_result || "—"} color={d.pdh_first_touch_result === "bounce" ? "var(--green)" : "var(--red)"} />}
                {d.pdh_tested && d.pdh_move_after && <StatRow label="Move After" value={`${f(d.pdh_move_after)} pts`} />}
                {d.pdh_tested && d.pdh_hold_duration_min != null && <StatRow label="Hold Duration" value={mins(d.pdh_hold_duration_min)} />}
              </div>

              <div className={s.pdlSubsection}>
                <div className={s.pdlHeader}>PDL — {f(d.prior_low)}</div>
                <StatRow label="Tested" value={bool(d.pdl_tested)} color={d.pdl_tested ? "var(--text-primary)" : "var(--text-dim)"} />
                {d.pdl_tested && <StatRow label="Test Time" value={mins(d.pdl_test_time_min)} />}
                {d.pdl_tested && <StatRow label="Result" value={d.pdl_result || "—"} color={d.pdl_result === "bounce" ? "var(--green)" : "var(--red)"} />}
                {d.pdl_tested && <StatRow label="First Touch" value={d.pdl_first_touch_result || "—"} color={d.pdl_first_touch_result === "bounce" ? "var(--green)" : "var(--red)"} />}
                {d.pdl_tested && d.pdl_move_after && <StatRow label="Move After" value={`${f(d.pdl_move_after)} pts`} />}
                {d.pdl_tested && d.pdl_hold_duration_min != null && <StatRow label="Hold Duration" value={mins(d.pdl_hold_duration_min)} />}
              </div>

              <div className={s.pdlSubsection}>
                <div className={s.pdlHeader}>PDC — {f(d.prior_close)}</div>
                <StatRow label="Tested" value={bool(d.pdc_tested)} color={d.pdc_tested ? "var(--text-primary)" : "var(--text-dim)"} />
                {d.pdc_tested && <StatRow label="Test Time" value={mins(d.pdc_test_time_min)} />}
                {d.pdc_tested && <StatRow label="Result" value={d.pdc_result || "—"} color={d.pdc_result === "bounce" ? "var(--green)" : "var(--red)"} />}
                {d.pdc_tested && d.pdc_move_after && <StatRow label="Move After" value={`${f(d.pdc_move_after)} pts`} />}
              </div>
            </Section>

          </div>

          {/* Meta */}
          <div className={s.footer}>
            {d.bar_count && <span>{d.bar_count} bars used</span>}
            {d.bar_count && d.classified_at && <span> · </span>}
            {d.classified_at && <span>Classified: {new Date(d.classified_at).toLocaleString()}</span>}
          </div>
        </div>
      )}
    </div>
  );
}

function FG({ label, children }) {
  return (
    <div className={s.filterGroup}>
      <span className={s.filterLabel}>{label}</span>
      <div className={s.filterBtns}>{children}</div>
    </div>
  );
}
function FB({ a, o, children }) {
  return (
    <button onClick={o} className={`${s.filterBtn} ${a ? s.filterBtnActive : ""}`}>
      {children}
    </button>
  );
}
