const canvas = document.getElementById("vis");
const ctx = canvas.getContext("2d");
canvas.width = innerWidth;
canvas.height = innerHeight;

let dragging = false;
let fx = 0.5, fy = 0.5;

let lat = 0, lon = 0;
let mode = "bright";    
let bpmValue = 100;
let rPulse = 1;

let synth, kick, kickLoop, melodyLoop;

const SCALE_BRIGHT = ["C5","D5","E5","G5","A5"];
const SCALE_DARK   = ["C3","Eb3","F3","G3","Bb3"];

function startSound() {
  synth = new Tone.Synth({
    oscillator: { type: "sine" }, 
    envelope: { attack: 0.01, decay: 0.2, sustain: 0.2, release: 0.3 }
  }).toDestination();

  kick  = new Tone.MembraneSynth().toDestination();

  kickLoop = new Tone.Loop(time => {
    kick.triggerAttackRelease("C2", "8n", time);
    rPulse = 1.3;
  }, "2n").start(0);

  melodyLoop = new Tone.Loop(time => {
    const scale = mode === "bright" ? SCALE_BRIGHT : SCALE_DARK;

    const idx = Math.max(0, Math.min(scale.length - 1, Math.floor(fx * scale.length)));
    const note = scale[idx];

    const detune = (fx - 0.5) * 600;
    synth.set({ detune, oscillator: { type: (lat >= 0 ? "triangle" : "sine") } });

    const density = 0.2 + fy * 0.8;
    if (Math.random() < density) {
      synth.triggerAttackRelease(note, "8n", time);
    }
  }, "8n").start(0);

  Tone.Transport.start();
}

function draw() {
  requestAnimationFrame(draw);

  const latNorm = (lat + 90) / 180;
  const baseHue = mode === "bright" ? 45 : 210;
  const lightness = mode === "bright" ? (72 + latNorm * 10) : (20 + (1 - latNorm) * 10);
  ctx.fillStyle = `hsl(${baseHue}, 80%, ${lightness}%)`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = mode === "bright" ? "#fd79a8" : "#74b9ff";
  let r = 50 + fx * 200;
  r *= rPulse;
  ctx.beginPath();
  ctx.arc(canvas.width * fx, canvas.height * fy, r, 0, Math.PI * 2);
  ctx.fill();

  const hudX = canvas.width - 210, hudY = 12, hudW = 198, hudH = 70;
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  ctx.fillRect(hudX, hudY, hudW, hudH);
  ctx.fillStyle = "#fff";
  ctx.font = "13px monospace";
  ctx.textBaseline = "top";
  ctx.fillText(`Mode: ${mode}`, hudX + 10, hudY + 8);
  ctx.fillText(`BPM (lon): ${bpmValue.toFixed(0)}`, hudX + 10, hudY + 26);
  ctx.fillText(`Lat: ${lat.toFixed(2)}  Lon: ${lon.toFixed(2)}`, hudX + 10, hudY + 44);

  rPulse += (1 - rPulse) * 0.05;
}

canvas.addEventListener("pointerdown", e => { dragging = true; handlePointer(e); });
canvas.addEventListener("pointermove", e => { if (dragging) handlePointer(e); });
canvas.addEventListener("pointerup",   () => { dragging = false; });
canvas.addEventListener("pointerleave",() => { dragging = false; });

function handlePointer(e) {
  const rect = canvas.getBoundingClientRect();
  fx = (e.clientX - rect.left) / rect.width;
  fy = (e.clientY - rect.top) / rect.height;
}

function setFromLocation() {
  if (!("geolocation" in navigator)) {
    lat = 0; lon = 0;
    applyGeoMappings();
    return;
  }
  navigator.geolocation.getCurrentPosition(pos => {
    lat = pos.coords.latitude;
    lon = pos.coords.longitude;
    applyGeoMappings();
  }, () => {
    lat = 0; lon = 0;
    applyGeoMappings();
  });
}

function applyGeoMappings() {
  mode = lat < 0 ? "bright" : "dark";

  const raw = 90 + ((lon + 180) / 360) * 80;   
  bpmValue = Math.round(raw / 2) * 2;          
  Tone.Transport.bpm.value = bpmValue;

  console.log(`Geo → Mode:${mode}  BPM:${bpmValue}  Lat:${lat.toFixed(2)} Lon:${lon.toFixed(2)}`);
}

document.getElementById("gate")?.addEventListener("click", async ()=>{
  await Tone.start();         
  startSound();
  setFromLocation();
  document.getElementById("gate").style.display = "none";
  draw();
});