export class AudioEngine{
  constructor(){this.ctx=null;this.master=null;this.muted=false;this.timers=[]}
  async init(){
    if(this.muted) return false;
    try{
      if(!this.ctx) this.ctx=new (window.AudioContext||window.webkitAudioContext)();
      if(this.ctx.state==="suspended") await this.ctx.resume();
      if(!this.master){this.master=this.ctx.createGain();this.master.gain.value=.09;this.master.connect(this.ctx.destination)}
      return true;
    }catch(e){return false}
  }
  setMuted(v){this.muted=v;if(this.master)this.master.gain.value=v?0:.09}
  stop(){this.timers.forEach(clearTimeout);this.timers=[]}
  note(freq,dur=.16,when=0){
    if(!this.ctx||this.muted)return;
    const t=this.ctx.currentTime+when;
    const o=this.ctx.createOscillator(),g=this.ctx.createGain();
    o.type="triangle";o.frequency.value=freq;
    g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.35,t+.015);
    g.gain.exponentialRampToValueAtTime(.0001,t+dur);
    o.connect(g);g.connect(this.master);o.start(t);o.stop(t+dur+.02);
  }
  hit(lane){this.note([261.63,293.66,329.63,392][lane],.12)}
  miss(){this.note(110,.1)}
  scheduleSong(map,startTime,rate){
    if(!this.ctx||this.muted)return;
    const base=[261.63,293.66,329.63,392];
    map.forEach(n=>{
      const delay=(n.time-startTime)/rate;
      if(delay>=0 && delay<20){
        const id=setTimeout(()=>this.note(base[n.lane],n.duration?Math.min(.5,n.duration):.12),delay*1000);
        this.timers.push(id);
      }
    });
  }
}
