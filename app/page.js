"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { fetchOverview } from "../lib/data";
import s from "./home.module.css";

const SYMBOLS = ["NQ", "ES", "CL", "GC"];

const pct = (v) => (v != null ? `${Math.round(v * 100)}%` : "—");

const REPORT_CONFIG = [
  {
    key: "orb",
    title: "Opening Range Breakout",
    href: "/reports/orb",
    icon: "⧖",
    question: "Should I trade the first breakout or wait?",
    heroStat: (d) => pct(d?.bias?.first_break_reliability),
    heroLabel: "first break reliability",
    subStats: (d) => [
      { label: "Breakout rate", value: pct(d?.bias?.breakout_rate) },
      { label: "Trap rate", value: pct(d?.entry?.trap_rate) },
      { label: "Avg move", value: d?.target?.avg_move_pct != null ? `${d.target.avg_move_pct.toFixed(2)}%` : "—" },
    ],
  },
  {
    key: "gap_fill",
    title: "Gap Fill",
    href: "/reports/gap-fill",
    icon: "⇅",
    question: "Should I fade this gap or ride it?",
    heroStat: (d) => pct(d?.bias?.fill_rate),
    heroLabel: "gap fill rate",
    subStats: (d) => [
      { label: "Continuation", value: pct(d?.bias?.continuation_rate) },
      { label: "Avg fill time", value: d?.entry?.avg_fill_time_min != null ? `${Math.round(d.entry.avg_fill_time_min)} min` : "—" },
      { label: "Gaps up fill", value: pct(d?.bias?.fill_rate_up) },
    ],
  },
  {
    key: "ib",
    title: "Initial Balance",
    href: "/reports/ib",
    icon: "⬌",
    question: "Is today a trend day or a chop day?",
    heroStat: (d) => {
      const above = d?.bias?.ext_above_rate || 0;
      const below = d?.bias?.ext_below_rate || 0;
      return pct(above + below);
    },
    heroLabel: "extension rate",
    subStats: (d) => [
      { label: "Stay inside", value: pct(d?.bias?.stay_inside_rate) },
      { label: "Double break", value: pct(d?.bias?.double_break_rate) },
      { label: "Avg multiple", value: d?.target?.avg_ext_multiple != null ? `${d.target.avg_ext_multiple.toFixed(1)}x` : "—" },
    ],
  },
  {
    key: "prior_day_levels",
    title: "Prior Day Levels",
    href: "/reports/prior-day-levels",
    icon: "☰",
    question: "Will this level hold or break?",
    heroStat: (d) => pct(d?.bias?.test_rate),
    heroLabel: "PDH test rate",
    subStats: (d) => [
      { label: "Bounce rate", value: pct(d?.bias?.bounce_rate) },
      { label: "Break rate", value: pct(d?.bias?.break_rate) },
      { label: "Bounce move", value: d?.bias?.avg_bounce_move != null ? `${Number(d.bias.avg_bounce_move).toFixed(1)} pts` : "—" },
    ],
  },
];

export default function HomePage() {
  const [symbol, setSymbol] = useState("NQ");
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchOverview(symbol, 90)
      .then(setData)
      .catch(() => setData({}))
      .finally(() => setLoading(false));
  }, [symbol]);

  return (
    <div className={s.page}>
      <header className={s.header}>
        <h1 className={s.logo}>
          <span className={s.logoAccent}>Level</span>Sight
        </h1>
        <p className={s.tagline}>The answer, not the chart.</p>
      </header>

      <div className={s.tickerBar}>
        {SYMBOLS.map((sym) => (
          <button
            key={sym}
            onClick={() => setSymbol(sym)}
            className={`${s.tickerBtn} ${symbol === sym ? s.tickerBtnActive : ""}`}
          >
            {sym}
          </button>
        ))}
      </div>

      <div className={s.grid}>
        {REPORT_CONFIG.map((report) => {
          const rd = data[report.key];
          const hasData = rd != null;
          return (
            <Link key={report.key} href={report.href} className={s.cardLink}>
              <div className={s.card}>
                <div className={s.cardHeader}>
                  <span className={s.cardIcon}>{report.icon}</span>
                  <span className={s.cardTitle}>{report.title}</span>
                  <span className={s.cardArrow}>→</span>
                </div>
                <p className={s.cardQuestion}>{report.question}</p>
                <div className={s.cardHero}>
                  {loading ? (
                    <div className={s.cardHeroLoading}>--</div>
                  ) : hasData ? (
                    <div className={s.cardHeroNumber}>{report.heroStat(rd)}</div>
                  ) : (
                    <div className={s.cardHeroEmpty}>—</div>
                  )}
                  <div className={s.cardHeroLabel}>{report.heroLabel}</div>
                </div>
                {hasData && !loading && (
                  <>
                    <div className={s.subStats}>
                      {report.subStats(rd).map((sub, i) => (
                        <div key={i} className={s.subStat}>
                          <span className={s.subStatValue}>{sub.value}</span>
                          <span className={s.subStatLabel}>{sub.label}</span>
                        </div>
                      ))}
                    </div>
                    <div className={s.cardMeta}>
                      {rd.sample_size} sessions · 90d lookback
                    </div>
                  </>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      <footer className={s.footer}>
        <p>LevelSight analyzes every session and gives you the probability. Not a chart — just the number.</p>
        <p className={s.footerSub}>Updated daily after market close</p>
      </footer>
    </div>
  );
}
