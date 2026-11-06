import { useEffect, useState } from "react";
import { SafeAreaView, ScrollView, Text, View, StyleSheet } from "react-native";
import { getCountdown } from "@commandjee/shared";
export default function Home() {
  const [time,setTime] = useState(getCountdown());
  useEffect(()=>{const id=setInterval(()=>setTime(getCountdown()),1000);return()=>clearInterval(id);},[]);
  return <SafeAreaView style={s.safe}><ScrollView contentContainerStyle={s.wrap}>
    <Text style={s.brand}>✦ COMMANDJEE</Text><Text style={s.title}>Your preparation hub.</Text>
    <View style={s.card}><Text style={s.label}>15 JANUARY 2027</Text><View style={s.row}>
      {[["DAYS",time.days],["HRS",time.hours],["MIN",time.minutes],["SEC",time.seconds]].map(([l,v])=><View key={String(l)}><Text style={s.num}>{String(v).padStart(2,"0")}</Text><Text style={s.label}>{l}</Text></View>)}
    </View></View>
    <View style={s.card}><Text style={s.heading}>Today's plan</Text><Text style={s.body}>Your study tasks will appear here after Firebase setup.</Text></View>
    <View style={s.card}><Text style={s.heading}>Quick access</Text>{["Chapters","Calendar","Study planner","Mock tests","AI Study Manager"].map(x=><Text key={x} style={s.link}>{x}  ›</Text>)}</View>
  </ScrollView></SafeAreaView>;
}
const s=StyleSheet.create({safe:{flex:1,backgroundColor:"#0a1020"},wrap:{padding:22,gap:18},brand:{color:"#8fb8ff",fontWeight:"800",letterSpacing:2},title:{fontSize:28,color:"white",fontWeight:"800"},card:{backgroundColor:"#121e33",borderColor:"#263650",borderWidth:1,borderRadius:16,padding:18,gap:14},label:{color:"#9aabc5",fontSize:11},row:{flexDirection:"row",justifyContent:"space-between"},num:{fontSize:27,color:"white",fontWeight:"800"},heading:{fontSize:19,color:"white",fontWeight:"700"},body:{color:"#aebbd1"},link:{color:"#dbe7ff",paddingVertical:8,borderBottomColor:"#263650",borderBottomWidth:1}});
