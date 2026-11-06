"use client";
import {useEffect,useState} from "react";
import {CHAPTERS} from "@commandjee/shared";
import type {Chapter,ChapterStatus,Priority} from "@commandjee/shared";
export type Task={id:string;title:string;subject:string;chapter:string;date:string;time:string;minutes:number;kind:"study"|"revision"|"mock"|"coaching";done:boolean;items?:Array<{subject:string;chapter:string;tasks:string[];done?:boolean}>};
export type Mock={id:string;name:string;date:string;p:number;c:number;m:number;notes:string};
export type State={chapters:Chapter[];tasks:Task[];mocks:Mock[];theme:"dark"|"light";targetHours:number};
const KEY="commandjee.web.v1";
const migrateStatus=(v:string)=>({not_started:"pending",learning:"theory",theory_complete:"theory",practising:"pyqs",revision_due:"revision",retesting:"revision",mastered:"mastery"} as Record<string,string>)[v]||v;
const initial:State={chapters:CHAPTERS.map((x,i)=>({...x,sortOrder:i,status:migrateStatus(x.status) as ChapterStatus})),tasks:[],mocks:[],theme:"dark",targetHours:6};
export function useStore(){
 const [state,setState]=useState<State>(initial),[ready,setReady]=useState(false);
 useEffect(()=>{try{const v=localStorage.getItem(KEY);if(v){const x=JSON.parse(v);setState({...initial,...x,chapters:x.chapters?.length?x.chapters.map((c:Chapter,i:number)=>({...c,sortOrder:c.sortOrder??i,status:migrateStatus(c.status) as ChapterStatus})):initial.chapters})}}catch{}setReady(true)},[]);
 useEffect(()=>{if(ready)localStorage.setItem(KEY,JSON.stringify(state))},[state,ready]);
 const patchChapter=(id:string,patch:Partial<Chapter>)=>setState(s=>({...s,chapters:s.chapters.map(c=>c.id===id?{...c,...patch,...(patch.pyqAttempted!==undefined&&patch.pyqIndependent===undefined?{pyqIndependent:Math.min(c.pyqIndependent,patch.pyqAttempted)}:{})}:c)}));
 const addTask=(t:Task)=>setState(s=>({...s,tasks:[...s.tasks,t]}));
 const toggleTask=(id:string)=>setState(s=>({...s,tasks:s.tasks.map(t=>t.id===id?{...t,done:!t.done}:t)}));
 const toggleTaskItem=(id:string,index:number)=>setState(s=>({...s,tasks:s.tasks.map(t=>t.id===id?{...t,items:t.items?.map((it,i)=>i===index?{...it,done:!it.done}:it)}:t)}));
 const removeTask=(id:string)=>setState(s=>({...s,tasks:s.tasks.filter(t=>t.id!==id)}));
 const addMock=(m:Mock)=>setState(s=>({...s,mocks:[...s.mocks,m]}));
 return {state,setState,patchChapter,addTask,toggleTask,toggleTaskItem,removeTask,addMock};
}
