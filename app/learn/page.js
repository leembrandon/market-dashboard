"use client";
import { useState } from "react";
import Link from "next/link";
import EDUCATION from "../../lib/education";
import s from "./learn.module.css";

const REPORTS = [
  { key: "orb", icon: "⧖", color: "var(--accent)" },
  { key: "gap_fill", icon: "⇅", color: "var(--green)" },
  { key: "ib", icon: "⬌", color: "var(--amber)" },
  { key: "prior_day_levels", icon: "☰", color: "var(--red)" },
];

export default function LearnPage() {
  const [active, setActive] = useState("orb");
  const content = EDUCATION[active];
  const report = REPORTS.find((r) => r.key === active);

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
        <h1 className={s.title}>Learn the Setups</h1>
        <p className={s.subtitle}>
          What each report measures, how to trade it, and what to avoid.
        </p>
      </header>

      {/* Report selector */}
      <div className={s.reportBar}>
        {REPORTS.map((r) => {
          const ed = EDUCATION[r.key];
          return (
            <button
              key={r.key}
              onClick={() => setActive(r.key)}
              className={`${s.reportBtn} ${active === r.key ? s.reportBtnActive : ""}`}
              style={active === r.key ? { borderColor: r.color } : undefined}
            >
              <span className={s.reportBtnIcon} style={active === r.key ? { color: r.color } : undefined}>
                {r.icon}
              </span>
              <span className={s.reportBtnLabel}>{ed.title}</span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className={s.content} key={active}>
        {/* What Is It */}
        <section className={s.section}>
          <h2 className={s.sectionTitle}>
            <span className={s.sectionIcon} style={{ color: report.color }}>◈</span>
            {content.what.heading}
          </h2>
          <p className={s.bodyText}>{content.what.body}</p>
          <div className={s.termGrid}>
            {content.what.terms.map((t, i) => (
              <div key={i} className={s.termRow}>
                <span className={s.termLabel}>{t.term}</span>
                <span className={s.termDef}>{t.def}</span>
              </div>
            ))}
          </div>
        </section>

        {/* How to Trade */}
        <section className={s.section}>
          <h2 className={s.sectionTitle}>
            <span className={s.sectionIcon} style={{ color: "var(--green)" }}>⎆</span>
            {content.trade.heading}
          </h2>
          <ol className={s.steps}>
            {content.trade.steps.map((step, i) => (
              <li key={i} className={s.step}>
                <span className={s.stepNum}>{i + 1}</span>
                <span className={s.stepText}>{step}</span>
              </li>
            ))}
          </ol>
        </section>

        {/* Common Mistakes */}
        <section className={s.section}>
          <h2 className={s.sectionTitle}>
            <span className={s.sectionIcon} style={{ color: "var(--red)" }}>⊘</span>
            Common Mistakes
          </h2>
          <div className={s.mistakeList}>
            {content.mistakes.map((m, i) => (
              <div key={i} className={s.mistakeCard}>
                <div className={s.mistakeBad}>
                  <span className={s.mistakeX}>✕</span>
                  <span>{m.bad}</span>
                </div>
                <div className={s.mistakeFix}>
                  <span className={s.mistakeCheck}>✓</span>
                  <span>{m.fix}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <div className={s.cta}>
          <p className={s.ctaText}>Ready to see the data?</p>
          <Link href={`/reports/${content.slug}`} className={s.ctaBtn}>
            View {content.title} Report →
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className={s.footer}>
        These are statistical setups, not trading advice. Always manage risk according to your own plan.
      </footer>
    </div>
  );
}
