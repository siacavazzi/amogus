import React, { forwardRef, useId } from 'react';

// Signal icons: one set for the whole game and site. Drawn on a 24px grid with heavy round
// strokes, and solid shapes for the game's own words (meeting, task, kill, vote, sabotage) so
// they read from arm's length. Same props and names as lucide-react, so a file switches over by
// changing its import line.

const kebab = (name) => name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').replace(/([A-Z])([A-Z][a-z])/g, '$1-$2').toLowerCase();

function make(name, draw) {
  const Icon = forwardRef(({ size = 24, color = 'currentColor', strokeWidth = 2.5, className = '', style, ...rest }, ref) => {
    const id = `sgi${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
    const labelled = rest['aria-label'] || rest.title;
    return (
      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`sg-icon lucide lucide-${kebab(name)} ${className}`.trim()}
        style={style}
        aria-hidden={labelled ? undefined : true}
        role={labelled ? 'img' : undefined}
        {...rest}
      >
        {draw({ id, c: color })}
      </svg>
    );
  });
  Icon.displayName = name;
  return Icon;
}

// A solid shape with parts knocked out of it (eyes in a skull, a check in a circle).
const Cut = ({ id, c, shape, holes }) => (
  <>
    <defs>
      <mask id={id} maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24">
        <rect width="24" height="24" fill="#fff" stroke="none" />
        <g fill="#000" stroke="#000">{holes}</g>
      </mask>
    </defs>
    <g mask={`url(#${id})`} fill={c} stroke={c}>{shape}</g>
  </>
);
const solid = (c) => ({ fill: c, stroke: c });

/* ---------- basic UI ---------- */
export const Check = make('Check', () => <path d="M4.5 12.5l5 5L19.5 7" />);
export const X = make('X', () => <path d="M6 6l12 12M18 6L6 18" />);
export const Plus = make('Plus', () => <path d="M12 4.5v15M4.5 12h15" />);
export const Minus = make('Minus', () => <path d="M4.5 12h15" />);
export const ArrowRight = make('ArrowRight', () => <path d="M4 12h15M13 5.5L19.5 12 13 18.5" />);
export const ArrowLeft = make('ArrowLeft', () => <path d="M20 12H5M11 5.5L4.5 12 11 18.5" />);
export const ChevronRight = make('ChevronRight', () => <path d="M9 5l7 7-7 7" />);
export const ChevronLeft = make('ChevronLeft', () => <path d="M15 5l-7 7 7 7" />);
export const ChevronUp = make('ChevronUp', () => <path d="M5 15l7-7 7 7" />);
export const ChevronDown = make('ChevronDown', () => <path d="M5 9l7 7 7-7" />);
export const Copy = make('Copy', ({ c }) => (
  <>
    <path d="M15 4.5H7A2.5 2.5 0 0 0 4.5 7v8" />
    <rect x="8.5" y="8.5" width="11" height="11" rx="2.5" {...solid(c)} />
  </>
));
export const Share2 = make('Share2', ({ c }) => (
  <>
    <path d="M8 11l8-4.5M8 13l8 4.5" />
    <circle cx="6" cy="12" r="3" {...solid(c)} />
    <circle cx="18" cy="5.5" r="3" {...solid(c)} />
    <circle cx="18" cy="18.5" r="3" {...solid(c)} />
  </>
));
export const ExternalLink = make('ExternalLink', () => <path d="M13 4.5h6.5V11M19.5 4.5L11 13M17 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h4" />);
export const Download = make('Download', () => <path d="M12 3.5v11M7 10l5 5 5-5M4.5 20h15" />);
export const Save = make('Save', ({ id, c }) => (
  <Cut id={id} c={c}
    shape={<path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h9.5l4 4v9.5a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5z" />}
    holes={<><rect x="8" y="13" width="8" height="5" rx="1" stroke="none" /><rect x="8" y="6" width="6" height="3" rx="1" stroke="none" /></>}
  />
));
export const Search = make('Search', () => <><circle cx="10.5" cy="10.5" r="6" /><path d="M15 15l5 5" /></>);
export const List = make('List', ({ c }) => (
  <>
    <path d="M9.5 6h10M9.5 12h10M9.5 18h10" />
    <circle cx="5" cy="6" r="1.6" {...solid(c)} strokeWidth="1" />
    <circle cx="5" cy="12" r="1.6" {...solid(c)} strokeWidth="1" />
    <circle cx="5" cy="18" r="1.6" {...solid(c)} strokeWidth="1" />
  </>
));
export const Pencil = make('Pencil', ({ c }) => (
  <>
    <path d="M15.5 5.5l3 3L9 18l-4.5 1.5L6 15z" {...solid(c)} />
  </>
));
export const Trash2 = make('Trash2', ({ id, c }) => (
  <>
    <path d="M4 6.5h16M9.5 6.5V4.5h5v2" />
    <Cut id={id} c={c}
      shape={<path d="M6 8.5h12l-1 10.5a2 2 0 0 1-2 1.5H9a2 2 0 0 1-2-1.5z" />}
      holes={<path d="M10.5 11.5v5.5M13.5 11.5v5.5" strokeWidth="1.8" />}
    />
  </>
));
export const Settings = make('Settings', ({ id, c }) => (
  <Cut id={id} c={c}
    shape={<>
      <circle cx="12" cy="12" r="6.5" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
        <rect key={a} x="10.4" y="2.5" width="3.2" height="4.5" rx="1" transform={`rotate(${a} 12 12)`} />
      ))}
    </>}
    holes={<circle cx="12" cy="12" r="2.6" stroke="none" />}
  />
));
export const Eye = make('Eye', ({ id, c }) => (
  <Cut id={id} c={c}
    shape={<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />}
    holes={<circle cx="12" cy="12" r="3.2" stroke="none" />}
  />
));
export const EyeOff = make('EyeOff', ({ id, c }) => (
  <>
    <Cut id={id} c={c}
      shape={<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />}
      holes={<><circle cx="12" cy="12" r="3.2" stroke="none" /><path d="M4 2.5l17 19" strokeWidth="5.5" /></>}
    />
    <path d="M4 2.5l17 19" />
  </>
));
export const RefreshCw = make('RefreshCw', () => <path d="M19.5 9A8 8 0 0 0 5.6 6.5L4 8M4 4v4h4M4.5 15a8 8 0 0 0 13.9 2.5L20 16M20 20v-4h-4" />);
export const RotateCcw = make('RotateCcw', () => <path d="M4 4v5h5M4.6 9A8 8 0 1 1 6 17.5" />);
export const Repeat = make('Repeat', () => <path d="M17 3l3 3-3 3M4 11V9a3 3 0 0 1 3-3h13M7 21l-3-3 3-3M20 13v2a3 3 0 0 1-3 3H4" />);
export const Shuffle = make('Shuffle', () => <path d="M16.5 4H20v3.5M4 20L20 4M20 16.5V20h-3.5M14.5 14.5L20 20M4 4l5 5" />);
export const HelpCircle = make('HelpCircle', ({ id, c }) => (
  <Cut id={id} c={c}
    shape={<circle cx="12" cy="12" r="9.5" />}
    holes={<><path d="M9.3 9.3a2.8 2.8 0 0 1 5.4 1c0 1.9-2.7 2.4-2.7 3.9" strokeWidth="2.6" fill="none" /><circle cx="12" cy="17.3" r="1.4" stroke="none" /></>}
  />
));
export const Home = make('Home', ({ id, c }) => (
  <Cut id={id} c={c}
    shape={<path d="M3.5 10.5L12 3.5l8.5 7V19a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 19z" />}
    holes={<rect x="9.5" y="13.5" width="5" height="7.5" rx="1" stroke="none" />}
  />
));
export const Lock = make('Lock', ({ id, c }) => (
  <>
    <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
    <Cut id={id} c={c} shape={<rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />} holes={<circle cx="12" cy="15.5" r="1.7" stroke="none" />} />
  </>
));
export const Printer = make('Printer', ({ id, c }) => (
  <>
    <path d="M7 8V3.5h10V8" />
    <Cut id={id} c={c} shape={<rect x="3.5" y="8" width="17" height="9" rx="2.5" />} holes={<rect x="7" y="13.5" width="10" height="7" rx="1" strokeWidth="3" />} />
    <rect x="8" y="14.5" width="8" height="6" rx="1" />
  </>
));
export const Minimize = Minus;
export const User = make('User', ({ c }) => (
  <>
    <circle cx="12" cy="8" r="4" {...solid(c)} />
    <path d="M4.5 20.5a7.5 7.5 0 0 1 15 0z" {...solid(c)} />
  </>
));
export const Users = make('Users', ({ c }) => (
  <>
    <circle cx="16.5" cy="8" r="3" {...solid(c)} opacity="0.55" />
    <path d="M14 20a6 6 0 0 1 8-5.7V20z" {...solid(c)} opacity="0.55" />
    <circle cx="9" cy="8.5" r="3.7" {...solid(c)} />
    <path d="M2 20.5a7 7 0 0 1 14 0z" {...solid(c)} />
  </>
));
export const UserX = make('UserX', ({ c }) => (
  <>
    <circle cx="9" cy="8" r="3.8" {...solid(c)} />
    <path d="M2 20.5a7 7 0 0 1 14 0z" {...solid(c)} />
    <path d="M17 8l4.5 4.5M21.5 8L17 12.5" />
  </>
));
export const ToggleLeft = make('ToggleLeft', ({ c }) => (
  <>
    <rect x="2" y="6" width="20" height="12" rx="6" />
    <circle cx="8" cy="12" r="3.3" {...solid(c)} />
  </>
));
export const ToggleRight = make('ToggleRight', ({ id, c }) => (
  <Cut id={id} c={c} shape={<rect x="2" y="6" width="20" height="12" rx="6" />} holes={<circle cx="16" cy="12" r="3.3" stroke="none" />} />
));
export const ThumbsDown = make('ThumbsDown', ({ c }) => (
  <>
    <rect x="2.5" y="3.5" width="4" height="11" rx="1.2" {...solid(c)} />
    <path d="M9 14.5V5a1.5 1.5 0 0 1 1.5-1.5h7.2a2 2 0 0 1 2 1.6l1.3 7a2 2 0 0 1-2 2.4H14l1 4.2a1.8 1.8 0 0 1-3.3 1.3z" {...solid(c)} />
  </>
));
export const Github = make('Github', ({ c }) => (
  <path
    d="M12 2.5a9.5 9.5 0 0 0-3 18.5c.5.1.6-.2.6-.5v-1.8c-2.6.6-3.2-1.2-3.2-1.2-.4-1.1-1-1.4-1-1.4-.9-.6 0-.6 0-.6 1 .1 1.5 1 1.5 1 .9 1.5 2.3 1 2.8.8.1-.6.3-1 .6-1.3-2.1-.2-4.3-1-4.3-4.7 0-1 .4-1.9 1-2.6-.1-.2-.4-1.2.1-2.5 0 0 .8-.3 2.6 1a9 9 0 0 1 4.8 0c1.8-1.3 2.6-1 2.6-1 .5 1.3.2 2.3.1 2.5.6.7 1 1.6 1 2.6 0 3.7-2.2 4.5-4.3 4.7.3.3.6.9.6 1.8v2.6c0 .3.2.6.7.5A9.5 9.5 0 0 0 12 2.5z"
    {...solid(c)}
    strokeWidth="0.5"
  />
));

/* ---------- devices, sound, connection ---------- */
export const Monitor = make('Monitor', ({ c }) => (
  <>
    <rect x="2.5" y="3.5" width="19" height="13" rx="2.5" {...solid(c)} />
    <path d="M8.5 20.5h7M12 16.5v4" />
  </>
));
export const Smartphone = make('Smartphone', ({ id, c }) => (
  <Cut id={id} c={c} shape={<rect x="6" y="2.5" width="12" height="19" rx="3" />} holes={<path d="M10.5 18h3" strokeWidth="2" />} />
));
export const Speaker = make('Speaker', ({ id, c }) => (
  <Cut id={id} c={c}
    shape={<rect x="5" y="2.5" width="14" height="19" rx="3" />}
    holes={<><circle cx="12" cy="14.5" r="3.3" strokeWidth="2" fill="none" /><circle cx="12" cy="7" r="1.5" stroke="none" /></>}
  />
));
export const Volume2 = make('Volume2', ({ c }) => (
  <>
    <path d="M3.5 9.5h3.5L12 5v14l-5-4.5H3.5z" {...solid(c)} />
    <path d="M15.5 9a4 4 0 0 1 0 6M18.5 6a8 8 0 0 1 0 12" />
  </>
));
export const Wifi = make('Wifi', ({ c }) => (
  <>
    <path d="M2.5 8.5a14 14 0 0 1 19 0M5.8 12.2a9 9 0 0 1 12.4 0M9 15.7a4.3 4.3 0 0 1 6 0" />
    <circle cx="12" cy="19.3" r="1.7" {...solid(c)} strokeWidth="1" />
  </>
));
export const WifiOff = make('WifiOff', ({ c }) => (
  <>
    <path d="M5.8 12.2a9 9 0 0 1 4-2.3M9 15.7a4.3 4.3 0 0 1 6 0M2.5 8.5a14 14 0 0 1 4.3-2.8M14.5 5.3a14 14 0 0 1 7 3.2M3 3l18 18" />
    <circle cx="12" cy="19.3" r="1.7" {...solid(c)} strokeWidth="1" />
  </>
));
export const Signal = make('Signal', ({ c }) => (
  <>
    <rect x="3" y="15" width="3.6" height="5.5" rx="1" {...solid(c)} strokeWidth="1" />
    <rect x="8.4" y="11" width="3.6" height="9.5" rx="1" {...solid(c)} strokeWidth="1" />
    <rect x="13.8" y="7" width="3.6" height="13.5" rx="1" {...solid(c)} strokeWidth="1" />
    <rect x="19.2" y="3" width="1.8" height="17.5" rx="0.9" {...solid(c)} strokeWidth="1" />
  </>
));
export const Radio = make('Radio', ({ c }) => (
  <>
    <circle cx="12" cy="12" r="2.6" {...solid(c)} />
    <path d="M7.8 7.8a6 6 0 0 0 0 8.4M16.2 7.8a6 6 0 0 1 0 8.4M4.9 4.9a10 10 0 0 0 0 14.2M19.1 4.9a10 10 0 0 1 0 14.2" />
  </>
));
export const Camera = make('Camera', ({ id, c }) => (
  <Cut id={id} c={c}
    shape={<path d="M2.5 9a2.5 2.5 0 0 1 2.5-2.5h2.3L9 4h6l1.7 2.5H19A2.5 2.5 0 0 1 21.5 9v8.5A2.5 2.5 0 0 1 19 20H5a2.5 2.5 0 0 1-2.5-2.5z" />}
    holes={<circle cx="12" cy="13" r="3.6" stroke="none" />}
  />
));

/* ---------- time, status ---------- */
export const Clock = make('Clock', ({ id, c }) => (
  <Cut id={id} c={c} shape={<circle cx="12" cy="12" r="9.5" />} holes={<path d="M12 6.8V12l3.3 2.2" strokeWidth="2.6" fill="none" />} />
));
export const Timer = make('Timer', ({ id, c }) => (
  <>
    <path d="M9.5 2.5h5" />
    <Cut id={id} c={c} shape={<circle cx="12" cy="13.5" r="8" />} holes={<path d="M12 9v4.5" strokeWidth="2.6" />} />
  </>
));
export const Activity = make('Activity', () => <path d="M2.5 12.5h4l2.5-7 5 13 2.5-6h5" />);
export const Check2 = Check;
export const CheckCircle = make('CheckCircle', ({ id, c }) => (
  <Cut id={id} c={c} shape={<circle cx="12" cy="12" r="9.5" />} holes={<path d="M7.5 12.3l3 3 6-6.3" strokeWidth="2.8" fill="none" />} />
));
export const CheckCircle2 = CheckCircle;
export const Sparkles = make('Sparkles', ({ c }) => (
  <>
    <path d="M10 3.5l1.8 5.2 5.2 1.8-5.2 1.8L10 17.5l-1.8-5.2L3 10.5l5.2-1.8z" {...solid(c)} strokeWidth="1.5" />
    <path d="M18.5 14l.9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9z" {...solid(c)} strokeWidth="1" />
  </>
));
export const FlaskConical = make('FlaskConical', ({ c }) => (
  <>
    <path d="M9.5 3.5h5M10 3.5v5.2L4.6 18a2 2 0 0 0 1.7 3h11.4a2 2 0 0 0 1.7-3L14 8.7V3.5" />
    <path d="M6.7 15h10.6l1.5 3.2a1.5 1.5 0 0 1-1.3 2.3H6.5a1.5 1.5 0 0 1-1.3-2.3z" {...solid(c)} strokeWidth="1" />
  </>
));
export const Trophy = make('Trophy', ({ c }) => (
  <>
    <path d="M7 5H3.8v1.5A4 4 0 0 0 7.5 10.5M17 5h3.2v1.5a4 4 0 0 1-3.7 4M12 15.5V19M8 20.5h8" />
    <path d="M6.5 3.5h11V9a5.5 5.5 0 0 1-11 0z" {...solid(c)} />
  </>
));
export const GraduationCap = make('GraduationCap', ({ c }) => (
  <>
    <path d="M12 4L1.5 9 12 14l10.5-5z" {...solid(c)} strokeWidth="1.5" />
    <path d="M6 11.5V16c0 1.4 2.7 3 6 3s6-1.6 6-3v-4.5M21 9.5V15" />
  </>
));

/* ---------- places and tasks ---------- */
export const MapPin = make('MapPin', ({ id, c }) => (
  <Cut id={id} c={c} shape={<path d="M12 22s-7.5-6.6-7.5-12.5a7.5 7.5 0 0 1 15 0C19.5 15.4 12 22 12 22z" />} holes={<circle cx="12" cy="9.5" r="2.8" stroke="none" />} />
));
export const ClipboardList = make('ClipboardList', ({ id, c }) => (
  <Cut id={id} c={c}
    shape={<><rect x="4.5" y="4" width="15" height="17.5" rx="2.5" /><rect x="8" y="2.5" width="8" height="4" rx="1.2" /></>}
    holes={<path d="M8.5 11.5h7M8.5 15.5h5" strokeWidth="2.2" />}
  />
));
export const ClipboardX = make('ClipboardX', ({ id, c }) => (
  <Cut id={id} c={c}
    shape={<><rect x="4.5" y="4" width="15" height="17.5" rx="2.5" /><rect x="8" y="2.5" width="8" height="4" rx="1.2" /></>}
    holes={<path d="M9.5 11l5 5M14.5 11l-5 5" strokeWidth="2.2" />}
  />
));
export const FileText = make('FileText', ({ id, c }) => (
  <Cut id={id} c={c}
    shape={<path d="M6.5 2.5H14l5 5v12a2 2 0 0 1-2 2H6.5a2 2 0 0 1-2-2v-15a2 2 0 0 1 2-2z" />}
    holes={<path d="M8.5 12.5h7M8.5 16.5h5" strokeWidth="2.2" />}
  />
));
export const Sofa = make('Sofa', ({ c }) => (
  <>
    <path d="M5 11V7.5A2.5 2.5 0 0 1 7.5 5h9A2.5 2.5 0 0 1 19 7.5V11" />
    <path d="M2.5 12a2 2 0 0 1 4 0v1.5h11V12a2 2 0 0 1 4 0v5.5a1.5 1.5 0 0 1-1.5 1.5H4a1.5 1.5 0 0 1-1.5-1.5z" {...solid(c)} strokeWidth="1" />
    <path d="M5.5 19v1.5M18.5 19v1.5" />
  </>
));
export const Utensils = make('Utensils', ({ c }) => (
  <>
    <path d="M5 3v6a2.5 2.5 0 0 0 5 0V3M7.5 3v18" />
    <path d="M18.5 3c-2.5 0-4 2.5-4 6.5V14h4z" {...solid(c)} />
    <path d="M18.5 14v7" />
  </>
));

/* ---------- the game's own words ---------- */
// Meeting: a loudhailer. Solid, because a meeting is the loudest thing in the game.
export const Megaphone = make('Megaphone', ({ c }) => (
  <>
    <path d="M3 9.5h4L18.5 4v16L7 14.5H3z" {...solid(c)} />
    <path d="M7 14.5L8.5 20h3l-1-5" {...solid(c)} strokeWidth="2" />
    <path d="M21 10v4" />
  </>
));
export const AlertTriangle = make('AlertTriangle', ({ id, c }) => (
  <Cut id={id} c={c}
    shape={<path d="M10.3 3.6a2 2 0 0 1 3.4 0l8 13.9a2 2 0 0 1-1.7 3H4a2 2 0 0 1-1.7-3z" />}
    holes={<><path d="M12 9v4.5" strokeWidth="2.6" /><circle cx="12" cy="17" r="1.5" stroke="none" /></>}
  />
));
export const Zap = make('Zap', ({ c }) => <path d="M13.5 2L4.5 13.5h6.5L10 22l9.5-12H13z" {...solid(c)} strokeWidth="1.5" />);
export const Skull = make('Skull', ({ id, c }) => (
  <Cut id={id} c={c}
    shape={<path d="M12 2.5c-4.7 0-8.5 3.4-8.5 8 0 2.6 1.2 4.4 3 5.5V19a1.5 1.5 0 0 0 1.5 1.5h8A1.5 1.5 0 0 0 17.5 19v-3c1.8-1.1 3-2.9 3-5.5 0-4.6-3.8-8-8.5-8z" />}
    holes={<><circle cx="8.6" cy="11" r="2.3" stroke="none" /><circle cx="15.4" cy="11" r="2.3" stroke="none" /><path d="M10.5 20.5v-2.5M13.5 20.5v-2.5" strokeWidth="1.6" /></>}
  />
));
export const Vote = make('Vote', ({ id, c }) => (
  <>
    <path d="M9 9.5l2.2 2.2L16 7" />
    <Cut id={id} c={c} shape={<rect x="3" y="13" width="18" height="8" rx="2" />} holes={<path d="M8 15.5h8" strokeWidth="2.2" />} />
    <path d="M6.5 13V4.5a1.5 1.5 0 0 1 1.5-1.5h8a1.5 1.5 0 0 1 1.5 1.5V13" />
  </>
));
export const Gavel = make('Gavel', ({ c }) => (
  <>
    <rect x="8" y="2.5" width="9" height="6" rx="1.5" transform="rotate(45 12.5 5.5)" {...solid(c)} />
    <path d="M10.5 11.5L4 18" strokeWidth="3.2" />
    <path d="M13 21h8" />
  </>
));
export const Target = make('Target', ({ c }) => (
  <>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="4.5" {...solid(c)} />
  </>
));
export const Crosshair = make('Crosshair', ({ c }) => (
  <>
    <circle cx="12" cy="12" r="8" />
    <path d="M12 1.5v5M12 17.5v5M1.5 12h5M17.5 12h5" />
    <circle cx="12" cy="12" r="1.8" {...solid(c)} strokeWidth="1" />
  </>
));
export const Shield = make('Shield', ({ c }) => <path d="M12 2.5l8 3v6c0 5-3.4 8.6-8 10-4.6-1.4-8-5-8-10v-6z" {...solid(c)} />);
export const ShieldCheck = make('ShieldCheck', ({ id, c }) => (
  <Cut id={id} c={c} shape={<path d="M12 2.5l8 3v6c0 5-3.4 8.6-8 10-4.6-1.4-8-5-8-10v-6z" />} holes={<path d="M8.3 12l2.6 2.6 4.9-5" strokeWidth="2.6" fill="none" />} />
));
export const ShieldAlert = make('ShieldAlert', ({ id, c }) => (
  <Cut id={id} c={c} shape={<path d="M12 2.5l8 3v6c0 5-3.4 8.6-8 10-4.6-1.4-8-5-8-10v-6z" />} holes={<><path d="M12 7.5v5" strokeWidth="2.6" /><circle cx="12" cy="16" r="1.5" stroke="none" /></>} />
));
export const Ban = make('Ban', () => <><circle cx="12" cy="12" r="9" strokeWidth="3" /><path d="M5.8 5.8l12.4 12.4" strokeWidth="3" /></>);
export const Hand = make('Hand', ({ c }) => (
  <path d="M8 13V5a1.5 1.5 0 0 1 3 0v6V3.5a1.5 1.5 0 0 1 3 0V11V5a1.5 1.5 0 0 1 3 0v6.5V8.5a1.5 1.5 0 0 1 3 0v6c0 4.1-3 7-7 7h-.8c-2.2 0-3.6-.8-4.9-2.3L4.4 15.7a1.6 1.6 0 0 1 2.4-2.1z" {...solid(c)} strokeWidth="1.5" />
));
export const DoorOpen = make('DoorOpen', ({ id, c }) => (
  <>
    <path d="M14 4.5h4.5v16M2.5 20.5h19" />
    <Cut id={id} c={c} shape={<path d="M5 4.5l9-2v18H5z" />} holes={<circle cx="11" cy="12" r="1.3" stroke="none" />} />
  </>
));
export const LogOut = make('LogOut', ({ c }) => (
  <>
    <path d="M10 3.5H6A2.5 2.5 0 0 0 3.5 6v12A2.5 2.5 0 0 0 6 20.5h4" />
    <path d="M15.5 7.5L20 12l-4.5 4.5M20 12H9" />
  </>
));
export const Send = make('Send', ({ c }) => <path d="M21 3L2.5 10.5l7.5 3.2 3.2 7.8z" {...solid(c)} strokeWidth="2" />);
export const MessageSquare = make('MessageSquare', ({ c }) => (
  <path d="M4 3.5h16A1.5 1.5 0 0 1 21.5 5v10.5A1.5 1.5 0 0 1 20 17H9l-5 4v-4A1.5 1.5 0 0 1 2.5 15.5V5A1.5 1.5 0 0 1 4 3.5z" {...solid(c)} />
));
export const Radiation = make('Radiation', ({ c }) => (
  <>
    <circle cx="12" cy="12" r="2" {...solid(c)} strokeWidth="1" />
    {[0, 120, 240].map((a) => (
      <path key={a} d="M12 9.2L9 3.6a9.5 9.5 0 0 1 6 0z" transform={`rotate(${a} 12 12)`} {...solid(c)} strokeWidth="1.5" />
    ))}
  </>
));
export const Flame = make('Flame', ({ c }) => (
  <path d="M12 22c-4 0-7-2.7-7-6.7 0-3.4 2.4-5.2 3.4-8 .9 1.7 2 2.4 2.6 2.4C11 6.5 12.3 4 14.5 2c.4 3 2.3 4.6 3.3 6.4.8 1.4 1.2 2.9 1.2 4.6 0 5-3 9-7 9z" {...solid(c)} strokeWidth="1.5" />
));
export const Play = make('Play', ({ c }) => <path d="M7 4.5v15a1 1 0 0 0 1.5.9l12-7.5a1 1 0 0 0 0-1.8l-12-7.5A1 1 0 0 0 7 4.5z" {...solid(c)} strokeWidth="1.5" />);
export const FastForward = make('FastForward', ({ c }) => (
  <>
    <path d="M3 5.5v13l8.5-6.5z" {...solid(c)} strokeWidth="1.5" />
    <path d="M12 5.5v13l8.5-6.5z" {...solid(c)} strokeWidth="1.5" />
  </>
));

/* ---------- site ---------- */
// A fanned hand of two cards, for the intruder's sabotage deck.
export const Cards = make('Cards', ({ c }) => (
  <>
    <rect x="3" y="6" width="10" height="14" rx="2" transform="rotate(-12 8 13)" />
    <rect x="10" y="4" width="10" height="14" rx="2" transform="rotate(10 15 11)" {...solid(c)} />
  </>
));
