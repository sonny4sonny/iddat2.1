const canvas = document.getElementById("vis");
const ctx = canvas.getContext("2d");
canvas.width = innerWidth;
canvas.height = innerHeight;

let dragging = false;
let fx = 0.5, fy = 0.5;
let mode = "bright";
let rPulse = 1;
let bpmValue = 100;

let synth, kick, loop;

function startSound() {
  synth = new Tone.Synth().toDestination();
  kick  = new Tone.MembraneSynth().toDestination();

  loop = new Tone.Loop(time => {
    kick.triggerAttackRelease("C2", "8n", time);
    rPulse = 1.3;
  }, "2n").start(0);

  Tone.Transport.start();
}

function updateSound() {
  if (!synth) return;
  const note = mode === "bright" ? "C5" : "C3";
  const detune = (fx - 0.5) * 600;
  synth.set({ detune });

  if (Math.random() < fy) {
    synth.triggerAttackRelease(note, "8n");
  }
}

function draw() {
  requestAnimationFrame(draw);

  ctx.fillStyle = mode === "bright" ? "#ffeaa7" : "#2d3436";
  ctx.fillRect(0,0,canvas.width,canvas.height);

  ctx.fillStyle = mode === "bright" ? "#fd79a8" : "#74b9ff";
  let r = 50 + fx*200;
  r *= rPulse;
  ctx.beginPath();
  ctx.arc(canvas.width*fx, canvas.height*fy, r, 0, Math.PI*2);
  ctx.fill();

  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(canvas.width-110, 10, 100, 28);
  ctx.fillStyle = "#fff";
  ctx.font = "14px monospace";
  ctx.textBaseline = "top";
  ctx.fillText(`BPM: ${bpmValue.toFixed(0)}`, canvas.width-100, 14);

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
  updateSound();
}

function setModeFromLocation() {
  if (!("geolocation" in navigator)) {
    mode = "dark"; return;
  }
  navigator.geolocation.getCurrentPosition(pos => {
    const lat = pos.coords.latitude;
    const lon = pos.coords.longitude;

    mode = lat < 0 ? "bright" : "dark";
    bpmValue = 80 + ((lon + 180) / 360) * 60;
    Tone.Transport.bpm.value = bpmValue;

    console.log(`Lat:${lat.toFixed(2)} Lon:${lon.toFixed(2)} -> Mode:${mode}, BPM:${bpmValue.toFixed(1)}`);
  }, () => {
    mode = "dark";
    bpmValue = 100;
    Tone.Transport.bpm.value = bpmValue;
  });
}

document.getElementById("gate").addEventListener("click", async ()=>{
  await Tone.start();  
  startSound();
  setModeFromLocation();
  document.getElementById("gate").style.display="none";
  draw();
});