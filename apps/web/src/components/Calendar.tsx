"use client";
import { useMemo, useState } from "react";
export default function Calendar() {
  const [month, setMonth] = useState(new Date(2026,10,1));
  const days = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const count = new Date(month.getFullYear(), month.getMonth()+1, 0).getDate();
    return [...Array(first.getDay()).fill(null), ...Array.from({length:count},(_,i)=>i+1)];
  }, [month]);
  const label = month.toLocaleDateString("en-IN",{month:"long",year:"numeric"});
  return <section className="card">
    <div className="top"><div><h2>Calendar</h2><div className="muted">Study sessions, revisions, mocks and deadlines</div></div>
      <div><button onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()-1,1))}>‹</button>{" "}
      <button onClick={()=>setMonth(new Date(month.getFullYear(),month.getMonth()+1,1))}>›</button></div>
    </div>
    <div className="top"><strong>{label}</strong><span className="muted">Monthly view · event sync coming with Firebase connection</span></div>
    <div className="calendar">
      {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d=><div key={d} className="muted">{d}</div>)}
      {days.map((d,i)=><div key={i} className={"day "+(d && new Date().getDate()===d && new Date().getMonth()===month.getMonth()?"today":"")}>{d ?? ""}</div>)}
    </div>
  </section>;
}
