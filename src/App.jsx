// StockMin — src/App.jsx
// Real Yahoo Finance + News + Technicals + Anthropic AI + localStorage
import { useState, useEffect, useCallback } from "react";
import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts";

// ── Design Tokens ────────────────────────────────────────────────────────────
const C = {
  bg:"#080b12",surface:"#0d1120",card:"#111827",border:"#1c2540",
  green:"#ff3d6e",greenBg:"rgba(255,61,110,0.10)",greenBd:"rgba(255,61,110,0.25)",
  red:"#00e5a0",redBg:"rgba(0,229,160,0.10)",redBd:"rgba(0,229,160,0.25)",
  gold:"#ffb547",goldBg:"rgba(255,181,71,0.10)",goldBd:"rgba(255,181,71,0.25)",
  blue:"#60a5fa",blueBg:"rgba(96,165,250,0.10)",
  text:"#edf2ff",sub:"#8896b3",dim:"#1c2540",
  mono:"'Space Mono',monospace",sans:"'Outfit',sans-serif",
};

// ── 台股中文名稱對照表 ────────────────────────────────────────────────────────
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
};

const DEFAULT_TICKERS = ["2330.TW","2454.TW","1802.TW","2408.TW","2458.TW","3231.TW","8069.TW","AAPL","NVDA","TSLA"];

// ── Mock fallback ─────────────────────────────────────────────────────────────
function genMock(base,up){
  let v=base*0.96;
  return Array.from({length:24},()=>{v+=(Math.random()-(up?.42:.58))*base*.008;return{v:+v.toFixed(2)};}).concat([{v:base}]);
}
const MOCK_DATA = {
  "2330.TW":{name:"台積電",price:1045,pct:2.45,change:25,low:1018,high:1052,currency:"TWD"},
  "2454.TW":{name:"聯發科",price:1580,pct:2.59,change:40,low:1540,high:1595,currency:"TWD"},
  "AAPL":{name:"Apple",price:213,pct:1.48,change:3.1,low:209,high:215,currency:"USD"},
  "NVDA":{name:"NVIDIA",price:1087,pct:-1.36,change:-15,low:1060,high:1105,currency:"USD"},
  "TSLA":{name:"Tesla",price:249,pct:3.62,change:8.7,low:238,high:252,currency:"USD"},
};

// ── API Helpers ───────────────────────────────────────────────────────────────
async function fetchQuote(ticker) {
  try {
    const res = await fetch(`/api/quote?ticker=${encodeURIComponent(ticker)}`,{signal:AbortSignal.timeout(9000)});
    if(!res.ok) throw new Error("api error");
    const d = await res.json();
    if(!d.sparkline) d.sparkline = genMock(d.price, d.pct>=0);
    if(d && d.ticker && TW_NAMES[d.ticker]) d.name = TW_NAMES[d.ticker];
    return d;
  } catch {
    const m = MOCK_DATA[ticker];
    if(m) return {...m,ticker,sparkline:genMock(m.price,m.pct>=0),real:false};
    return null;
  }
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
    const d = await res.json();
    return d.news || [];
  } catch { return []; }
}

async function fetchMarketTickers(exclude=[]) {
  try {
    const res = await fetch(`/api/market?exclude=${exclude.join(",")}`,{signal:AbortSignal.timeout(8000)});
    if(!res.ok) throw new Error();
    const d = await res.json();
    return d.tickers || [];
  } catch {
    // fallback 固定清單
    const fallback = [
      "2330.TW","2454.TW","2317.TW","3711.TW","2308.TW",
      "2303.TW","2882.TW","2357.TW","2382.TW","2412.TW",
    ];
    return fallback.filter(t=>!exclude.includes(t)).slice(0,10);
  }
}

async function callAI(prompt) {
  const res = await fetch("/api/analyze",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({prompt}),
  });
  if(!res.ok) throw new Error("API error");
  const data = await res.json();
  return data.text || "";
}

// ── localStorage ──────────────────────────────────────────────────────────────
function loadWatchlist(){
  try{const s=localStorage.getItem("stockmin:watchlist");return s?JSON.parse(s):DEFAULT_TICKERS;}
  catch{return DEFAULT_TICKERS;}
}
function saveWatchlist(t){try{localStorage.setItem("stockmin:watchlist",JSON.stringify(t));}catch{}}

// ── Sparkline ─────────────────────────────────────────────────────────────────
function Spark({data,color}){
  return(
    <ResponsiveContainer width={64} height={32}>
      <LineChart data={data}>
        <YAxis domain={["auto","auto"]} hide/>
        <Line type="monotone" dataKey="v" stroke={color} strokeWidth={1.8} dot={false}/>
      </LineChart>
    </ResponsiveContainer>
  );
}

// ── TechBadge ─────────────────────────────────────────────────────────────────
function TechBadge({label,value,color}){
  return(
    <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,padding:"4px 8px",textAlign:"center"}}>
      <div style={{fontSize:9,color:C.sub,marginBottom:1}}>{label}</div>
      <div style={{fontSize:11,fontWeight:800,color:color||C.text,fontFamily:C.mono}}>{value}</div>
    </div>
  );
}

// ── WatchCard ─────────────────────────────────────────────────────────────────
function WatchCard({s,onTap,onRemove,editing}){
  const up=s.pct>=0,col=up?C.green:C.red,bg=up?C.greenBg:C.redBg,bd=up?C.greenBd:C.redBd;
  const sym=s.currency==="TWD"?"NT$":"$";
  return(
    <div style={{position:"relative",marginBottom:6}}>
      {editing&&(
        <button onClick={()=>onRemove(s.ticker)} style={{position:"absolute",top:-5,left:-5,zIndex:10,width:20,height:20,borderRadius:"50%",border:"none",background:C.red,color:"#fff",fontSize:14,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>−</button>
      )}
      <div onClick={()=>!editing&&onTap(s)} style={{background:C.card,border:`1px solid ${editing?C.dim:C.border}`,borderRadius:14,padding:"10px 14px",cursor:editing?"default":"pointer",display:"flex",alignItems:"center",gap:10}}>
        <div style={{width:72,flexShrink:0}}>
          <div style={{fontSize:13,fontWeight:800,color:C.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{s.name}</div>
          <div style={{fontSize:10,color:C.sub,fontFamily:C.mono,marginTop:1}}>{s.ticker.replace(".TW","")}</div>
        </div>
        <div style={{flex:1,minWidth:0}}>
          <Spark data={s.sparkline} color={col}/>
        </div>
        <div style={{textAlign:"right",flexShrink:0}}>
          <div style={{fontSize:14,fontWeight:900,color:C.text,fontFamily:C.mono}}>{sym}{s.price.toLocaleString()}</div>
          <div style={{background:bg,border:`1px solid ${bd}`,borderRadius:6,padding:"2px 7px",marginTop:3,display:"inline-flex",alignItems:"center",gap:3}}>
            <span style={{fontSize:11}}>{up?"▲":"▼"}</span>
            <span style={{fontSize:12,fontWeight:900,color:col,fontFamily:C.mono}}>{Math.abs(s.pct)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── RecCard ───────────────────────────────────────────────────────────────────
function RecCard({r,type}){
  const isBuy=type==="buy",col=isBuy?C.green:C.red,bg=isBuy?C.greenBg:C.redBg,bd=isBuy?C.greenBd:C.redBd;
  const up=r.pct>=0;
  return(
    <div style={{background:C.card,border:`1px solid ${bd}`,borderRadius:16,padding:"14px",marginBottom:10}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <div>
          <div style={{fontSize:15,fontWeight:800,color:C.text}}>{r.name}</div>
          <div style={{fontSize:10,color:C.sub,fontFamily:C.mono}}>{r.ticker}</div>
        </div>
        <div style={{position:"relative",width:44,height:44}}>
          <svg width="44" height="44" viewBox="0 0 44 44" style={{transform:"rotate(-90deg)"}}>
            <circle cx="22" cy="22" r="18" fill="none" stroke={C.dim} strokeWidth="3"/>
            <circle cx="22" cy="22" r="18" fill="none" stroke={col} strokeWidth="3"
              strokeDasharray={`${2*Math.PI*18*r.conf/100} ${2*Math.PI*18}`} strokeLinecap="round"/>
          </svg>
          <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:col,fontFamily:C.mono}}>{r.conf}%</div>
        </div>
      </div>
      <div style={{fontSize:12,color:up?C.green:C.red,fontWeight:700,marginBottom:8}}>{up?"▲":"▼"} {Math.abs(r.pct)}% 今日</div>
      {/* 技術指標 */}
      {r.tech&&(
        <div style={{display:"flex",gap:6,marginBottom:8,flexWrap:"wrap"}}>
          {r.tech.ma5&&<TechBadge label="MA5" value={r.tech.ma5} color={r.tech.ma5>r.tech.ma20?C.green:C.red}/>}
          {r.tech.ma20&&<TechBadge label="MA20" value={r.tech.ma20}/>}
          {r.tech.rsi&&<TechBadge label="RSI" value={r.tech.rsi} color={r.tech.rsi>70?C.red:r.tech.rsi<30?C.green:C.sub}/>}
          {r.tech.trend&&<TechBadge label="趨勢" value={r.tech.trend} color={r.tech.trend.includes("多")?C.green:r.tech.trend.includes("空")?C.red:C.sub}/>}
        </div>
      )}
      <div style={{background:bg,borderRadius:10,padding:"8px 10px"}}>
        <div style={{fontSize:11,color:C.sub,marginBottom:2}}>AI 理由</div>
        <div style={{fontSize:12,color:C.text,lineHeight:1.6}}>{r.reason}</div>
      </div>
    </div>
  );
}

// ── Add Sheet ─────────────────────────────────────────────────────────────────
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
          <input value={val} onChange={e=>{setVal(e.target.value.toUpperCase());setStatus("");}} onKeyDown={e=>e.key==="Enter"&&check()}
            placeholder="輸入代號，如 2330.TW 或 AAPL"
            style={{flex:1,padding:"12px 14px",borderRadius:12,border:`1px solid ${C.border}`,background:C.card,color:C.text,fontSize:14,outline:"none",fontFamily:C.mono}}/>
          <button onClick={check} disabled={checking} style={{padding:"12px 18px",borderRadius:12,border:"none",background:C.green,color:C.bg,fontWeight:800,fontSize:14,cursor:"pointer"}}>
            {checking?"...":"加入"}
          </button>
        </div>
        {status&&<div style={{fontSize:13,color:status.startsWith("✓")?C.green:status.startsWith("⚠")?C.gold:C.red,marginBottom:12}}>{status}</div>}
        <div style={{fontSize:12,color:C.sub,marginBottom:10}}>快速加入：</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
          {suggestions.slice(0,6).map(t=>(
            <button key={t} onClick={()=>{setVal(t);setStatus("");}} style={{padding:"6px 12px",borderRadius:99,border:`1px solid ${C.border}`,background:C.card,color:C.sub,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:C.mono}}>{t}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Analysis Modal ────────────────────────────────────────────────────────────
function AnalysisModal({stock,onClose}){
  const[text,setText]=useState("");
  const[loading,setLoading]=useState(true);
  const[tech,setTech]=useState(null);
  const[news,setNews]=useState([]);
  const[phase,setPhase]=useState("載入資料中...");

  useEffect(()=>{
    let cancelled=false;
    (async()=>{
      const sym=stock.currency==="TWD"?"NT$":"$";

      // 同時抓技術指標 + 新聞
      setPhase("抓取技術指標與新聞...");
      const [techData, newsData] = await Promise.all([
        fetchTechnicals(stock.ticker),
        fetchNews(stock.name, stock.ticker),
      ]);
      if(cancelled) return;
      if(techData) setTech(techData);
      if(newsData) setNews(newsData);

      setPhase("AI 分析中...");

      // 組建完整 prompt
      const techSection = techData ? `
技術指標：
- MA5：${techData.ma5??"N/A"}　MA20：${techData.ma20??"N/A"}
- RSI(14)：${techData.rsi??"N/A"}
- 成交量比（今日/5日均）：${techData.volRatio??"N/A"}x
- 52週高：${techData.week52High??"N/A"}　52週低：${techData.week52Low??"N/A"}
- 短線趨勢：${techData.trend??"N/A"}` : "";

      const newsSection = newsData?.length > 0 ? `
最新相關新聞：
${newsData.slice(0,3).map(n=>`- ${n.title}（${n.source}）`).join("\n")}` : "";

      const prompt = `你是頂尖股票分析師，請針對「${stock.name}（${stock.ticker}）」給出詳細分析（繁體中文，200字內）。

基本資料：
現價：${sym}${stock.price}　今日：${stock.pct>0?"+":""}${stock.pct}%
日內區間：${sym}${stock.low} – ${sym}${stock.high}
${techSection}
${newsSection}

請依以下格式輸出：
【技術面】（50字）說明MA、RSI、趨勢
【基本面】（50字）結合新聞說明近期利多利空
【操作建議】（50字）短線具體建議，含支撐/壓力價位`;

      try{
        const result = await callAI(prompt);
        if(!cancelled) setText(result);
      }catch{
        if(!cancelled) setText("⚠️ 分析暫時無法使用");
      }
      if(!cancelled) setLoading(false);
    })();
    return()=>{cancelled=true;};
  },[]);

  const up=stock.pct>=0,col=up?C.green:C.red,sym=stock.currency==="TWD"?"NT$":"$";

  return(
    <div style={{position:"fixed",inset:0,zIndex:100,display:"flex",flexDirection:"column",justifyContent:"flex-end"}}>
      <div onClick={onClose} style={{flex:1,background:"rgba(8,11,18,0.85)",backdropFilter:"blur(4px)"}}/>
      <div style={{background:C.surface,borderRadius:"24px 24px 0 0",padding:"24px 20px 48px",border:`1px solid ${C.border}`,borderBottom:"none",maxHeight:"85vh",overflowY:"auto"}}>
        <div style={{width:40,height:4,borderRadius:99,background:C.dim,margin:"0 auto 20px"}}/>

        {/* 股票標題 */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div>
            <div style={{fontSize:20,fontWeight:900,color:C.text}}>{stock.name}</div>
            <div style={{fontSize:12,color:C.sub,fontFamily:C.mono}}>{stock.ticker}</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:22,fontWeight:900,color:C.text,fontFamily:C.mono}}>{sym}{stock.price.toLocaleString()}</div>
            <div style={{fontSize:13,color:col,fontWeight:700}}>{up?"▲":"▼"} {Math.abs(stock.pct)}%</div>
          </div>
        </div>

        {/* 技術指標 badges */}
        {tech&&(
          <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
            {tech.ma5&&<TechBadge label="MA5" value={tech.ma5} color={tech.ma5>tech.ma20?C.green:C.red}/>}
            {tech.ma20&&<TechBadge label="MA20" value={tech.ma20}/>}
            {tech.rsi&&<TechBadge label="RSI14" value={tech.rsi} color={tech.rsi>70?C.red:tech.rsi<30?C.green:C.sub}/>}
            {tech.volRatio&&<TechBadge label="量比" value={`${tech.volRatio}x`} color={tech.volRatio>1.5?C.green:C.sub}/>}
            {tech.trend&&<TechBadge label="趨勢" value={tech.trend} color={tech.trend.includes("多")?C.green:tech.trend.includes("空")?C.red:C.sub}/>}
          </div>
        )}

        {/* 新聞 */}
        {news.length>0&&(
          <div style={{marginBottom:14}}>
            <div style={{fontSize:11,color:C.sub,marginBottom:6}}>📰 最新新聞</div>
            {news.slice(0,2).map((n,i)=>(
              <div key={i} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:"8px 10px",marginBottom:6}}>
                <div style={{fontSize:12,color:C.text,lineHeight:1.5}}>{n.title}</div>
                <div style={{fontSize:10,color:C.sub,marginTop:3}}>{n.source}</div>
              </div>
            ))}
          </div>
        )}

        {/* AI 分析 */}
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:16,minHeight:100}}>
          <div style={{fontSize:11,color:C.sub,marginBottom:8}}>✦ AI 分析報告</div>
          {loading&&!text&&(
            <div>
              <div style={{display:"flex",gap:4,padding:"4px 0",marginBottom:6}}>
                {[0,1,2].map(i=><div key={i} style={{width:6,height:6,borderRadius:"50%",background:C.green,animation:`pulse 1s ${i*.2}s infinite ease-in-out`}}/>)}
              </div>
              <div style={{fontSize:12,color:C.sub}}>{phase}</div>
            </div>
          )}
          <div style={{fontSize:14,color:C.text,lineHeight:1.9,whiteSpace:"pre-wrap"}}>
            {text}{loading&&text&&<span style={{color:C.green}}>▋</span>}
          </div>
        </div>

        <button onClick={onClose} style={{width:"100%",marginTop:14,padding:14,borderRadius:14,background:C.dim,border:"none",color:C.sub,fontWeight:700,fontSize:14,cursor:"pointer"}}>關閉</button>
      </div>
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
  // AI 推薦
  const[recs,setRecs]=useState(null);
  const[recsLoad,setRecsLoad]=useState(false);
  const[recsPhase,setRecsPhase]=useState("");
  const[marketRecs,setMarketRecs]=useState(null);
  const[marketLoad,setMarketLoad]=useState(false);
  const[marketPhase,setMarketPhase]=useState("");

  // ── 自選股資料刷新 ──────────────────────────────────────────────────────────
  const refresh=useCallback(async(list)=>{
    if(!list.length) return;
    setFetching(true);
    const results=await Promise.all(list.map(fetchQuote));
    const map={};
    results.forEach((d,i)=>{if(d)map[list[i]]=d;});
    setStocks(map);
    setFetching(false);
    setLastFetch(new Date());
  },[]);

  useEffect(()=>{ refresh(tickers); },[tickers]);
  useEffect(()=>{
    if(!autoRefresh) return;
    const id=setInterval(()=>refresh(tickers),10000);
    return()=>clearInterval(id);
  },[autoRefresh,tickers]);

  // ── 自選股管理 ──────────────────────────────────────────────────────────────
  const addStock=useCallback((ticker,data)=>{
    setTickers(prev=>{const next=[...prev,ticker];saveWatchlist(next);return next;});
    setStocks(prev=>({...prev,[ticker]:data}));
  },[]);
  const removeStock=useCallback((ticker)=>{
    setTickers(prev=>{const next=prev.filter(t=>t!==ticker);saveWatchlist(next);return next;});
    setStocks(prev=>{const n={...prev};delete n[ticker];return n;});
  },[]);

  // ── 自選股 AI 分析 ──────────────────────────────────────────────────────────
  const generateRecs=async()=>{
    setRecsLoad(true);
    const list=tickers.map(t=>stocks[t]).filter(Boolean);
    if(!list.length){setRecsLoad(false);return;}

    // 同時抓所有技術指標 + 新聞
    setRecsPhase("抓取技術指標與新聞...");
    const [techResults, newsResults] = await Promise.all([
      Promise.all(list.map(s=>fetchTechnicals(s.ticker))),
      Promise.all(list.map(s=>fetchNews(s.name, s.ticker))),
    ]);

    setRecsPhase("AI 分析中...");
    const stockDetails = list.map((s,i)=>{
      const t = techResults[i];
      const n = newsResults[i];
      const sym = s.currency==="TWD"?"NT$":"$";
      return `${s.ticker} ${s.name} | 現價${sym}${s.price} 今日${s.pct>0?"+":""}${s.pct}%` +
        (t ? ` | MA5:${t.ma5} MA20:${t.ma20} RSI:${t.rsi} 趨勢:${t.trend}` : "") +
        (n?.length ? ` | 新聞:${n[0]?.title?.slice(0,20)}` : "");
    }).join("\n");

    const prompt=`你是專業股票分析師。根據以下自選股今日表現、技術指標與新聞，給出買入與減碼建議（繁體中文）。
只回傳 JSON，格式：{"buy":[{"ticker":"","name":"","pct":0,"conf":0,"reason":"25字內，含技術或新聞依據","tech":{"ma5":0,"ma20":0,"rsi":0,"trend":""}}],"sell":[...]}
不要有 markdown，純 JSON。

股票資料：
${stockDetails}`;

    try{
      const fullText=await callAI(prompt);
      const clean=fullText.replace(/```json|```/g,"").trim();
      const parsed=JSON.parse(clean);
      const enrich=arr=>arr.map((r,i)=>({
        ...r,
        pct:stocks[r.ticker]?.pct??r.pct,
        tech:techResults[list.findIndex(s=>s.ticker===r.ticker)]||null,
      }));
      setRecs({buy:enrich(parsed.buy||[]),sell:enrich(parsed.sell||[])});
    }catch{setRecs({buy:[],sell:[],error:true});}
    setRecsLoad(false);
    setRecsPhase("");
  };

  // ── 市場熱門 AI 分析 ────────────────────────────────────────────────────────
  const generateMarketRecs=async()=>{
    setMarketLoad(true);

    // 動態從證交所抓熱門股，排除自選股
    setMarketPhase("抓取市場熱門標的...");
    const marketTickers = await fetchMarketTickers(tickers);
    const top10 = marketTickers.slice(0,10);

    setMarketPhase("抓取股價資料...");
    const quoteResults = await Promise.all(top10.map(fetchQuote));
    const validStocks = quoteResults.filter(Boolean);

    if(!validStocks.length){setMarketLoad(false);return;}

    setMarketPhase("抓取技術指標與新聞...");
    const [techResults, newsResults] = await Promise.all([
      Promise.all(validStocks.map(s=>fetchTechnicals(s.ticker))),
      Promise.all(validStocks.map(s=>fetchNews(s.name, s.ticker))),
    ]);

    setMarketPhase("AI 分析中...");
    const stockDetails = validStocks.map((s,i)=>{
      const t = techResults[i];
      const n = newsResults[i];
      const sym = s.currency==="TWD"?"NT$":"$";
      return `${s.ticker} ${s.name} | 現價${sym}${s.price} 今日${s.pct>0?"+":""}${s.pct}%` +
        (t ? ` | MA5:${t.ma5} MA20:${t.ma20} RSI:${t.rsi} 趨勢:${t.trend} 量比:${t.volRatio}x` : "") +
        (n?.length ? ` | 新聞:${n[0]?.title?.slice(0,25)}` : "");
    }).join("\n");

    const prompt=`你是專業股票分析師。根據以下市場熱門台股今日表現、技術指標與新聞，給出買入與減碼建議（繁體中文）。
以台股為主要分析對象，結合技術面（MA、RSI、量能）與基本面（新聞利多利空）綜合判斷。
只回傳 JSON，格式：{"buy":[{"ticker":"","name":"","pct":0,"conf":0,"reason":"25字內，含技術或新聞依據","tech":{"ma5":0,"ma20":0,"rsi":0,"trend":""}}],"sell":[...]}
不要有 markdown，純 JSON。

股票資料：
${stockDetails}`;

    try{
      const fullText=await callAI(prompt);
      const clean=fullText.replace(/```json|```/g,"").trim();
      const parsed=JSON.parse(clean);
      const techMap={};
      validStocks.forEach((s,i)=>{techMap[s.ticker]=techResults[i];});
      const enrich=arr=>arr.map(r=>({...r,tech:techMap[r.ticker]||null}));
      setMarketRecs({buy:enrich(parsed.buy||[]),sell:enrich(parsed.sell||[])});
    }catch{setMarketRecs({buy:[],sell:[],error:true});}
    setMarketLoad(false);
    setMarketPhase("");
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const watchData=tickers.map(t=>stocks[t]).filter(Boolean);
  const upCount=watchData.filter(s=>s.pct>=0).length;
  const downCount=watchData.filter(s=>s.pct<0).length;

  return(
    <div style={{background:C.bg,minHeight:"100vh",maxWidth:430,margin:"0 auto",fontFamily:C.sans,color:C.text,overflowX:"hidden"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900&family=Space+Mono:wght@400;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{display:none}
        @keyframes pulse{0%,100%{opacity:.2;transform:scale(.7)}50%{opacity:1;transform:scale(1)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        input::placeholder{color:#3a4259}
      `}</style>

      <div style={{height:48}}/>

      {/* Header */}
      <div style={{padding:"0 20px 16px",display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
        <div>
          <div style={{fontSize:11,color:C.sub,letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>StockMin</div>
          <div style={{fontSize:26,fontWeight:900,color:C.text,lineHeight:1}}>{tab==="ai"?"AI 推薦":"自選股"}</div>
          {lastFetch&&<div style={{fontSize:10,color:C.sub,marginTop:4}}>更新 {lastFetch.toLocaleTimeString("zh-TW",{hour:"2-digit",minute:"2-digit"})}</div>}
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
        {[{id:"ai",label:"✦  AI 推薦"},{id:"watch",label:"☆  自選股"}].map(t=>(
          <button key={t.id} onClick={()=>{setTab(t.id);setEditing(false);}} style={{flex:1,padding:"10px 0",borderRadius:11,border:"none",background:tab===t.id?C.green:"transparent",color:tab===t.id?C.bg:C.sub,fontWeight:800,fontSize:14,cursor:"pointer",transition:"all .2s",fontFamily:C.sans}}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{padding:"0 16px 100px"}}>

        {/* ── AI 推薦 ── */}
        {tab==="ai"&&(
          <>
            {/* 市場熱門 */}
            <div style={{marginBottom:24}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
                <div style={{width:3,height:18,borderRadius:99,background:C.gold}}/>
                <span style={{fontSize:14,fontWeight:800,color:C.gold}}>市場熱門</span>
                <div style={{flex:1,height:1,background:C.goldBd}}/>
                <span style={{fontSize:10,color:C.sub}}>動態抓取 · 排除自選股</span>
              </div>
              <button onClick={generateMarketRecs} disabled={marketLoad} style={{width:"100%",padding:"12px 0",borderRadius:14,border:`1px solid ${C.goldBd}`,background:marketLoad?C.dim:C.goldBg,color:marketLoad?C.sub:C.gold,fontWeight:800,fontSize:14,cursor:marketLoad?"default":"pointer",marginBottom:12,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                {marketLoad
                  ? <><div style={{width:14,height:14,border:`2px solid ${C.sub}`,borderTopColor:"transparent",borderRadius:"50%",animation:"spin .8s linear infinite"}}/> {marketPhase||"分析中..."}</>
                  : marketRecs?"↻ 重新分析市場":"✦ 分析市場熱門股（含技術面+新聞）"}
              </button>
              {marketRecs&&!marketLoad&&(
                <>
                  {marketRecs.error&&<div style={{color:C.gold,fontSize:13,marginBottom:12}}>⚠️ 分析失敗，請重試</div>}
                  {marketRecs.buy?.length>0&&(
                    <div style={{marginBottom:16}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                        <div style={{width:3,height:14,borderRadius:99,background:C.green}}/>
                        <span style={{fontSize:13,fontWeight:800,color:C.green}}>建議買入</span>
                        <div style={{flex:1,height:1,background:C.greenBd}}/>
                        <span style={{fontSize:11,color:C.sub}}>{marketRecs.buy.length} 檔</span>
                      </div>
                      {marketRecs.buy.map(r=><RecCard key={r.ticker} r={r} type="buy"/>)}
                    </div>
                  )}
                  {marketRecs.sell?.length>0&&(
                    <div style={{marginBottom:12}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                        <div style={{width:3,height:14,borderRadius:99,background:C.red}}/>
                        <span style={{fontSize:13,fontWeight:800,color:C.red}}>建議減碼</span>
                        <div style={{flex:1,height:1,background:C.redBd}}/>
                        <span style={{fontSize:11,color:C.sub}}>{marketRecs.sell.length} 檔</span>
                      </div>
                      {marketRecs.sell.map(r=><RecCard key={r.ticker} r={r} type="sell"/>)}
                    </div>
                  )}
                </>
              )}
            </div>

            <div style={{height:1,background:C.border,marginBottom:24}}/>

            {/* 我的自選股 */}
            <div>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
                <div style={{width:3,height:18,borderRadius:99,background:C.green}}/>
                <span style={{fontSize:14,fontWeight:800,color:C.text}}>我的自選股</span>
                <div style={{flex:1,height:1,background:C.border}}/>
                <span style={{fontSize:10,color:C.sub}}>{watchData.length} 檔</span>
              </div>
              <button onClick={generateRecs} disabled={recsLoad||watchData.length===0} style={{width:"100%",padding:"12px 0",borderRadius:14,border:"none",background:recsLoad?C.dim:C.green,color:recsLoad?C.sub:C.bg,fontWeight:800,fontSize:14,cursor:recsLoad?"default":"pointer",marginBottom:12,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                {recsLoad
                  ? <><div style={{width:14,height:14,border:`2px solid ${C.sub}`,borderTopColor:"transparent",borderRadius:"50%",animation:"spin .8s linear infinite"}}/> {recsPhase||"分析中..."}</>
                  : recs?"↻ 重新分析自選股":"✦ 分析我的自選股（含技術面+新聞）"}
              </button>
              {!recs&&!recsLoad&&(
                <div style={{background:C.card,border:`1px dashed ${C.border}`,borderRadius:16,padding:24,textAlign:"center"}}>
                  <div style={{fontSize:13,color:C.sub,lineHeight:1.8}}>點擊上方按鈕<br/>AI 將結合技術指標與新聞<br/>給出買入與減碼建議</div>
                </div>
              )}
              {recs&&!recsLoad&&(
                <>
                  {recs.error&&<div style={{color:C.gold,fontSize:13,marginBottom:12}}>⚠️ 分析失敗，請重試</div>}
                  {recs.buy?.length>0&&(
                    <div style={{marginBottom:16}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                        <div style={{width:3,height:14,borderRadius:99,background:C.green}}/>
                        <span style={{fontSize:13,fontWeight:800,color:C.green}}>建議買入</span>
                        <div style={{flex:1,height:1,background:C.greenBd}}/>
                        <span style={{fontSize:11,color:C.sub}}>{recs.buy.length} 檔</span>
                      </div>
                      {recs.buy.map(r=><RecCard key={r.ticker} r={r} type="buy"/>)}
                    </div>
                  )}
                  {recs.sell?.length>0&&(
                    <div style={{marginBottom:12}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                        <div style={{width:3,height:14,borderRadius:99,background:C.red}}/>
                        <span style={{fontSize:13,fontWeight:800,color:C.red}}>建議減碼</span>
                        <div style={{flex:1,height:1,background:C.redBd}}/>
                        <span style={{fontSize:11,color:C.sub}}>{recs.sell.length} 檔</span>
                      </div>
                      {recs.sell.map(r=><RecCard key={r.ticker} r={r} type="sell"/>)}
                    </div>
                  )}
                </>
              )}
            </div>

            <div style={{background:C.goldBg,border:`1px solid rgba(255,181,71,0.2)`,borderRadius:12,padding:"10px 14px",marginTop:16}}>
              <div style={{fontSize:11,color:C.gold,lineHeight:1.6}}>⚠️ AI 建議僅供參考，投資請自行評估風險</div>
            </div>
          </>
        )}

        {/* ── 自選股 ── */}
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
                <button onClick={()=>setEditing(e=>!e)} style={{padding:"6px 10px",borderRadius:99,border:`1px solid ${editing?C.red:C.border}`,background:editing?C.redBg:"transparent",color:editing?C.red:C.sub,fontSize:12,fontWeight:700,cursor:"pointer"}}>
                  {editing?"完成":"✎ 編輯"}
                </button>
                <button onClick={()=>refresh(tickers)} style={{padding:"6px 10px",borderRadius:99,border:`1px solid ${C.border}`,background:"transparent",color:C.sub,fontSize:12,fontWeight:700,cursor:"pointer"}}>
                  ↻ 刷新
                </button>
                <button onClick={()=>setAutoRefresh(a=>!a)} style={{padding:"6px 10px",borderRadius:99,border:`1px solid ${autoRefresh?C.green:C.border}`,background:autoRefresh?C.greenBg:"transparent",color:autoRefresh?C.green:C.sub,fontSize:12,fontWeight:700,cursor:"pointer"}}>
                  {autoRefresh?"⏹ 停止":"⏱ 自動"}
                </button>
              </div>
              <button onClick={()=>setAddOpen(true)} style={{padding:"6px 10px",borderRadius:99,border:`1px solid ${C.greenBd}`,background:C.greenBg,color:C.green,fontSize:12,fontWeight:700,cursor:"pointer"}}>
                ＋ 新增
              </button>
            </div>

            {fetching&&watchData.length===0&&(
              <div style={{textAlign:"center",padding:"40px 0",color:C.sub}}>
                <div style={{width:24,height:24,border:`2px solid ${C.green}`,borderTopColor:"transparent",borderRadius:"50%",animation:"spin .8s linear infinite",margin:"0 auto 12px"}}/>
                載入中...
              </div>
            )}
            {!fetching&&watchData.length===0&&(
              <div style={{textAlign:"center",padding:"40px 0"}}>
                <div style={{fontSize:13,color:C.sub,marginBottom:16}}>自選股是空的</div>
                <button onClick={()=>setAddOpen(true)} style={{padding:"10px 20px",borderRadius:12,border:"none",background:C.green,color:C.bg,fontWeight:700,fontSize:14,cursor:"pointer"}}>+ 新增第一檔股票</button>
              </div>
            )}
            {watchData.map(s=><WatchCard key={s.ticker} s={s} onTap={setModal} onRemove={removeStock} editing={editing}/>)}
          </>
        )}
      </div>

      {/* Bottom Nav */}
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:430,background:C.surface,borderTop:`1px solid ${C.border}`,padding:"12px 40px 32px",display:"flex",justifyContent:"space-around",zIndex:50}}>
        {[{id:"ai",icon:"✦",label:"AI 推薦"},{id:"watch",icon:"☆",label:"自選股"}].map(t=>(
          <button key={t.id} onClick={()=>{setTab(t.id);setEditing(false);}} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,background:"transparent",border:"none",cursor:"pointer",padding:"2px 16px"}}>
            <span style={{fontSize:22,color:tab===t.id?C.green:C.dim}}>{t.icon}</span>
            <span style={{fontSize:11,fontWeight:700,color:tab===t.id?C.green:C.sub}}>{t.label}</span>
          </button>
        ))}
      </div>

      {modal&&<AnalysisModal stock={modal} onClose={()=>setModal(null)}/>}
      {addOpen&&<AddSheet existing={tickers} onAdd={addStock} onClose={()=>setAddOpen(false)}/>}
    </div>
  );
}
