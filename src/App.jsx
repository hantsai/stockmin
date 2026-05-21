// StockMin — src/App.jsx
// Real Yahoo Finance + Anthropic AI + localStorage watchlist
import { useState, useRef, useEffect, useCallback } from "react";
import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts";

const C = {
  bg:"#080b12",surface:"#0d1120",card:"#111827",border:"#1c2540",
  green:"#00e5a0",greenBg:"rgba(0,229,160,0.10)",greenBd:"rgba(0,229,160,0.25)",
  red:"#ff3d6e",redBg:"rgba(255,61,110,0.10)",redBd:"rgba(255,61,110,0.25)",
  gold:"#ffb547",goldBg:"rgba(255,181,71,0.10)",
  text:"#edf2ff",sub:"#8896b3",dim:"#1c2540",
  mono:"'Space Mono',monospace",sans:"'Outfit',sans-serif",
};

const DEFAULT_TICKERS = ["2330.TW","2317.TW","2454.TW","AAPL","NVDA","TSLA"];

function genMock(base,up){
  let v=base*0.96;
  return Array.from({length:24},()=>{v+=(Math.random()-(up?.42:.58))*base*.008;return{v:+v.toFixed(2)};}).concat([{v:base}]);
}

const MOCK_DATA = {
  "2330.TW":{name:"台積電",price:1045,pct:2.45,change:25,low:1018,high:1052,currency:"TWD"},
  "2317.TW":{name:"鴻海",price:198,pct:-1.73,change:-3.5,low:195,high:202,currency:"TWD"},
  "2454.TW":{name:"聯發科",price:1580,pct:2.59,change:40,low:1540,high:1595,currency:"TWD"},
  "AAPL":{name:"Apple",price:213,pct:1.48,change:3.1,low:209,high:215,currency:"USD"},
  "NVDA":{name:"NVIDIA",price:1087,pct:-1.36,change:-15,low:1060,high:1105,currency:"USD"},
  "TSLA":{name:"Tesla",price:249,pct:3.62,change:8.7,low:238,high:252,currency:"USD"},
};

// ── API helpers ──────────────────────────────────────────────────────────────
async function fetchQuote(ticker) {
  try {
    const res = await fetch(`/api/quote?ticker=${encodeURIComponent(ticker)}`,{signal:AbortSignal.timeout(9000)});
    if(!res.ok) throw new Error("api error");
    const d = await res.json();
    if(!d.sparkline) d.sparkline = genMock(d.price, d.pct>=0);
    return d;
  } catch {
    const m = MOCK_DATA[ticker];
    if(m) return {...m,ticker,sparkline:genMock(m.price,m.pct>=0),real:false};
    return null;
  }
}

async function streamAnalysis(prompt) {
  const res = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  if (!res.ok) throw new Error("API error");
  const data = await res.json();
  return data.text || "⚠️ 分析服務暫時無法使用";
}

// ── localStorage watchlist ───────────────────────────────────────────────────
function loadWatchlist(){
  try{const s=localStorage.getItem("stockmin:watchlist");return s?JSON.parse(s):DEFAULT_TICKERS;}
  catch{return DEFAULT_TICKERS;}
}
function saveWatchlist(t){try{localStorage.setItem("stockmin:watchlist",JSON.stringify(t));}catch{}}

// ── Sparkline ────────────────────────────────────────────────────────────────
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

// ── WatchCard ────────────────────────────────────────────────────────────────
function WatchCard({s,onTap,onRemove,editing}){
  const up=s.pct>=0,col=up?C.green:C.red,bg=up?C.greenBg:C.redBg,bd=up?C.greenBd:C.redBd;
  const sym=s.currency==="TWD"?"NT$":"$";
  const rangePct=s.high>s.low?((s.price-s.low)/(s.high-s.low))*100:50;
  return(
    <div style={{position:"relative",marginBottom:10}}>
      {editing&&(
        <button onClick={()=>onRemove(s.ticker)} style={{position:"absolute",top:-6,left:-6,zIndex:10,width:22,height:22,borderRadius:"50%",border:"none",background:C.red,color:"#fff",fontSize:16,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:`0 0 8px ${C.red}`}}>−</button>
      )}
      <div onClick={()=>!editing&&onTap(s)} style={{background:C.card,border:`1px solid ${editing?C.dim:C.border}`,borderRadius:18,padding:"16px 18px",cursor:editing?"default":"pointer"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              <div style={{fontSize:16,fontWeight:800,color:C.text}}>{s.name}</div>
              {!s.real&&<div style={{fontSize:9,color:C.gold,border:`1px solid ${C.gold}`,borderRadius:4,padding:"1px 5px"}}>模擬</div>}
            </div>
            <div style={{fontSize:11,color:C.sub,marginTop:2,fontFamily:C.mono}}>{s.ticker}</div>
          </div>
          <div style={{fontSize:20,fontWeight:900,color:C.text,fontFamily:C.mono}}>{sym}{s.price.toLocaleString()}</div>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:10}}>
          <Spark data={s.sparkline} color={col}/>
          <div style={{background:bg,border:`1px solid ${bd}`,borderRadius:10,padding:"5px 12px",display:"flex",alignItems:"center",gap:4}}>
            <span style={{fontSize:16}}>{up?"▲":"▼"}</span>
            <span style={{fontSize:17,fontWeight:900,color:col,fontFamily:C.mono}}>{Math.abs(s.pct)}%</span>
          </div>
        </div>
        <div style={{marginTop:12}}>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:C.sub,marginBottom:4}}>
            <span>低 {sym}{s.low}</span><span>高 {sym}{s.high}</span>
          </div>
          <div style={{height:4,borderRadius:99,background:C.dim,position:"relative"}}>
            <div style={{height:"100%",width:`${rangePct}%`,background:`linear-gradient(90deg,${C.dim},${col})`,borderRadius:99}}/>
            <div style={{position:"absolute",left:`${rangePct}%`,transform:"translateX(-50%)",top:-3,width:10,height:10,borderRadius:"50%",background:col,boxShadow:`0 0 8px ${col}`}}/>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── RecCard ──────────────────────────────────────────────────────────────────
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
            <circle cx="22" cy="22" r="18" fill="none" stroke={col} strokeWidth="3" strokeDasharray={`${2*Math.PI*18*r.conf/100} ${2*Math.PI*18}`} strokeLinecap="round"/>
          </svg>
          <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:col,fontFamily:C.mono}}>{r.conf}%</div>
        </div>
      </div>
      <div style={{fontSize:12,color:up?C.green:C.red,fontWeight:700,marginBottom:8}}>{up?"▲":"▼"} {Math.abs(r.pct)}% 今日</div>
      <div style={{background:bg,borderRadius:10,padding:"8px 10px"}}>
        <div style={{fontSize:11,color:C.sub,marginBottom:2}}>AI 理由</div>
        <div style={{fontSize:12,color:C.text,lineHeight:1.6}}>{r.reason}</div>
      </div>
    </div>
  );
}

// ── Add Sheet ────────────────────────────────────────────────────────────────
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

// ── Analysis Modal ───────────────────────────────────────────────────────────
function AnalysisModal({stock,onClose}){
  const[text,setText]=useState("");
  const[loading,setLoading]=useState(true);
  useEffect(()=>{
    let cancelled=false;
    (async()=>{
      const sym=stock.currency==="TWD"?"NT$":"$";
      const prompt=`你是頂尖股票分析師，針對「${stock.name}（${stock.ticker}）」給簡明分析（繁體中文，150字內）。
現價：${sym}${stock.price}　今日：${stock.pct>0?"+":""}${stock.pct}%　區間：${sym}${stock.low}–${sym}${stock.high}
請包含：① 今日走勢 ② 主要風險 ③ 操作建議。語氣專業簡潔。`;
      try{
        const result = await streamAnalysis(prompt);
        if(!cancelled) setText(result);
      }catch{if(!cancelled)setText("⚠️ 分析暫時無法使用");}
      if(!cancelled)setLoading(false);
    })();
    return()=>{cancelled=true;};
  },[]);

  const up=stock.pct>=0,col=up?C.green:C.red,sym=stock.currency==="TWD"?"NT$":"$";
  return(
    <div style={{position:"fixed",inset:0,zIndex:100,display:"flex",flexDirection:"column",justifyContent:"flex-end"}}>
      <div onClick={onClose} style={{flex:1,background:"rgba(8,11,18,0.85)",backdropFilter:"blur(4px)"}}/>
      <div style={{background:C.surface,borderRadius:"24px 24px 0 0",padding:"24px 20px 48px",border:`1px solid ${C.border}`,borderBottom:"none"}}>
        <div style={{width:40,height:4,borderRadius:99,background:C.dim,margin:"0 auto 20px"}}/>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
          <div>
            <div style={{fontSize:20,fontWeight:900,color:C.text}}>{stock.name}</div>
            <div style={{fontSize:12,color:C.sub,fontFamily:C.mono}}>{stock.ticker}</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:22,fontWeight:900,color:C.text,fontFamily:C.mono}}>{sym}{stock.price.toLocaleString()}</div>
            <div style={{fontSize:13,color:col,fontWeight:700}}>{up?"▲":"▼"} {Math.abs(stock.pct)}%</div>
          </div>
        </div>
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:16,minHeight:100}}>
          <div style={{fontSize:11,color:C.sub,marginBottom:8}}>✦ AI 分析報告</div>
          {loading&&!text&&(
            <div style={{display:"flex",gap:4,padding:"8px 0"}}>
              {[0,1,2].map(i=><div key={i} style={{width:6,height:6,borderRadius:"50%",background:C.green,animation:`pulse 1s ${i*.2}s infinite ease-in-out`}}/>)}
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

// ── Main ─────────────────────────────────────────────────────────────────────
export default function App(){
  const[tab,setTab]=useState("watch");
  const[tickers,setTickers]=useState(()=>loadWatchlist());
  const[stocks,setStocks]=useState({});
  const[fetching,setFetching]=useState(false);
  const[modal,setModal]=useState(null);
  const[addOpen,setAddOpen]=useState(false);
  const[editing,setEditing]=useState(false);
  const[recs,setRecs]=useState(null);
  const[recsLoad,setRecsLoad]=useState(false);
  const[lastFetch,setLastFetch]=useState(null);

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

  useEffect(()=>{
    refresh(tickers);
    const id=setInterval(()=>refresh(tickers),60000);
    return()=>clearInterval(id);
  },[tickers]);

  const addStock=useCallback((ticker,data)=>{
    setTickers(prev=>{const next=[...prev,ticker];saveWatchlist(next);return next;});
    setStocks(prev=>({...prev,[ticker]:data}));
  },[]);

  const removeStock=useCallback((ticker)=>{
    setTickers(prev=>{const next=prev.filter(t=>t!==ticker);saveWatchlist(next);return next;});
    setStocks(prev=>{const n={...prev};delete n[ticker];return n;});
  },[]);

  const generateRecs=async()=>{
    setRecsLoad(true);
    const list=tickers.map(t=>stocks[t]).filter(Boolean);
    if(!list.length){setRecsLoad(false);return;}
    const prompt=`你是專業股票分析師。根據以下自選股今日表現，給出買入與減碼建議（繁體中文）。
只回傳 JSON，格式：{"buy":[{"ticker":"","name":"","pct":0,"conf":0,"reason":"20字內"}],"sell":[...]}
不要有 markdown，純 JSON。

股票資料：
${list.map(s=>`${s.ticker} ${s.name} 今日${s.pct>0?"+":""}${s.pct}% 現價${s.price}`).join("\n")}`;
    try{
      let fullText="";
      fullText = await streamAnalysis(prompt);
      const clean=fullText.replace(/```json|```/g,"").trim();
      const parsed=JSON.parse(clean);
      const enrich=arr=>arr.map(r=>({...r,pct:stocks[r.ticker]?.pct??r.pct,real:stocks[r.ticker]?.real??false}));
      setRecs({buy:enrich(parsed.buy||[]),sell:enrich(parsed.sell||[])});
    }catch{setRecs({buy:[],sell:[],error:true});}
    setRecsLoad(false);
  };

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

        {/* AI 推薦 */}
        {tab==="ai"&&(
          <>
            <button onClick={generateRecs} disabled={recsLoad||watchData.length===0} style={{width:"100%",padding:"14px 0",borderRadius:14,border:"none",background:recsLoad?C.dim:C.green,color:recsLoad?C.sub:C.bg,fontWeight:800,fontSize:15,cursor:recsLoad?"default":"pointer",marginBottom:20,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
              {recsLoad?<><div style={{width:14,height:14,border:`2px solid ${C.sub}`,borderTopColor:"transparent",borderRadius:"50%",animation:"spin .8s linear infinite"}}/> 分析中...</>:recs?"↻ 重新分析":"✦ 開始 AI 分析"}
            </button>
            {!recs&&!recsLoad&&(
              <div style={{background:C.card,border:`1px dashed ${C.border}`,borderRadius:20,padding:40,textAlign:"center"}}>
                <div style={{fontSize:32,marginBottom:12}}>✦</div>
                <div style={{fontSize:14,color:C.sub,lineHeight:1.8}}>點擊上方按鈕<br/>AI 將根據你的自選股<br/>給出買入與減碼建議</div>
              </div>
            )}
            {recs&&!recsLoad&&(
              <>
                {recs.error&&<div style={{color:C.gold,fontSize:13,marginBottom:12}}>⚠️ 分析失敗，請重試</div>}
                {recs.buy?.length>0&&(
                  <div style={{marginBottom:24}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
                      <div style={{width:3,height:18,borderRadius:99,background:C.green}}/>
                      <span style={{fontSize:14,fontWeight:800,color:C.green}}>建議買入</span>
                      <div style={{flex:1,height:1,background:C.greenBd}}/>
                      <span style={{fontSize:11,color:C.sub}}>{recs.buy.length} 檔</span>
                    </div>
                    {recs.buy.map(r=><RecCard key={r.ticker} r={r} type="buy"/>)}
                  </div>
                )}
                {recs.sell?.length>0&&(
                  <div style={{marginBottom:20}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
                      <div style={{width:3,height:18,borderRadius:99,background:C.red}}/>
                      <span style={{fontSize:14,fontWeight:800,color:C.red}}>建議減碼</span>
                      <div style={{flex:1,height:1,background:C.redBd}}/>
                      <span style={{fontSize:11,color:C.sub}}>{recs.sell.length} 檔</span>
                    </div>
                    {recs.sell.map(r=><RecCard key={r.ticker} r={r} type="sell"/>)}
                  </div>
                )}
                <div style={{background:C.goldBg,border:`1px solid rgba(255,181,71,0.2)`,borderRadius:12,padding:"10px 14px"}}>
                  <div style={{fontSize:11,color:C.gold,lineHeight:1.6}}>⚠️ AI 建議僅供參考，投資請自行評估風險</div>
                </div>
              </>
            )}
          </>
        )}

        {/* 自選股 */}
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
              <button onClick={()=>setEditing(e=>!e)} style={{padding:"6px 14px",borderRadius:99,border:`1px solid ${editing?C.red:C.border}`,background:editing?C.redBg:"transparent",color:editing?C.red:C.sub,fontSize:12,fontWeight:700,cursor:"pointer"}}>
                {editing?"完成編輯":"✎ 編輯"}
              </button>
              <button onClick={()=>setAddOpen(true)} style={{padding:"6px 14px",borderRadius:99,border:`1px solid ${C.greenBd}`,background:C.greenBg,color:C.green,fontSize:12,fontWeight:700,cursor:"pointer"}}>
                ＋ 新增股票
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
