let context;
const voices = new Set();
export async function unlock() {
  const Audio = window.AudioContext || window.webkitAudioContext;
  if (!Audio) throw new Error('Web Audio is unavailable in this browser.');
  context ||= new Audio();
  if (context.state !== 'running') await context.resume();
  return context;
}
export function silence() { for (const v of voices) { try { v.stop(); } catch {} } voices.clear(); }
export function now() { return context?.currentTime ?? 0; }
export function tone(midi, when=now(), duration=1.5, volume=0.16) {
  if (!context || context.state!=='running') return;
  const gain=context.createGain();
  const osc=context.createOscillator();
  // A quiet second harmonic adds warmth without external samples.
  const harmonic=context.createOscillator();
  const overtone=context.createGain();
  when=Math.max(when,context.currentTime);
  osc.type='triangle'; harmonic.type='sine';
  osc.frequency.value=440*2**((midi-69)/12); harmonic.frequency.value=osc.frequency.value*2;
  overtone.gain.value=0.12;
  gain.gain.setValueAtTime(0,when); gain.gain.linearRampToValueAtTime(volume,when+0.012);
  gain.gain.exponentialRampToValueAtTime(volume*0.45,when+0.12);
  gain.gain.exponentialRampToValueAtTime(0.0001,when+duration);
  osc.connect(gain); harmonic.connect(overtone); overtone.connect(gain); gain.connect(context.destination);
  for (const source of [osc,harmonic]) { voices.add(source); source.start(when); source.stop(when+duration+0.05); source.onended=()=>{ voices.delete(source); if (source===osc) { gain.disconnect(); overtone.disconnect(); } }; }
}
export function playNotes(notes, {arpeggio=false, beat=0.23, duration=1.8, at=now()}={}) {
  notes.forEach((n,i)=>tone(n.midi,at+(arpeggio?i*beat:0),duration,0.35/Math.sqrt(notes.length)));
}
export function click(at=now(), accent=false) { tone(accent?96:89,at,0.045,0.1); }
