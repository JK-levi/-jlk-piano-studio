// Audio scheduling has its own look-ahead timer; animation frames only render
// output-clock visuals. A slow/offscreen visual update must not stop the music.
export class Playback {
  constructor({ audio, requestFrame = fn => globalThis.requestAnimationFrame(fn), cancelFrame = id => globalThis.cancelAnimationFrame(id), setTimer = fn => globalThis.setInterval(fn,25), clearTimer = id => globalThis.clearInterval(id) }) {
    Object.assign(this,{audio,requestFrame,cancelFrame,setTimer,clearTimer});
    this.running=false; this.frameId=null; this.timerId=null;
  }
  stop() {
    this.running=false;
    if(this.frameId!==null)this.cancelFrame(this.frameId);
    if(this.timerId!==null)this.clearTimer(this.timerId);
    this.frameId=this.timerId=null; this.audio.silence();
    this.options?.onFrame?.([],null);
  }
  start(plan,options={}) {
    this.stop(); this.options=options;
    if(!plan.events.length || !Number.isFinite(plan.beats) || plan.beats<=0) { options.onError?.(new Error('No playable events. Load a progression and try again.')); return; }
    if(!Number.isFinite(options.bpm)||options.bpm<40||options.bpm>180) { options.onError?.(new Error('Invalid tempo. Enter a value between 40 and 180 BPM.')); return; }
    this.plan=plan; this.seconds=60/options.bpm; this.startBeat=options.fromBeat||0;
    this.origin=this.audio.now()+0.08-this.startBeat*this.seconds;
    this.cursor=plan.events.findIndex(event=>event.beat>=this.startBeat);
    if(this.cursor<0)this.cursor=plan.events.length;
    this.cycle=0; this.queued=[]; this.running=true; this.scheduled=0;
    this.schedule();
    if(this.running){this.timerId=this.setTimer(this.schedule);this.draw();}
  }
  fail(error) { this.stop(); this.options.onError?.(error); }
  schedule = () => {
    if(!this.running)return;
    try {
      if(!this.audio.isRunning())throw new Error('Audio interrupted. Tap Recover Audio, then Play to continue.');
      const {plan,options,seconds,origin}=this, clock=this.audio.now(), horizon=clock+0.16;
      while(true){
        if(this.cursor>=plan.events.length){if(!options.loop)break;this.cycle++;this.cursor=0;}
        const event=plan.events[this.cursor], at=origin+(event.beat+this.cycle*plan.beats)*seconds;
        if(at>horizon)break;
        this.cursor++;
        // Never emit a catch-up burst of expired chords after a timer stall.
        if(at+event.duration*seconds<=clock)continue;
        const onset=Math.max(at,clock);
        if(event.click)this.audio.click(onset,event.accent);
        else {
          if(!event.notes?.length)throw new Error('Missing chord notes. Reload this progression and try again.');
          event.notes.forEach(note=>this.audio.tone(note.midi,onset,(event.ring||event.duration)*seconds,0.4/Math.sqrt(event.notes.length)));
          this.scheduled++; options.onScheduled?.({event,at:onset,count:this.scheduled});
        }
        this.queued.push({...event,at:onset,until:at+event.duration*seconds});
      }
    }catch(error){this.fail(error);}
  };
  draw = () => {
    if(!this.running)return;
    try {
      // The visual clock can lag audio for output latency, but cannot run ahead
      // of the render clock and prematurely complete/stop unscheduled chords.
      const audible=Math.min(this.audio.now(),this.audio.audibleTime());
      this.queued=this.queued.filter(event=>event.until>audible);
      const elapsed=(audible-this.origin)/this.seconds;
      const beat=Math.max(this.startBeat,elapsed);
      const position=this.options.loop?beat%this.plan.beats:Math.min(beat,this.plan.beats);
      this.options.onFrame?.(this.queued.filter(event=>!event.click&&event.at<=audible),position);
      if(!this.options.loop&&elapsed>=this.plan.beats){this.stop();this.options.onEnd?.();return;}
      this.frameId=this.requestFrame(this.draw);
    }catch(error){this.fail(error);}
  };
}
