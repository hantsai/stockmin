// StockMin — src/App.jsx
import { useState, useEffect, useCallback } from "react";
import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts";

const C = {
  bg:"#080b12",surface:"#0d1120",card:"#111827",border:"#1c2540",
  green:"#ff3d6e",greenBg:"rgba(255,61,110,0.10)",greenBd:"rgba(255,61,110,0.25)",
  red:"#00e5a0",redBg:"rgba(0,229,160,0.10)",redBd:"rgba(0,229,160,0.25)",
  gold:"#ffb547",goldBg:"rgba(255,181,71,0.10)",goldBd:"rgba(255,181,71,0.25)",
  blue:"#60a5fa",blueBg:"rgba(96,165,250,0.10)",blueBd:"rgba(96,165,250,0.25)",
  purple:"#a78bfa",purpleBg:"rgba(167,139,250,0.10)",purpleBd:"rgba(167,139,250,0.25)",
  text:"#edf2ff",sub:"#8896b3",dim:"#1c2540",
  mono:"'Space Mono',monospace",sans:"'Outfit',sans-serif",
};

const TW_NAMES = {
  "0050.TW":"元大台灣50","0056.TW":"元大高股息",
  "2330.TW":"台積電","2454.TW":"聯發科","2308.TW":"台達電","2317.TW":"鴻海",
  "3711.TW":"日月光投控","2303.TW":"聯電","6285.TW":"台光電","2634.TW":"欣興",
  "2494.TW":"奇鋐","2891.TW":"中信金","2882.TW":"國泰金","2884.TW":"玉山金",
  "2886.TW":"兆豐金","2881.TW":"富邦金","2892.TW":"第一金","5880.TW":"合庫金",
  "2885.TW":"元大金","2883.TW":"開發金","2890.TW":"永豐金","2880.TW":"華南金",
  "2887.TW":"台新金","2412.TW":"中華電","3045.TW":"台灣大","4904.TW":"遠傳",
  "2357.TW":"華碩","2382.TW":"廣達","3231.TW":"緯創","2301.TW":"光寶科",
  "2327.TW":"國巨","2379.TW":"瑞昱","3034.TW":"聯詠","2385.TW":"群光",
  "2408.TW":"南亞科","2337.TW":"旺宏","3008.TW":"大立光","2376.TW":"技嘉",
  "2344.TW":"華邦電","6669.TW":"緯穎","3051.TW":"智邦","2048.TW":"欣興",
  "2360.TW":"致茂","3653.TW":"健策","2474.TW":"可成","4938.TW":"和碩",
  "2603.TW":"長榮","2609.TW":"陽明","2615.TW":"萬海","2002.TW":"中鋼",
  "1301.TW":"台塑","1303.TW":"南亞","1326.TW":"台化","6505.TW":"台塑化",
  "2912.TW":"統一超","1216.TW":"統一","2207.TW":"和泰車","2353.TW":"宏碁",
  "2324.TW":"仁寶","2356.TW":"英業達","2352.TW":"佳世達","2347.TW":"聯強",
  "2492.TW":"華新科","6415.TW":"矽力-KY","4958.TW":"臻鼎-KY","5871.TW":"中租-KY",
  "2645.TW":"長榮航太","1504.TW":"東元","2838.TW":"聯邦銀","5876.TW":"上海商銀",
  "1102.TW":"亞泥","1101.TW":"台泥","2006.TW":"東和鋼鐵","1605.TW":"華新",
  "1402.TW":"遠東新","9904.TW":"寶成","9910.TW":"豐泰","1476.TW":"儒鴻",
  "1227.TW":"佳格","3044.TW":"健鼎","3443.TW":"創意","3035.TW":"智原",
  "2395.TW":"研華","2049.TW":"上銀","2409.TW":"友達","3481.TW":"群創",
  "1802.TW":"台玻","2458.TW":"義隆","8069.TW":"元太",
  "5347.TW":"世界先進","6770.TW":"力積電","2449.TW":"京元電子",
  "2377.TW":"微星","2014.TW":"中鴻","2015.TW":"豐興",
  "6446.TW":"藥華藥","4130.TW":"聯亞","4736.TW":"泰博","1795.TW":"美時",
  "2612.TW":"中航","2636.TW":"台驊","2637.TW":"慧洋-KY",
};

const UNDERVALUED_POOL = [
  "2881.TW","2882.TW","2886.TW","2891.TW","2892.TW","5880.TW",
  "2603.TW","2609.TW","2615.TW","1301.TW","1303.TW","6505.TW",
  "2002.TW","2412.TW","3045.TW","2353.TW","2324.TW","2347.TW",
  "1102.TW","1101.TW","2207.TW","2912.TW","1216.TW","2395.TW",
  "2049.TW","3008.TW","2327.TW","2337.TW","2474.TW","1476.TW",
];

const DEFAULT_TICKERS = ["2330.TW","2454.TW","1802.TW","2408.TW","2458.TW","3231.TW","8069.TW","AAPL","NVDA","TSLA"];

const sleep = ms => new Promise(r => setTimeout(r, ms));

// 量比術語判斷
function volInfo(ratio) {
  if (!ratio) return null;
  if (ratio >= 2.0) return { label:"大量", color:C.green };
  if (ratio >= 1.5) return { label:"放量", color:C.green };
  if (ratio >= 0.8) return { label:"平量", color:C.sub };
  if (ratio >= 0.5) return { label:"縮量", color:C.red };
  return { label:"大縮量", color:C.red };
}

function genMock(base,up){
  let v=base*0.96;
  return Array.from({length:24},()=>{v+=(Math.random()-(up?.42:.58))*base*.008;return{v:+v.toFixed(2)};}).concat([{v:base}]);
}
const MOCK_DATA = {
  "2330.TW":{name:"台積電",price:1045,pct:2.45,change:25,low:1018,high:1052,currency:"TWD"},
  "AAPL":{name:"Apple",price:213,pct:1.48,change:3.1,low:209,high:215,currency:"USD"},
  "NVDA":{name:"NVIDIA",price:1087,pct:-1.36,change:-15,low:1060,high:1105,currency:"USD"},
  "TSLA":{name:"Tesla",price:249,pct:3.62,change:8.7,low:238,high:252,currency:"USD"},
};

// ── API Helpers ───────────────────────────────────────────────────────────────
async function fetchQuote(ticker) {
  try {
    const res = await fetch(`/api/quote?ticker=${encodeURIComponent(ticker)}`,{signal:AbortSignal.timeout(9000)});
    if(!res.ok) throw new Error();
    const d = await res.json();
    if(!d.sparkline) d.sparkline = genMock(d.price, d.pct>=0);
    if(d?.ticker && TW_NAMES[d.ticker]) d.name = TW_NAMES[d.ticker];
    return d;
  } catch {
    const m = MOCK_DATA[ticker];
    if(m) return {...m,ticker,sparkline:genMock(m.price,m.pct>=0),real:false};
    return null;
  }
}

async function fetchSectorBatch(tickers) {
  try {
    const res = await fetch(`/api/sectors?tickers=${tickers.join(",")}`,{signal:AbortSignal.timeout(15000)});
    if(!res.ok) throw new Error();
    return (await res.json()).data || {};
  } catch { return {}; }
}

async function fetchDynamicSectors() {
  try {
    const res = await fetch(`/api/dynamic-sectors`,{signal:AbortSignal.timeout(20000)});
    if(!res.ok) throw new Error();
    return await res.json();
  } catch { return null; }
}

async function fetchTechnicals(ticker) {
  try {
    const res = await fetch(`/api/technicals?ticker=${encodeURIComponent(ticker)}`,{signal:AbortSignal.timeout(10000)});
    if(!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

async function fetchNews(name, ticker) {
  try {
    const res = await fetch(`/api/news?name=${encodeURIComponent(name)}&ticker=${encodeURIComponent(ticker)}`,{signal:AbortSignal.timeout(8000)});
    if(!res.ok) return [];
    return (await res.json()).news || [];
  } catch { return []; }
}

async function fetchChips(ticker) {
  try {
    const res = await fetch(`/api/chips?ticker=${encodeURIComponent(ticker)}`,{signal:AbortSignal.timeout(8000)});
    if(!res.ok) return null;
    const d = await res.json();
    return d.available ? d : null;
  } catch { return null; }
}

async function fetchMarketTickers(exclude=[]) {
  try {
    const res = await fetch(`/api/market?exclude=${exclude.join(",")}`,{signal:AbortSignal.timeout(8000)});
    if(!res.ok) throw new Error();
    return (await res.json()).tickers || [];
  } catch {
    return ["2330.TW","2454.TW","2317.TW","3711.TW","2308.TW","2303.TW","2882.TW","2357.TW","2382.TW","2412.TW"].filter(t=>!exclude.includes(t)).slice(0,5);
  }
}

async function callAI(prompt) {
  const res = await fetch("/api/analyze",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt})});
  if(!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()).text || "";
}

function loadWatchlist(){try{const s=localStorage.getItem("stockmin:watchlist");return s?JSON.parse(s):DEFAULT_TICKERS;}catch{return DEFAULT_TICKERS;}}
function saveWatchlist(t){try{localStorage.setItem("stockmin:watchlist",JSON.stringify(t));}catch{}}

// ── UI Components ─────────────────────────────────────────────────────────────
function Spark({data,color,width=64,height=32}){
  return(<ResponsiveContainer width={width} height={height}><LineChart data={data}><YAxis domain={["auto","auto"]} hide/><Line type="monotone" dataKey="v" stroke={color} strokeWidth={1.8} dot={false}/></LineChart></ResponsiveContainer>);
}

function Badge({label,value,color}){
  return(
    <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,padding:"4px 8px",textAlign:"center"}}>
      <div style={{fontSize:9,color:C.sub,marginBottom:1}}>{label}</div>
      <div style={{fontSize:11,fontWeight:800,color:color||C.text,fontFamily:C.mono}}>{value??"-"}</div>
    </div>
  );
}

function ChipsSection({chips}){
  if(!chips) return null;
  const {valuation,chips:c} = chips;
  const chipColor = v => v>0?C.green:v<0?C.red:C.sub;
  const fmt = v => v==null?"-":(v>0?"+":"")+v.toLocaleString()+"張";
  return(
    <div style={{marginBottom:14}}>
      <div style={{fontSize:11,color:C.sub,marginBottom:8}}>🎯 籌碼面（前一交易日）</div>
      {c&&(
        <div style={{display:"flex",gap:6,marginBottom:8,flexWrap:"wrap"}}>
          <Badge label="外資" value={fmt(c.foreign)} color={chipColor(c.foreign)}/>
          <Badge label="投信" value={fmt(c.trust)} color={chipColor(c.trust)}/>
          <Badge label="自營商" value={fmt(c.dealer)} color={chipColor(c.dealer)}/>
          <Badge label="三大合計" value={fmt(c.totalNet)} color={chipColor(c.totalNet)}/>
        </div>
      )}
      {valuation&&(
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {valuation.per&&<Badge label="本益比" value={`${valuation.per}x`} color={valuation.per<15?C.green:valuation.per>30?C.red:C.sub}/>}
          {valuation.pbr&&<Badge label="淨值比" value={`${valuation.pbr}x`} color={valuation.pbr<1.5?C.green:C.sub}/>}
          {valuation.dividendYield&&<Badge label="殖利率" value={`${valuation.dividendYield}%`} color={valuation.dividendYield>5?C.green:C.sub}/>}
        </div>
      )}
    </div>
  );
}

// ── WatchCard（Grid 版，一排兩個）─────────────────────────────────────────────
function WatchCard({s,onTap,onRemove,editing}){
  const up=s.pct>=0,col=up?C.green:C.red,bg=up?C.greenBg:C.redBg,bd=up?C.greenBd:C.redBd;
  const sym=s.currency==="TWD"?"NT$":"$";
  return(
    <div style={{position:"relative"}}>
      {editing&&<button onClick={()=>onRemove(s.ticker)} style={{position:"absolute",top:-5,left:-5,zIndex:10,width:20,height:20,borderRadius:"50%",border:"none",background:C.red,color:"#fff",fontSize:14,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>−</button>}
      <div onClick={()=>!editing&&onTap(s)} style={{background:C.card,border:`1px solid ${editing?C.dim:C.border}`,borderRadius:14,padding:"12px 12px",cursor:editing?"default":"pointer",height:"100%"}}>
        {/* 名稱 + 代號 */}
        <div style={{marginBottom:6}}>
          <div style={{fontSize:13,fontWeight:800,color:C.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{s.name}</div>
          <div style={{fontSize:10,color:C.sub,fontFamily:C.mono}}>{s.ticker.replace(".TW","")}</div>
        </div>
        {/* 走勢圖 */}
        <div style={{marginBottom:6}}>
          <Spark data={s.sparkline} color={col} width="100%" height={40}/>
        </div>
        {/* 價格 */}
        <div style={{fontSize:13,fontWeight:900,color:C.text,fontFamily:C.mono,marginBottom:4}}>
          {sym}{s.price.toLocaleString()}
        </div>
        {/* 漲跌幅 badge */}
        <div style={{background:bg,border:`1px solid ${bd}`,borderRadius:6,padding:"2px 8px",display:"inline-flex",alignItems:"center",gap:3}}>
          <span style={{fontSize:10}}>{up?"▲":"▼"}</span>
          <span style={{fontSize:12,fontWeight:900,color:col,fontFamily:C.mono}}>{Math.abs(s.pct)}%</span>
          {s.change!=null&&<span style={{fontSize:10,color:col,fontFamily:C.mono}}>{up?"+":""}{s.change}</span>}
        </div>
      </div>
    </div>
  );
}

// ── RecDetailModal ────────────────────────────────────────────────────────────
function RecDetailModal({r, type, children}){
  const[open,setOpen]=useState(false);
  const[text,setText]=useState("");
  const[loading,setLoading]=useState(false);
  const isBuy=type==="buy",col=isBuy?C.green:C.red;
  const up=r.pct>=0;
  const sym=r.ticker?.includes(".TW")?"NT$":"$";

  const analyze=async()=>{
    if(text) return;
    setLoading(true);
    const prompt=`你是頂尖股票分析師，針對「${r.name}（${r.ticker}）」給出詳細分析（繁體中文，200字內）。
今日漲跌：${r.pct>0?"+":""}${r.pct}% ${r.change!=null?`(${r.change>0?"+":""}${r.change}元)`:""}
${r.price?`現價：${sym}${r.price}`:""}
${r.tech?`技術指標：MA5:${r.tech.ma5} MA20:${r.tech.ma20} RSI:${r.tech.rsi} 趨勢:${r.tech.trend} 量比:${r.tech.volRatio}x`:""}
AI建議理由：${r.reason}

請依格式輸出：
【進場時機】何時適合進場
【目標價位】短線目標與支撐
【主要風險】需注意的風險
【操作建議】具體建議`;
    try{
      const result=await callAI(prompt);
      setText(result);
    }catch{setText("⚠️ 分析暫時無法使用");}
    setLoading(false);
  };

  return(
    <>
      <div onClick={()=>{setOpen(true);analyze();}}>{children}</div>
      {open&&(
        <div style={{position:"fixed",inset:0,zIndex:200,display:"flex",flexDirection:"column",justifyContent:"flex-end"}}>
          <div onClick={()=>setOpen(false)} style={{flex:1,background:"rgba(8,11,18,0.85)",backdropFilter:"blur(4px)"}}/>
          <div style={{background:C.surface,borderRadius:"24px 24px 0 0",padding:"24px 20px 48px",border:`1px solid ${C.border}`,borderBottom:"none",maxHeight:"80vh",overflowY:"auto"}}>
            <div style={{width:40,height:4,borderRadius:99,background:C.dim,margin:"0 auto 20px"}}/>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <div>
                <div style={{fontSize:20,fontWeight:900,color:C.text}}>{r.name}</div>
                <div style={{fontSize:12,color:C.sub,fontFamily:C.mono}}>{r.ticker}</div>
              </div>
              <div style={{textAlign:"right"}}>
                {r.price&&<div style={{fontSize:18,fontWeight:900,color:C.text,fontFamily:C.mono}}>{sym}{r.price.toLocaleString()}</div>}
                <div style={{background:isBuy?C.greenBg:C.redBg,border:`1px solid ${isBuy?C.greenBd:C.redBd}`,borderRadius:8,padding:"3px 10px",marginTop:4}}>
                  <div style={{fontSize:12,fontWeight:800,color:col}}>{isBuy?"建議買入":"建議減碼"}</div>
                </div>
              </div>
            </div>
            <div style={{fontSize:13,color:up?C.green:C.red,fontWeight:700,marginBottom:14}}>
              {up?"▲":"▼"} {Math.abs(r.pct)}% 今日
              {r.change!=null&&<span style={{fontSize:12,marginLeft:8,color:C.sub}}>({r.change>0?"+":""}{r.change}元)</span>}
            </div>
            {r.tech&&(
              <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
                {r.tech.ma5&&<Badge label="MA5" value={r.tech.ma5} color={r.tech.ma5>r.tech.ma20?C.green:C.red}/>}
                {r.tech.ma20&&<Badge label="MA20" value={r.tech.ma20}/>}
                {r.tech.rsi&&<Badge label="RSI" value={r.tech.rsi} color={r.tech.rsi>70?C.red:r.tech.rsi<30?C.green:C.sub}/>}
                {r.tech.volRatio&&(()=>{const vi=volInfo(r.tech.volRatio);return <Badge label={`量比 ${r.tech.volRatio}x`} value={vi?.label||"-"} color={vi?.color||C.sub}/>;})()}
                {r.tech.trend&&<Badge label="趨勢" value={r.tech.trend} color={r.tech.trend.includes("多")?C.green:r.tech.trend.includes("空")?C.red:C.sub}/>}
              </div>
            )}
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:16,minHeight:100}}>
              <div style={{fontSize:11,color:C.sub,marginBottom:8}}>✦ AI 詳細分析</div>
              {loading&&(<div style={{display:"flex",gap:4,padding:"8px 0"}}>{[0,1,2].map(i=><div key={i} style={{width:6,height:6,borderRadius:"50%",background:C.green,animation:`pulse 1s ${i*.2}s infinite ease-in-out`}}/>)}</div>)}
              <div style={{fontSize:14,color:C.text,lineHeight:1.9,whiteSpace:"pre-wrap"}}>{text}</div>
            </div>
            <button onClick={()=>setOpen(false)} style={{width:"100%",marginTop:14,padding:14,borderRadius:14,background:C.dim,border:"none",color:C.sub,fontWeight:700,fontSize:14,cursor:"pointer"}}>關閉</button>
          </div>
        </div>
      )}
    </>
  );
}

// ── RecCard（加現價、漲跌金額、量比）────────────────────────────────────────
function RecCard({r,type}){
  const isBuy=type==="buy",col=isBuy?C.green:C.red,bg=isBuy?C.greenBg:C.redBg,bd=isBuy?C.greenBd:C.redBd;
  const up=r.pct>=0;
  const sym=r.ticker?.includes(".TW")?"NT$":"$";
  const vi=r.tech?.volRatio ? volInfo(r.tech.volRatio) : null;

  return(
    <div style={{background:C.card,border:`1px solid ${bd}`,borderRadius:16,padding:"14px",marginBottom:10}}>
      {/* Row 1: 名稱 + 信心圓環 */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
        <div>
          <div style={{fontSize:15,fontWeight:800,color:C.text}}>{r.name}</div>
          <div style={{fontSize:10,color:C.sub,fontFamily:C.mono}}>{r.ticker}</div>
        </div>
        <div style={{position:"relative",width:44,height:44,flexShrink:0}}>
          <svg width="44" height="44" viewBox="0 0 44 44" style={{transform:"rotate(-90deg)"}}>
            <circle cx="22" cy="22" r="18" fill="none" stroke={C.dim} strokeWidth="3"/>
            <circle cx="22" cy="22" r="18" fill="none" stroke={col} strokeWidth="3" strokeDasharray={`${2*Math.PI*18*(r.conf||50)/100} ${2*Math.PI*18}`} strokeLinecap="round"/>
          </svg>
          <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:col,fontFamily:C.mono}}>{r.conf||"—"}%</div>
        </div>
      </div>

      {/* Row 2: 現價 + 漲跌 */}
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
        {r.price&&<div style={{fontSize:15,fontWeight:900,color:C.text,fontFamily:C.mono}}>{sym}{r.price.toLocaleString()}</div>}
        <div style={{fontSize:12,color:up?C.green:C.red,fontWeight:700}}>
          {up?"▲":"▼"} {Math.abs(r.pct)}%
          {r.change!=null&&<span style={{fontSize:11,marginLeft:4}}>({r.change>0?"+":""}{r.change}元)</span>}
        </div>
      </div>

      {/* Row 3: 技術指標 */}
      {r.tech&&(
        <div style={{display:"flex",gap:6,marginBottom:8,flexWrap:"wrap"}}>
          {r.tech.ma5&&<Badge label="MA5" value={r.tech.ma5} color={r.tech.ma5>r.tech.ma20?C.green:C.red}/>}
          {r.tech.ma20&&<Badge label="MA20" value={r.tech.ma20}/>}
          {r.tech.rsi&&<Badge label="RSI" value={r.tech.rsi} color={r.tech.rsi>70?C.red:r.tech.rsi<30?C.green:C.sub}/>}
          {r.tech.volRatio&&vi&&(
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,padding:"4px 8px",textAlign:"center"}}>
              <div style={{fontSize:9,color:C.sub,marginBottom:1}}>量比 {r.tech.volRatio}x</div>
              <div style={{fontSize:11,fontWeight:800,color:vi.color,fontFamily:C.mono}}>{vi.label}</div>
            </div>
          )}
          {r.tech.trend&&<Badge label="趨勢" value={r.tech.trend} color={r.tech.trend.includes("多")?C.green:r.tech.trend.includes("空")?C.red:C.sub}/>}
        </div>
      )}

      {/* Row 4: AI 理由（點擊展開詳細） */}
      <RecDetailModal r={r} type={type}>
        <div style={{background:bg,borderRadius:10,padding:"8px 10px",cursor:"pointer"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:2}}>
            <div style={{fontSize:11,color:C.sub}}>AI 理由</div>
            <div style={{fontSize:10,color:col}}>點擊看詳細分析 ›</div>
          </div>
          <div style={{fontSize:12,color:C.text,lineHeight:1.6}}>{r.reason}</div>
        </div>
      </RecDetailModal>
    </div>
  );
}

// ── SectorCard ────────────────────────────────────────────────────────────────
function SectorCard({sector,analysis,loading,onAnalyze}){
  const[expanded,setExpanded]=useState(false);
  const stocks = sector.stocks || [];
  return(
    <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:18,padding:"14px 16px",marginBottom:12}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:20}}>{sector.icon}</span>
          <span style={{fontSize:15,fontWeight:800,color:C.text}}>{sector.name}</span>
          <span style={{fontSize:10,color:C.sub}}>{sector.total?`${sector.total}支成分股`:"前3大漲幅"}</span>
        </div>
        <button onClick={()=>setExpanded(e=>!e)} style={{background:"transparent",border:"none",color:C.sub,fontSize:16,cursor:"pointer"}}>{expanded?"▲":"▼"}</button>
      </div>
      {stocks.length===0?(
        <div style={{fontSize:12,color:C.sub,textAlign:"center",padding:"8px 0",marginBottom:12}}>⚠️ 今日無資料或非交易日</div>
      ):(
        <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:12}}>
          {stocks.map((s,i)=>{
            const up=s.pct>=0,col=up?C.green:C.red;
            return(
              <div key={s.ticker} style={{display:"flex",alignItems:"center",gap:8}}>
                <div style={{width:18,height:18,borderRadius:"50%",background:i===0?C.gold:C.dim,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:800,color:i===0?C.bg:C.sub,flexShrink:0}}>{i+1}</div>
                <div style={{flex:1,fontSize:13,fontWeight:700,color:C.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{s.name}</div>
                <div style={{fontSize:11,fontFamily:C.mono,color:C.sub,flexShrink:0}}>NT${s.price}</div>
                <div style={{fontSize:12,fontWeight:800,color:col,fontFamily:C.mono,minWidth:56,textAlign:"right",flexShrink:0}}>{up?"▲":"▼"}{Math.abs(s.pct)}%</div>
              </div>
            );
          })}
        </div>
      )}
      <button onClick={onAnalyze} disabled={loading||stocks.length===0} style={{width:"100%",padding:"8px 0",borderRadius:10,border:`1px solid ${C.blueBd}`,background:loading?C.dim:C.blueBg,color:loading?C.sub:C.blue,fontWeight:700,fontSize:12,cursor:(loading||stocks.length===0)?"default":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
        {loading?<><div style={{width:12,height:12,border:`2px solid ${C.sub}`,borderTopColor:"transparent",borderRadius:"50%",animation:"spin .8s linear infinite"}}/> 分析中...</>:analysis?"↻ 重新分析":"✦ AI 分析此類股（含籌碼）"}
      </button>
      {analysis&&!expanded&&<div onClick={()=>setExpanded(true)} style={{marginTop:8,fontSize:11,color:C.blue,cursor:"pointer",textAlign:"center"}}>查看 AI 分析 ▼</div>}
      {analysis&&expanded&&(
        <div style={{marginTop:10,background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:12}}>
          <div style={{fontSize:11,color:C.sub,marginBottom:6}}>✦ AI 分析</div>
          <div style={{fontSize:13,color:C.text,lineHeight:1.8,whiteSpace:"pre-wrap"}}>{analysis}</div>
        </div>
      )}
    </div>
  );
}

// ── AddSheet ──────────────────────────────────────────────────────────────────
function AddSheet({existing,onAdd,onClose}){
  const[val,setVal]=useState("");
  const[status,setStatus]=useState("");
  const[checking,setChecking]=useState(false);
  const suggestions=["2308.TW","2382.TW","2881.TW","MSFT","GOOGL","META","AMZN","2412.TW"].filter(t=>!existing.includes(t));
  const check=async()=>{
    const t=val.trim().toUpperCase();
    if(!t) return;
    if(existing.includes(t)){setStatus("⚠️ 已在自選股中");return;}
    setChecking(true);setStatus("驗證股票代號中...");
    const data=await fetchQuote(t);
    setChecking(false);
    if(data){setStatus(`✓ 找到：${data.name}`);setTimeout(()=>{onAdd(t,data);onClose();},600);}
    else setStatus("✗ 找不到此代號，請確認後再試");
  };
  return(
    <div style={{position:"fixed",inset:0,zIndex:100,display:"flex",flexDirection:"column",justifyContent:"flex-end"}}>
      <div onClick={onClose} style={{flex:1,background:"rgba(8,11,18,0.85)",backdropFilter:"blur(4px)"}}/>
      <div style={{background:C.surface,borderRadius:"24px 24px 0 0",padding:"24px 20px 48px",border:`1px solid ${C.border}`,borderBottom:"none"}}>
        <div style={{width:40,height:4,borderRadius:99,background:C.dim,margin:"0 auto 20px"}}/>
        <div style={{fontSize:18,fontWeight:800,color:C.text,marginBottom:16}}>新增自選股</div>
        <div style={{display:"flex",gap:8,marginBottom:10}}>
          <input value={val} onChange={e=>{setVal(e.target.value.toUpperCase());setStatus("");}} onKeyDown={e=>e.key==="Enter"&&check()} placeholder="輸入代號，如 2330.TW 或 AAPL"
            style={{flex:1,padding:"12px 14px",borderRadius:12,border:`1px solid ${C.border}`,background:C.card,color:C.text,fontSize:14,outline:"none",fontFamily:C.mono}}/>
          <button onClick={check} disabled={checking} style={{padding:"12px 18px",borderRadius:12,border:"none",background:C.green,color:C.bg,fontWeight:800,fontSize:14,cursor:"pointer"}}>{checking?"...":"加入"}</button>
        </div>
        {status&&<div style={{fontSize:13,color:status.startsWith("✓")?C.green:status.startsWith("⚠")?C.gold:C.red,marginBottom:12}}>{status}</div>}
        <div style={{fontSize:12,color:C.sub,marginBottom:10}}>快速加入：</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
          {suggestions.slice(0,6).map(t=><button key={t} onClick={()=>{setVal(t);setStatus("");}} style={{padding:"6px 12px",borderRadius:99,border:`1px solid ${C.border}`,background:C.card,color:C.sub,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:C.mono}}>{t}</button>)}
        </div>
      </div>
    </div>
  );
}

// ── DeepAnalysisModal ─────────────────────────────────────────────────────────
function DeepAnalysisModal({stock, tech, chips, onClose}){
  const[text,setText]=useState("");
  const[loading,setLoading]=useState(true);
  const[phase,setPhase]=useState("抓取財務資料中...");
  const[truncated,setTruncated]=useState(false);
  const[hasFinancials,setHasFinancials]=useState(false);

  useEffect(()=>{
    let cancelled=false;
    (async()=>{
      setPhase("抓取財務資料中...");
      await new Promise(r=>setTimeout(r,500));
      if(cancelled) return;
      setPhase("AI 深度分析中（約需15-30秒）...");
      try{
        const res=await fetch("/api/deep-analyze",{
          method:"POST",
          headers:{"Content-Type":"application/json"},
          body:JSON.stringify({
            ticker: stock.ticker,
            name:   stock.name,
            price:  stock.price,
            pct:    stock.pct,
            tech,
            chips,
          }),
          signal: AbortSignal.timeout(60000),
        });
        if(!res.ok) throw new Error(`HTTP ${res.status}`);
        const data=await res.json();
        if(!cancelled){
          setText(data.text||"");
          setTruncated(data.truncated||false);
          setHasFinancials(data.hasFinancials||false);
        }
      }catch(e){
        if(!cancelled) setText(`⚠️ 分析失敗：${e.message}`);
      }
      if(!cancelled) setLoading(false);
    })();
    return()=>{cancelled=true;};
  },[]);

  const sym=stock.currency==="TWD"?"NT$":"$";
  const up=stock.pct>=0,col=up?C.green:C.red;
  return(
    <div style={{position:"fixed",inset:0,zIndex:150,display:"flex",flexDirection:"column",justifyContent:"flex-end"}}>
      <div onClick={onClose} style={{flex:1,background:"rgba(8,11,18,0.9)",backdropFilter:"blur(6px)"}}/>
      <div style={{background:C.surface,borderRadius:"24px 24px 0 0",padding:"24px 20px 48px",border:`1px solid ${C.border}`,borderBottom:"none",maxHeight:"92vh",overflowY:"auto"}}>
        <div style={{width:40,height:4,borderRadius:99,background:C.dim,margin:"0 auto 20px"}}/>

        {/* 標題 */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <div>
            <div style={{fontSize:20,fontWeight:900,color:C.text}}>{stock.name}</div>
            <div style={{fontSize:12,color:C.sub,fontFamily:C.mono}}>{stock.ticker}</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:20,fontWeight:900,color:C.text,fontFamily:C.mono}}>{sym}{stock.price?.toLocaleString()}</div>
            <div style={{fontSize:13,color:col,fontWeight:700}}>{up?"▲":"▼"} {Math.abs(stock.pct)}%</div>
          </div>
        </div>

        {/* 標籤 */}
        <div style={{display:"flex",gap:6,marginBottom:16}}>
          <div style={{background:C.goldBg,border:`1px solid ${C.goldBd}`,borderRadius:8,padding:"3px 10px",fontSize:11,color:C.gold,fontWeight:700}}>
            ✦ 深度研究報告
          </div>
          {hasFinancials&&<div style={{background:C.blueBg,border:`1px solid ${C.blueBd}`,borderRadius:8,padding:"3px 10px",fontSize:11,color:C.blue,fontWeight:700}}>📊 含財務數據</div>}
          {!hasFinancials&&!loading&&<div style={{background:C.dim,borderRadius:8,padding:"3px 10px",fontSize:11,color:C.sub,fontWeight:700}}>財務資料不足</div>}
        </div>

        {/* 截斷警告 */}
        {truncated&&(
          <div style={{background:"rgba(255,181,71,0.1)",border:`1px solid ${C.goldBd}`,borderRadius:12,padding:"10px 14px",marginBottom:14}}>
            <div style={{fontSize:12,color:C.gold,fontWeight:700}}>⚠️ 分析內容已達字數上限而截斷</div>
            <div style={{fontSize:11,color:C.sub,marginTop:4}}>建議分章節單獨查詢，或縮小分析範圍</div>
          </div>
        )}

        {/* 載入中 */}
        {loading&&(
          <div style={{background:C.card,borderRadius:16,padding:20,textAlign:"center"}}>
            <div style={{display:"flex",justifyContent:"center",gap:6,marginBottom:12}}>
              {[0,1,2].map(i=><div key={i} style={{width:8,height:8,borderRadius:"50%",background:C.gold,animation:`pulse 1s ${i*.2}s infinite ease-in-out`}}/>)}
            </div>
            <div style={{fontSize:13,color:C.sub}}>{phase}</div>
            <div style={{fontSize:11,color:C.dim,marginTop:6}}>深度分析含財務資料與網路搜尋</div>
          </div>
        )}

        {/* 報告內容 */}
        {!loading&&text&&(
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:16}}>
            <div style={{fontSize:11,color:C.sub,marginBottom:10}}>✦ 深度投資研究報告</div>
            <div style={{fontSize:13,color:C.text,lineHeight:2,whiteSpace:"pre-wrap"}}>{text}</div>
          </div>
        )}

        <button onClick={onClose} style={{width:"100%",marginTop:14,padding:14,borderRadius:14,background:C.dim,border:"none",color:C.sub,fontWeight:700,fontSize:14,cursor:"pointer"}}>關閉</button>
      </div>
    </div>
  );
}

// ── AnalysisModal ─────────────────────────────────────────────────────────────
function AnalysisModal({stock,onClose}){
  const[text,setText]=useState("");
  const[loading,setLoading]=useState(true);
  const[tech,setTech]=useState(null);
  const[news,setNews]=useState([]);
  const[chips,setChips]=useState(null);
  const[phase,setPhase]=useState("載入資料中...");
  const[deepOpen,setDeepOpen]=useState(false);
  useEffect(()=>{
    let cancelled=false;
    (async()=>{
      const sym=stock.currency==="TWD"?"NT$":"$";
      setPhase("抓取技術指標...");
      const techData=await fetchTechnicals(stock.ticker);
      if(cancelled) return;
      setPhase("抓取新聞...");
      const newsData=await fetchNews(stock.name,stock.ticker);
      if(cancelled) return;
      setPhase("抓取籌碼資料...");
      const chipsData=await fetchChips(stock.ticker);
      if(cancelled) return;
      if(techData) setTech(techData);
      if(newsData) setNews(newsData);
      if(chipsData) setChips(chipsData);
      setPhase("AI 深度分析中...");
      await sleep(500);
      const techSection=techData?`\n【技術指標】\n- MA5：${techData.ma5??"-"} MA20：${techData.ma20??"-"}\n- RSI(14)：${techData.rsi??"-"} 量比：${techData.volRatio??"-"}x\n- 趨勢：${techData.trend??"-"}`:"";
      const chipsSection=chipsData?.chips?`\n【籌碼面】\n- 外資：${chipsData.chips.foreign!=null?(chipsData.chips.foreign>0?"+":"")+chipsData.chips.foreign.toLocaleString()+"張":"-"}\n- 投信：${chipsData.chips.trust!=null?(chipsData.chips.trust>0?"+":"")+chipsData.chips.trust.toLocaleString()+"張":"-"}\n- 三大合計：${chipsData.chips.totalNet!=null?(chipsData.chips.totalNet>0?"+":"")+chipsData.chips.totalNet.toLocaleString()+"張":"-"}`:"";
      const valuationSection=chipsData?.valuation?`\n【估值】PE：${chipsData.valuation.per??"-"} PB：${chipsData.valuation.pbr??"-"} 殖利率：${chipsData.valuation.dividendYield??"-"}%`:"";
      const newsSection=newsData?.length?`\n【最新新聞】\n${newsData.slice(0,3).map(n=>`- ${n.title}`).join("\n")}`:"";
      const prompt=`你是頂尖股票分析師，針對「${stock.name}（${stock.ticker}）」做詳細分析（繁體中文，300字內）。\n【基本資料】現價：${sym}${stock.price} 今日：${stock.pct>0?"+":""}${stock.pct}% 區間：${sym}${stock.low}–${sym}${stock.high}${techSection}${chipsSection}${valuationSection}${newsSection}\n\n請依格式輸出（每項50-80字）：\n【技術面分析】\n【籌碼面分析】\n【基本面分析】\n【風險提示】\n【操作建議】含支撐壓力價位`;
      try{
        const result=await callAI(prompt);
        if(!cancelled) setText(result);
      }catch{if(!cancelled) setText("⚠️ 分析暫時無法使用，請稍後重試");}
      if(!cancelled) setLoading(false);
    })();
    return()=>{cancelled=true;};
  },[]);
  const up=stock.pct>=0,col=up?C.green:C.red,sym=stock.currency==="TWD"?"NT$":"$";
  const vi=tech?.volRatio ? volInfo(tech.volRatio) : null;
  return(
    <div style={{position:"fixed",inset:0,zIndex:100,display:"flex",flexDirection:"column",justifyContent:"flex-end"}}>
      <div onClick={onClose} style={{flex:1,background:"rgba(8,11,18,0.85)",backdropFilter:"blur(4px)"}}/>
      <div style={{background:C.surface,borderRadius:"24px 24px 0 0",padding:"24px 20px 48px",border:`1px solid ${C.border}`,borderBottom:"none",maxHeight:"90vh",overflowY:"auto"}}>
        <div style={{width:40,height:4,borderRadius:99,background:C.dim,margin:"0 auto 20px"}}/>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div><div style={{fontSize:20,fontWeight:900,color:C.text}}>{stock.name}</div><div style={{fontSize:12,color:C.sub,fontFamily:C.mono}}>{stock.ticker}</div></div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:22,fontWeight:900,color:C.text,fontFamily:C.mono}}>{sym}{stock.price.toLocaleString()}</div>
            <div style={{fontSize:13,color:col,fontWeight:700}}>{up?"▲":"▼"} {Math.abs(stock.pct)}%</div>
          </div>
        </div>
        {tech&&(
          <div style={{marginBottom:14}}>
            <div style={{fontSize:11,color:C.sub,marginBottom:8}}>📈 技術指標</div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {tech.ma5&&<Badge label="MA5" value={tech.ma5} color={tech.ma5>tech.ma20?C.green:C.red}/>}
              {tech.ma20&&<Badge label="MA20" value={tech.ma20}/>}
              {tech.rsi&&<Badge label="RSI14" value={tech.rsi} color={tech.rsi>70?C.red:tech.rsi<30?C.green:C.sub}/>}
              {tech.volRatio&&vi&&(
                <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,padding:"4px 8px",textAlign:"center"}}>
                  <div style={{fontSize:9,color:C.sub,marginBottom:1}}>量比 {tech.volRatio}x</div>
                  <div style={{fontSize:11,fontWeight:800,color:vi.color,fontFamily:C.mono}}>{vi.label}</div>
                </div>
              )}
              {tech.trend&&<Badge label="趨勢" value={tech.trend} color={tech.trend.includes("多")?C.green:tech.trend.includes("空")?C.red:C.sub}/>}
              {tech.week52High&&<Badge label="52W高" value={tech.week52High}/>}
              {tech.week52Low&&<Badge label="52W低" value={tech.week52Low}/>}
            </div>
          </div>
        )}
        <ChipsSection chips={chips}/>
        {news.length>0&&(
          <div style={{marginBottom:14}}>
            <div style={{fontSize:11,color:C.sub,marginBottom:6}}>📰 最新新聞</div>
            {news.slice(0,3).map((n,i)=>(
              <div key={i} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:"8px 10px",marginBottom:6}}>
                <div style={{fontSize:12,color:C.text,lineHeight:1.5}}>{n.title}</div>
                <div style={{fontSize:10,color:C.sub,marginTop:3}}>{n.source}</div>
              </div>
            ))}
          </div>
        )}
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:16,minHeight:120}}>
          <div style={{fontSize:11,color:C.sub,marginBottom:8}}>✦ AI 深度分析報告</div>
          {loading&&!text&&(<div><div style={{display:"flex",gap:4,marginBottom:8}}>{[0,1,2].map(i=><div key={i} style={{width:6,height:6,borderRadius:"50%",background:C.green,animation:`pulse 1s ${i*.2}s infinite ease-in-out`}}/>)}</div><div style={{fontSize:12,color:C.sub}}>{phase}</div></div>)}
          <div style={{fontSize:14,color:C.text,lineHeight:2,whiteSpace:"pre-wrap"}}>{text}</div>
        </div>
        <button onClick={()=>setDeepOpen(true)} style={{width:"100%",marginTop:14,padding:14,borderRadius:14,border:`1px solid ${C.goldBd}`,background:C.goldBg,color:C.gold,fontWeight:800,fontSize:14,cursor:"pointer"}}>
          ✦ 深度研究報告（AI + 財務數據）
        </button>
        <button onClick={onClose} style={{width:"100%",marginTop:8,padding:14,borderRadius:14,background:C.dim,border:"none",color:C.sub,fontWeight:700,fontSize:14,cursor:"pointer"}}>關閉</button>
        {deepOpen&&<DeepAnalysisModal stock={stock} tech={tech} chips={chips} onClose={()=>setDeepOpen(false)}/>}

        <button onClick={onClose} style={{width:"100%",marginTop:14,padding:14,borderRadius:14,background:C.dim,border:"none",color:C.sub,fontWeight:700,fontSize:14,cursor:"pointer"}}>關閉</button>
      </div>
    </div>
  );
}

// ── UndervaluedDetailModal ────────────────────────────────────────────────────
function UndervaluedDetailModal({s, children}){
  const[open,setOpen]=useState(false);
  const[text,setText]=useState("");
  const[loading,setLoading]=useState(false);
  const analyze=async()=>{
    if(text) return;
    setLoading(true);
    const prompt=`你是價值投資分析師，針對「${s.name}（${s.ticker}）」給出詳細低估分析（繁體中文，200字內）。
低估理由：${s.reason}
上漲潛力：${s.potential}
主要風險：${s.risk}

請依格式輸出：
【低估原因詳析】深入說明為何被低估
【催化劑】何種條件會觸發股價回升
【目標價位】合理估值區間
【風險控管】停損與注意事項`;
    try{const result=await callAI(prompt);setText(result);}catch{setText("⚠️ 分析暫時無法使用");}
    setLoading(false);
  };
  return(
    <>
      <div onClick={()=>{setOpen(true);analyze();}}>{children}</div>
      {open&&(
        <div style={{position:"fixed",inset:0,zIndex:200,display:"flex",flexDirection:"column",justifyContent:"flex-end"}}>
          <div onClick={()=>setOpen(false)} style={{flex:1,background:"rgba(8,11,18,0.85)",backdropFilter:"blur(4px)"}}/>
          <div style={{background:C.surface,borderRadius:"24px 24px 0 0",padding:"24px 20px 48px",border:`1px solid ${C.border}`,borderBottom:"none",maxHeight:"80vh",overflowY:"auto"}}>
            <div style={{width:40,height:4,borderRadius:99,background:C.dim,margin:"0 auto 20px"}}/>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <div><div style={{fontSize:20,fontWeight:900,color:C.text}}>{s.name}</div><div style={{fontSize:12,color:C.sub,fontFamily:C.mono}}>{s.ticker}</div></div>
              <div style={{background:C.purpleBg,border:`1px solid ${C.purpleBd}`,borderRadius:10,padding:"6px 12px"}}>
                <div style={{fontSize:13,fontWeight:800,color:C.purple}}>💎 潛力低估</div>
              </div>
            </div>
            <div style={{display:"flex",gap:6,marginBottom:14}}>
              <div style={{flex:1,background:C.greenBg,borderRadius:8,padding:"8px 10px"}}><div style={{fontSize:10,color:C.sub,marginBottom:2}}>上漲潛力</div><div style={{fontSize:12,color:C.green}}>{s.potential}</div></div>
              <div style={{flex:1,background:C.redBg,borderRadius:8,padding:"8px 10px"}}><div style={{fontSize:10,color:C.sub,marginBottom:2}}>主要風險</div><div style={{fontSize:12,color:C.red}}>{s.risk}</div></div>
            </div>
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:16,minHeight:100}}>
              <div style={{fontSize:11,color:C.sub,marginBottom:8}}>✦ AI 詳細分析</div>
              {loading&&<div style={{display:"flex",gap:4,padding:"8px 0"}}>{[0,1,2].map(i=><div key={i} style={{width:6,height:6,borderRadius:"50%",background:C.purple,animation:`pulse 1s ${i*.2}s infinite ease-in-out`}}/>)}</div>}
              <div style={{fontSize:14,color:C.text,lineHeight:1.9,whiteSpace:"pre-wrap"}}>{text}</div>
            </div>
            <button onClick={()=>setOpen(false)} style={{width:"100%",marginTop:14,padding:14,borderRadius:14,background:C.dim,border:"none",color:C.sub,fontWeight:700,fontSize:14,cursor:"pointer"}}>關閉</button>
          </div>
        </div>
      )}
    </>
  );
}

// ── UndervaluedSection ────────────────────────────────────────────────────────
function UndervaluedSection({watchTickers}){
  const[result,setResult]=useState(null);
  const[loading,setLoading]=useState(false);
  const[phase,setPhase]=useState("");
  const analyze=async()=>{
    setLoading(true);setResult(null);
    const pool=UNDERVALUED_POOL.filter(t=>!watchTickers.includes(t));
    const sample=pool.sort(()=>Math.random()-0.5).slice(0,15);
    setPhase("抓取候選股報價...");
    const quotes=await fetchSectorBatch(sample);
    setPhase("抓取估值資料...");
    const valuations=await Promise.all(sample.map(t=>fetchChips(t)));
    setPhase("AI 篩選低估股...");
    await sleep(500);
    const details=sample.map((t,i)=>{
      const q=quotes[t];const v=valuations[i]?.valuation;
      if(!q) return null;
      return `${t} ${TW_NAMES[t]||t} 今日${q.pct>0?"+":""}${q.pct}% 現價NT$${q.price}`+(v?` PE:${v.per??"-"} PB:${v.pbr??"-"} 殖利率:${v.dividendYield??"-"}%`:"");
    }).filter(Boolean).join("\n");
    const prompt=`你是價值投資分析師。根據以下台股資料，找出3支目前可能被市場低估、具長期投資價值的個股（繁體中文）。判斷標準：低本益比、低淨值比、高殖利率、近期股價疲弱但基本面穩健。只回傳 JSON：{"stocks":[{"ticker":"","name":"","reason":"低估理由30字","potential":"上漲潛力說明20字","risk":"主要風險15字"}]}純 JSON。\n候選股：\n${details}`;
    try{
      const text=await callAI(prompt);
      const parsed=JSON.parse(text.replace(/```json|```/g,"").trim());
      setResult(parsed.stocks||[]);
    }catch{setResult([]);}
    setLoading(false);setPhase("");
  };
  return(
    <div style={{marginBottom:24}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
        <div style={{width:3,height:18,borderRadius:99,background:C.purple}}/>
        <span style={{fontSize:14,fontWeight:800,color:C.purple}}>潛力低估股</span>
        <div style={{flex:1,height:1,background:C.purpleBd}}/>
        <span style={{fontSize:10,color:C.sub}}>AI 從市場篩選 3 檔</span>
      </div>
      <button onClick={analyze} disabled={loading} style={{width:"100%",padding:"12px 0",borderRadius:14,border:`1px solid ${C.purpleBd}`,background:loading?C.dim:C.purpleBg,color:loading?C.sub:C.purple,fontWeight:800,fontSize:14,cursor:loading?"default":"pointer",marginBottom:12,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
        {loading?<><div style={{width:14,height:14,border:`2px solid ${C.sub}`,borderTopColor:"transparent",borderRadius:"50%",animation:"spin .8s linear infinite"}}/> {phase}</>:result?"↻ 重新篩選":"💎 AI 篩選低估股（含估值）"}
      </button>
      {result&&result.length>0&&result.map((s,i)=>(
        <div key={s.ticker||i} style={{background:C.card,border:`1px solid ${C.purpleBd}`,borderRadius:16,padding:"14px",marginBottom:10}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <div><div style={{fontSize:15,fontWeight:800,color:C.text}}>{s.name}</div><div style={{fontSize:10,color:C.sub,fontFamily:C.mono}}>{s.ticker}</div></div>
            <div style={{background:C.purpleBg,border:`1px solid ${C.purpleBd}`,borderRadius:8,padding:"4px 10px",fontSize:11,color:C.purple,fontWeight:700}}>#{i+1}</div>
          </div>
          <UndervaluedDetailModal s={s}>
            <div style={{background:C.purpleBg,borderRadius:10,padding:"8px 10px",marginBottom:6,cursor:"pointer"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:2}}>
                <div style={{fontSize:11,color:C.purple}}>💎 低估理由</div>
                <div style={{fontSize:10,color:C.purple}}>點擊看詳細分析 ›</div>
              </div>
              <div style={{fontSize:12,color:C.text,lineHeight:1.6}}>{s.reason}</div>
            </div>
          </UndervaluedDetailModal>
          <div style={{display:"flex",gap:6}}>
            <div style={{flex:1,background:C.greenBg,borderRadius:8,padding:"6px 8px"}}><div style={{fontSize:10,color:C.sub,marginBottom:1}}>上漲潛力</div><div style={{fontSize:11,color:C.green}}>{s.potential}</div></div>
            <div style={{flex:1,background:C.redBg,borderRadius:8,padding:"6px 8px"}}><div style={{fontSize:10,color:C.sub,marginBottom:1}}>主要風險</div><div style={{fontSize:11,color:C.red}}>{s.risk}</div></div>
          </div>
        </div>
      ))}
      {result&&result.length===0&&<div style={{fontSize:13,color:C.sub,textAlign:"center",padding:"12px 0"}}>⚠️ 篩選失敗，請重試</div>}
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App(){
  const[tab,setTab]=useState("watch");
  const[tickers,setTickers]=useState(()=>loadWatchlist());
  const[stocks,setStocks]=useState({});
  const[fetching,setFetching]=useState(false);
  const[modal,setModal]=useState(null);
  const[addOpen,setAddOpen]=useState(false);
  const[editing,setEditing]=useState(false);
  const[lastFetch,setLastFetch]=useState(null);
  const[autoRefresh,setAutoRefresh]=useState(false);
  const[refreshInterval,setRefreshInterval]=useState(30);
  const[showIntervalPicker,setShowIntervalPicker]=useState(false);
  const[recs,setRecs]=useState(null);
  const[recsLoad,setRecsLoad]=useState(false);
  const[recsPhase,setRecsPhase]=useState("");
  const[marketRecs,setMarketRecs]=useState(null);
  const[marketLoad,setMarketLoad]=useState(false);
  const[marketPhase,setMarketPhase]=useState("");
  const[sectors,setSectors]=useState([]);
  const[sectorLoading,setSectorLoading]=useState(false);
  const[sectorLastUpdate,setSectorLastUpdate]=useState(null);
  const[sectorAnalysis,setSectorAnalysis]=useState({});
  const[sectorAnalyzing,setSectorAnalyzing]=useState({});

  const refresh=useCallback(async(list)=>{
    if(!list.length) return;
    setFetching(true);
    const results=await Promise.all(list.map(fetchQuote));
    const map={};results.forEach((d,i)=>{if(d)map[list[i]]=d;});
    setStocks(map);setFetching(false);setLastFetch(new Date());
  },[]);

  useEffect(()=>{refresh(tickers);},[tickers]);
  useEffect(()=>{
    if(!autoRefresh) return;
    const id=setInterval(()=>refresh(tickers),refreshInterval*1000);
    return()=>clearInterval(id);
  },[autoRefresh,refreshInterval,tickers]);

  const addStock=useCallback((ticker,data)=>{
    setTickers(prev=>{const next=[...prev,ticker];saveWatchlist(next);return next;});
    setStocks(prev=>({...prev,[ticker]:data}));
  },[]);
  const removeStock=useCallback((ticker)=>{
    setTickers(prev=>{const next=prev.filter(t=>t!==ticker);saveWatchlist(next);return next;});
    setStocks(prev=>{const n={...prev};delete n[ticker];return n;});
  },[]);

  const loadSectors=async()=>{
    setSectorLoading(true);
    try{
      const data=await fetchDynamicSectors();
      if(data?.sectors){setSectors(data.sectors);setSectorLastUpdate(new Date());}
    }catch(e){console.error("loadSectors",e);}
    finally{setSectorLoading(false);}
  };
  useEffect(()=>{if(tab==="sectors"&&sectors.length===0) loadSectors();},[tab]);

  const analyzeSector=async(sector)=>{
    const list=sector.stocks||[];
    if(!list.length) return;
    setSectorAnalyzing(prev=>({...prev,[sector.id]:true}));
    const techR=await Promise.all(list.map(s=>fetchTechnicals(s.ticker)));
    const newsR=await Promise.all(list.map(s=>fetchNews(s.name,s.ticker)));
    const chipsR=await Promise.all(list.map(s=>fetchChips(s.ticker)));
    await sleep(800);
    const details=list.map((s,i)=>{
      const t=techR[i],n=newsR[i],c=chipsR[i];
      return `${s.name}(${s.ticker}) 今日${s.pct>0?"+":""}${s.pct}% 現價NT$${s.price}`+
        (t?` MA5:${t.ma5} RSI:${t.rsi} 趨勢:${t.trend} 量比:${t.volRatio}x`:"") +
        (c?.chips?` 外資:${c.chips.foreign!=null?(c.chips.foreign>0?"+":"")+c.chips.foreign+"張":"-"}`:"")+
        (n?.length?` 新聞:${n[0]?.title?.slice(0,20)}`:"");
    }).join("\n");
    const prompt=`你是股票分析師。請分析台股「${sector.name}」類股今日前3大漲幅標的（繁體中文，200字內）。結合技術面、籌碼面與新聞，說明：①類股整體動能 ②籌碼面動向 ③最值得關注的標的 ④短線操作建議。\n${details}`;
    try{
      const text=await callAI(prompt);
      setSectorAnalysis(prev=>({...prev,[sector.id]:text}));
    }catch{setSectorAnalysis(prev=>({...prev,[sector.id]:"⚠️ 分析失敗，請重試"}));}
    setSectorAnalyzing(prev=>({...prev,[sector.id]:false}));
  };

  const buildDetails=(list,techR,newsR,chipsR)=>
    list.map((s,i)=>{
      const t=techR?.[i],n=newsR?.[i],c=chipsR?.[i];
      const sym=s.currency==="TWD"?"NT$":"$";
      return `${s.ticker} ${s.name} | 現價${sym}${s.price} 今日${s.pct>0?"+":""}${s.pct}%`+
        (t?` | MA5:${t.ma5} RSI:${t.rsi} 趨勢:${t.trend} 量比:${t.volRatio}x`:"")+
        (c?.chips?` | 外資:${c.chips.foreign!=null?(c.chips.foreign>0?"+":"")+c.chips.foreign+"張":"-"}`:"")+
        (c?.valuation?` | PE:${c.valuation.per??"-"} 殖利率:${c.valuation.dividendYield??"-"}%`:"")+
        (n?.length?` | 新聞:${n[0]?.title?.slice(0,20)}`:"");
    }).join("\n");

  const generateRecs=async()=>{
    setRecsLoad(true);
    const list=tickers.map(t=>stocks[t]).filter(Boolean);
    if(!list.length){setRecsLoad(false);return;}
    setRecsPhase("抓取技術指標...");
    const techR=await Promise.all(list.map(s=>fetchTechnicals(s.ticker)));
    setRecsPhase("抓取新聞...");
    const newsR=await Promise.all(list.map(s=>fetchNews(s.name,s.ticker)));
    setRecsPhase("抓取籌碼資料...");
    const chipsR=await Promise.all(list.map(s=>fetchChips(s.ticker)));
    setRecsPhase("AI 分析中...");
    await sleep(800);
    const details=buildDetails(list,techR,newsR,chipsR);
    const prompt=`你是專業股票分析師。根據以下自選股資料（含技術面、籌碼面、新聞），給出買入與減碼建議（繁體中文）。
重要：pct 必須直接使用資料中提供的今日漲跌幅數字，不可自行估算或改變正負號。
只回傳 JSON：{"buy":[{"ticker":"","name":"","pct":0,"conf":0,"reason":"30字內，含技術/籌碼/新聞依據","tech":{"ma5":0,"ma20":0,"rsi":0,"trend":"","volRatio":0}}],"sell":[...]}
純 JSON。\n\n${details}`;
    try{
      const text=await callAI(prompt);
      // 嘗試從回應中抽取 JSON
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if(!jsonMatch) throw new Error("No JSON found");
      const parsed=JSON.parse(jsonMatch[0]);
      const text=await callAI(prompt);
      console.log("AI response:", text);
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      console.log("JSON match:", jsonMatch?.[0]?.slice(0,200));
      if(!jsonMatch) throw new Error("No JSON found");
      const parsed=JSON.parse(jsonMatch[0]);

      const techMap={};list.forEach((s,i)=>{techMap[s.ticker]=techR[i];});
      const enrich=arr=>arr.map(r=>({
        ...r,
        pct:   stocks[r.ticker]?.pct   ?? r.pct,
        price: stocks[r.ticker]?.price ?? null,
        change:stocks[r.ticker]?.change?? null,
        tech:  techMap[r.ticker] || r.tech || null,
      }));
      setRecs({buy:enrich(parsed.buy||[]),sell:enrich(parsed.sell||[])});
    }catch{setRecs({buy:[],sell:[],error:true});}
    setRecsLoad(false);setRecsPhase("");
  };

  const generateMarketRecs=async()=>{
    setMarketLoad(true);
    setMarketPhase("抓取市場熱門標的...");
    const mTickers=await fetchMarketTickers(tickers);
    setMarketPhase("抓取股價資料...");
    const quoteR=await Promise.all(mTickers.slice(0,6).map(fetchQuote));
    const validStocks=quoteR.filter(Boolean);
    if(!validStocks.length){setMarketLoad(false);return;}
    setMarketPhase("抓取技術指標...");
    const techR=await Promise.all(validStocks.map(s=>fetchTechnicals(s.ticker)));
    setMarketPhase("抓取新聞...");
    const newsR=await Promise.all(validStocks.map(s=>fetchNews(s.name,s.ticker)));
    setMarketPhase("抓取籌碼資料...");
    const chipsR=await Promise.all(validStocks.map(s=>fetchChips(s.ticker)));
    setMarketPhase("AI 分析中...");
    await sleep(1000);
    const details=buildDetails(validStocks,techR,newsR,chipsR);
    const prompt=`你是專業股票分析師。根據以下市場熱門台股（含技術面、籌碼面、新聞），給出買入與減碼建議（繁體中文）。
重要：pct 必須直接使用資料中提供的今日漲跌幅數字，不可自行估算或改變正負號。
只回傳 JSON：{"buy":[{"ticker":"","name":"","pct":0,"conf":0,"reason":"30字內","tech":{"ma5":0,"ma20":0,"rsi":0,"trend":"","volRatio":0}}],"sell":[...]}
純 JSON。\n\n${details}`;
    try{
      const text=await callAI(prompt);
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if(!jsonMatch) throw new Error("No JSON found");
      const parsed=JSON.parse(jsonMatch[0]);

      const techMap={};validStocks.forEach((s,i)=>{techMap[s.ticker]=techR[i];});
      const stockDataMap={};validStocks.forEach(s=>{stockDataMap[s.ticker]=s;});
      const enrich=arr=>arr.map(r=>({
        ...r,
        price: stockDataMap[r.ticker]?.price ?? null,
        change:stockDataMap[r.ticker]?.change?? null,
        tech:  techMap[r.ticker] || r.tech || null,
      }));
      setMarketRecs({buy:enrich(parsed.buy||[]),sell:enrich(parsed.sell||[])});
    }catch{setMarketRecs({buy:[],sell:[],error:true});}
    setMarketLoad(false);setMarketPhase("");
  };

  const watchData=tickers.map(t=>stocks[t]).filter(Boolean);
  const upCount=watchData.filter(s=>s.pct>=0).length;
  const downCount=watchData.filter(s=>s.pct<0).length;

  return(
    <div style={{background:C.bg,minHeight:"100vh",maxWidth:430,margin:"0 auto",fontFamily:C.sans,color:C.text,overflowX:"hidden"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900&family=Space+Mono:wght@400;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}::-webkit-scrollbar{display:none}
        @keyframes pulse{0%,100%{opacity:.2;transform:scale(.7)}50%{opacity:1;transform:scale(1)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        input::placeholder{color:#3a4259}
      `}</style>
      <div style={{height:48}}/>

      {/* Header */}
      <div style={{padding:"0 20px 16px",display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
        <div>
          <div style={{fontSize:11,color:C.sub,letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>StockMin</div>
          <div style={{fontSize:26,fontWeight:900,color:C.text,lineHeight:1}}>{tab==="ai"?"AI 推薦":tab==="sectors"?"類股分析":"自選股"}</div>
          {lastFetch&&<div style={{fontSize:10,color:C.sub,marginTop:4}}>更新 {lastFetch.toLocaleTimeString("zh-TW",{hour:"2-digit",minute:"2-digit"})}{autoRefresh&&` · 每${refreshInterval}秒刷新`}</div>}
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          {fetching&&<div style={{width:16,height:16,border:`2px solid ${C.green}`,borderTopColor:"transparent",borderRadius:"50%",animation:"spin .8s linear infinite"}}/>}
          <div style={{background:C.greenBg,border:`1px solid ${C.greenBd}`,borderRadius:20,padding:"5px 12px",fontSize:11,color:C.green,fontWeight:700,display:"flex",alignItems:"center",gap:5}}>
            <div style={{width:6,height:6,borderRadius:"50%",background:C.green,boxShadow:`0 0 6px ${C.green}`}}/>即時
          </div>
        </div>
      </div>

      {/* Tab */}
      <div style={{margin:"0 20px 20px",background:C.card,borderRadius:14,padding:4,display:"flex",border:`1px solid ${C.border}`}}>
        {[{id:"ai",label:"✦ AI"},{id:"sectors",label:"📊 類股"},{id:"watch",label:"☆ 自選"}].map(t=>(
          <button key={t.id} onClick={()=>{setTab(t.id);setEditing(false);}} style={{flex:1,padding:"10px 0",borderRadius:11,border:"none",background:tab===t.id?C.green:"transparent",color:tab===t.id?C.bg:C.sub,fontWeight:800,fontSize:13,cursor:"pointer",transition:"all .2s",fontFamily:C.sans}}>{t.label}</button>
        ))}
      </div>

      <div style={{padding:"0 16px 100px"}}>

        {/* AI 推薦 */}
        {tab==="ai"&&(
          <>
            <div style={{marginBottom:24}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
                <div style={{width:3,height:18,borderRadius:99,background:C.gold}}/>
                <span style={{fontSize:14,fontWeight:800,color:C.gold}}>市場熱門</span>
                <div style={{flex:1,height:1,background:C.goldBd}}/>
                <span style={{fontSize:10,color:C.sub}}>動態抓取 · 含籌碼</span>
              </div>
              <button onClick={generateMarketRecs} disabled={marketLoad} style={{width:"100%",padding:"12px 0",borderRadius:14,border:`1px solid ${C.goldBd}`,background:marketLoad?C.dim:C.goldBg,color:marketLoad?C.sub:C.gold,fontWeight:800,fontSize:14,cursor:marketLoad?"default":"pointer",marginBottom:12,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                {marketLoad?<><div style={{width:14,height:14,border:`2px solid ${C.sub}`,borderTopColor:"transparent",borderRadius:"50%",animation:"spin .8s linear infinite"}}/> {marketPhase}</>:marketRecs?"↻ 重新分析":"✦ 分析市場熱門股"}
              </button>
              {marketRecs&&!marketLoad&&(
                <>
                  {marketRecs.error&&<div style={{color:C.gold,fontSize:13,marginBottom:12}}>⚠️ 分析失敗，請重試</div>}
                  {marketRecs.buy?.length>0&&<div style={{marginBottom:16}}><div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}><div style={{width:3,height:14,borderRadius:99,background:C.green}}/><span style={{fontSize:13,fontWeight:800,color:C.green}}>建議買入</span><div style={{flex:1,height:1,background:C.greenBd}}/><span style={{fontSize:11,color:C.sub}}>{marketRecs.buy.length} 檔</span></div>{marketRecs.buy.map(r=><RecCard key={r.ticker} r={r} type="buy"/>)}</div>}
                  {marketRecs.sell?.length>0&&<div style={{marginBottom:12}}><div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}><div style={{width:3,height:14,borderRadius:99,background:C.red}}/><span style={{fontSize:13,fontWeight:800,color:C.red}}>建議減碼</span><div style={{flex:1,height:1,background:C.redBd}}/><span style={{fontSize:11,color:C.sub}}>{marketRecs.sell.length} 檔</span></div>{marketRecs.sell.map(r=><RecCard key={r.ticker} r={r} type="sell"/>)}</div>}
                </>
              )}
            </div>
            <div style={{height:1,background:C.border,marginBottom:24}}/>
            <UndervaluedSection watchTickers={tickers}/>
            <div style={{height:1,background:C.border,marginBottom:24}}/>
            <div>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
                <div style={{width:3,height:18,borderRadius:99,background:C.green}}/>
                <span style={{fontSize:14,fontWeight:800,color:C.text}}>我的自選股</span>
                <div style={{flex:1,height:1,background:C.border}}/>
                <span style={{fontSize:10,color:C.sub}}>{watchData.length} 檔</span>
              </div>
              <button onClick={generateRecs} disabled={recsLoad||!watchData.length} style={{width:"100%",padding:"12px 0",borderRadius:14,border:"none",background:recsLoad?C.dim:C.green,color:recsLoad?C.sub:C.bg,fontWeight:800,fontSize:14,cursor:recsLoad?"default":"pointer",marginBottom:12,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                {recsLoad?<><div style={{width:14,height:14,border:`2px solid ${C.sub}`,borderTopColor:"transparent",borderRadius:"50%",animation:"spin .8s linear infinite"}}/> {recsPhase}</>:recs?"↻ 重新分析":"✦ 分析我的自選股"}
              </button>
              {!recs&&!recsLoad&&<div style={{background:C.card,border:`1px dashed ${C.border}`,borderRadius:16,padding:24,textAlign:"center"}}><div style={{fontSize:13,color:C.sub,lineHeight:1.8}}>點擊上方按鈕<br/>AI 結合技術面+籌碼面+新聞給出建議</div></div>}
              {recs&&!recsLoad&&(
                <>
                  {recs.error&&<div style={{color:C.gold,fontSize:13,marginBottom:12}}>⚠️ 分析失敗，請重試</div>}
                  {recs.buy?.length>0&&<div style={{marginBottom:16}}><div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}><div style={{width:3,height:14,borderRadius:99,background:C.green}}/><span style={{fontSize:13,fontWeight:800,color:C.green}}>建議買入</span><div style={{flex:1,height:1,background:C.greenBd}}/><span style={{fontSize:11,color:C.sub}}>{recs.buy.length} 檔</span></div>{recs.buy.map(r=><RecCard key={r.ticker} r={r} type="buy"/>)}</div>}
                  {recs.sell?.length>0&&<div style={{marginBottom:12}}><div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}><div style={{width:3,height:14,borderRadius:99,background:C.red}}/><span style={{fontSize:13,fontWeight:800,color:C.red}}>建議減碼</span><div style={{flex:1,height:1,background:C.redBd}}/><span style={{fontSize:11,color:C.sub}}>{recs.sell.length} 檔</span></div>{recs.sell.map(r=><RecCard key={r.ticker} r={r} type="sell"/>)}</div>}
                </>
              )}
            </div>
            <div style={{background:C.goldBg,border:`1px solid rgba(255,181,71,0.2)`,borderRadius:12,padding:"10px 14px",marginTop:16}}>
              <div style={{fontSize:11,color:C.gold}}>⚠️ AI 建議僅供參考，投資請自行評估風險</div>
            </div>
          </>
        )}

        {/* 類股分析 */}
        {tab==="sectors"&&(
          <>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <div>
                <div style={{fontSize:13,color:C.sub}}>TWSE 13 類 · 即時漲幅前3大</div>
                {sectorLastUpdate&&<div style={{fontSize:10,color:C.dim,marginTop:2}}>資料時間：{sectorLastUpdate.toLocaleTimeString("zh-TW",{hour:"2-digit",minute:"2-digit"})}</div>}
              </div>
              <button onClick={loadSectors} disabled={sectorLoading} style={{padding:"6px 14px",borderRadius:99,border:`1px solid ${C.border}`,background:"transparent",color:C.sub,fontSize:12,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
                {sectorLoading?<><div style={{width:12,height:12,border:`2px solid ${C.sub}`,borderTopColor:"transparent",borderRadius:"50%",animation:"spin .8s linear infinite"}}/> 載入中</>:"↻ 更新"}
              </button>
            </div>
            {sectorLoading&&!sectors.length&&(
              <div style={{textAlign:"center",padding:"40px 0",color:C.sub}}>
                <div style={{width:24,height:24,border:`2px solid ${C.blue}`,borderTopColor:"transparent",borderRadius:"50%",animation:"spin .8s linear infinite",margin:"0 auto 12px"}}/>
                <div>從 TWSE 抓取全市場資料中...</div>
                <div style={{fontSize:11,marginTop:6}}>首次載入約需 10-15 秒</div>
              </div>
            )}
            {sectors.map(sector=>(
              <SectorCard key={sector.id} sector={sector} analysis={sectorAnalysis[sector.id]||null} loading={sectorAnalyzing[sector.id]||false} onAnalyze={()=>analyzeSector(sector)}/>
            ))}
          </>
        )}

        {/* 自選股（Grid 版）*/}
        {tab==="watch"&&(
          <>
            <div style={{display:"flex",gap:8,marginBottom:16}}>
              <div style={{flex:1,background:C.greenBg,border:`1px solid ${C.greenBd}`,borderRadius:12,padding:"10px 14px",textAlign:"center"}}>
                <div style={{fontSize:22,fontWeight:900,color:C.green}}>{upCount}</div>
                <div style={{fontSize:11,color:C.sub,marginTop:2}}>上漲</div>
              </div>
              <div style={{flex:1,background:C.redBg,border:`1px solid ${C.redBd}`,borderRadius:12,padding:"10px 14px",textAlign:"center"}}>
                <div style={{fontSize:22,fontWeight:900,color:C.red}}>{downCount}</div>
                <div style={{fontSize:11,color:C.sub,marginTop:2}}>下跌</div>
              </div>
              <div style={{flex:2,background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"10px 14px"}}>
                <div style={{fontSize:11,color:C.sub,marginBottom:6}}>整體比例</div>
                <div style={{height:6,borderRadius:99,background:C.dim,overflow:"hidden"}}>
                  {watchData.length>0&&<div style={{height:"100%",width:`${(upCount/watchData.length)*100}%`,background:`linear-gradient(90deg,${C.green},${C.greenBd})`,borderRadius:99,transition:"width .5s"}}/>}
                </div>
                <div style={{fontSize:10,color:C.sub,marginTop:4}}>{watchData.length} 檔追蹤</div>
              </div>
            </div>

            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <div style={{display:"flex",gap:6}}>
                <button onClick={()=>setEditing(e=>!e)} style={{padding:"6px 10px",borderRadius:99,border:`1px solid ${editing?C.red:C.border}`,background:editing?C.redBg:"transparent",color:editing?C.red:C.sub,fontSize:12,fontWeight:700,cursor:"pointer"}}>{editing?"完成":"✎ 編輯"}</button>
                <button onClick={()=>refresh(tickers)} style={{padding:"6px 10px",borderRadius:99,border:`1px solid ${C.border}`,background:"transparent",color:C.sub,fontSize:12,fontWeight:700,cursor:"pointer"}}>↻ 刷新</button>
                <button onClick={()=>autoRefresh?setAutoRefresh(false):setShowIntervalPicker(true)} style={{padding:"6px 10px",borderRadius:99,border:`1px solid ${autoRefresh?C.green:C.border}`,background:autoRefresh?C.greenBg:"transparent",color:autoRefresh?C.green:C.sub,fontSize:12,fontWeight:700,cursor:"pointer"}}>
                  {autoRefresh?`⏹ ${refreshInterval}s`:"⏱ 自動"}
                </button>
              </div>
              <button onClick={()=>setAddOpen(true)} style={{padding:"6px 10px",borderRadius:99,border:`1px solid ${C.greenBd}`,background:C.greenBg,color:C.green,fontSize:12,fontWeight:700,cursor:"pointer"}}>＋ 新增</button>
            </div>

            {fetching&&!watchData.length&&<div style={{textAlign:"center",padding:"40px 0",color:C.sub}}><div style={{width:24,height:24,border:`2px solid ${C.green}`,borderTopColor:"transparent",borderRadius:"50%",animation:"spin .8s linear infinite",margin:"0 auto 12px"}}/>載入中...</div>}
            {!fetching&&!watchData.length&&<div style={{textAlign:"center",padding:"40px 0"}}><div style={{fontSize:13,color:C.sub,marginBottom:16}}>自選股是空的</div><button onClick={()=>setAddOpen(true)} style={{padding:"10px 20px",borderRadius:12,border:"none",background:C.green,color:C.bg,fontWeight:700,fontSize:14,cursor:"pointer"}}>+ 新增第一檔</button></div>}

            {/* Grid 佈局：一排兩個 */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              {watchData.map(s=><WatchCard key={s.ticker} s={s} onTap={setModal} onRemove={removeStock} editing={editing}/>)}
            </div>
          </>
        )}
      </div>

      {/* Bottom Nav */}
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:430,background:C.surface,borderTop:`1px solid ${C.border}`,padding:"12px 20px 32px",display:"flex",justifyContent:"space-around",zIndex:50}}>
        {[{id:"ai",icon:"✦",label:"AI 推薦"},{id:"sectors",icon:"📊",label:"類股"},{id:"watch",icon:"☆",label:"自選股"}].map(t=>(
          <button key={t.id} onClick={()=>{setTab(t.id);setEditing(false);}} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,background:"transparent",border:"none",cursor:"pointer",padding:"2px 12px"}}>
            <span style={{fontSize:20,color:tab===t.id?C.green:C.dim}}>{t.icon}</span>
            <span style={{fontSize:10,fontWeight:700,color:tab===t.id?C.green:C.sub}}>{t.label}</span>
          </button>
        ))}
      </div>

      {/* 自動刷新選單 */}
      {showIntervalPicker&&(
        <div style={{position:"fixed",inset:0,zIndex:100,display:"flex",flexDirection:"column",justifyContent:"flex-end"}} onClick={()=>setShowIntervalPicker(false)}>
          <div style={{background:C.surface,borderRadius:"24px 24px 0 0",padding:"24px 20px 48px",border:`1px solid ${C.border}`,borderBottom:"none"}} onClick={e=>e.stopPropagation()}>
            <div style={{width:40,height:4,borderRadius:99,background:C.dim,margin:"0 auto 20px"}}/>
            <div style={{fontSize:16,fontWeight:800,color:C.text,marginBottom:16}}>自動刷新間隔</div>
            {[{sec:10,label:"10 秒"},{sec:30,label:"30 秒"},{sec:60,label:"1 分鐘"},{sec:120,label:"2 分鐘"},{sec:300,label:"5 分鐘"}].map(({sec,label})=>(
              <button key={sec} onClick={()=>{setRefreshInterval(sec);setAutoRefresh(true);setShowIntervalPicker(false);}} style={{width:"100%",padding:"14px 16px",borderRadius:12,border:`1px solid ${refreshInterval===sec&&autoRefresh?C.green:C.border}`,background:refreshInterval===sec&&autoRefresh?C.greenBg:C.card,color:refreshInterval===sec&&autoRefresh?C.green:C.text,fontWeight:700,fontSize:14,cursor:"pointer",marginBottom:8,textAlign:"left",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span>{label}</span>
                {refreshInterval===sec&&autoRefresh&&<span style={{fontSize:12,color:C.green}}>✓ 使用中</span>}
              </button>
            ))}
            <button onClick={()=>{setAutoRefresh(false);setShowIntervalPicker(false);}} style={{width:"100%",padding:"14px 16px",borderRadius:12,border:`1px solid ${C.redBd}`,background:C.redBg,color:C.red,fontWeight:700,fontSize:14,cursor:"pointer",marginTop:4}}>
              ⏹ 關閉自動刷新
            </button>
          </div>
        </div>
      )}

      {modal&&<AnalysisModal stock={modal} onClose={()=>setModal(null)}/>}
      {addOpen&&<AddSheet existing={tickers} onAdd={addStock} onClose={()=>setAddOpen(false)}/>}
    </div>
  );
}
