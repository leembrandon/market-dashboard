"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { fetchReport } from "../../../lib/data";
import s from "./report.module.css";

const SYMBOLS=["NQ","ES","CL","GC"];
const IB_SIZES=[{label:"All",value:null},{label:"Narrow",value:"narrow"},{label:"Average",value:"average"},{label:"Wide",value:"wide"}];
const LOOKBACKS=[30,90];
const SESSIONS=[{label:"Asia",value:"asia"},{label:"London",value:"london"},{label:"NY",value:"ny"}];
const DAYS=[{label:"All",value:null},{label:"Mon",value:0},{label:"Tue",value:1},{label:"Wed",value:2},{label:"Thu",value:3},{label:"Fri",value:4}];
const DAY_LABELS=["Mon","Tue","Wed","Thu","Fri"];
const pct=(v)=>v!=null?`${Math.round(v*100)}%`:"—";
const pts=(v)=>v!=null&&!isNaN(v)?parseFloat(v).toFixed(2):"—";
const mult=(v)=>v!=null&&!isNaN(v)?`${parseFloat(v).toFixed(1)}x`:"—";
const mins=(v)=>v!=null?`${Math.round(v)} min`:"—";
function heatColor(v){if(v==null)return"#1e1e2e";const c=Math.max(0,Math.min(1,v));if(c>=0.7)return`rgba(16,185,129,${0.25+c*0.55})`;if(c>=0.5)return`rgba(245,158,11,${0.2+c*0.4})`;return`rgba(244,63,94,${0.2+c*0.5})`;}

export default function IBReportPage(){
  const [symbol,setSymbol]=useState("NQ");
  const [ibSize,setIbSize]=useState(null);
  const [lookback,setLookback]=useState(90);
  const [session,setSession]=useState("ny");
  const [dayFilter,setDayFilter]=useState(null);
  const [data,setData]=useState(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState(null);

  const loadReport=useCallback(async()=>{
    setLoading(true);setError(null);
    try{setData(await fetchReport("ib",symbol,{day_of_week:dayFilter,ib_size:ibSize},lookback,session));}
    catch(e){setError(e.message);setData(null);}
    setLoading(false);
  },[symbol,ibSize,lookback,session,dayFilter]);
  useEffect(()=>{loadReport();},[loadReport]);

  const bias=data?.bias||{},entry=data?.entry||{},target=data?.target||{},inv=data?.invalidation||{},heatmap=data?.heatmap||{},recent=data?.recent_sessions||[];
  const totalExt=((bias.ext_above_rate||0)+(bias.ext_below_rate||0));

  return(
    <div className={s.page}>
      <div className={s.nav}><Link href="/" className={s.backLink}>← <span className={s.backLogo}><span style={{color:"var(--accent)"}}>Level</span>Sight</span></Link></div>
      <header className={s.header}><div><h1 className={s.title}>Initial Balance</h1><p className={s.question}>Is today a trend day or a chop day?</p></div><div className={s.meta}>{data&&<span className={s.sampleBadge}>{data.sample_size} of {data.total_sessions} sessions</span>}</div></header>
      <div className={s.filterBar}>
        <FG label="Ticker">{SYMBOLS.map(v=><FB key={v} a={symbol===v} o={()=>setSymbol(v)}>{v}</FB>)}</FG>
        <FG label="Session">{SESSIONS.map(v=><FB key={v.value} a={session===v.value} o={()=>setSession(v.value)}>{v.label}</FB>)}</FG>
        <FG label="IB Size">{IB_SIZES.map(v=><FB key={v.label} a={ibSize===v.value} o={()=>setIbSize(v.value)}>{v.label}</FB>)}</FG>
        <FG label="Lookback">{LOOKBACKS.map(v=><FB key={v} a={lookback===v} o={()=>setLookback(v)}>{v}d</FB>)}</FG>
        <FG label="Day">{DAYS.map(v=><FB key={v.label} a={dayFilter===v.value} o={()=>setDayFilter(v.value)}>{v.label}</FB>)}</FG>
      </div>
      {loading&&<div className={s.stateBox}><div className={s.spinner}/><p className={s.stateText}>Loading report...</p></div>}
      {error&&<div className={s.stateBox}><p className={s.stateText} style={{color:"var(--red)"}}>Unable to load data</p></div>}
      {!loading&&!error&&!data&&<div className={s.stateBox}><p className={s.stateText}>No data available for these filters.</p></div>}
      {!loading&&!error&&data&&(
        <div style={{animation:"fadeIn 0.3s ease-out"}}>
          <div className={s.heroSection}>
            <div className={s.heroNumber}>{pct(totalExt)}</div>
            <div className={s.heroLabel}>IB extension rate</div>
            <div className={s.heroContext}>{symbol} · {session.toUpperCase()} session · {pct(bias.ext_above_rate)} above · {pct(bias.ext_below_rate)} below · {pct(bias.stay_inside_rate)} inside{bias.avg_ib_range?` · Avg IB: ${pts(bias.avg_ib_range)} pts`:""}</div>
          </div>
          <div className={s.cardRow}>
            <div className={s.actionCard}><div className={s.actionHeader}><span className={s.actionIcon} style={{color:"var(--green)"}}>⎆</span><span className={s.actionTitle}>Entry</span></div><div className={s.actionStat} style={{color:"var(--green)"}}>{pct(entry.first_ext_reliability)}</div><div className={s.actionStatLabel}>first extension reliability</div><div className={s.actionDesc}>{entry.avg_ext_time_min!=null?`First extension ~${mins(entry.avg_ext_time_min)} after IB sets. `:""}{pct(entry.retest_rate)} retest the IB edge.</div></div>
            <div className={s.actionCard}><div className={s.actionHeader}><span className={s.actionIcon} style={{color:"var(--accent)"}}>◎</span><span className={s.actionTitle}>Target</span></div><div className={s.actionStat} style={{color:"var(--accent)"}}>{mult(target.avg_ext_multiple)}</div><div className={s.actionStatLabel}>avg extension multiple</div><div className={s.actionDesc}>Above: {mult(target.avg_ext_multiple_above)} ({pts(target.avg_ext_above_pts)} pts) · Below: {mult(target.avg_ext_multiple_below)} ({pts(target.avg_ext_below_pts)} pts)</div></div>
            <div className={s.actionCard}><div className={s.actionHeader}><span className={s.actionIcon} style={{color:"var(--red)"}}>⊘</span><span className={s.actionTitle}>Invalidation</span></div><div className={s.actionStat} style={{color:"var(--red)"}}>{pct(inv.failed_ext_rate)}</div><div className={s.actionStatLabel}>failed extension rate</div><div className={s.actionDesc}>Double break: {pct(bias.double_break_rate)}.{inv.late_ext_rate!=null?` Late extensions only ${pct(inv.late_ext_rate)}.`:""}</div></div>
          </div>
          <div className={s.section}><h3 className={s.sectionTitle}>IB Size Context</h3><div className={s.compRow}><div className={`${s.compCard} ${ibSize==="narrow"?s.compCardActive:""}`}><div className={s.compPeriod}>Narrow</div><div className={s.compStat}>{pct(bias.narrow_ext_rate)}</div><div className={s.compLabel}>extension rate</div></div><div className={`${s.compCard} ${ibSize==="wide"?s.compCardActive:""}`}><div className={s.compPeriod}>Wide</div><div className={s.compStat}>{pct(bias.wide_ext_rate)}</div><div className={s.compLabel}>extension rate</div></div></div></div>
          <div className={s.section}><h3 className={s.sectionTitle}>Day of Week — Extension Rate</h3><div className={s.heatmapRow}>{DAY_LABELS.map((l,i)=>{const v=heatmap[String(i)];return<div key={i} className={s.heatmapCell}><div className={s.heatmapBlock} style={{backgroundColor:heatColor(v)}}>{pct(v)}</div><div className={s.heatmapLabel}>{l}</div></div>;})}</div></div>
          {recent.length>0&&<div className={s.section}><h3 className={s.sectionTitle}>Last {recent.length} Sessions</h3><div className={s.streakRow}>{recent.map((r,i)=><div key={i} className={s.streakCard}><div className={s.streakDate}>{r.date?.slice(5)||"—"}</div><div className={s.streakDir} style={{color:r.extended==="above"?"var(--green)":r.extended==="below"?"var(--red)":"var(--text-muted)"}}>{r.extended==="above"?"▲ above":r.extended==="below"?"▼ below":"— inside"}</div><div className={s.streakResult}>{r.double_break?<span style={{color:"var(--amber)"}}>⚠ double</span>:<span style={{color:"var(--text-dim)"}}>close: {r.close||"—"}</span>}</div><div className={s.streakMove}>{r.ib_range!=null?`${Number(r.ib_range).toFixed(1)} pts`:"—"}</div></div>)}</div></div>}
          <div className={s.footer}>Last computed: {data.computed_at?new Date(data.computed_at).toLocaleString():"—"}</div>
        </div>
      )}
    </div>
  );
}
function FG({label,children}){return<div className={s.filterGroup}><span className={s.filterLabel}>{label}</span><div className={s.filterBtns}>{children}</div></div>;}
function FB({a,o,children}){return<button onClick={o} className={`${s.filterBtn} ${a?s.filterBtnActive:""}`}>{children}</button>;}
