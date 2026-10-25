import { ROOTS, QUALITIES } from './theory.js';
const PREFIX = 'jlk-studio-v1-';
export function read(key, fallback) { try { const value=JSON.parse(localStorage.getItem(PREFIX+key)); return value ?? fallback; } catch { return fallback; } }
export function write(key, value) { try { localStorage.setItem(PREFIX+key,JSON.stringify(value)); return true; } catch { return false; } }
export function validSpec(s) { return !!s && ROOTS.includes(s.root) && Object.hasOwn(QUALITIES,s.quality) && Number.isInteger(s.octave) && s.octave>=2 && s.octave<=4 && Number.isInteger(s.inversion) && s.inversion>=0 && s.inversion<QUALITIES[s.quality].steps.length && ['close','open'].includes(s.voicing); }
export function savedProgressions() { const data=read('progressions',[]); return Array.isArray(data) ? data.filter(p=>p && typeof p.name==='string' && p.name.length<=60 && Array.isArray(p.chords) && p.chords.length>0 && p.chords.length<=64 && p.chords.every(validSpec)).slice(0,50) : []; }
