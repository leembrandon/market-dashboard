"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { fetchReport } from "../../../lib/data";
import s from "./orb.module.css";

const SYMBOLS = ["NQ","ES","CL","GC"];
const OR_PERIODS = [5,15,30];
const LOOKBACKS = [30,90];
const SESSIONS = [{label:"Asia",value:"asia"},{label:"London",value:"london"},{label:"NY",value:"ny"}];
const DAYS = [{label:"All",value:null},{label:"Mon",value:0},{label:"Tue",value:1},{label:"Wed",value:2},{label:"Thu",value:3},{label:"Fri",value:4}];
const DAY_LABELS = ["Mon","Tue","Wed","Thu","Fri"];
const pct = (v) => v!=null ? `${Math.round(v*100)}%` : "—";
const pts = (v) => v!=null&&!isNaN(v) ? parseFloat(v).toFixed(2) : "—";
const mins = (v) => v!=null ? `${Math.round(v)} min` : "—";
function heatColor(v){if(v==null)return"#1e1e2e";const c=Math.max(0,Math.min(1,v));if(c>=0.7)return`rgba(16,185,129,${0.25+c*0.55})`;if(c>=0.5)return`rgba(245,158,11,${0.2+c*0.4})`;return`rgba(244,63,94,${0.2+c*0.5})`;}

export default function ORBReportPage(){
  const [symbol,setSymbol]=useState("NQ");
  const [orPeriod,setOrPeriod]=useState(15);
  const [lookback,setLookback]=useState(90);
  const [session,setSession]=useState("ny");
  const [dayFilter,setDayFilter]=useState(null);
  const [data,setData]=useState(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState(null);

  const loadReport=useCallback(async()=>{
    setLoading(true);setError(null);
    try{const r=await fetchReport("orb",symbol,{day_of_week:dayFilter,or_period:orPeriod},lookback,session);setData(r);}
    catch(e){setError(e.message);setData(null);}
    setLoading(false);
  },[symbol,orPeriod,lookback,session,dayFilter]);
  useEffect(()=>{loadReport();},[loadReport]);

  const bias=data?.bias||{},entry=data?.entry||{},target=data?.target||{},inv=data?.invalidation||{},heatmap=data?.heatmap||{},recent=data?.recent_sessions||[],comparison=entry.or_period_comparison||{};

  return(
    <div className={s.page}>
      <div className={s.nav}><Link href="/" className={s.backLink}>← <span className={s.backLogo}><span style={{color:"var(--accent)"}}>Level</span>Sight</span></Link></div>
      <header className={s.header}>
        <div><h1 className={s.title}>Opening Range Breakout</h1><p className={s.question}>Should I trade the first breakout or wait?</p></div>
        <div className={s.meta}>{data&&<span className={s.sampleBadge}>{data.sample_size} of {data.total_sessions} sessions</span>}</div>
      </header>
      <div className={s.filterBar}>
        <FG label="Ticker">{SYMBOLS.map(v=><FB key={v} a={symbol===v} o={()=>setSymbol(v)}>{v}</FB>)}</FG>
        <FG label="Session">{SESSIONS.map(v=><FB key={v.value} a={session===v.value} o={()=>setSession(v.value)}>{v.label}</FB>)}</FG>
        <FG label="OR Period">{OR_PERIODS.map(v=><FB key={v} a={orPeriod===v} o={()=>setOrPeriod(v)}>{v}m</FB>)}</FG>
        <FG label="Lookback">{LOOKBACKS.map(v=><FB key={v} a={lookback===v} o={()=>setLookback(v)}>{v}d</FB>)}</FG>
        <FG label="Day">{DAYS.map(v=><FB key={v.label} a={dayFilter===v.value} o={()=>setDayFilter(v.value)}>{v.label}</FB>)}</FG>
      </div>
      {loading&&<div className={s.stateBox}><div className={s.spinner}/><p className={s.stateText}>Loading report...</p></div>}
      {error&&<div className={s.stateBox}><p className={s.stateText} style={{color:"var(--red)"}}>Unable to load data</p><p className={s.stateSubtext}>Please try again later.</p></div>}
      {!loading&&!error&&!data&&<div className={s.stateBox}><p className={s.stateText}>No data available for these filters.</p></div>}
      {!loading&&!error&&data&&(
        <div style={{animation:"fadeIn 0.3s ease-out"}}>
          <div className={s.heroSection}>
            <div className={s.heroNumber}>{pct(bias.first_break_reliability)}</div>
            <div className={s.heroLabel}>First break = real direction</div>
            <div className={s.heroContext}>{symbol} {orPeriod}-min OR · {session.toUpperCase()} session · {pct(bias.breakout_rate)} break the range · {pct(bias.bullish_pct)} bullish / {pct(bias.bearish_pct)} bearish</div>
          </div>
          <div className={s.cardRow}>
            <div className={s.actionCard}><div className={s.actionHeader}><span className={s.actionIcon} style={{color:"var(--green)"}}>⎆</span><span className={s.actionTitle}>Entry</span></div><div className={s.actionStat} style={{color:"var(--green)"}}>{pct(entry.trap_rate)}</div><div className={s.actionStatLabel}>trap rate</div><div className={s.actionDesc}>{entry.avg_break_time_min!=null?`Avg first break at ${mins(entry.avg_break_time_min)} after OR sets.`:"Awaiting more data."}</div></div>
            <div className={s.actionCard}><div className={s.actionHeader}><span className={s.actionIcon} style={{color:"var(--accent)"}}>◎</span><span className={s.actionTitle}>Target</span></div><div className={s.actionStat} style={{color:"var(--accent)"}}>{pts(target.avg_total_move)}</div><div className={s.actionStatLabel}>avg move (pts)</div><div className={s.actionDesc}>A-move: {pts(target.avg_a_move)} pts · B-move: {pts(target.avg_b_move)} pts · {target.avg_move_multiple!=null?target.avg_move_multiple.toFixed(1):"—"}x OR range</div></div>
            <div className={s.actionCard}><div className={s.actionHeader}><span className={s.actionIcon} style={{color:"var(--red)"}}>⊘</span><span className={s.actionTitle}>Invalidation</span></div><div className={s.actionStat} style={{color:"var(--red)"}}>{pct(inv.midpoint_retest_fail_rate)}</div><div className={s.actionStatLabel}>midpoint retest fails</div><div className={s.actionDesc}>{inv.trap_reveal_time_min!=null?`Traps reveal in ~${inv.trap_reveal_time_min} min. Small OR trap rate: ${pct(inv.small_or_trap_rate)}.`:`Small OR trap rate: ${pct(inv.small_or_trap_rate)}.`}</div></div>
          </div>
          {Object.keys(comparison).length>0&&<div className={s.section}><h3 className={s.sectionTitle}>OR Period Comparison</h3><div className={s.compRow}>{["5","15","30"].map(p=>{const c=comparison[p];if(!c)return null;return(<div key={p} className={`${s.compCard} ${parseInt(p)===orPeriod?s.compCardActive:""}`}><div className={s.compPeriod}>{p}m</div><div className={s.compStat}>{pct(c.reliability)}</div><div className={s.compLabel}>reliability</div><div className={s.compTrap} style={{color:c.trap_rate>0.3?"var(--red)":c.trap_rate>0.2?"var(--amber)":"var(--green)"}}>{pct(c.trap_rate)} traps</div></div>);})}</div></div>}
          <div className={s.section}><h3 className={s.sectionTitle}>Day of Week — First Break Reliability</h3><div className={s.heatmapRow}>{DAY_LABELS.map((l,i)=>{const v=heatmap[String(i)];return(<div key={i} className={s.heatmapCell}><div className={s.heatmapBlock} style={{backgroundColor:heatColor(v)}}>{pct(v)}</div><div className={s.heatmapLabel}>{l}</div></div>);})}</div></div>
          {recent.length>0&&<div className={s.section}><h3 className={s.sectionTitle}>Last {recent.length} Sessions</h3><div className={s.streakRow}>{recent.map((r,i)=>(<div key={i} className={s.streakCard}><div className={s.streakDate}>{r.date?.slice(5)||"—"}</div><div className={s.streakDir} style={{color:r.first_break==="above"?"var(--green)":"var(--red)"}}>{r.first_break==="above"?"▲":"▼"} {r.first_break||"—"}</div><div className={s.streakResult}>{r.held?<span style={{color:"var(--green)"}}>✓ held</span>:r.trapped?<span style={{color:"var(--red)"}}>✗ trapped</span>:<span style={{color:"var(--amber)"}}>✗ failed</span>}</div><div className={s.streakMove}>{r.move!=null?`${r.move>0?"+":""}${r.move.toFixed(2)}%`:"—"}</div></div>))}</div></div>}
          <div className={s.footer}>Last computed: {data.computed_at?new Date(data.computed_at).toLocaleString():"—"}</div>
        </div>
      )}
    </div>
  );
}
function FG({label,children}){return<div className={s.filterGroup}><span className={s.filterLabel}>{label}</span><div className={s.filterBtns}>{children}</div></div>;}
function FB({a,o,children}){return<button onClick={o} className={`${s.filterBtn} ${a?s.filterBtnActive:""}`}>{children}</button>;}
