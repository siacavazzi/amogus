import React from "react";

// Built-in player avatars. Player.pic is an index into AVATARS; keep AVATAR_COUNT
// in server/assets/game.py in sync when adding more. Each avatar has its own
// silhouette as well as its own color so players stay distinguishable when the
// UI grays out dead players.

const INK = "#17142a";
const WHITE = "#ffffff";
const BLUSH = "#fb7185";

const Eye = ({ x, y, r }) => (
  <>
    <circle cx={x} cy={y} r={r} fill={WHITE} />
    <circle cx={x} cy={y + r * 0.14} r={r * 0.56} fill={INK} />
    <circle cx={x - r * 0.22} cy={y - r * 0.12} r={r * 0.2} fill={WHITE} />
  </>
);

const Dot = ({ x, y, r }) => (
  <>
    <circle cx={x} cy={y} r={r} fill={INK} />
    <circle cx={x - r * 0.35} cy={y - r * 0.38} r={r * 0.36} fill={WHITE} />
  </>
);

const Blush = ({ x, y, r = 4 }) => <circle cx={x} cy={y} r={r} fill={BLUSH} opacity=".45" />;

const Smile = ({ x, y, w, h, sw = 2.2 }) => (
  <path d={`M${x - w} ${y}Q${x} ${y + h} ${x + w} ${y}`} stroke={INK} strokeWidth={sw} fill="none" strokeLinecap="round" />
);

const starPoints = (cx, cy, outer, inner) =>
  Array.from({ length: 10 }, (_, i) => {
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    const radius = i % 2 ? inner : outer;
    return `${(cx + radius * Math.cos(angle)).toFixed(1)},${(cy + radius * Math.sin(angle)).toFixed(1)}`;
  }).join(" ");

export const AVATARS = [
  {
    name: "Astro", kind: "astronaut", color: "orange", main: "#f97316", dark: "#c2410c", light: "#fdba74", bg: "#431407",
    draw: (c) => (
      <>
        <path d="M12 100C12 82 28 74 50 74C72 74 88 82 88 100Z" fill={c.main} />
        <rect x="40" y="84" width="20" height="12" rx="3" fill={c.dark} />
        <circle cx="45" cy="90" r="1.8" fill="#fde047" />
        <circle cx="50" cy="90" r="1.8" fill="#22d3ee" />
        <circle cx="55" cy="90" r="1.8" fill="#4ade80" />
        <rect x="28" y="69" width="44" height="10" rx="5" fill={c.dark} />
        <path d="M80 37L84 23" stroke={c.dark} strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="84" cy="21" r="3.5" fill="#fde047" />
        <rect x="15" y="36" width="9" height="19" rx="4" fill={c.dark} />
        <rect x="76" y="36" width="9" height="19" rx="4" fill={c.dark} />
        <circle cx="50" cy="45" r="29" fill={c.main} />
        <path d="M30 31A25 25 0 0 1 45 21" stroke={WHITE} strokeWidth="3" strokeLinecap="round" fill="none" opacity=".45" />
        <circle cx="50" cy="48" r="19" fill="#0f172a" />
        <path d="M37 41A14 14 0 0 1 49 33" stroke="#93c5fd" strokeWidth="3" strokeLinecap="round" fill="none" opacity=".55" />
        <ellipse cx="44" cy="50" rx="2.8" ry="3.8" fill={WHITE} />
        <ellipse cx="56" cy="50" rx="2.8" ry="3.8" fill={WHITE} />
      </>
    ),
  },
  {
    name: "Bolt", kind: "robot", color: "blue", main: "#3b82f6", dark: "#1d4ed8", light: "#bfdbfe", bg: "#172554",
    draw: (c) => (
      <>
        <path d="M12 100C12 86 26 80 50 80C74 80 88 86 88 100Z" fill={c.dark} />
        <circle cx="50" cy="92" r="4" fill="#fde047" />
        <rect x="43" y="68" width="14" height="14" fill={c.dark} />
        <rect x="15" y="40" width="9" height="18" rx="3" fill={c.dark} />
        <rect x="76" y="40" width="9" height="18" rx="3" fill={c.dark} />
        <line x1="50" y1="30" x2="50" y2="17" stroke={c.dark} strokeWidth="3.5" />
        <circle cx="50" cy="15" r="5" fill="#fde047" />
        <rect x="22" y="26" width="56" height="46" rx="11" fill={c.main} />
        <rect x="29" y="33" width="42" height="26" rx="7" fill={INK} />
        <circle cx="40" cy="45" r="5" fill={c.light} />
        <circle cx="60" cy="45" r="5" fill={c.light} />
        <circle cx="41.5" cy="43.5" r="1.6" fill={WHITE} />
        <circle cx="61.5" cy="43.5" r="1.6" fill={WHITE} />
        <rect x="42" y="63" width="16" height="3.5" rx="1.75" fill={c.dark} />
        <circle cx="28" cy="65" r="1.6" fill={c.dark} />
        <circle cx="72" cy="65" r="1.6" fill={c.dark} />
      </>
    ),
  },
  {
    name: "Zib", kind: "alien", color: "lime", main: "#a3e635", dark: "#65a30d", light: "#ecfccb", bg: "#1a2e05",
    draw: (c) => (
      <>
        <path d="M18 100C18 86 32 80 50 80C68 80 82 86 82 100Z" fill={c.dark} />
        <rect x="44" y="68" width="12" height="14" fill={c.dark} />
        <path d="M39 22Q34 14 28 12" stroke={c.main} strokeWidth="3" strokeLinecap="round" fill="none" />
        <circle cx="28" cy="12" r="4.2" fill={c.light} />
        <path d="M61 22Q66 14 72 12" stroke={c.main} strokeWidth="3" strokeLinecap="round" fill="none" />
        <circle cx="72" cy="12" r="4.2" fill={c.light} />
        <path d="M50 76C34 76 20 58 20 42C20 26 33 18 50 18C67 18 80 26 80 42C80 58 66 76 50 76Z" fill={c.main} />
        <ellipse cx="37" cy="46" rx="10" ry="6.5" transform="rotate(28 37 46)" fill={INK} />
        <ellipse cx="63" cy="46" rx="10" ry="6.5" transform="rotate(-28 63 46)" fill={INK} />
        <circle cx="34" cy="43" r="2.3" fill={WHITE} />
        <circle cx="60" cy="43" r="2.3" fill={WHITE} />
        <Smile x={50} y={63} w={5} h={3} sw={2} />
      </>
    ),
  },
  {
    name: "Inky", kind: "octopus", color: "purple", main: "#c084fc", dark: "#9333ea", light: "#f3e8ff", bg: "#3b0764",
    draw: (c) => (
      <>
        <g stroke={c.main} strokeWidth="10" strokeLinecap="round" fill="none">
          <path d="M30 56C24 70 22 80 30 86C36 90 31 97 25 96" />
          <path d="M42 60C40 74 45 84 40 94" />
          <path d="M58 60C60 74 55 84 60 94" />
          <path d="M70 56C76 70 78 80 70 86C64 90 69 97 75 96" />
        </g>
        <circle cx="40" cy="80" r="1.8" fill={c.light} />
        <circle cx="43" cy="87" r="1.8" fill={c.light} />
        <circle cx="60" cy="80" r="1.8" fill={c.light} />
        <circle cx="57" cy="87" r="1.8" fill={c.light} />
        <path d="M23 62C23 34 35 20 50 20C65 20 77 34 77 62Z" fill={c.main} />
        <ellipse cx="38" cy="30" rx="6" ry="3.5" transform="rotate(-30 38 30)" fill={WHITE} opacity=".35" />
        <Eye x={40} y={44} r={7} />
        <Eye x={60} y={44} r={7} />
        <Blush x={32} y={54} />
        <Blush x={68} y={54} />
        <Smile x={50} y={54} w={4} h={4} />
      </>
    ),
  },
  {
    name: "Mango", kind: "cat", color: "amber", main: "#fbbf24", dark: "#d97706", light: "#fef3c7", bg: "#451a03",
    draw: (c) => (
      <>
        <path d="M16 100C16 84 32 78 50 78C68 78 84 84 84 100Z" fill={c.dark} />
        <polygon points="22,42 26,12 46,26" fill={c.main} />
        <polygon points="27,35 29,20 40,27" fill="#f9a8d4" />
        <polygon points="78,42 74,12 54,26" fill={c.main} />
        <polygon points="73,35 71,20 60,27" fill="#f9a8d4" />
        <ellipse cx="50" cy="51" rx="31" ry="27" fill={c.main} />
        <rect x="47" y="25" width="6" height="10" rx="3" fill={c.dark} />
        <rect x="39" y="27" width="5" height="7" rx="2.5" fill={c.dark} />
        <rect x="56" y="27" width="5" height="7" rx="2.5" fill={c.dark} />
        <ellipse cx="39" cy="48" rx="5.5" ry="6.5" fill={WHITE} />
        <ellipse cx="39" cy="48.5" rx="2.2" ry="5" fill={INK} />
        <ellipse cx="61" cy="48" rx="5.5" ry="6.5" fill={WHITE} />
        <ellipse cx="61" cy="48.5" rx="2.2" ry="5" fill={INK} />
        <ellipse cx="50" cy="62" rx="11" ry="7.5" fill={c.light} />
        <path d="M47 57.5H53L50 61Z" fill="#f472b6" />
        <path d="M50 61Q48 65.5 44.5 63.5M50 61Q52 65.5 55.5 63.5" stroke={INK} strokeWidth="1.8" fill="none" strokeLinecap="round" />
        <path d="M33 60L18 57M33 64L19 67M67 60L82 57M67 64L81 67" stroke={c.light} strokeWidth="1.4" strokeLinecap="round" opacity=".85" />
      </>
    ),
  },
  {
    name: "Boo", kind: "ghost", color: "silver", main: "#e5e7eb", dark: "#9ca3af", light: "#ffffff", bg: "#273244",
    draw: (c) => (
      <>
        <ellipse cx="50" cy="95" rx="17" ry="3" fill="#000000" opacity=".3" />
        <ellipse cx="22" cy="58" rx="7" ry="4.5" transform="rotate(-30 22 58)" fill={c.main} />
        <ellipse cx="78" cy="58" rx="7" ry="4.5" transform="rotate(30 78 58)" fill={c.main} />
        <path d="M24 48C24 30 36 20 50 20C64 20 76 30 76 48V84Q70 92 63.5 84Q57 92 50 84Q43 92 36.5 84Q30 92 24 84Z" fill={c.main} />
        <path d="M66 26C71 30 74 36 74 44" stroke={c.dark} strokeWidth="3" strokeLinecap="round" fill="none" opacity=".5" />
        <ellipse cx="41" cy="46" rx="4.5" ry="7" fill={INK} />
        <ellipse cx="59" cy="46" rx="4.5" ry="7" fill={INK} />
        <circle cx="39.5" cy="43" r="1.6" fill={WHITE} />
        <circle cx="57.5" cy="43" r="1.6" fill={WHITE} />
        <ellipse cx="50" cy="63" rx="4" ry="5" fill={INK} />
        <Blush x={33} y={56} />
        <Blush x={67} y={56} />
      </>
    ),
  },
  {
    name: "Gloop", kind: "slime", color: "green", main: "#22c55e", dark: "#15803d", light: "#bbf7d0", bg: "#052e16",
    draw: (c) => (
      <>
        <path d="M12 100C14 92 21 90 22 80V56C22 34 34 22 50 22C66 22 78 34 78 56V80C79 90 86 92 88 100Z" fill={c.main} />
        <path d="M30 62V72C30 76 34 76 34 72V64" fill={c.dark} opacity=".5" />
        <ellipse cx="36" cy="34" rx="7" ry="4" transform="rotate(-35 36 34)" fill={c.light} opacity=".7" />
        <circle cx="30" cy="45" r="2" fill={c.light} opacity=".7" />
        <circle cx="68" cy="66" r="2.6" fill={c.light} opacity=".6" />
        <circle cx="71" cy="75" r="1.8" fill={c.light} opacity=".6" />
        <circle cx="50" cy="50" r="14" fill={WHITE} />
        <circle cx="50" cy="52" r="8.5" fill={c.dark} />
        <circle cx="50" cy="52" r="4.5" fill={INK} />
        <circle cx="46.5" cy="48" r="2.4" fill={WHITE} />
        <path d="M37 71Q50 82 63 71" stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" />
        <rect x="47" y="74.5" width="5" height="4" rx="1" fill={WHITE} />
      </>
    ),
  },
  {
    name: "Hopper", kind: "frog", color: "teal", main: "#2dd4bf", dark: "#0f766e", light: "#ccfbf1", bg: "#042f2e",
    draw: (c) => (
      <>
        <path d="M14 100C14 86 30 80 50 80C70 80 86 86 86 100Z" fill={c.main} />
        <ellipse cx="50" cy="97" rx="18" ry="10" fill={c.light} />
        <circle cx="31" cy="38" r="12.5" fill={c.main} />
        <circle cx="69" cy="38" r="12.5" fill={c.main} />
        <ellipse cx="50" cy="59" rx="35" ry="22" fill={c.main} />
        <Eye x={31} y={37} r={8.5} />
        <Eye x={69} y={37} r={8.5} />
        <circle cx="46" cy="54" r="1.3" fill={INK} />
        <circle cx="54" cy="54" r="1.3" fill={INK} />
        <path d="M28 63Q50 77 72 63" stroke={INK} strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <Blush x={24} y={67} />
        <Blush x={76} y={67} />
      </>
    ),
  },
  {
    name: "Hoot", kind: "owl", color: "brown", main: "#a06b3f", dark: "#5f3b1f", light: "#e7cba9", bg: "#2a1a0e",
    draw: (c) => (
      <>
        <polygon points="22,38 19,13 39,26" fill={c.main} />
        <polygon points="78,38 81,13 61,26" fill={c.main} />
        <path d="M20 100V54C20 32 34 22 50 22C66 22 80 32 80 54V100Z" fill={c.main} />
        <ellipse cx="50" cy="94" rx="19" ry="18" fill={c.light} />
        <path d="M37 84q3 4 6.5 0q3 4 6.5 0q3 4 6.5 0q3 4 6.5 0M40 92q3 4 6.5 0q3 4 6.5 0q3 4 6.5 0" stroke={c.dark} strokeWidth="1.8" fill="none" strokeLinecap="round" />
        <circle cx="38" cy="48" r="14" fill={c.light} />
        <circle cx="62" cy="48" r="14" fill={c.light} />
        <circle cx="38" cy="48" r="9.5" fill={WHITE} />
        <circle cx="62" cy="48" r="9.5" fill={WHITE} />
        <circle cx="38" cy="49" r="6.5" fill="#f59e0b" />
        <circle cx="62" cy="49" r="6.5" fill="#f59e0b" />
        <circle cx="38" cy="49" r="3.8" fill={INK} />
        <circle cx="62" cy="49" r="3.8" fill={INK} />
        <circle cx="36" cy="46.5" r="1.7" fill={WHITE} />
        <circle cx="60" cy="46.5" r="1.7" fill={WHITE} />
        <path d="M45.5 58H54.5L50 67Z" fill="#f59e0b" />
      </>
    ),
  },
  {
    name: "Gummy", kind: "gummy bear", color: "rose", main: "#fb7185", dark: "#e11d48", light: "#ffe4e6", bg: "#4c0519",
    draw: (c) => (
      <>
        <path d="M16 100C16 84 32 78 50 78C68 78 84 84 84 100Z" fill={c.main} />
        <circle cx="26" cy="27" r="10.5" fill={c.main} />
        <circle cx="26" cy="27" r="5" fill={c.dark} />
        <circle cx="74" cy="27" r="10.5" fill={c.main} />
        <circle cx="74" cy="27" r="5" fill={c.dark} />
        <circle cx="50" cy="50" r="28" fill={c.main} />
        <ellipse cx="36" cy="36" rx="7" ry="3.5" transform="rotate(-35 36 36)" fill={WHITE} opacity=".4" />
        <ellipse cx="50" cy="61" rx="12.5" ry="9.5" fill={c.light} />
        <ellipse cx="50" cy="56.5" rx="4.5" ry="3" fill={INK} />
        <path d="M50 59.5V62.5M50 62.5Q46.5 66.5 43 63.5M50 62.5Q53.5 66.5 57 63.5" stroke={INK} strokeWidth="1.8" fill="none" strokeLinecap="round" />
        <Dot x={40} y={46} r={3.6} />
        <Dot x={60} y={46} r={3.6} />
      </>
    ),
  },
  {
    name: "Pip", kind: "penguin", color: "black", main: "#1f2937", dark: "#111827", light: "#ffffff", bg: "#64748b",
    draw: (c) => (
      <>
        <path d="M18 100V52C18 30 32 20 50 20C68 20 82 30 82 52V100Z" fill={c.main} />
        <ellipse cx="50" cy="98" rx="21" ry="18" fill={WHITE} />
        <path d="M50 34C44 26 29 28 29 44C29 60 40 70 50 76C60 70 71 60 71 44C71 28 56 26 50 34Z" fill={WHITE} />
        <Dot x={41} y={46} r={3.6} />
        <Dot x={59} y={46} r={3.6} />
        <path d="M44 54H56L50 61.5Z" fill="#f59e0b" />
        <Blush x={36} y={57} r={3.2} />
        <Blush x={64} y={57} r={3.2} />
        <path d="M30 24C34 21 40 20 44 21" stroke="#475569" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      </>
    ),
  },
  {
    name: "Shroom", kind: "mushroom", color: "red", main: "#ef4444", dark: "#b91c1c", light: "#fee2e2", bg: "#450a0a",
    draw: (c) => (
      <>
        <rect x="32" y="52" width="36" height="56" rx="13" fill="#fdf0de" />
        <path d="M12 60C12 32 30 16 50 16C70 16 88 32 88 60C88 64 84 67 80 67H20C16 67 12 64 12 60Z" fill={c.main} />
        <path d="M14 62C20 66 80 66 86 62" stroke={c.dark} strokeWidth="3" fill="none" opacity=".6" />
        <circle cx="31" cy="39" r="6.5" fill={c.light} />
        <circle cx="54" cy="27" r="5.5" fill={c.light} />
        <circle cx="71" cy="44" r="5.5" fill={c.light} />
        <circle cx="47" cy="51" r="4" fill={c.light} />
        <circle cx="22" cy="55" r="3" fill={c.light} />
        <Dot x={43} y={79} r={3.2} />
        <Dot x={57} y={79} r={3.2} />
        <Smile x={50} y={86} w={5} h={4} sw={2} />
        <Blush x={37} y={86} r={3.2} />
        <Blush x={63} y={86} r={3.2} />
      </>
    ),
  },
  {
    name: "Beam", kind: "UFO", color: "cyan", main: "#22d3ee", dark: "#0e7490", light: "#cffafe", bg: "#083344",
    draw: (c) => (
      <>
        <polygon points="36,64 64,64 80,100 20,100" fill={c.light} opacity=".16" />
        <ellipse cx="50" cy="63" rx="38" ry="9" fill={c.dark} />
        <ellipse cx="50" cy="58" rx="38" ry="11" fill={c.main} />
        <path d="M28 55C28 35 38 26 50 26C62 26 72 35 72 55Z" fill={c.light} opacity=".92" />
        <path d="M35 46C35 39 39 33 45 31" stroke={WHITE} strokeWidth="3" strokeLinecap="round" fill="none" />
        <Eye x={43} y={44} r={5.5} />
        <Eye x={57} y={44} r={5.5} />
        <circle cx="22" cy="59" r="2.6" fill="#fde047" />
        <circle cx="35" cy="63" r="2.6" fill="#fde047" />
        <circle cx="50" cy="64.5" r="2.6" fill="#fde047" />
        <circle cx="65" cy="63" r="2.6" fill="#fde047" />
        <circle cx="78" cy="59" r="2.6" fill="#fde047" />
      </>
    ),
  },
  {
    name: "Nova", kind: "star", color: "yellow", main: "#fde047", dark: "#ca8a04", light: "#fef9c3", bg: "#422006",
    draw: (c) => (
      <>
        <path d="M18 24l1.6 4.4 4.4 1.6-4.4 1.6-1.6 4.4-1.6-4.4-4.4-1.6 4.4-1.6z" fill={c.light} opacity=".8" />
        <path d="M82 74l1.2 3.3 3.3 1.2-3.3 1.2-1.2 3.3-1.2-3.3-3.3-1.2 3.3-1.2z" fill={c.light} opacity=".8" />
        <polygon points={starPoints(50, 55, 37, 17)} fill={c.main} stroke={c.main} strokeWidth="7" strokeLinejoin="round" />
        <Dot x={43} y={52} r={3.5} />
        <Dot x={57} y={52} r={3.5} />
        <Smile x={50} y={60} w={5} h={5} />
        <Blush x={37} y={59} r={3.4} />
        <Blush x={63} y={59} r={3.4} />
      </>
    ),
  },
  {
    name: "Orbit", kind: "planet", color: "indigo", main: "#818cf8", dark: "#4f46e5", light: "#e0e7ff", bg: "#1e1b4b",
    draw: (c) => (
      <>
        <circle cx="20" cy="22" r="1.4" fill={WHITE} opacity=".7" />
        <circle cx="76" cy="84" r="1.2" fill={WHITE} opacity=".6" />
        <circle cx="81" cy="22" r="5.5" fill={c.light} />
        <circle cx="79.5" cy="20.5" r="1.4" fill={c.dark} opacity=".35" />
        <ellipse cx="50" cy="54" rx="44" ry="11" transform="rotate(-14 50 54)" stroke={c.light} strokeWidth="5" fill="none" />
        <circle cx="50" cy="54" r="25" fill={c.main} />
        <path d="M27 46C38 43 60 43 73 47" stroke={c.dark} strokeWidth="3" fill="none" opacity=".5" strokeLinecap="round" />
        <ellipse cx="62" cy="64" rx="4" ry="2.5" fill={c.dark} opacity=".45" />
        <path d="M6 54A44 11 0 0 0 94 54" transform="rotate(-14 50 54)" stroke={c.light} strokeWidth="5" fill="none" />
        <Dot x={42} y={52} r={3.4} />
        <Dot x={58} y={52} r={3.4} />
        <Smile x={50} y={59} w={4} h={4} />
      </>
    ),
  },
  {
    name: "Clover", kind: "bunny", color: "pink", main: "#f9a8d4", dark: "#db2777", light: "#fce7f3", bg: "#500724",
    draw: (c) => (
      <>
        <path d="M18 100C18 86 32 80 50 80C68 80 82 86 82 100Z" fill={c.main} />
        <ellipse cx="37" cy="27" rx="7.5" ry="18" transform="rotate(-12 37 27)" fill={c.main} />
        <ellipse cx="37" cy="28" rx="3.5" ry="12.5" transform="rotate(-12 37 28)" fill={c.dark} opacity=".55" />
        <ellipse cx="63" cy="27" rx="7.5" ry="18" transform="rotate(12 63 27)" fill={c.main} />
        <ellipse cx="63" cy="28" rx="3.5" ry="12.5" transform="rotate(12 63 28)" fill={c.dark} opacity=".55" />
        <ellipse cx="50" cy="57" rx="27" ry="24" fill={c.main} />
        <Dot x={41} y={54} r={3.5} />
        <Dot x={59} y={54} r={3.5} />
        <ellipse cx="50" cy="62" rx="3.2" ry="2.3" fill={c.dark} />
        <rect x="47.5" y="65" width="5" height="4.5" rx="1" fill={WHITE} />
        <path d="M50 64.3Q47 68.5 43.5 66.5M50 64.3Q53 68.5 56.5 66.5" stroke={INK} strokeWidth="1.6" fill="none" strokeLinecap="round" />
        <circle cx="35" cy="63" r="4" fill={c.dark} opacity=".35" />
        <circle cx="65" cy="63" r="4" fill={c.dark} opacity=".35" />
      </>
    ),
  },
  {
    name: "Zoom", kind: "rocket", color: "sky blue", main: "#7dd3fc", dark: "#0284c7", light: "#e0f2fe", bg: "#082f49",
    draw: (c) => (
      <>
        <path d="M41 85Q50 106 59 85Z" fill="#fb923c" />
        <path d="M45 85Q50 98 55 85Z" fill="#fde047" />
        <path d="M36 64L23 84L38 82Z" fill={c.dark} />
        <path d="M64 64L77 84L62 82Z" fill={c.dark} />
        <path d="M50 11C64 23 68 44 66 66L64 87H36L34 66C32 44 36 23 50 11Z" fill={c.main} />
        <path d="M50 11C57 17 61 24 63.5 31H36.5C39 24 43 17 50 11Z" fill={c.dark} />
        <rect x="40" y="81" width="20" height="5" rx="2" fill={c.dark} />
        <circle cx="50" cy="51" r="12" fill={c.dark} />
        <circle cx="50" cy="51" r="9" fill={c.light} />
        <Dot x={46.5} y={50} r={2.1} />
        <Dot x={53.5} y={50} r={2.1} />
        <Smile x={50} y={54.5} w={2.6} h={2.6} sw={1.6} />
        <circle cx="41" cy="70" r="1.5" fill={c.dark} />
        <circle cx="59" cy="70" r="1.5" fill={c.dark} />
      </>
    ),
  },
  {
    name: "Gnash", kind: "monster", color: "violet", main: "#8b5cf6", dark: "#6d28d9", light: "#ede9fe", bg: "#2e1065",
    draw: (c) => (
      <>
        <path d="M30 29C24 23 22 15 26 9C30 17 34 21 39 24Z" fill="#fef3c7" />
        <path d="M70 29C76 23 78 15 74 9C70 17 66 21 61 24Z" fill="#fef3c7" />
        <path d="M15 100L18 50C18 30 32 18 50 18C68 18 82 30 82 50L85 100Z" fill={c.main} />
        <path d="M18 56l-4 3 4 2M82 60l4 3-4 2M17 76l-4 3 4 2M83 80l4 3-4 2" stroke={c.main} strokeWidth="3" strokeLinejoin="round" fill={c.main} />
        <circle cx="25" cy="72" r="3" fill={c.dark} />
        <circle cx="74" cy="78" r="4" fill={c.dark} />
        <circle cx="62" cy="92" r="3" fill={c.dark} />
        <circle cx="31" cy="90" r="2.4" fill={c.dark} />
        <Eye x={39} y={42} r={8.5} />
        <Eye x={62} y={44} r={6.5} />
        <path d="M29 58Q50 84 71 58Z" fill={INK} />
        <ellipse cx="50" cy="70" rx="7" ry="4" fill="#f472b6" />
        <polygon points="35,59.5 39.5,66 43.5,61" fill={WHITE} />
        <polygon points="56.5,61 60.5,66 65,59.5" fill={WHITE} />
      </>
    ),
  },
];

export const AVATAR_COUNT = AVATARS.length;

export const getAvatar = (id) => {
  if (id === null || id === undefined || id === "") return null;
  const index = Number(id);
  if (!Number.isInteger(index)) return null;
  return AVATARS[((index % AVATAR_COUNT) + AVATAR_COUNT) % AVATAR_COUNT];
};

export const describeAvatar = (avatar) => `${avatar.name}, the ${avatar.color} ${avatar.kind}`;

// Renders a square avatar that fills its box; crop it with the parent
// (rounded-full for profile circles, or a 3:4 portrait, which it covers).
const Avatar = ({ id, label, decorative = false, className = "" }) => {
  const avatar = getAvatar(id);
  if (!avatar) return null;
  const a11y = decorative
    ? { "aria-hidden": true }
    : { role: "img", "aria-label": label || describeAvatar(avatar) };
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid slice"
      {...a11y}
      className={`block ${className}`}
    >
      <rect width="100" height="100" fill={avatar.bg} />
      <circle cx="50" cy="48" r="40" fill={avatar.main} opacity=".12" />
      {avatar.draw(avatar)}
    </svg>
  );
};

export default Avatar;
