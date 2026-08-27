import React, { useState, useMemo, useRef, useCallback, useEffect } from "react";
import greetingCard from "../photos/assest_photo/Greetingcard.png";
import firstPageImage from "../photos/assest_photo/WhatsApp Image 2026-08-26 at 3.02.29 PM.png";
import giftAudioFile from "../photos/assest_photo/WhatsApp Video 2026-08-26 at 3.35.16 PM.mp3";
import rathAudioFile from "../photos/assest_photo/rathathin rathana sister love whatsapp status Tamil  subscribe like.mp3";

/* ---------- tiny cute chime synth (no external audio files needed) ---------- */
const NOTES = [523.25, 587.33, 659.25, 698.46, 783.99, 880.0];

function useChime() {
  const idx = useRef(0);
  const ctxRef = useRef(null);
  return useCallback(() => {
    try {
      if (!ctxRef.current) {
        const AC = window.AudioContext || window.webkitAudioContext;
        ctxRef.current = new AC();
      }
      const ctx = ctxRef.current;
      if (ctx.state === "suspended") ctx.resume();
      const freq = NOTES[idx.current % NOTES.length];
      idx.current += 1;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.45);
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      o.stop(ctx.currentTime + 0.46);
    } catch (e) {
      /* audio not available, fail silently */
    }
  }, []);
}

/* ---------- deterministic pseudo-random helper (stable across renders) ---------- */
function seeded(i, mod, base = 0) {
  const x = Math.sin(i * 999.7 + base) * 10000;
  return (x - Math.floor(x)) * mod;
}

/* ---------- pill <-> heart shape morph (clip-path polygon interpolation) ---------- */
const MORPH_SAMPLES = 20;

function buildHeartPoints(n) {
  const pts = [];
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  const raw = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
    raw.push([x, y]);
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }
  for (const [x, y] of raw) {
    pts.push([((x - minX) / (maxX - minX)) * 100, ((y - minY) / (maxY - minY)) * 100]);
  }
  return pts;
}

function buildPillPoints(n) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    const c = Math.cos(t), s = Math.sin(t);
    const x = Math.sign(c) * Math.pow(Math.abs(c), 0.5) * 50 + 50;
    const y = Math.sign(s) * Math.pow(Math.abs(s), 0.5) * 50 + 50;
    pts.push([x, y]);
  }
  return pts;
}

const HEART_PTS = buildHeartPoints(MORPH_SAMPLES);
const PILL_PTS = buildPillPoints(MORPH_SAMPLES);

function morphClipPath(t) {
  const clamped = Math.max(0, Math.min(1, t));
  const parts = [];
  for (let i = 0; i < MORPH_SAMPLES; i++) {
    const x = PILL_PTS[i][0] + (HEART_PTS[i][0] - PILL_PTS[i][0]) * clamped;
    const y = PILL_PTS[i][1] + (HEART_PTS[i][1] - PILL_PTS[i][1]) * clamped;
    parts.push(`${x.toFixed(2)}% ${y.toFixed(2)}%`);
  }
  return `polygon(${parts.join(",")})`;
}

/* ---------- word-by-word typewriter reveal ---------- */
function useTypewriter(text, wordsPerTick = 4, intervalMs = 40) {
  const tokens = useMemo(() => text.split(/(\s+)/), [text]);
  const [count, setCount] = useState(0);
  const done = count >= tokens.length;

  useEffect(() => {
    if (done) return;
    const t = setTimeout(() => setCount((c) => Math.min(c + wordsPerTick, tokens.length)), intervalMs);
    return () => clearTimeout(t);
  }, [count, done, tokens.length, wordsPerTick, intervalMs]);

  const visible = tokens.slice(0, count).join("");
  const skip = () => setCount(tokens.length);
  return { visible, done, skip };
}

/* ---------- floating / bursting emoji particles ---------- */
function Particles({ emojis, count, mode = "float", seedBase = 0 }) {
  const items = useMemo(() => {
    return Array.from({ length: count }).map((_, i) => {
      const left = seeded(i, 100, seedBase + 1);
      const top = seeded(i, 100, seedBase + 2);
      const delay = seeded(i, 3, seedBase + 3);
      const dur = 2.5 + seeded(i, 2.5, seedBase + 4);
      const size = 14 + seeded(i, 16, seedBase + 5);
      const rot = seeded(i, 360, seedBase + 6);
      const angle = (360 / count) * i + seeded(i, 30, seedBase + 8);
      const dist = 80 + seeded(i, 70, seedBase + 7);
      const emoji = emojis[i % emojis.length];
      return { left, top, delay, dur, size, rot, emoji, angle, dist, key: i };
    });
  }, [count, emojis, seedBase]);

  return (
    <div className={`grr-particles grr-particles-${mode}`} aria-hidden="true">
      {items.map((p) => (
        <span
          key={p.key}
          className={`grr-particle grr-particle-${mode}`}
          style={
            mode === "burst"
              ? {
                  left: "50%",
                  top: "50%",
                  fontSize: p.size,
                  animationDelay: `${p.delay * 0.12}s`,
                  "--tx": `${Math.cos((p.angle * Math.PI) / 180) * p.dist}px`,
                  "--ty": `${Math.sin((p.angle * Math.PI) / 180) * p.dist}px`,
                  "--rot": `${p.rot}deg`,
                }
              : {
                  left: `${p.left}%`,
                  top: `${p.top}%`,
                  fontSize: p.size,
                  animationDelay: `${p.delay}s`,
                  animationDuration: `${p.dur}s`,
                }
          }
        >
          {p.emoji}
        </span>
      ))}
    </div>
  );
}

function Butterflies({ count = 6, seedBase = 0 }) {
  const items = useMemo(() => {
    return Array.from({ length: count }).map((_, i) => {
      const left = seeded(i, 100, seedBase + 1);
      const top = seeded(i, 90, seedBase + 2) + 5;
      const delay = seeded(i, 4, seedBase + 3);
      const dur = 5 + seeded(i, 4, seedBase + 4);
      const size = 16 + seeded(i, 10, seedBase + 5);
      return { left, top, delay, dur, size, key: i };
    });
  }, [count, seedBase]);
  return (
    <div className="grr-particles" aria-hidden="true">
      {items.map((b) => (
        <span
          key={b.key}
          className="grr-butterfly"
          style={{
            left: `${b.left}%`,
            top: `${b.top}%`,
            fontSize: b.size,
            animationDelay: `${b.delay}s`,
            animationDuration: `${b.dur}s`,
          }}
        >
          🦋
        </span>
      ))}
    </div>
  );
}

/* ================= LETTER TEXT ================= */
const LETTER_TEXT = `Hey MK/Anni,


I don't know what good I did, but having you as my sister is the luckiest thing that ever happened to me.You are the only person with whom I can share anything, anytime, without thinking twice.
In my hardest days, you were there - silently, strongly. I will never forget that.You are not just my sister, you are one of the biggest lucky charms of my life.
All I ever want is to see you happy. Your smile is all I want to see for the rest of my life.If I had known in my school days itself that you would help me this much, support me this much, I would have spent even more time with you. 
But it's okay, we have a whole lifetime ahead.Till the end of my life, I need your love, your care, your scolding, everything.One day, I will proudly tell my wife about you. I will tell her,
 "See, do you have someone this caring in your life?" And I will show you as an example of what true love looks like.
 Please be there in all my ups and downs, Anni. Always.Those small texts from you - "Vanakam" "Ena Panra?" "Saptiya?" - you have no idea how many times those two lines cured my loneliness. 
 For you it might be just a small message, but for me, they meant the world.Thank you for everything, Anniiii. Thank you for being you.Happy Raksha Bandhan, my everything.

With love,
Your brother,
MS`;

/* ---------- photos ---------- */
const PHOTO_IMPORTS = Object.entries(
  import.meta.glob("../photos/*.{jpg,jpeg,png,webp,avif}", {
    eager: true,
    import: "default",
  })
)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([, src]) => src);

const MAIN_PHOTO = PHOTO_IMPORTS[0] || "";
const PHOTOS = PHOTO_IMPORTS;
const GREETING_CARD = greetingCard;
const FIRST_PAGE_IMAGE = firstPageImage;
const GIFT_AUDIO_FILE = giftAudioFile;

function PhotoImg({ src, className, fallback = "📷" }) {
  const [failed, setFailed] = useState(false);
  return !failed ? (
    <img src={src} alt="" className={className} onError={() => setFailed(true)} />
  ) : (
    <div className={`grr-photo-placeholder ${className || ""}`}>{fallback}</div>
  );
}

/* ================= SCENES ================= */

function Scene1({ yesCount, onYes, onNo, bursting }) {
  const t = Math.min(yesCount, 5) / 5;
  const [noPos, setNoPos] = useState({ x: 0, y: 0 });

  const dodgeNo = () => {
    const x = Math.round(seeded(Date.now() % 97, 90, 1) - 45);
    const y = Math.round(seeded(Date.now() % 53, 50, 2) - 25);
    setNoPos({ x, y });
    onNo();
  };

  return (
    <div className="grr-scene grr-scene1">
      <p className="grr-topline">
        <span className="grr-main-rakhi-title">Happy Raksha Bandhan ✨️</span>
        <br />
        <span className="grr-sub-rakhi-title">Tied by thread, bonded by Care since forever 💖</span>
      </p>

      <div className="grr-window">
        <img src={FIRST_PAGE_IMAGE} alt="Raksha Bandhan greeting" className="grr-first-page-image" />
      </div>

      <p className="grr-question">Are you really excited?</p>

      <div className="grr-buttons">
        <div className="grr-heart-btn-wrap">
          <button
            className="grr-btn grr-btn-heart"
            style={{ clipPath: morphClipPath(t) }}
            onClick={onYes}
            disabled={bursting}
          >
            {yesCount >= 5 ? "❤️" : "YES"}
          </button>
          {bursting && <Particles emojis={["❤️", "💕", "💖", "✨"]} count={14} mode="burst" seedBase={20} />}
        </div>
        <button
          className="grr-btn grr-btn-no"
          style={{ transform: `translate(${noPos.x}px, ${noPos.y}px)` }}
          onClick={dodgeNo}
        >
          NO
        </button>
      </div>
    </div>
  );
}

function Scene2({ openedBoxes, onGift }) {
  const boxes = [
    { id: 1, label: "Gift 1" },
    { id: 2, label: "Gift 2" },
    { id: 3, label: "Gift 3" },
  ];

  return (
    <div className="grr-scene grr-scene2">
      <svg className="grr-curve-text" viewBox="0 0 300 70">
        <path id="grrCurve" d="M 15 60 Q 150 -5 285 60" fill="transparent" />
        <text width="300">
          <textPath href="#grrCurve" startOffset="50%" textAnchor="middle">
            A royal gift awaits you 👑
          </textPath>
        </text>
      </svg>

      <div className="grr-gift-row">
        {boxes.map(({ id, label }) => {
          const isOpened = id <= openedBoxes;
          const isNextAvailable = id === openedBoxes + 1;
          const isLocked = id > openedBoxes + 1;
          return (
            <button
              key={id}
              className={`grr-royal-box grr-gift-box ${isOpened ? "grr-gift-box-open" : ""} ${isLocked ? "grr-gift-box-locked" : ""} ${isNextAvailable ? "grr-gift-box-next" : ""}`}
              onClick={() => !isLocked && onGift(id)}
              aria-label={`${label} box`}
              disabled={isLocked}
            >
              <span className="grr-royal-crown">{isOpened ? "✨" : "👑"}</span>
              <div className="grr-royal-lid">
                <span className="grr-royal-gem" />
              </div>
              <div className="grr-royal-body">
                <span className="grr-royal-trim grr-royal-trim-v" />
                <span className="grr-royal-trim grr-royal-trim-h" />
              </div>
              {!isOpened && <span className="grr-tap-hint">👆</span>}
            </button>
          );
        })}
      </div>

      <p className="grr-cta-bottom">CLICK THE NEXT GIFT</p>
    </div>
  );
}

function Scene3({ onNext }) {
  return (
    <div className="grr-scene grr-scene3">
      <div className="grr-rakhi-card grr-greeting-card-wrap">
        <PhotoImg src={GREETING_CARD} className="grr-greeting-card-image" fallback="💞" />
      </div>
      <button className="grr-continue-btn" onClick={onNext}>
        tap to continue ▸
      </button>
    </div>
  );
}

function Scene4({ onNext }) {
  const { visible, done, skip } = useTypewriter(LETTER_TEXT, 4, 40);
  return (
    <div className="grr-scene grr-scene4">
      <div className="grr-letter-scroll" onClick={skip}>
        <p className="grr-letter">
          {visible}
          {!done && <span className="grr-caret">▌</span>}
        </p>
      </div>
      <button className={`grr-continue-btn ${done ? "grr-show" : "grr-hide"}`} onClick={onNext}>
        tap to continue ▸
      </button>
    </div>
  );
}

function Scene5({ onNext }) {
  return (
    <div className="grr-scene grr-scene5">
      <p className="grr-topline">Our little gallery 📸</p>
      <div className="grr-vcarousel">
        {PHOTOS.map((src, i) => (
          <div className="grr-vphoto-card" key={i}>
            <PhotoImg src={src} />
          </div>
        ))}
      </div>
      <p className="grr-scroll-hint">↕ scroll to see more</p>
      <button className="grr-continue-btn" onClick={onNext}>
        tap to continue ▸
      </button>
    </div>
  );
}

function Scene6({ onRestart }) {
  return (
    <div className="grr-scene grr-scene6">
      <Particles emojis={["💗", "💕", "❤️", "💖"]} count={16} mode="burst" seedBase={70} />
      <Particles emojis={["✉️", "🎀", "✨"]} count={9} mode="float" seedBase={80} />

      <p className="grr-final-title">Once again, Happy Raksha Bandhan</p>
      <p className="grr-final-sub">Thank you for everything for all the memories, the care, the laughs, and for simply being there.
I never want this beautiful bond we share to end, no matter where life takes us, I’ll always be there for you, and I’ll always be thankful for this bond we share. ❤️</p>

      <button className="grr-btn grr-btn-replay" onClick={onRestart}>
        🔁 Watch again
      </button>
    </div>
  );
}

/* ================= MAIN APP ================= */

const TOTAL_SCENES = 6;

export default function GiftRevealReel() {
  const [scene, setScene] = useState(1);
  const [yesCount, setYesCount] = useState(0);
  const [bursting, setBursting] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [giftProgress, setGiftProgress] = useState(0);
  const [currentGift, setCurrentGift] = useState(0);
  const playChime = useChime();
  const giftAudioRef = useRef(null);
  const audioSourceRef = useRef(null); // 'rath' for center loop, 'gift3' for third-box audio

  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  const goTo = (n) => {
    playChime();
    setScene(n);
  };

  const handleYes = () => {
    if (bursting) return;
    playChime();
    setYesCount((c) => {
      const next = c + 1;
      if (next >= 5) {
        setBursting(true);
        setTimeout(() => setScene(2), 750);
      }
      return next;
    });
  };

  const handleNo = () => {
    playChime();
  };

  const openGiftBox = (giftId) => {
    if (giftId !== giftProgress + 1) return;
    setCurrentGift(giftId);
    playChime();

    if (giftId === 3) {
      try {
        if (giftAudioRef.current) {
          giftAudioRef.current.pause();
          giftAudioRef.current.currentTime = 0;
        }
        const audio = new Audio(GIFT_AUDIO_FILE);
        giftAudioRef.current = audio;
        audio.volume = 1;
        audio.loop = false;
        audioSourceRef.current = 'gift3';
        audio.play().catch(() => {});
      } catch (e) {
        // Ignore audio issues in unsupported browsers
      }
    }
    if (giftId === 2) {
      try {
        if (giftAudioRef.current) {
          giftAudioRef.current.pause();
          giftAudioRef.current.currentTime = 0;
        }
        const audio = new Audio(rathAudioFile);
        giftAudioRef.current = audio;
        audio.volume = 1;
        audio.loop = true; // keep looping until user taps to continue in the letter
        audioSourceRef.current = 'rath';
        audio.play().catch(() => {});
      } catch (e) {
        // Ignore audio issues in unsupported browsers
      }
    }

    if (giftId === 1) setScene(3);
    else if (giftId === 2) setScene(4);
    else setScene(5);
  };

  const continueGiftReveal = () => {
    if (currentGift === 0) return;
    playChime();
    // stop only the center-box looping song when continuing from the letter
    if (audioSourceRef.current === 'rath' && giftAudioRef.current) {
      try {
        giftAudioRef.current.pause();
        giftAudioRef.current.loop = false;
        giftAudioRef.current.currentTime = 0;
      } catch (e) {
        // ignore
      }
      giftAudioRef.current = null;
      audioSourceRef.current = null;
    }

    const nextProgress = currentGift;
    setGiftProgress(nextProgress);
    setCurrentGift(0);

    if (nextProgress >= 3) {
      setScene(6);
    } else {
      setScene(2);
    }
  };

  const restart = () => {
    playChime();
    if (giftAudioRef.current) {
      giftAudioRef.current.pause();
      giftAudioRef.current.currentTime = 0;
      giftAudioRef.current = null;
      audioSourceRef.current = null;
    }
    setSeconds(0);
    setYesCount(0);
    setBursting(false);
    setGiftProgress(0);
    setCurrentGift(0);
    setScene(1);
  };

  return (
    <div className="grr-page">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@600;700&family=Quicksand:wght@500;600;700;800&display=swap');

        * { box-sizing: border-box; }

        .grr-page {
          min-height: 100vh;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: radial-gradient(circle at 25% 15%, #fff8f2, #ffe9e0 45%, #ffd6c9 100%);
          font-family: 'Quicksand', sans-serif;
          padding: 28px 12px;
          position: relative;
          overflow: hidden;
        }
        .grr-backdrop {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: repeating-linear-gradient(45deg, rgba(255,255,255,0.5) 0 18px, rgba(255,214,232,0.35) 18px 36px);
          opacity: 0.6;
        }

        .grr-phone-wrap { position: relative; z-index: 1; animation: grrWobble 6s ease-in-out infinite; }
        @keyframes grrWobble {
          0%, 100% { transform: translate(0,0) rotate(0deg); }
          25% { transform: translate(1px,-1px) rotate(0.3deg); }
          50% { transform: translate(-1px,1px) rotate(-0.2deg); }
          75% { transform: translate(1px,1px) rotate(0.2deg); }
        }

        .grr-phone {
          width: min(380px, 88vw);
          aspect-ratio: 9 / 16;
          background: linear-gradient(160deg, #2b2b2b, #171717);
          border-radius: 46px;
          padding: 12px 10px;
          box-shadow: 0 30px 60px rgba(60,30,20,0.35), 0 8px 18px rgba(60,30,20,0.2);
          display: flex;
          flex-direction: column;
        }

        .grr-statusbar { display: flex; align-items: center; justify-content: space-between; color: #fff; font-size: 11px; font-weight: 700; padding: 2px 10px 6px; }
        .grr-rec { display: flex; align-items: center; gap: 4px; letter-spacing: 0.5px; }
        .grr-dot { width: 7px; height: 7px; border-radius: 50%; background: #ff3b30; display: inline-block; animation: grrRecPulse 1s ease-in-out infinite; }
        @keyframes grrRecPulse { 0%,100% { opacity: 1; } 50% { opacity: 0.25; } }

        .grr-browserbar {
          display: flex; align-items: center; justify-content: center; gap: 6px;
          background: rgba(255,255,255,0.92); border-radius: 999px; padding: 6px 10px; margin: 0 6px 8px;
          font-size: 11px; color: #6b6b6b; font-weight: 600; box-shadow: 0 2px 6px rgba(0,0,0,0.15);
        }

        .grr-progress { display: flex; gap: 4px; padding: 0 10px 8px; }
        .grr-seg { flex: 1; height: 4px; background: rgba(255,255,255,0.35); border-radius: 2px; overflow: hidden; }
        .grr-segfill { height: 100%; width: 0%; background: #fff; }
        .grr-segfill.grr-full { width: 100%; }
        .grr-segfill.grr-active { animation: grrFill 4.5s linear forwards; }
        @keyframes grrFill { from { width: 0%; } to { width: 100%; } }

        .grr-card-outer {
          flex: 1; margin: 2px 6px 8px; border-radius: 26px; padding: 12px; background-color: #fff;
          background-image:
            linear-gradient(45deg, #ff8c42 25%, transparent 25%),
            linear-gradient(-45deg, #ff8c42 25%, transparent 25%),
            linear-gradient(45deg, transparent 75%, #ff8c42 75%),
            linear-gradient(-45deg, transparent 75%, #ff8c42 75%);
          background-size: 18px 18px;
          background-position: 0 0, 0 9px, 9px -9px, -9px 0px;
          box-shadow: inset 0 0 0 6px #fff;
        }

        .grr-card-inner {
          height: 100%; width: 100%; background: #fffdfa; border-radius: 18px; position: relative; overflow: hidden;
          display: flex; align-items: center; justify-content: center; padding: 14px 10px;
          box-shadow: inset 0 0 0 2px rgba(255,140,66,0.18);
        }

        .grr-scene {
          width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center;
          justify-content: space-between; position: relative; animation: grrPop 0.5s ease;
        }
        @keyframes grrPop { from { opacity: 0; transform: scale(0.85); } to { opacity: 1; transform: scale(1); } }

        .grr-topline, .grr-question, .grr-final-title { font-family: 'Caveat', cursive; color: #d62d4d; font-weight: 700; text-align: center; line-height: 1.15; }
        .grr-topline { font-size: clamp(17px, 5vw, 21px); margin-top: 2px; }
        .grr-main-rakhi-title {
          display: inline-block;
          font-size: clamp(22px, 5.5vw, 30px);
          line-height: 1.1;
          color: #d62d4d;
          white-space: nowrap;
        }
        .grr-sub-rakhi-title {
          display: inline-block;
          font-size: clamp(14px, 3.5vw, 18px);
          line-height: 1.3;
          color: #d62d4d;
          margin-top: 4px;
        }
        .grr-question { font-size: clamp(19px, 5.5vw, 25px); animation: grrBounceText 1.8s ease-in-out infinite; }
        @keyframes grrBounceText { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }

        .grr-buttons { display: flex; gap: 20px; margin-bottom: 4px; align-items: center; min-height: 70px; }
        .grr-heart-btn-wrap { position: relative; }
        .grr-btn {
          font-family: 'Quicksand', sans-serif; font-weight: 800; border: none; padding: 13px 30px; font-size: 17px;
          color: #fff; cursor: pointer; box-shadow: 0 6px 0 rgba(0,0,0,0.15); transition: transform 0.25s ease;
        }
        .grr-btn:active { filter: brightness(0.95); }
        .grr-btn-heart {
          width: 92px; height: 76px; padding: 0; background: linear-gradient(135deg, #ff9aa2, #ff5f7e);
          transition: clip-path 0.35s ease; display: flex; align-items: center; justify-content: center; font-size: 20px;
        }
        .grr-btn-no { border-radius: 999px; background: linear-gradient(135deg, #b9d7ff, #8fb8f5); transition: transform 0.2s ease; }

        .grr-btn-replay { border-radius: 999px; background: linear-gradient(135deg, #b8e0d2, #8fd3c4); margin-top: 14px; animation: grrBounceBtn 1.4s ease-in-out infinite; }
        @keyframes grrBounceBtn { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }

        .grr-window { position: relative; display: flex; flex-direction: column; align-items: center; margin: 4px 0; }
        .grr-first-page-image {
          width: 180px;
          height: 180px;
          object-fit: cover;
          border-radius: 18px;
          display: block;
          box-shadow: 0 8px 18px rgba(0,0,0,0.12);
          border: 4px solid #000000;
          background: #fff;
        }

        .grr-curve-text { width: 100%; max-width: 260px; height: 46px; }
        .grr-curve-text text { fill: #d62d4d; font-family: 'Caveat', cursive; font-size: 19px; font-weight: 700; }

        .grr-gift-row {
          display: flex; justify-content: center; align-items: flex-end; gap: 8px; width: 100%; margin-top: 12px; padding: 0 10px;
        }

        /* royal gift box */
        .grr-royal-box { position: relative; border: none; background: transparent; padding: 0; cursor: pointer; margin: 8px 0; transition: transform 0.2s ease, opacity 0.2s ease; width: 86px; }
        .grr-royal-box:disabled { cursor: not-allowed; }
        .grr-gift-box { transform: scale(0.82); }
        .grr-gift-box-next { animation: grrGlowPulse 1.2s ease-in-out infinite; }
        @keyframes grrGlowPulse { 0%, 100% { transform: scale(0.86); filter: drop-shadow(0 0 0 rgba(214,45,77,0.2)); } 50% { transform: scale(0.9); filter: drop-shadow(0 0 12px rgba(214,45,77,0.4)); } }
        .grr-gift-box-open .grr-royal-body { background: linear-gradient(160deg, #d4af37, #9b7d1b); }
        .grr-gift-box-open .grr-royal-lid { background: linear-gradient(#fce7a3, #d4af37); }
        .grr-gift-box-locked { opacity: 0.5; filter: grayscale(0.3); }
        .grr-royal-crown { position: absolute; top: -22px; left: 50%; transform: translateX(-50%); font-size: 24px; animation: grrCrownFloat 2s ease-in-out infinite; }
        @keyframes grrCrownFloat { 0%, 100% { transform: translateX(-50%) translateY(0); } 50% { transform: translateX(-50%) translateY(-4px); } }
        .grr-royal-body {
          width: 84px; height: 66px; border-radius: 6px; position: relative;
          background: linear-gradient(160deg, #7a1f2b, #4d0f18);
          box-shadow: 0 8px 16px rgba(90,10,20,0.4), inset 0 0 0 2px #d4af37;
          margin: 0 auto;
        }
        .grr-royal-trim { position: absolute; background: linear-gradient(#f3d67a, #d4af37); }
        .grr-royal-trim-v { left: 50%; top: 0; bottom: 0; width: 9px; transform: translateX(-50%); }
        .grr-royal-trim-h { top: 50%; left: 0; right: 0; height: 9px; transform: translateY(-50%); }
        .grr-royal-lid { width: 92px; height: 18px; border-radius: 6px; margin: 0 auto 3px; position: relative; background: linear-gradient(#f3d67a, #d4af37); box-shadow: 0 4px 8px rgba(0,0,0,0.25); }
        .grr-royal-gem { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); width: 12px; height: 12px; border-radius: 50%; background: radial-gradient(circle at 35% 35%, #ff6b6b, #8b1e2b); box-shadow: 0 0 8px rgba(255,80,80,0.7); }
        .grr-royal-box::after {
          content: ""; position: absolute; inset: -4px; border-radius: 10px; pointer-events: none;
          background: linear-gradient(120deg, transparent 30%, rgba(255,255,255,0.5) 50%, transparent 70%);
          background-size: 250% 250%; animation: grrShimmer 2.6s linear infinite;
        }
        @keyframes grrShimmer { 0% { background-position: 200% 0; } 100% { background-position: -50% 0; } }

        .grr-tap-hint { position: absolute; top: -14px; right: -10px; font-size: 24px; animation: grrTap 1.2s ease-in-out infinite; }
        @keyframes grrTap { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(10px); } }

        .grr-cta-bottom { font-family: 'Quicksand', sans-serif; font-weight: 800; letter-spacing: 1px; color: #d62d4d; font-size: 15px; animation: grrPulse 1.2s ease-in-out infinite; }
        @keyframes grrPulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.06); } }

        /* raksha bandhan card */
        .grr-scene3 { justify-content: center; gap: 14px; }
        .grr-rakhi-card {
          width: 88%; border-radius: 16px; padding: 14px 12px 16px; text-align: center;
          background: linear-gradient(#fffaf0, #fff3df);
          box-shadow: 0 10px 24px rgba(180,120,20,0.18), inset 0 0 0 3px #d4af37, inset 0 0 0 6px #fff;
        }
        .grr-rakhi-card-title { font-family: 'Caveat', cursive; color: #d62d4d; font-weight: 700; font-size: 20px; margin: 0 0 10px; }
        .grr-photo-slot { width: 140px; height: 160px; margin: 0 auto; border-radius: 10px; overflow: hidden; box-shadow: 0 6px 14px rgba(0,0,0,0.18); background: linear-gradient(135deg, #ffeaf4, #e8f7ff); }
        .grr-photo-slot img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .grr-rakhi-card-sub { font-family: 'Caveat', cursive; color: #d62d4d; font-size: 14px; margin-top: 8px; }
        .grr-photo-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 34px; color: #d99cb8; }
        .grr-greeting-card-wrap {
          width: 92%;
          padding: 0;
          overflow: hidden;
          background: transparent;
          box-shadow: none;
          border: none;
        }
        .grr-greeting-card-image {
          display: block;
          width: 100%;
          height: auto;
          max-height: 360px;
          object-fit: contain;
          border-radius: 16px;
          box-shadow: 0 10px 24px rgba(180,120,20,0.18);
        }

        /* letter */
        .grr-scene4 { justify-content: space-between; padding-top: 4px; }
        .grr-letter-scroll { width: 100%; flex: 1; overflow-y: auto; padding: 4px 8px; -webkit-overflow-scrolling: touch; }
        .grr-letter { font-family: 'Caveat', cursive; color: #d62d4d; font-weight: 600; font-size: 16px; line-height: 1.45; white-space: pre-wrap; text-align: left; margin: 0; }
        .grr-caret { animation: grrBlink 0.9s steps(1) infinite; }
        @keyframes grrBlink { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0; } }

        .grr-continue-btn {
          font-family: 'Quicksand', sans-serif; color: #d62d4d; font-size: 13px; font-weight: 700;
          background: #fff0f5; border: none; border-radius: 999px; padding: 8px 18px; margin-top: 8px; cursor: pointer;
          transition: opacity 0.3s ease, transform 0.3s ease;
        }
        .grr-continue-btn.grr-hide { opacity: 0; pointer-events: none; transform: translateY(6px); }
        .grr-continue-btn.grr-show { opacity: 1; animation: grrBlink2 1.6s ease-in-out infinite; }
        @keyframes grrBlink2 { 0%, 100% { opacity: 0.6; } 50% { opacity: 1; } }

        /* vertical manual carousel */
        .grr-scene5 { gap: 6px; padding-top: 4px; }
        .grr-vcarousel {
          width: 100%; flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 10px;
          padding: 4px 26px; -webkit-overflow-scrolling: touch;
        }
        .grr-vphoto-card {
          width: 100%; height: 170px; border-radius: 12px; overflow: hidden; flex: 0 0 auto;
          background: linear-gradient(135deg, #ffeaf4, #e8f7ff);
          box-shadow: 0 6px 14px rgba(0,0,0,0.15);
          border: 4px solid #d62d4d;
          padding: 4px;
          box-sizing: border-box;
        }
        .grr-vphoto-card img {
          width: 100%; height: 100%; object-fit: cover; display: block;
          border-radius: 8px;
          border: 2px solid rgba(214, 45, 77, 0.7);
        }
        .grr-scroll-hint { font-size: 11px; color: #d62d4d; opacity: 0.8; }

        .grr-final-title { font-size: clamp(26px, 7.5vw, 32px); animation: grrFinalIn 0.8s ease both; }
        @keyframes grrFinalIn { from { opacity: 0; transform: scale(0.6); } to { opacity: 1; transform: scale(1); } }
        .grr-final-sub { font-family: 'Quicksand', sans-serif; color: #8a5a6b; font-size: 13px; margin-top: 4px; font-weight: 600; }

        .grr-particles { position: absolute; inset: 0; pointer-events: none; overflow: visible; }
        .grr-particle { position: absolute; will-change: transform, opacity; }
        .grr-particle-float { animation-name: grrFloat; animation-timing-function: ease-in-out; animation-iteration-count: infinite; }
        @keyframes grrFloat { 0% { transform: translateY(0) rotate(0deg); opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { transform: translateY(-50px) rotate(20deg); opacity: 0; } }
        .grr-particle-burst { animation: grrBurst 1s ease-out forwards; }
        @keyframes grrBurst {
          0% { transform: translate(-50%, -50%) scale(0.3); opacity: 0; }
          15% { opacity: 1; }
          100% { transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(1) rotate(var(--rot)); opacity: 0; }
        }
        .grr-butterfly { position: absolute; animation-name: grrFlutter; animation-timing-function: ease-in-out; animation-iteration-count: infinite; }
        @keyframes grrFlutter {
          0% { transform: translate(0,0) rotate(0deg); opacity: 0; }
          10% { opacity: 1; }
          50% { transform: translate(30px,-20px) rotate(10deg); }
          90% { opacity: 1; }
          100% { transform: translate(60px,-4px) rotate(-6deg); opacity: 0; }
        }

        .grr-homebar { width: 110px; height: 4px; background: #fff; border-radius: 3px; margin: 8px auto 2px; opacity: 0.7; }
      `}</style>

      <div className="grr-backdrop" />

      <div className="grr-phone-wrap">
        <div className="grr-phone">
          <div className="grr-statusbar">
            <span>9:41</span>
            <div className="grr-rec">
              <span className="grr-dot" /> REC {mm}:{ss}
            </div>
            <span>📶 🔋</span>
          </div>

          <div className="grr-browserbar">
            <span>🔒</span>
            <span>rakshabandhan-surprise.love</span>
            <span>⟳</span>
          </div>

          <div className="grr-progress">
            {Array.from({ length: TOTAL_SCENES }, (_, idx) => idx + 1).map((n) => (
              <div key={n} className="grr-seg">
                <div
                  className={`grr-segfill ${scene > n ? "grr-full" : scene === n ? "grr-active" : ""}`}
                  key={`${n}-${scene === n ? "run" : "idle"}`}
                />
              </div>
            ))}
          </div>

          <div className="grr-card-outer">
            <div className="grr-card-inner">
              {scene === 1 && <Scene1 yesCount={yesCount} onYes={handleYes} onNo={handleNo} bursting={bursting} />}
              {scene === 2 && <Scene2 openedBoxes={giftProgress} onGift={openGiftBox} />}
              {scene === 3 && <Scene3 onNext={continueGiftReveal} />}
              {scene === 4 && <Scene4 onNext={continueGiftReveal} />}
              {scene === 5 && <Scene5 onNext={continueGiftReveal} />}
              {scene === 6 && <Scene6 onRestart={restart} />}
            </div>
          </div>

          <div className="grr-homebar" />
        </div>
      </div>
    </div>
  );
}
