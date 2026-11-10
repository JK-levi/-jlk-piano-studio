// Source times use quarter-note units; playback plans use the musical pulse.
export const METERS={
 '4/4':{numerator:4,denominator:4,quarters:4,pulses:4,pulseQuarters:1,unit:'quarter-note',count:'1–2–3–4'},
 '3/4':{numerator:3,denominator:4,quarters:3,pulses:3,pulseQuarters:1,unit:'quarter-note',count:'1–2–3'},
 '6/8':{numerator:6,denominator:8,quarters:3,pulses:2,pulseQuarters:1.5,unit:'dotted-quarter',count:'1-la-li · 2-la-li'},
 '12/8':{numerator:12,denominator:8,quarters:6,pulses:4,pulseQuarters:1.5,unit:'dotted-quarter',count:'1-la-li · 2-la-li · 3-la-li · 4-la-li'}
};
export const NOTE_VALUES={
 '0.5':{name:'Eighth',base:.5,dotted:false},'1':{name:'Quarter',base:1,dotted:false},
 '1.5':{name:'Dotted quarter',base:1,dotted:true},'2':{name:'Half',base:2,dotted:false},
 '3':{name:'Dotted half',base:2,dotted:true},'4':{name:'Whole',base:4,dotted:false},
 '6':{name:'Dotted whole',base:4,dotted:true}
};
export function meter(signature=[4,4]){
 const key=Array.isArray(signature)&&signature.length===2?signature.join('/'):'';
 if(!METERS[key]||signature.some(n=>!Number.isInteger(n)))throw Error('Choose 4/4, 3/4, 6/8 or 12/8 time.');
 return {...METERS[key],key};
}
export function positionLabel(signature,pulse){
 const m=meter(signature),bar=Math.floor(pulse/m.pulses),within=pulse-bar*m.pulses,beat=Math.floor(within)+1;
 const subdivision=m.denominator===8?['','-la','-li'][Math.min(2,Math.floor((within%1)*3+1e-7))]:'';
 return `Measure ${bar+1} · ${beat}${subdivision} of ${m.pulses}`;
}
export function capacityLabel(signature,quarters){
 const m=meter(signature),amount=m.denominator===8?quarters*2:quarters;
 return `${amount} ${m.denominator===8?'eighth-note':'quarter-note'} units`;
}
