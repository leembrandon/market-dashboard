"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { fetchReport } from "../../../lib/data";
import EducationAccordion from "../../../components/EducationAccordion";
import EDUCATION from "../../../lib/education";
import s from "./report.module.css";

const SYMBOLS = ["NQ","ES","CL","GC"];
const DIRECTIONS = [{label:"Both",value:null},{label:"Gap Up",value:"up"},{label:"Gap Down",value:"down"}];
const LOOKBACKS = [30,90];
const SESSIONS = [{label:"Asia",value:"asia"},{label:"London",value:"london"},{label:"NY",value:"ny"}];
const DAYS = [{label:"All",value:null},{label:"Mon",value:0},{label:"Tue",value:1},{label:"Wed",value:2},{label:"Thu",value:3},{label:"Fri",value:4}];
const DAY_LABELS = ["Mon","Tue","Wed","Thu","Fri"];
const pct=(v)=>v!=null?`${Math.round(v*100)}%`:"—";
const pts=(v)=>v!=null&&!isNaN(v)?parseFloat(v).toFixed(2):"—";
const mins=(v)=>v!=null?`${Math.round(v)} min`:"—";
function heatColor(v){if(v==null)return"#1e1e2e";const c=Math.max(0,Math.min(1,v));if(c>=0.7)return`rgba(16,185,129,${0.25+c*0.55})`;if(c>=0.5)return`rgba(245,158,11,${0.2+c*0.4})`;return`rgba(244,63,94,${0.2+c*0.5})`;}

export default function GapFillReportPage(){
  const [symbol,setSymbol]=useState("NQ");
  const [direction,setDirection]=useState(null);
  const [lookback,setLookback]=useState(90);
  const [session,setSession]=useState("ny");
  const [dayFilter,setDayFilter]=useState(null);
  const [data,setData]=useState(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState(null);

  const loadReport=useCallback(async()=>{
    setLoading(true);setError(null);
    try{setData(await fetchReport("gap_fill",symbol,{day_of_week:dayFilter,direction},lookback,session));}
    catch(e){setError(e.message);setData(null);}
    setLoading(false);
  },[symbol,direction,lookback,session,dayFilter]);
  useEffect(()=>{loadReport();},[loadReport]);

  const bias=data?.bias||{},entry=data?.entry||{},target=data?.target||{},inv=data?.invalidation||{},heatmap=data?.heatmap||{},recent=data?.recent_sessions||[];

  return(
    <div className={s.page}>
      <div className={s.nav}><Link href="/" className={s.backLink}>← <span className={s.backLogo}><span style={{color:"var(--accent)"}}>Level</span>Sight</span></Link></div>
      <header className={s.header}><div><h1 className={s.title}>Gap Fill</h1><p className={s.question}>Should I fade this gap or ride it?</p></div><div className={s.meta}>{data&&<span className={s.sampleBadge}>{data.sample_size} of {data.total_sessions} sessions</span>}</div></header>
      <div className={s.filterBar}>
        <FG label="Ticker">{SYMBOLS.map(v=><FB key={v} a={symbol===v} o={()=>setSymbol(v)}>{v}</FB>)}</FG>
        <FG label="Session">{SESSIONS.map(v=><FB key={v.value} a={session===v.value} o={()=>setSession(v.value)}>{v.label}</FB>)}</FG>
        <FG label="Direction">{DIRECTIONS.map(v=><FB key={v.label} a={direction===v.value} o={()=>setDirection(v.value)}>{v.label}</FB>)}</FG>
        <FG label="Lookback">{LOOKBACKS.map(v=><FB key={v} a={lookback===v} o={()=>setLookback(v)}>{v}d</FB>)}</FG>
        <FG label="Day">{DAYS.map(v=><FB key={v.label} a={dayFilter===v.value} o={()=>setDayFilter(v.value)}>{v.label}</FB>)}</FG>
      </div>
      {loading&&<div className={s.stateBox}><div className={s.spinner}/><p className={s.stateText}>Loading report...</p></div>}
      {error&&<div className={s.stateBox}><p className={s.stateText} style={{color:"var(--red)"}}>Unable to load data</p></div>}
      {!loading&&!error&&!data&&<div className={s.stateBox}><p className={s.stateText}>No data available for these filters.</p></div>}
      {!loading&&!error&&data&&(
        <div style={{animation:"fadeIn 0.3s ease-out"}}>
          <div className={s.heroSection}>
            <div className={s.heroNumber}>{pct(bias.fill_rate)}</div>
            <div className={s.heroLabel}>Gap fill rate</div>
            <div className={s.heroContext}>{symbol} · {session.toUpperCase()} session · {pct(bias.continuation_rate)} continuation · Up fill {pct(bias.fill_rate_up)} · Down fill {pct(bias.fill_rate_down)}</div>
          </div>

          {/* ── Education accordion ── */}
          <EducationAccordion content={EDUCATION.gap_fill} />

          <div className={s.cardRow}>
            <div className={s.actionCard}><div className={s.actionHeader}><span className={s.actionIcon} style={{color:"var(--green)"}}>⎆</span><span className={s.actionTitle}>Entry</span></div><div className={s.actionStat} style={{color:"var(--green)"}}>{entry.avg_fill_time_min!=null?mins(entry.avg_fill_time_min):"—"}</div><div className={s.actionStatLabel}>avg fill time</div><div className={s.actionDesc}>{pct(entry.pct_filled_in_30)} fill within 30 min · {pct(entry.pct_filled_in_60)} within 60 min.{entry.late_fill_rate!=null?` After 60 min, only ${pct(entry.late_fill_rate)} still fill.`:""}</div></div>
            <div className={s.actionCard}><div className={s.actionHeader}><span className={s.actionIcon} style={{color:"var(--accent)"}}>◎</span><span className={s.actionTitle}>Target</span></div><div className={s.actionStat} style={{color:"var(--accent)"}}>{target.avg_gap_size_pct!=null?`${target.avg_gap_size_pct.toFixed(2)}%`:"—"}</div><div className={s.actionStatLabel}>avg gap size</div><div className={s.actionDesc}>Avg overshoot past fill: {pts(target.avg_overshoot)} pts. Avg continuation when unfilled: {pts(target.avg_continuation_move)} pts.</div></div>
            <div className={s.actionCard}><div className={s.actionHeader}><span className={s.actionIcon} style={{color:"var(--red)"}}>⊘</span><span className={s.actionTitle}>Invalidation</span></div><div className={s.actionStat} style={{color:"var(--red)"}}>{pct(inv.large_gap_fill_rate)}</div><div className={s.actionStatLabel}>large gap fill rate</div><div className={s.actionDesc}>Small gaps fill {pct(inv.small_gap_fill_rate)}. Avg max adverse before fill: {pts(inv.avg_max_adverse)} pts.</div></div>
          </div>
          <div className={s.section}><h3 className={s.sectionTitle}>Day of Week — Gap Fill Rate</h3><div className={s.heatmapRow}>{DAY_LABELS.map((l,i)=>{const v=heatmap[String(i)];return<div key={i} className={s.heatmapCell}><div className={s.heatmapBlock} style={{backgroundColor:heatColor(v)}}>{pct(v)}</div><div className={s.heatmapLabel}>{l}</div></div>;})}</div></div>
          {recent.length>0&&<div className={s.section}><h3 className={s.sectionTitle}>Last {recent.length} Sessions</h3><div className={s.streakRow}>{recent.map((r,i)=><Link key={i} href={`/session?symbol=${symbol}&session=${session}&date=${r.date}`} className={s.streakLink}><div className={s.streakCard}><div className={s.streakDate}>{r.date?.slice(5)||"—"}</div><div className={s.streakDir} style={{color:r.direction==="up"?"var(--green)":"var(--red)"}}>{r.direction==="up"?"▲ up":"▼ down"}</div><div className={s.streakResult}>{r.filled?<span style={{color:"var(--green)"}}>✓ filled</span>:<span style={{color:"var(--red)"}}>✗ unfilled</span>}</div><div className={s.streakMove}>{r.gap_pct!=null?`${Number(r.gap_pct).toFixed(2)}%`:"—"}</div></div></Link>)}</div></div>}
          <div className={s.footer}>Last computed: {data.computed_at?new Date(data.computed_at).toLocaleString():"—"}</div>
        </div>
      )}
    </div>
  );
}
function FG({label,children}){return<div className={s.filterGroup}><span className={s.filterLabel}>{label}</span><div className={s.filterBtns}>{children}</div></div>;}
function FB({a,o,children}){return<button onClick={o} className={`${s.filterBtn} ${a?s.filterBtnActive:""}`}>{children}</button>;}
