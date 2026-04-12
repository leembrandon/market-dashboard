"use client";
import { useState } from "react";
import s from "./education.module.css";

export default function EducationAccordion({ content }) {
  const [open, setOpen] = useState(null);
  if (!content) return null;

  const toggle = (id) => setOpen(open === id ? null : id);

  const sections = [
    { id: "what", icon: "◈", label: content.what.heading },
    { id: "trade", icon: "⎆", label: content.trade.heading },
    { id: "mistakes", icon: "⊘", label: "Common Mistakes" },
  ];

  return (
    <div className={s.accordion}>
      <div className={s.accordionHeader}>
        <span className={s.accordionIcon}>📖</span>
        <span className={s.accordionTitle}>Understand This Report</span>
      </div>

      {sections.map((sec) => (
        <div key={sec.id}>
          <button
            onClick={() => toggle(sec.id)}
            className={`${s.accordionBtn} ${open === sec.id ? s.accordionBtnOpen : ""}`}
          >
            <span className={s.accordionBtnInner}>
              <span className={s.accordionBtnIcon}>{sec.icon}</span>
              {sec.label}
            </span>
            <span className={`${s.chevron} ${open === sec.id ? s.chevronOpen : ""}`}>›</span>
          </button>

          {open === sec.id && (
            <div className={s.accordionBody}>
              {sec.id === "what" && (
                <>
                  <p className={s.bodyText}>{content.what.body}</p>
                  <div className={s.termGrid}>
                    {content.what.terms.map((t, i) => (
                      <div key={i} className={s.termRow}>
                        <span className={s.termLabel}>{t.term}</span>
                        <span className={s.termDef}>{t.def}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {sec.id === "trade" && (
                <ol className={s.steps}>
                  {content.trade.steps.map((step, i) => (
                    <li key={i} className={s.step}>
                      <span className={s.stepNum}>{i + 1}</span>
                      <span className={s.stepText}>{step}</span>
                    </li>
                  ))}
                </ol>
              )}

              {sec.id === "mistakes" && (
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
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
