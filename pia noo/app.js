import {SONGS,makeMap} from "./data.js";
import {judge,multiplier,accuracy} from "./game.js";
import {AudioEngine} from "./audio.js";
import {Store} from "./storage.js";

const $=s=>document.querySelector(s);
const catalog=$("#catalog"), game=$("#game"), result=$("#result");
const canvas=$("#gameCanvas"), ctx=canvas.getContext("2d");
const audio=new AudioEngine();

let selected=SONGS[0], filter="all", notes=[], raf=0, state=null, countdown=false;
let lastTime=0, heldLane=null;

function show(screen){[catalog,game,result].forEach(x=>x.classList.remove("active"));screen.classList.add("active")}
function renderSongs(){
  const list=SONGS.filter(s=>filter==="all"||s.difficulty===filter);
  $("#songs").innerHTML=list.map(s=>`<button class="song card ${s.id===selected.id?"selected":""}" data-id="${s.id}">
    <div><h3>${s.title}</h3><p>${s.author}</p></div><div class="difficulty">${s.difficultyLabel}</div></button>`).join("");
  document.querySelectorAll(".song").forEach(b=>b.onclick=()=>{selected=SONGS.find(s=>s.id===b.dataset.id);updateHero();renderSongs()});
}
function updateHero(){$("#heroTitle").textContent=selected.title;$("#heroAuthor").textContent=selected.author;$("#heroDifficulty").textContent=selected.difficultyLabel;$("#heroBpm").textContent=`${selected.bpm} BPM`}
function updateStats(){
 const d=Store.all(), rs=Object.values(d.records||{});
 $("#completedCount").textContent=rs.filter(x=>x.cleared).length;
 $("#bestCombo").textContent=rs.reduce((m,x)=>Math.max(m,x.combo||0),0);
 $("#gamesPlayed").textContent=d.games||0;
}
function resize(){const r=canvas.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2);canvas.width=r.width*d;canvas.height=r.height*d;ctx.setTransform(d,0,0,d,0,0)}
window.addEventListener("resize",resize);

function start(){
 if(!selected) selected=SONGS[0];
 show(game); document.body.classList.add("playing");
 const w=canvas.clientWidth,h=canvas.clientHeight;
 state={running:false,paused:false,score:0,combo:0,maxCombo:0,lives:3,good:0,misses:0,wrong:0,round:1,speed:.9,roundStart:performance.now(),gameTime:0,roundLength:0,resultDone:false};
 notes=makeMap(selected,1); state.roundLength=notes.at(-1).time+1.5;
 $("#gameTitle").textContent=selected.title; $("#gameRound").textContent="Круг 1"; updateHUD();
 audio.init().then(()=>audio.setMuted(Store.muted()));
 resize(); countdownStart();
}
function countdownStart(){
 countdown=true; let n=3; $("#countdown").textContent=n;
 const tick=()=>{if(!countdown)return;if(n>0){$("#countdown").textContent=n--;setTimeout(tick,1000)}else{$("#countdown").textContent="";countdown=false;state.running=true;state.roundStart=performance.now();lastTime=performance.now();loop(lastTime)}};
 tick();
}
function loop(now){
 if(!state?.running||state.paused)return;
 const dt=(now-lastTime)/1000; lastTime=now; state.gameTime+=(dt*state.speed);
 draw();
 checkMisses();
 updateProgress();
 raf=requestAnimationFrame(loop);
}
function draw(){
 const w=canvas.clientWidth,h=canvas.clientHeight;ctx.clearRect(0,0,w,h);
 const laneW=w/4, hitY=h*.78, pxPerSec=h*.55;
 // guide lines and hit line
 for(let i=0;i<4;i++){ctx.fillStyle=["#bba7df","#dfbd91","#9bc9c1","#d3a2bc"][i]+"18";ctx.fillRect(i*laneW,0,laneW,h)}
 ctx.strokeStyle="#b8f34a";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(0,hitY);ctx.lineTo(w,hitY);ctx.stroke();
 notes.forEach(n=>{
   if(n.done)return;
   const y=hitY-(n.time-state.gameTime)*pxPerSec;
   const hh=Math.max(18,n.duration*pxPerSec);
   if(y<-hh||y>h+40)return;
   const x=n.lane*laneW+7; const width=laneW-14;
   ctx.fillStyle=["#c9b7ed","#e9cba2","#abd8d0","#dfb2cb"][n.lane];
   ctx.beginPath();roundRect(ctx,x,y,width,hh,9);ctx.fill();
   ctx.fillStyle="#ffffff44";ctx.fillRect(x+5,y+5,width-10,4);
 });
}
function roundRect(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath()}
function checkMisses(){
 const target=state.gameTime;
 notes.forEach(n=>{
   if(n.done)return;
   if(target-n.time>0.28 && !n.holding){n.done=true;state.misses++;state.combo=0;loseLife("Промах");}
 });
 if(state.lives<=0)finish();
 if(target>=state.roundLength)nextRound();
}
function nextRound(){
 state.round++;state.speed=Math.min(1.55,.9+(state.round-1)*.12);
 notes=makeMap(selected,state.round);state.gameTime=0;state.roundLength=notes.at(-1).time+1.5;
 $("#gameRound").textContent=`Круг ${state.round}`; feedback(`Круг ${state.round}`);
}
function hitLane(lane){
 if(!state?.running||state.paused||countdown)return;
 const candidates=notes.filter(n=>!n.done && n.lane===lane);
 const n=candidates[0]; if(!n){wrong();return}
 const delta=(state.gameTime-n.time)*1000;
 const j=judge(delta); if(!j){wrong();return}
 n.hit=true;
 state.good++;state.combo++;state.maxCombo=Math.max(state.maxCombo,state.combo);
 const mult=multiplier(state.combo);state.score+=j.points*mult;
 if(n.duration){n.holding=true;heldLane=lane}else{n.done=true}
 feedback(j.kind);audio.hit(lane);updateHUD();
}
function releaseLane(lane){
 if(!state||heldLane!==lane)return;
 const n=notes.find(x=>x.holding&&!x.done);
 if(!n){heldLane=null;return}
 const end=n.time+n.duration;
 if(state.gameTime>=end-.15){n.done=true;n.holding=false;heldLane=null;state.score+=Math.round(50*multiplier(state.combo));feedback("Удержание ✓")}
 else{n.done=true;n.holding=false;heldLane=null;loseLife("Рано!")}
}
function wrong(){state.wrong++;state.combo=0;audio.miss();loseLife("Не та дорожка")}
function loseLife(msg){state.lives--;feedback(msg,true);updateHUD()}
function feedback(text,miss=false){const el=$("#feedback");el.textContent=text;el.className="feedback show"+(miss?" miss":"");setTimeout(()=>el.className="feedback",450)}
function updateHUD(){$("#score").textContent=state.score;$("#combo").textContent=`${state.combo} ×${multiplier(state.combo)}`;$("#speed").textContent=state.speed.toFixed(2)+"×";$("#lives").textContent="♥ ".repeat(Math.max(0,state.lives)).trim()}
function updateProgress(){const p=Math.min(100,state.gameTime/state.roundLength*100);$("#progressBar").style.width=p+"%"}
function finish(){
 if(state.resultDone)return;state.resultDone=true;state.running=false;cancelAnimationFrame(raf);audio.stop();
 const acc=accuracy(state.good,state.misses,state.wrong);
 const r={score:state.score,maxCombo:state.maxCombo,accuracy:acc,rounds:Math.max(0,state.round-1)};
 const nr=Store.record(selected.id,r); updateStats();
 $("#resultTitle").textContent=selected.title;$("#resultScore").textContent=r.score;$("#resultAccuracy").textContent=r.accuracy+"%";$("#resultCombo").textContent=r.maxCombo;$("#resultRounds").textContent=r.rounds;$("#newRecord").classList.toggle("hidden",!nr);
 document.body.classList.remove("playing");show(result);
}
function pause(){
 if(!state||!state.running)return;
 state.running=false;state.paused=true;audio.stop();
 openModal(`<h2>Пауза</h2><p>Игровое время остановлено.</p><button id="resume" class="primary">Продолжить</button><button id="quit" class="secondary" style="margin-left:8px">Выйти</button>`);
 $("#resume").onclick=()=>{closeModal();state.paused=false;countdownStart()};$("#quit").onclick=()=>{closeModal();audio.stop();document.body.classList.remove("playing");show(catalog);updateStats()}
}
function openModal(html){$("#modalContent").innerHTML=html;$("#modal").classList.remove("hidden")}
function closeModal(){$("#modal").classList.add("hidden")}
$("#playBtn").onclick=start;$("#againBtn").onclick=start;$("#backBtn").onclick=()=>{show(catalog);updateStats()};
$("#pauseBtn").onclick=pause;$("#closeModal").onclick=closeModal;
$("#helpBtn").onclick=()=>openModal(`<h2>Как играть</h2><ul><li>Нажимай одну из четырёх дорожек в момент попадания плитки в зелёную линию.</li><li>Perfect: ±90 мс, Отлично: ±180 мс, Есть: ±280 мс.</li><li>Длинную плитку нужно удерживать до конца.</li><li>Три ошибки завершают партию.</li><li>После первого полного круга игра продолжается быстрее с новой раскладкой.</li><li>На компьютере: D, F, J, K. Esc — пауза.</li></ul>`);
$("#recordsBtn").onclick=()=>{
 const rs=Store.all().records||{};
 openModal(`<h2>Мои рекорды</h2>${SONGS.map(s=>{const r=rs[s.id]||{};return `<div class="record-row"><b>${s.title}</b><span>${r.score||0} очков · ${r.accuracy||0}% · ${r.cleared?"Пройдено":"—"}</span></div>`}).join("")}<p>Рекорды хранятся только в этом браузере.</p>`)
};
$("#soundBtn").onclick=()=>{const v=!Store.muted();Store.setMuted(v);audio.setMuted(v);$("#soundBtn").textContent=v?"🔇":"🔊"};
document.querySelectorAll(".filter").forEach(b=>b.onclick=()=>{document.querySelectorAll(".filter").forEach(x=>x.classList.remove("active"));b.classList.add("active");filter=b.dataset.filter;renderSongs()});
document.querySelectorAll("#lanes button").forEach(b=>{
 const l=+b.dataset.lane;
 b.addEventListener("pointerdown",e=>{e.preventDefault();hitLane(l);heldLane=l});
 b.addEventListener("pointerup",e=>{e.preventDefault();releaseLane(l)});
 b.addEventListener("pointercancel",()=>releaseLane(l));
});
window.addEventListener("keydown",e=>{
 const map={d:0,f:1,j:2,k:3};const key=e.key.toLowerCase();
 if(key in map){e.preventDefault();hitLane(map[key])}
 if(e.key==="Escape")pause();
});
window.addEventListener("keyup",e=>{const map={d:0,f:1,j:2,k:3};const key=e.key.toLowerCase();if(key in map)releaseLane(map[key])});
document.addEventListener("visibilitychange",()=>{if(document.hidden&&state?.running)pause()});
$("#soundBtn").textContent=Store.muted()?"🔇":"🔊";
renderSongs();updateHero();updateStats();resize();
