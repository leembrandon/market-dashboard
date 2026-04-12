"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { fetchOverview, fetchReport } from "../../lib/data";
import s from "./today.module.css";

const SYMBOLS = ["NQ", "ES", "CL", "GC"];

// ── Session timing (all in ET minutes from midnight) ──
const SESSIONS = [
  { key: "asia", label: "Asia", startHr: 18, startMin: 0, endHr: 2, endMin: 0, crossesMidnight: true, prepMinutes: 30 },
  { key: "london", label: "London", startHr: 2, startMin: 0, endHr: 9, endMin: 30, crossesMidnight: false, prepMinutes: 30 },
  { key: "ny", label: "NY", startHr: 9, startMin: 30, endHr: 16, endMin: 0, crossesMidnight: false, prepMinutes: 30 },
];

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
// Map JS day (0=Sun) to your DB day (0=Mon)
const JS_TO_DB_DAY = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 0: null, 6: null };

const pct = (v) => (v != null ? `${Math.round(v * 100)}%` : "—");
const pts = (v) => (v != null && !isNaN(v) ? parseFloat(v).toFixed(1) : "—");
const mins = (v) => (v != null ? `${Math.round(v)} min` : "—");

function getETNow() {
  const now = new Date();
  const etStr = now.toLocaleString("en-US", { timeZone: "America/New_York" });
  return new Date(etStr);
}

function getMinuteOfDay(date) {
  return date.getHours() * 60 + date.getMinutes();
}

function toMinute(hr, min) {
  return hr * 60 + min;
}

function detectSessionState(etNow) {
  const minute = getMinuteOfDay(etNow);
  const jsDay = etNow.getDay(); // 0=Sun, 6=Sat
  const isWeekend = jsDay === 0 || jsDay === 6;

  // Sunday before 6PM = still closed
  // Saturday = closed
  // Friday after 4PM through Sunday 6PM = closed
  if (jsDay === 6) return { mode: "closed", jsDay };
  if (jsDay === 0 && minute < toMinute(18, 0)) return { mode: "closed", jsDay };
  if (jsDay === 5 && minute >= toMinute(16, 0)) return { mode: "closed", jsDay };

  // Check each session
  for (const ses of SESSIONS) {
    const start = toMinute(ses.startHr, ses.startMin);
    const end = toMinute(ses.endHr, ses.endMin);
    const prepStart = start - ses.prepMinutes;

    if (ses.crossesMidnight) {
      // Asia: 18:00 - 02:00 (crosses midnight)
      if (minute >= start || minute < end) {
        const elapsed = minute >= start ? minute - start : (1440 - start) + minute;
        const total = (1440 - start) + end;
        return { mode: "active", session: ses, elapsed, total, jsDay };
      }
      // Pre-Asia: 17:30 - 18:00
      if (minute >= prepStart && minute < start) {
        const untilOpen = start - minute;
        return { mode: "pre", session: ses, untilOpen, jsDay };
      }
    } else {
      if (minute >= start && minute < end) {
        const elapsed = minute - start;
        const total = end - start;
        return { mode: "active", session: ses, elapsed, total, jsDay };
      }
      if (minute >= prepStart && minute < start) {
        const untilOpen = start - minute;
        return { mode: "pre", session: ses, untilOpen, jsDay };
      }
    }
  }

  // Between sessions (e.g., 16:00 - 17:30 ET)
  // Show next session as pre
  if (minute >= toMinute(16, 0) && minute < toMinute(17, 30)) {
    return { mode: "between", nextSession: SESSIONS[0], jsDay }; // Asia next
  }

  return { mode: "closed", jsDay };
}

function getNextSession(currentKey) {
  const order = ["asia", "london", "ny"];
  const idx = order.indexOf(currentKey);
  return SESSIONS[order[(idx + 1) % 3]];
}

function getPrevSession(currentKey) {
  const order = ["asia", "london", "ny"];
  const idx = order.indexOf(currentKey);
  return SESSIONS[order[(idx + 2) % 3]];
}

// ── Setup insight generators ──
function generateInsights(data, sessionLabel, dayName) {
  const insights = [];

  // Gap Fill
  const gap = data.gap_fill;
  if (gap?.bias) {
    const fillRate = gap.bias.fill_rate;
    const strength = fillRate > 0.7 ? "high" : fillRate > 0.5 ? "moderate" : "low";
    const fillTime = gap.entry?.avg_fill_time_min;
    const maxAdverse = gap.invalidation?.avg_max_adverse;
    insights.push({
      report: "gap_fill",
      title: "Gap Fill",
      icon: "⇅",
      href: "/reports/gap-fill",
      strength,
      probability: fillRate,
      headline: `${pct(fillRate)} fill rate`,
      body: fillRate > 0.65
        ? `Gaps in the ${sessionLabel} session fill ${pct(fillRate)} of the time${dayName ? ` on ${dayName}s` : ""}. ${fillTime ? `Average fill takes ${mins(fillTime)}.` : ""} ${maxAdverse ? `Expect up to ${pts(maxAdverse)} pts adverse before fill.` : ""}`
        : `Gaps fill only ${pct(fillRate)} in this session${dayName ? ` on ${dayName}s` : ""}. ${gap.bias.continuation_rate > 0.4 ? `Continuation rate is ${pct(gap.bias.continuation_rate)} — consider trading with the gap instead.` : ""}`,
      actionable: fillRate > 0.65 ? "Fade the gap toward prior close" : fillRate < 0.45 ? "Trade with the gap direction" : "No strong edge — wait for confirmation",
      sampleSize: gap.sample_size,
    });
  }

  // ORB
  const orb = data.orb;
  if (orb?.bias) {
    const reliability = orb.bias.first_break_reliability;
    const strength = reliability > 0.65 ? "high" : reliability > 0.5 ? "moderate" : "low";
    const trapRate = orb.entry?.trap_rate;
    const avgMove = orb.target?.avg_total_move;
    insights.push({
      report: "orb",
      title: "Opening Range Breakout",
      icon: "⧖",
      href: "/reports/orb",
      strength,
      probability: reliability,
      headline: `${pct(reliability)} first break reliability`,
      body: `The first breakout of the 15-min OR holds direction ${pct(reliability)} of the time in ${sessionLabel}${dayName ? ` on ${dayName}s` : ""}. ${trapRate != null ? `Trap rate: ${pct(trapRate)}.` : ""} ${avgMove ? `Average move: ${pts(avgMove)} pts.` : ""}`,
      actionable: reliability > 0.65 ? "Trade the first breakout with the break direction" : trapRate > 0.3 ? "High trap rate — consider fading the first break" : "Wait for confirmation before entering",
      sampleSize: orb.sample_size,
    });
  }

  // IB
  const ib = data.ib;
  if (ib?.bias) {
    const extRate = (ib.bias.ext_above_rate || 0) + (ib.bias.ext_below_rate || 0);
    const strength = extRate > 0.65 ? "high" : extRate > 0.5 ? "moderate" : "low";
    const stayInside = ib.bias.stay_inside_rate;
    const avgMultiple = ib.target?.avg_ext_multiple;
    insights.push({
      report: "ib",
      title: "Initial Balance",
      icon: "⬌",
      href: "/reports/ib",
      strength,
      probability: extRate,
      headline: `${pct(extRate)} extension rate`,
      body: stayInside > 0.45
        ? `IB stays inside ${pct(stayInside)} of the time in ${sessionLabel}${dayName ? ` on ${dayName}s` : ""}. Expect a range day — mean reversion may work.`
        : `The IB extends ${pct(extRate)} of the time in ${sessionLabel}${dayName ? ` on ${dayName}s` : ""}. ${avgMultiple ? `Average extension: ${parseFloat(avgMultiple).toFixed(1)}x the IB range.` : ""} ${ib.bias.double_break_rate > 0.2 ? `Watch for double breaks (${pct(ib.bias.double_break_rate)}).` : ""}`,
      actionable: extRate > 0.65 ? "Look for IB breakout trades" : stayInside > 0.45 ? "Fade moves back toward IB midpoint" : "Mixed — wait for IB to set before deciding",
      sampleSize: ib.sample_size,
    });
  }

  // Prior Day Levels
  const pdl = data.prior_day_levels;
  if (pdl?.bias) {
    const testRate = pdl.bias.test_rate;
    const bounceRate = pdl.bias.bounce_rate;
    const strength = testRate > 0.6 && bounceRate > 0.55 ? "high" : testRate > 0.5 ? "moderate" : "low";
    insights.push({
      report: "prior_day_levels",
      title: "Prior Day Levels",
      icon: "☰",
      href: "/reports/prior-day-levels",
      strength,
      probability: testRate,
      headline: `${pct(testRate)} test rate`,
      body: `PDH gets tested ${pct(testRate)} of sessions in ${sessionLabel}${dayName ? ` on ${dayName}s` : ""}. ${bounceRate > 0.5 ? `First touch bounces ${pct(pdl.bias.first_touch_bounce_rate || bounceRate)} — levels tend to hold.` : `Break rate is ${pct(pdl.bias.break_rate)} — levels tend to give way.`} ${pdl.bias.avg_bounce_move ? `Average bounce: ${pts(pdl.bias.avg_bounce_move)} pts.` : ""}`,
      actionable: bounceRate > 0.55 ? "Fade at prior day levels (PDH/PDL)" : pdl.bias.break_rate > 0.55 ? "Trade breaks through prior day levels" : "React at the level — no strong lean",
      sampleSize: pdl.sample_size,
    });
  }

  // Sort by probability descending
  insights.sort((a, b) => (b.probability || 0) - (a.probability || 0));
  return insights;
}

// ── Components ──

function SessionBadge({ label, state, color }) {
  return (
    <div className={s.sessionBadge} style={{ borderColor: color }}>
      <span className={s.sessionBadgeDot} style={{ backgroundColor: color }} />
      <span className={s.sessionBadgeLabel}>{label}</span>
      <span className={s.sessionBadgeState}>{state}</span>
    </div>
  );
}

function InsightCard({ insight, index }) {
  const strengthColor = insight.strength === "high" ? "var(--green)" : insight.strength === "moderate" ? "var(--amber)" : "var(--text-dim)";
  const strengthLabel = insight.strength === "high" ? "Strong edge" : insight.strength === "moderate" ? "Moderate edge" : "Weak edge";

  return (
    <Link href={insight.href} className={s.insightLink}>
      <div className={s.insightCard} style={{ animationDelay: `${index * 0.08}s` }}>
        <div className={s.insightHeader}>
          <div className={s.insightLeft}>
            <span className={s.insightIcon}>{insight.icon}</span>
            <span className={s.insightTitle}>{insight.title}</span>
          </div>
          <div className={s.insightStrength} style={{ color: strengthColor, borderColor: strengthColor }}>
            {strengthLabel}
          </div>
        </div>

        <div className={s.insightHero} style={{ color: strengthColor }}>{insight.headline}</div>

        <p className={s.insightBody}>{insight.body}</p>

        <div className={s.insightAction}>
          <span className={s.insightActionIcon}>→</span>
          <span>{insight.actionable}</span>
        </div>

        <div className={s.insightMeta}>{insight.sampleSize} sessions · View full report →</div>
      </div>
    </Link>
  );
}

function SessionTimeline({ elapsed, total, sessionLabel }) {
  const progress = Math.min(1, elapsed / total);
  const remaining = total - elapsed;
  const orSet = elapsed >= 15;
  const ibSet = elapsed >= 60;

  return (
    <div className={s.timeline}>
      <div className={s.timelineBar}>
        <div className={s.timelineFill} style={{ width: `${progress * 100}%` }} />
        {/* OR marker at 15 min */}
        <div className={s.timelineMarker} style={{ left: `${Math.min(100, (15 / total) * 100)}%` }}>
          <div className={`${s.timelineMarkerDot} ${orSet ? s.timelineMarkerDone : ""}`} />
          <span className={s.timelineMarkerLabel}>OR</span>
        </div>
        {/* IB marker at 60 min */}
        <div className={s.timelineMarker} style={{ left: `${Math.min(100, (60 / total) * 100)}%` }}>
          <div className={`${s.timelineMarkerDot} ${ibSet ? s.timelineMarkerDone : ""}`} />
          <span className={s.timelineMarkerLabel}>IB</span>
        </div>
      </div>
      <div className={s.timelineInfo}>
        <span>{elapsed} min elapsed</span>
        <span>{remaining} min remaining</span>
      </div>
    </div>
  );
}

function MilestoneStatus({ elapsed }) {
  const milestones = [
    { name: "5-min OR", time: 5, icon: "◇" },
    { name: "15-min OR", time: 15, icon: "◈" },
    { name: "30-min OR", time: 30, icon: "◆" },
    { name: "Initial Balance", time: 60, icon: "⬌" },
  ];

  return (
    <div className={s.milestones}>
      {milestones.map((m) => {
        const done = elapsed >= m.time;
        const active = !done && elapsed >= m.time - 5;
        return (
          <div key={m.name} className={`${s.milestone} ${done ? s.milestoneDone : ""} ${active ? s.milestoneActive : ""}`}>
            <span className={s.milestoneIcon}>{m.icon}</span>
            <span className={s.milestoneName}>{m.name}</span>
            <span className={s.milestoneStatus}>
              {done ? "✓ Set" : active ? "Forming…" : `${m.time - elapsed} min`}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Main Page ──

export default function TodayPage() {
  const [symbol, setSymbol] = useState("NQ");
  const [sessionOverride, setSessionOverride] = useState(null);
  const [data, setData] = useState({});
  const [dayData, setDayData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [etNow, setEtNow] = useState(getETNow);
  const [tick, setTick] = useState(0);

  // Update clock every 30 seconds
  useEffect(() => {
    const iv = setInterval(() => {
      setEtNow(getETNow());
      setTick((t) => t + 1);
    }, 30000);
    return () => clearInterval(iv);
  }, []);

  const state = useMemo(() => detectSessionState(etNow), [tick, etNow]);

  const activeSessionKey = sessionOverride || state.session?.key || state.nextSession?.key || "ny";
  const activeSession = SESSIONS.find((s) => s.key === activeSessionKey);

  // Get DB day of week for day-specific stats
  const dbDay = JS_TO_DB_DAY[etNow.getDay()];
  const dayName = DAY_NAMES[etNow.getDay()];
  const dayShort = DAY_SHORT[etNow.getDay()];

  // Fetch overview data (all reports, default filters)
  useEffect(() => {
    setLoading(true);
    fetchOverview(symbol, 90, activeSessionKey)
      .then(setData)
      .catch(() => setData({}))
      .finally(() => setLoading(false));
  }, [symbol, activeSessionKey]);

  // Also fetch day-specific data if it's a weekday
  useEffect(() => {
    if (dbDay == null) { setDayData(null); return; }
    const reports = ["orb", "gap_fill", "ib", "prior_day_levels"];
    const filterSets = [
      { day_of_week: dbDay, or_period: 15 },
      { day_of_week: dbDay, direction: null },
      { day_of_week: dbDay, ib_size: null },
      { day_of_week: dbDay, level: null },
    ];
    Promise.all(reports.map((r, i) => fetchReport(r, symbol, filterSets[i], 90, activeSessionKey)))
      .then((results) => {
        const obj = {};
        reports.forEach((r, i) => { obj[r] = results[i]; });
        setDayData(obj);
      })
      .catch(() => setDayData(null));
  }, [symbol, activeSessionKey, dbDay]);

  const insights = useMemo(
    () => generateInsights(data, activeSession?.label || "—", null),
    [data, activeSession]
  );

  const dayInsights = useMemo(
    () => dayData ? generateInsights(dayData, activeSession?.label || "—", dayName) : null,
    [dayData, activeSession, dayName]
  );

  // Time display
  const timeStr = etNow.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  const dateStr = etNow.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });

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
        <div className={s.headerLeft}>
          <h1 className={s.title}>Today's Brief</h1>
          <div className={s.clock}>
            <span className={s.clockTime}>{timeStr}</span>
            <span className={s.clockDate}>{dateStr}</span>
          </div>
        </div>
        <div className={s.headerRight}>
          {state.mode === "active" && (
            <SessionBadge label={state.session.label} state={`${state.elapsed} min in`} color="var(--green)" />
          )}
          {state.mode === "pre" && (
            <SessionBadge label={state.session.label} state={`Opens in ${state.untilOpen} min`} color="var(--amber)" />
          )}
          {state.mode === "between" && (
            <SessionBadge label={state.nextSession.label} state="Next up" color="var(--text-dim)" />
          )}
          {state.mode === "closed" && (
            <SessionBadge label="Market" state="Closed" color="var(--text-dim)" />
          )}
        </div>
      </header>

      {/* Ticker + Session selector */}
      <div className={s.controls}>
        <div className={s.tickerBar}>
          {SYMBOLS.map((sym) => (
            <button key={sym} onClick={() => setSymbol(sym)}
              className={`${s.tickerBtn} ${symbol === sym ? s.tickerBtnActive : ""}`}>{sym}</button>
          ))}
        </div>
        <div className={s.sessionBar}>
          {SESSIONS.map((ses) => (
            <button key={ses.key} onClick={() => setSessionOverride(ses.key)}
              className={`${s.sessionBtn} ${activeSessionKey === ses.key ? s.sessionBtnActive : ""} ${state.session?.key === ses.key && !sessionOverride ? s.sessionBtnAuto : ""}`}>
              {ses.label}
              {state.session?.key === ses.key && !sessionOverride && <span className={s.sessionBtnLive}>●</span>}
            </button>
          ))}
          {sessionOverride && (
            <button onClick={() => setSessionOverride(null)} className={s.autoBtn}>Auto</button>
          )}
        </div>
      </div>

      {/* Session timeline (active sessions only) */}
      {state.mode === "active" && activeSessionKey === state.session.key && !sessionOverride && (
        <div className={s.timelineSection}>
          <SessionTimeline elapsed={state.elapsed} total={state.total} sessionLabel={state.session.label} />
          <MilestoneStatus elapsed={state.elapsed} />
        </div>
      )}

      {/* Market closed state */}
      {state.mode === "closed" && (
        <div className={s.closedBanner}>
          <div className={s.closedIcon}>◈</div>
          <div className={s.closedText}>
            <span className={s.closedTitle}>Markets closed</span>
            <span className={s.closedSub}>
              {etNow.getDay() === 6
                ? "Next session: Asia — opens Sunday 6:00 PM ET"
                : etNow.getDay() === 0
                  ? "Next session: Asia — opens tonight at 6:00 PM ET"
                  : "Next session: Asia — opens at 6:00 PM ET"}
            </span>
          </div>
        </div>
      )}

      {/* Pre-session state */}
      {state.mode === "pre" && activeSessionKey === state.session.key && !sessionOverride && (
        <div className={s.preBanner}>
          <div className={s.preIcon}>⏱</div>
          <div className={s.preText}>
            <span className={s.preTitle}>{state.session.label} session opens in {state.untilOpen} minutes</span>
            <span className={s.preSub}>Here's what the stats say for today's session</span>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className={s.stateBox}>
          <div className={s.spinner} />
          <p className={s.stateText}>Loading brief...</p>
        </div>
      )}

      {/* Insights */}
      {!loading && insights.length > 0 && (
        <div className={s.insightsSection}>
          {/* Day-specific headline if available */}
          {dayInsights && dayInsights.length > 0 && dbDay != null && (
            <div className={s.dayCallout}>
              <span className={s.dayCalloutIcon}>📅</span>
              <span className={s.dayCalloutText}>
                {dayShort} stats: strongest edge is <strong>{dayInsights[0].title}</strong> at {dayInsights[0].headline}
              </span>
            </div>
          )}

          <h2 className={s.sectionLabel}>
            {symbol} · {activeSession?.label} Session · {state.mode === "closed" ? "Preview" : "Setup Probabilities"}
          </h2>

          <div className={s.insightGrid}>
            {insights.map((insight, i) => (
              <InsightCard key={insight.report} insight={insight} index={i} />
            ))}
          </div>
        </div>
      )}

      {/* No data */}
      {!loading && insights.length === 0 && (
        <div className={s.stateBox}>
          <p className={s.stateText}>No data available for {symbol} in the {activeSession?.label} session.</p>
          <p className={s.stateSubtext}>Try a different ticker or session.</p>
        </div>
      )}

      {/* Footer */}
      <footer className={s.footer}>
        Probabilities based on historical data. Not trading advice — always manage your own risk.
      </footer>
    </div>
  );
}
