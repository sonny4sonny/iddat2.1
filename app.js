const canvas = document.getElementById("vis");
const ctx = canvas.getContext("2d");
resize();
window.addEventListener("resize", resize);

let dragging = false;
let fx = 0.5, fy = 0.5;
let lat = 0, lon = 0;
let bpmValue = 120;
let mode = "light"; 
let isDay = null;
let rPulse = 1;

let synth, kick, pad, kickLoop, melodyLoop, padLoop;

const SCALE_LIGHT = ["C5","D5","E5","G5","A5"]; 
const SCALE_DARK  = ["C3","Eb3","F3","G3","Bb3"]; 

function startSound() {
  
  const reverb = new Tone.Reverb({ decay: 3, wet: 0.3 }).toDestination();

  synth = new Tone.Synth({
    oscillator: { type: "sine" },
    envelope: { attack: 0.01, decay: 0.2, sustain: 0.2, release: 0.3 }
  }).connect(reverb);

  kick = new Tone.MembraneSynth().connect(reverb);

  pad = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: mode === "light" ? "triangle" : "sine" },
    envelope: { attack: 1, decay: 1, sustain: 0.7, release: 4 }
  }).connect(reverb);

  kickLoop = new Tone.Loop(time => {
    kick.triggerAttackRelease("C2", "8n", time);
    rPulse = 1.25;
  }, "2n").start(0);

  melodyLoop = new Tone.Loop(time => {
    const scale = mode === "light" ? SCALE_LIGHT : SCALE_DARK;

    const idx = Math.max(0, Math.min(scale.length - 1, Math.floor(fx * scale.length)));
    const note = scale[idx];
    const density = 0.2 + fy * 0.8;
    const detune = (fx - 0.5) * 600;
    const oscType = mode === "light" ? "triangle" : "sine";

    synth.set({ detune, oscillator: { type: oscType } });

    if (Math.random() < density) {
      synth.triggerAttackRelease(note, "8n", time);
    }
  }, "8n").start(0);

const padNotes = mode === "light"
  ? ["C4","E4","A4","G4"]
  : ["C3","Eb3","G3","Bb3"];
let pIndex = 0;

padLoop = new Tone.Loop(time => {
  pad.triggerAttackRelease(padNotes[pIndex], "2n", time);
  pIndex = (pIndex + 1) % padNotes.length;
}, "2n").start(0);

  padLoop = new Tone.Loop(time => {
    pad.triggerRelease(chords[chordIndex], time);
    chordIndex = (chordIndex + 1) % chords.length;
    pad.triggerAttack(chords[chordIndex], time);
  }, "4m").start(0);

  Tone.Transport.start();
}

async function updateFromGeo() {
  const raw = 90 + ((lon + 180) / 360) * 80; 
  bpmValue = Math.round(raw / 2) * 2;
  Tone.Transport.bpm.value = bpmValue;

  try {
    isDay = await fetchIsDay(lat, lon);
    mode = isDay ? "light" : "dark";
  } catch (e) {
    console.warn("Open-Meteo failed, fallback to timezone guess:", e);
    const utcHour = new Date().getUTCHours();
    const offset = Math.round(lon / 15);
    const localHour = (utcHour + offset + 24) % 24;
    mode = (localHour >= 6 && localHour < 18) ? "light" : "dark";
    isDay = (mode === "light");
  }
}

async function fetchIsDay(latitude, longitude) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=is_day`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Open-Meteo HTTP " + res.status);
  const data = await res.json();
  return data && data.current && Number(data.current.is_day) === 1;
}

canvas.addEventListener("pointerdown", e => { dragging = true; handlePointer(e); });
canvas.addEventListener("pointermove", e => { if (dragging) handlePointer(e); });
canvas.addEventListener("pointerup", () => { dragging = false; });
canvas.addEventListener("pointerleave", () => { dragging = false; });

function handlePointer(e) {
  const rect = canvas.getBoundingClientRect();
  fx = (e.clientX - rect.left) / rect.width;
  fy = (e.clientY - rect.top) / rect.height;
}

function draw() {
  requestAnimationFrame(draw);

  const bg = mode === "light"
    ? `hsl(45, 80%, 75%)`
    : `hsl(210, 60%, 18%)`;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = mode === "light" ? "#fd79a8" : "#74b9ff";
  let r = 60 + fx * 220;
  r *= rPulse;
  ctx.beginPath();
  ctx.arc(canvas.width * fx, canvas.height * fy, r, 0, Math.PI * 2);
  ctx.fill();

  const hudX = canvas.width - 240, hudY = 12, hudW = 228, hudH = 94;
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fillRect(hudX, hudY, hudW, hudH);
  ctx.fillStyle = "#fff";
  ctx.font = "13px monospace";
  ctx.textBaseline = "top";

  const dayText = (isDay === null) ? "…" : isDay ? "Day" : "Night";
  ctx.fillText(`Mode: ${mode.toUpperCase()} (${dayText})`, hudX + 10, hudY + 8);
  ctx.fillText(`BPM (lon): ${bpmValue}`, hudX + 10, hudY + 28);
  ctx.fillText(`Lat: ${lat.toFixed(2)}  Lon: ${lon.toFixed(2)}`, hudX + 10, hudY + 48);
  ctx.fillText(`X→note  Y→density`, hudX + 10, hudY + 68);

  rPulse += (1 - rPulse) * 0.06;
}

document.getElementById("gate")?.addEventListener("click", async () => {
  await Tone.start();
  startSound();
  draw();

  if (!("geolocation" in navigator)) {
    alert("Geolocation not available — using default mappings.");
    mode = "light";
    isDay = null;
    return;
  }

  navigator.geolocation.getCurrentPosition(async (pos) => {
    lat = pos.coords.latitude;
    lon = pos.coords.longitude;
    await updateFromGeo();
  }, () => {
    alert("Couldn’t get location — using defaults.");
  });

  document.getElementById("gate").style.display = "none";
  
});

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}