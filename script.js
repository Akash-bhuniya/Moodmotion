const emojis = [
  { char:"😃", bg:"#ffe16b", message:"Feeling happy!", category:"GOOD VIBES", kicker:"THE HAPPY ONE", description:"Good energy looks great on you.", transition:"pop" },
  { char:"😍", bg:"#ff8db8", message:"In love!", category:"HEART EYES", kicker:"THE ROMANTIC ONE", description:"Everything looks a little more magical.", transition:"heart" },
  { char:"😎", bg:"#70cfff", message:"Cool and confident", category:"TOO COOL", kicker:"THE CONFIDENT ONE", description:"Own your vibe. You’ve got this.", transition:"slide" },
  { char:"🤯", bg:"#c29bff", message:"Mind blown!", category:"PLOT TWIST", kicker:"THE SHOCKED ONE", description:"Well, that escalated quickly.", transition:"spin" },
  { char:"😴", bg:"#86d8cb", message:"Sleepy time", category:"SLOW MODE", kicker:"THE SLEEPY ONE", description:"Rest is productive too. Recharge.", transition:"soft" },
  { char:"😡", bg:"#ff906f", message:"Getting angry!", category:"HOT TEMPER", kicker:"THE FIERY ONE", description:"Take a breath. Let it pass.", transition:"shake" },
  { char:"🤣", bg:"#a8df79", message:"Can’t stop laughing!", category:"HAPPY TEARS", kicker:"THE FUNNY ONE", description:"A little laughter fixes a lot.", transition:"bounce" },
  { char:"🥶", bg:"#91caff", message:"Too cold!", category:"ICE COLD", kicker:"THE CHILLY ONE", description:"Somebody bring a warm blanket.", transition:"drop" },
  { char:"🤑", bg:"#f5d66e", message:"Feeling rich!", category:"MONEY MOOD", kicker:"THE BOSS ONE", description:"Big plans. Bigger energy.", transition:"pop" },
  { char:"🤩", bg:"#ffabb0", message:"Wow, amazed!", category:"STAR STRUCK", kicker:"THE STAR ONE", description:"Keep finding reasons to be amazed.", transition:"spin" },
  { char:"🥳", bg:"#f7a7e8", message:"Party time!", category:"LET'S CELEBRATE", kicker:"THE PARTY ONE", description:"Make this moment a celebration.", transition:"bounce" },
  { char:"🥹", bg:"#a8c7ff", message:"A little emotional", category:"SOFT MOMENT", kicker:"THE TENDER ONE", description:"It's okay to feel it all.", transition:"soft" },
  { char:"🤔", bg:"#b6a6ff", message:"Thinking it through", category:"DEEP THOUGHTS", kicker:"THE THINKER", description:"Curiosity looks good on you.", transition:"slide" },
  { char:"😇", bg:"#a9e8d1", message:"Feeling angelic", category:"PURE ENERGY", kicker:"THE ANGEL ONE", description:"Keep spreading a little kindness.", transition:"drop" },
  { char:"🥱", bg:"#9fc5d9", message:"Need a little break", category:"LOW BATTERY", kicker:"THE TIRED ONE", description:"Pause, breathe, and reset.", transition:"soft" },
  { char:"🤗", bg:"#ffc18f", message:"Sending a big hug!", category:"WARM & FUZZY", kicker:"THE HUGGER", description:"A little warmth goes a long way.", transition:"heart" }
];

let index = 0;
let timer = null;
let isPlaying = true;
const $ = (id) => document.getElementById(id);
const emojiDisplay = $("emojiDisplay");
const emojiMessage = $("emojiMessage");
const sliderBox = $("sliderBox");
const dots = $("dots");
const emojiStage = $("emojiStage");
const speedSelect = $("speedSelect");
const favoriteButton = $("favoriteButton");
let soundEnabled = false;
let ambienceEnabled = false;
let audioContext = null;
let ambienceNodes = [];
let favorites = loadFavorites();
let intensityEnabled = true;
let moodHistory = loadMoodHistory();
let trailTimer = null;
let trailPosition = 0;
const moodHistoryKey = "moodmotion-history";

function loadMoodHistory() {
  try {
    const saved = JSON.parse(localStorage.getItem("moodmotion-history") || "[]");
    return Array.isArray(saved) ? saved.filter(i => Number.isInteger(i) && i >= 0 && i < emojis.length).slice(0, 6) : [];
  } catch (_) { return []; }
}
function saveMoodHistory() {
  try { localStorage.setItem(moodHistoryKey, JSON.stringify(moodHistory)); } catch (_) {}
}
function renderMoodHistory() {
  const host = $("moodHistory");
  if (!host) return;
  host.innerHTML = "";
  moodHistory.forEach(i => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `history-chip${i === index ? " active" : ""}`;
    button.textContent = emojis[i].char;
    button.title = `Revisit ${emojis[i].message}`;
    button.setAttribute("aria-label", `Revisit ${emojis[i].message}`);
    button.addEventListener("click", () => goTo(i));
    host.appendChild(button);
  });
}
function rememberMood() {
  moodHistory = [index, ...moodHistory.filter(i => i !== index)].slice(0, 6);
  saveMoodHistory();
  renderMoodHistory();
}
function vibrateForMood() {
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    const patterns = { angry:[35,25,35], laugh:[12,18,12], love:[18], party:[20,25,20], shock:[45], cold:[12,30,12], hug:[25] };
    try { navigator.vibrate(patterns[emojiStage.dataset.effect] || 12); } catch (_) {}
  }
}
function createReactionTrail() {
  if (!intensityEnabled || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  const stage = $("emojiStage");
  const count = 8;
  for (let i = 0; i < count; i++) {
    const particle = document.createElement("span");
    particle.className = "reaction-trail-dot";
    const angle = (Math.PI * 2 * i) / count + trailPosition;
    const distance = 38 + (i % 3) * 13;
    particle.style.setProperty("--trail-x", `${Math.cos(angle) * distance}px`);
    particle.style.setProperty("--trail-y", `${Math.sin(angle) * distance}px`);
    particle.style.setProperty("--trail-delay", `${i * 24}ms`);
    stage.appendChild(particle);
    window.setTimeout(() => particle.remove(), 800);
  }
  trailPosition += .42;
}

function loadFavorites() {
  try { return new Set(JSON.parse(localStorage.getItem("moodmotion-favorites") || "[]")); }
  catch (_) { return new Set(); }
}
function saveFavorites() {
  try { localStorage.setItem("moodmotion-favorites", JSON.stringify([...favorites])); } catch (_) {}
}
function refreshFavoriteButton() {
  const saved = favorites.has(index);
  favoriteButton.textContent = saved ? "♥" : "♡";
  favoriteButton.classList.toggle("is-favorite", saved);
  favoriteButton.setAttribute("aria-pressed", String(saved));
  favoriteButton.setAttribute("aria-label", saved ? "Remove saved mood" : "Save this mood");
  favoriteButton.title = saved ? "Remove saved mood" : "Save mood";
}
function getAudioContext() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  if (!audioContext) audioContext = new AudioCtx();
  if (audioContext.state === "suspended") audioContext.resume();
  return audioContext;
}
function playMoodSound() {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  const moodNotes = [659.25, 783.99, 587.33, 880, 392, 220, 740, 493.88, 880, 987.77, 783.99, 523.25, 440, 698.46, 349.23, 587.33];
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = index === 5 ? "triangle" : "sine";
  osc.frequency.value = moodNotes[index];
  gain.gain.setValueAtTime(0.0001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.055, ctx.currentTime + 0.025);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.28);
  osc.connect(gain); gain.connect(ctx.destination);
  osc.start(); osc.stop(ctx.currentTime + 0.3);
}
function toggleAmbience() {
  const button = $("ambienceButton");
  ambienceEnabled = !ambienceEnabled;
  button.innerHTML = ambienceEnabled ? "<span>◖</span> Ambient on" : "<span>◖</span> Ambient off";
  button.setAttribute("aria-pressed", String(ambienceEnabled));
  if (!ambienceEnabled) {
    ambienceNodes.forEach(node => { try { node.stop(); } catch (_) {} });
    ambienceNodes = [];
    return;
  }
  const ctx = getAudioContext();
  if (!ctx) {
    ambienceEnabled = false;
    button.innerHTML = "<span>◖</span> Ambient unavailable";
    button.setAttribute("aria-pressed", "false");
    return;
  }
  [110, 164.81].forEach((frequency, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine"; osc.frequency.value = frequency;
    gain.gain.value = i === 0 ? 0.009 : 0.005;
    osc.connect(gain); gain.connect(ctx.destination); osc.start();
    ambienceNodes.push(osc);
  });
}
function burstParticles() {
  const stage = $("emojiStage");
  const colors = ["#ffffff", "var(--mood-color)", "#b7aaff"];
  const particleCount = intensityEnabled ? 22 : 10;
  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement("span");
    particle.className = "burst-particle";
    const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.22;
    const distance = (intensityEnabled ? 75 : 50) + Math.random() * (intensityEnabled ? 125 : 70);
    particle.style.setProperty("--dx", `${Math.cos(angle) * distance}px`);
    particle.style.setProperty("--dy", `${Math.sin(angle) * distance}px`);
    particle.style.setProperty("--particle-color", colors[i % colors.length]);
    stage.appendChild(particle);
    window.setTimeout(() => particle.remove(), 850);
  }
}

function renderDots() {
  dots.innerHTML = "";
  emojis.forEach((emoji, i) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `dot-button${i === index ? " active" : ""}`;
    button.setAttribute("aria-label", `Show mood ${i + 1}: ${emoji.message}`);
    button.setAttribute("aria-current", i === index ? "true" : "false");
    button.addEventListener("click", () => goTo(i));
    dots.appendChild(button);
  });
}

function updateEmoji() {
  const mood = emojis[index];
  sliderBox.style.setProperty("--mood-color", mood.bg);
  emojiStage.dataset.effect = ["happy","love","cool","shock","sleep","angry","laugh","cold","money","star","party","tender","think","angel","tired","hug"][index];
  document.body.style.setProperty("--page-mood", mood.bg);
  document.body.classList.add("mood-shift");
  emojiDisplay.textContent = mood.char;
  emojiDisplay.setAttribute("aria-label", mood.message);
  emojiMessage.textContent = mood.message;
  $("moodCategory").textContent = mood.category;
  $("moodKicker").textContent = mood.kicker;
  $("moodDescription").textContent = mood.description;
  $("counter").innerHTML = `${String(index + 1).padStart(2, "0")} <i>/</i> ${String(emojis.length).padStart(2, "0")}`;
  $("progressFill").style.width = `${((index + 1) / emojis.length) * 100}%`;
  emojiDisplay.className = `emoji-display enter transition-${mood.transition || "pop"} mood-${emojiStage.dataset.effect}`;
  void emojiDisplay.offsetWidth;
  burstParticles();
  playMoodSound();
  refreshFavoriteButton();
  renderDots();
  rememberMood();
  createReactionTrail();
  vibrateForMood();
}

function goTo(nextIndex) {
  index = (nextIndex + emojis.length) % emojis.length;
  updateEmoji();
}
function prevEmoji() { goTo(index - 1); }
function nextEmoji() { goTo(index + 1); }

function stopAutoChange() {
  if (timer) window.clearInterval(timer);
  timer = null;
}
function startAutoChange() {
  stopAutoChange();
  timer = window.setInterval(nextEmoji, Number(speedSelect.value));
  isPlaying = true;
  $("playIcon").textContent = "Ⅱ";
  $("playText").textContent = "Pause";
  $("playButton").setAttribute("aria-label", "Pause autoplay");
}
function togglePlayback() {
  if (isPlaying) {
    stopAutoChange();
    isPlaying = false;
    $("playIcon").textContent = "▶";
    $("playText").textContent = "Play";
    $("playButton").setAttribute("aria-label", "Start autoplay");
  } else {
    startAutoChange();
  }
}

$("prevButton").addEventListener("click", prevEmoji);
$("nextButton").addEventListener("click", nextEmoji);
$("playButton").addEventListener("click", togglePlayback);
favoriteButton.addEventListener("click", () => {
  if (favorites.has(index)) favorites.delete(index);
  else favorites.add(index);
  saveFavorites();
  refreshFavoriteButton();
});
$("randomButton").addEventListener("click", () => {
  if (emojis.length < 2) return;
  let next = index;
  while (next === index) next = Math.floor(Math.random() * emojis.length);
  goTo(next);
});
$("soundButton").addEventListener("click", () => {
  soundEnabled = !soundEnabled;
  const button = $("soundButton");
  button.innerHTML = soundEnabled ? "<span>♫</span> Sound on" : "<span>♫</span> Sound off";
  button.setAttribute("aria-pressed", String(soundEnabled));
  if (soundEnabled) playMoodSound();
});
$("ambienceButton").addEventListener("click", toggleAmbience);
$("intensityButton").addEventListener("click", () => {
  intensityEnabled = !intensityEnabled;
  const button = $("intensityButton");
  button.innerHTML = intensityEnabled ? "<span>✦</span> Effects boost on" : "<span>✦</span> Effects boost off";
  button.setAttribute("aria-pressed", String(intensityEnabled));
  sliderBox.classList.toggle("effects-boost", intensityEnabled);
});
speedSelect.addEventListener("change", () => { if (isPlaying) startAutoChange(); });
$("themeToggle").addEventListener("click", () => {
  document.body.classList.toggle("light");
  $("themeToggle").textContent = document.body.classList.contains("light") ? "☾" : "☼";
});

const fullscreenButton = $("fullscreenToggle");
const cardFullscreenClose = $("cardFullscreenClose");
fullscreenButton.addEventListener("click", () => {
  document.body.classList.toggle("card-fullscreen");
  syncFullscreenButton();
});
cardFullscreenClose.addEventListener("click", () => {
  document.body.classList.remove("card-fullscreen");
  syncFullscreenButton();
});
function syncFullscreenButton() {
  const active = document.body.classList.contains("card-fullscreen");
  fullscreenButton.textContent = "⛶";
  fullscreenButton.setAttribute("aria-label", active ? "Exit expanded card" : "Expand emoji card");
  fullscreenButton.title = active ? "Exit expanded card" : "Expand emoji card";
}
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && document.body.classList.contains("card-fullscreen")) {
    document.body.classList.remove("card-fullscreen");
    syncFullscreenButton();
  }
});

// Opening sequence: centered logo reveal, lift away, then type the tagline.
function typeTagline(text, speed = 58) {
  const target = $("typedTagline");
  const caret = document.querySelector(".type-caret");
  target.textContent = "";
  let i = 0;
  const tick = () => {
    if (i < text.length) {
      target.textContent += text.charAt(i++);
      window.setTimeout(tick, speed);
    } else if (caret) {
      window.setTimeout(() => { caret.style.opacity = "0"; }, 1100);
    }
  };
  tick();
}
function runIntroSequence() {
  const splash = $("introSplash");
  splash.classList.add("active");
  window.setTimeout(() => {
    splash.classList.add("exit");
    window.setTimeout(() => {
      splash.remove();
      typeTagline("A LITTLE EMOTION, A LOT OF MOTION");
    }, 620);
  }, 1750);
}
document.addEventListener("keydown", (event) => {
  const target = event.target;
  const typing = target && (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable);
  if (typing || event.altKey || event.ctrlKey || event.metaKey) return;
  if (event.key === "Escape" && document.body.classList.contains("card-fullscreen")) return;
  if (event.key === "ArrowRight") { event.preventDefault(); nextEmoji(); }
  if (event.key === "ArrowLeft") { event.preventDefault(); prevEmoji(); }
  if (event.code === "Space") { event.preventDefault(); togglePlayback(); }
  if (event.key.toLowerCase() === "f") {
    document.body.classList.toggle("card-fullscreen"); syncFullscreenButton();
  }
  if (event.key.toLowerCase() === "r") {
    let next = index;
    while (next === index) next = Math.floor(Math.random() * emojis.length);
    goTo(next);
  }
});

// Subtle 3D tilt follows the pointer on desktop; reset on exit.
if (window.matchMedia && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  sliderBox.addEventListener("pointermove", (event) => {
    if (event.pointerType === "touch" || document.body.classList.contains("card-fullscreen")) return;
    const rect = sliderBox.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    sliderBox.style.setProperty("--tilt-x", `${-y * 3.5}deg`);
    sliderBox.style.setProperty("--tilt-y", `${x * 4.5}deg`);
  });
  sliderBox.addEventListener("pointerleave", () => {
    sliderBox.style.setProperty("--tilt-x", "0deg");
    sliderBox.style.setProperty("--tilt-y", "0deg");
  });
}

// Touch / pointer swipe support.
let touchStartX = 0;
let touchStartY = 0;
sliderBox.addEventListener("touchstart", (event) => {
  touchStartX = event.changedTouches[0].clientX;
  touchStartY = event.changedTouches[0].clientY;
}, { passive:true });
sliderBox.addEventListener("touchend", (event) => {
  const dx = event.changedTouches[0].clientX - touchStartX;
  const dy = event.changedTouches[0].clientY - touchStartY;
  if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) dx < 0 ? nextEmoji() : prevEmoji();
}, { passive:true });

// Pause while the card is hovered or the tab is hidden; resume only if it was playing.
sliderBox.addEventListener("mouseenter", () => { if (isPlaying) stopAutoChange(); });
sliderBox.addEventListener("mouseleave", () => { if (isPlaying) startAutoChange(); });
document.addEventListener("visibilitychange", () => {
  if (document.hidden) stopAutoChange();
  else if (isPlaying) startAutoChange();
});

updateEmoji();
startAutoChange();
runIntroSequence();
