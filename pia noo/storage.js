const KEY="piano-v1";
const DEFAULT={version:1,muted:false,records:{},games:0};
function safeRead(){try{return JSON.parse(localStorage.getItem(KEY))||DEFAULT}catch{return {...DEFAULT}}}
function safeWrite(data){try{localStorage.setItem(KEY,JSON.stringify(data));return true}catch{return false}}
export const Store={
 get(){return safeRead()},
 muted(){return !!safeRead().muted},
 setMuted(v){const d=safeRead();d.muted=!!v;safeWrite(d)},
 record(id,result){
   const d=safeRead(); const old=d.records[id]||{score:0,combo:0,accuracy:0,cleared:false};
   const best={score:Math.max(old.score,result.score),combo:Math.max(old.combo,result.maxCombo),accuracy:Math.max(old.accuracy,result.accuracy),cleared:old.cleared||result.rounds>=1};
   d.records[id]=best; d.games=(d.games||0)+1; safeWrite(d);
   return result.score>old.score;
 },
 all(){return safeRead()}
};
