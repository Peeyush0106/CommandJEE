"use client";
import { useEffect, useState } from "react";
const target = new Date("2027-01-15T00:00:00+05:30").getTime();
export default function Countdown() {
  const [left, setLeft] = useState(target - Date.now());
  useEffect(() => {
    const id = setInterval(() => setLeft(target - Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const seconds = Math.max(0, Math.floor(left / 1000));
  const parts = [
    Math.floor(seconds / 86400),
    Math.floor((seconds % 86400) / 3600),
    Math.floor((seconds % 3600) / 60),
    seconds % 60
  ];
  return <div className="card">
    <div className="muted">COUNTDOWN TO JEE MAIN · 15 JANUARY 2027</div>
    <div className="grid" style={{gridTemplateColumns:"repeat(4,1fr)",marginTop:14}}>
      {parts.map((v,i)=><div key={i}><div className="big">{String(v).padStart(2,"0")}</div><div className="muted">{["DAYS","HOURS","MINUTES","SECONDS"][i]}</div></div>)}
    </div>
  </div>;
}
