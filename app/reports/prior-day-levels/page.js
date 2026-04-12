"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { fetchReport } from "../../../lib/data";
import EducationAccordion from "../../../components/EducationAccordion";
import EDUCATION from "../../../lib/education";
import s from "./report.module.css";

const SYMBOLS=["NQ","ES","CL","GC"];
const LEVELS=[{label:"All",value:null},{label:"PDH",value:"pdh"},{label:"PDL",value:"pdl"},{label:"PDC",value:"pdc"}];
const LOOKBACKS=[30,90];
const SESSIONS=[{label:"Asia",value:"asia"},{label:"London",value:"london"},{label:"NY",value:"ny"}];
const DAYS=[{label:"All",value:null},{label:"Mon",value:0},{label:"Tue",value:1},{label:"Wed",value:2},{label:"Thu",value:3},{label:"Fri",value:4}];
const DAY_LABELS=["Mon","Tue","Wed","Thu","Fri"];
const pct=(v)=>v!=null?`${Math.round(v*100)}%`:"—";
const pts=(v)=>v!=null&&!isNaN(v)?parseFloat(v).toFixed(2):"—";
const mins=(v)=>v!=null?`${Math.round(v)} min`:"—";
function heatColor(v){if(v==null)return"#1e1e2e";const c=Math.max(0,Math.min(1,v));if(c>=0.7)return`rgba(16,185,129,${0.25+c*0.55})`;if(c>=0.5)return`rgba(245,158,11,${0.2+c*0.4})`;return`rgba(244,63,94,${0.2+c*0.5})`;}

export default function PriorDayLevelsReportPage(){
  const [symbol,setSymbol]=useState("NQ");
  const [level,setLevel]=useState(null);
  const [lookback,setLookback]=useState(90);
  const [session,setSession]=useState("ny");
  const [dayFilter,setDayFilter]=useState(null);
  const [data,setData]=useState(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState(null);

  const loadReport=useCallback(async()=>{
    setLoading(true);setError(null);
    try{setData(await fetchReport("prior_day_levels",symbol,{day_of_week:dayFilter,level},lookback,session));}
    catch(e){setError(e.message);setData(null);}
    setLoading(false);
  },[symbol,level,lookback,session,dayFilter]);
  useEffect(()=>{loadReport();},[loadReport]);

  const bias=data?.bias||{},levels=data?.levels||{},heatmap=data?.heatmap||{},recent=data?.recent_sessions||[];

  return(
    <div className={s.page}>
      <div className={s.nav}><Link href="/" className={s.backLink}>← <span className={s.backLogo}><span style={{color:"var(--accent)"}}>Level</span>Sight</span></Link></div>
      <header className={s.header}><div><h1 className={s.title}>Prior Day Levels</h1><p className={s.question}>Will this level hold or break?</p></div><div className={s.meta}>{data&&<span className={s.sampleBadge}>{data.sample_size} of {data.total_sessions} sessions</span>}</div></header>
      <div className={s.filterBar}>
        <FG label="Ticker">{SYMBOLS.map(v=><FB key={v} a={symbol===v} o={()=>setSymbol(v)}>{v}</FB>)}</FG>
        <FG label="Session">{SESSIONS.map(v=><FB key={v.value} a={session===v.value} o={()=>setSession(v.value)}>{v.label}</FB>)}</FG>
        <FG label="Level">{LEVELS.map(v=><FB key={v.label} a={level===v.value} o={()=>setLevel(v.value)}>{v.label}</FB>)}</FG>
        <FG label="Lookback">{LOOKBACKS.map(v=><FB key={v} a={lookback===v} o={()=>setLookback(v)}>{v}d</FB>)}</FG>
        <FG label="Day">{DAYS.map(v=><FB key={v.label} a={dayFilter===v.value} o={()=>setDayFilter(v.value)}>{v.label}</FB>)}</FG>
      </div>
      {loading&&<div className={s.stateBox}><div className={s.spinner}/><p className={s.stateText}>Loading report...</p></div>}
      {error&&<div className={s.stateBox}><p className={s.stateText} style={{color:"var(--red)"}}>Unable to load data</p></div>}
      {!loading&&!error&&!data&&<div className={s.stateBox}><p className={s.stateText}>No data available for these filters.</p></div>}
      {!loading&&!error&&data&&(
        <div style={{animation:"fadeIn 0.3s ease-out"}}>
          <div className={s.heroSection}>
            <div className={s.heroNumber}>{pct(bias.test_rate)}</div>
            <div className={s.heroLabel}>{level?level.toUpperCase():"PDH"} test rate</div>
            <div className={s.heroContext}>{symbol} · {session.toUpperCase()} session · {pct(bias.bounce_rate)} bounce · {pct(bias.break_rate)} break{bias.avg_test_time_min!=null?` · Avg test at ${mins(bias.avg_test_time_min)}`:""}</div>
          </div>

          {/* ── Education accordion ── */}
          <EducationAccordion content={EDUCATION.prior_day_levels} />

          <div className={s.cardRow}>
            <div className={s.actionCard}><div className={s.actionHeader}><span className={s.actionIcon} style={{color:"var(--green)"}}>⎆</span><span className={s.actionTitle}>Entry</span></div><div className={s.actionStat} style={{color:"var(--green)"}}>{pct(bias.first_touch_bounce_rate)}</div><div className={s.actionStatLabel}>first touch bounce rate</div><div className={s.actionDesc}>First touch breaks: {pct(bias.first_touch_break_rate)}.{bias.avg_test_time_min!=null?` Level tested at ${mins(bias.avg_test_time_min)} into session.`:""}</div></div>
            <div className={s.actionCard}><div className={s.actionHeader}><span className={s.actionIcon} style={{color:"var(--accent)"}}>◎</span><span className={s.actionTitle}>Target</span></div><div className={s.actionStat} style={{color:"var(--accent)"}}>{pts(bias.avg_bounce_move)}</div><div className={s.actionStatLabel}>avg bounce move (pts)</div><div className={s.actionDesc}>Avg break move: {pts(bias.avg_break_move)} pts.{bias.avg_hold_duration_min!=null?` Breaks hold ~${mins(bias.avg_hold_duration_min)}.`:""}</div></div>
            <div className={s.actionCard}><div className={s.actionHeader}><span className={s.actionIcon} style={{color:"var(--red)"}}>⊘</span><span className={s.actionTitle}>Invalidation</span></div><div className={s.actionStat} style={{color:"var(--red)"}}>{pct(bias.break_rate)}</div><div className={s.actionStatLabel}>break rate</div><div className={s.actionDesc}>{bias.avg_hold_duration_min!=null?`If price holds beyond level for ${mins(bias.avg_hold_duration_min)}, break is likely real.`:"Monitor hold duration for confirmation."}</div></div>
          </div>
          {Object.keys(levels).length>1&&<div className={s.section}><h3 className={s.sectionTitle}>Level Breakdown</h3><div className={s.compRow}>{["pdh","pdl","pdc"].map(lv=>{const d=levels[lv];if(!d)return null;return<div key={lv} className={`${s.compCard} ${level===lv?s.compCardActive:""}`}><div className={s.compPeriod}>{lv.toUpperCase()}</div><div className={s.compStat}>{pct(d.test_rate)}</div><div className={s.compLabel}>test rate</div><div className={s.compTrap} style={{color:d.bounce_rate>0.5?"var(--green)":"var(--red)"}}>{pct(d.bounce_rate)} bounce</div></div>;})}</div></div>}
          <div className={s.section}><h3 className={s.sectionTitle}>Day of Week — Bounce Rate</h3><div className={s.heatmapRow}>{DAY_LABELS.map((l,i)=>{const v=heatmap[String(i)];return<div key={i} className={s.heatmapCell}><div className={s.heatmapBlock} style={{backgroundColor:heatColor(v)}}>{pct(v)}</div><div className={s.heatmapLabel}>{l}</div></div>;})}</div></div>
          {recent.length>0&&<div className={s.section}><h3 className={s.sectionTitle}>Last {recent.length} Sessions</h3><div className={s.streakRow}>{recent.map((r,i)=>{const pl=level||"pdh";const tested=r[`${pl}_tested`];const result=r[`${pl}_result`];return<div key={i} className={s.streakCard}><div className={s.streakDate}>{r.date?.slice(5)||"—"}</div><div className={s.streakDir} style={{color:tested?"var(--text-primary)":"var(--text-dim)"}}>{tested?"tested":"no test"}</div><div className={s.streakResult}>{result==="bounce"?<span style={{color:"var(--green)"}}>✓ bounce</span>:result==="break"?<span style={{color:"var(--red)"}}>✗ break</span>:<span style={{color:"var(--text-dim)"}}>—</span>}</div></div>;})}</div></div>}
          <div className={s.footer}>Last computed: {data.computed_at?new Date(data.computed_at).toLocaleString():"—"}</div>
        </div>
      )}
    </div>
  );
}
function FG({label,children}){return<div className={s.filterGroup}><span className={s.filterLabel}>{label}</span><div className={s.filterBtns}>{children}</div></div>;}
function FB({a,o,children}){return<button onClick={o} className={`${s.filterBtn} ${a?s.filterBtnActive:""}`}>{children}</button>;}
