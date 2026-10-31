import React, { useMemo } from 'react';
import qrcode from 'qrcode-generator';

// A QR code drawn as one SVG path, made in the browser (no image service sees the room code).
// Dark modules on a white tile with the standard four-module quiet zone, so phone cameras
// read it from across the room on a TV or projector.
// Low error correction: a screen doesn't get scuffed, and fewer, bigger modules scan from farther.
export function qrPath(text, errorCorrection = 'L') {
  const qr = qrcode(0, errorCorrection);
  qr.addData(text);
  qr.make();
  const count = qr.getModuleCount();
  let d = '';
  for (let row = 0; row < count; row++) {
    for (let col = 0; col < count; col++) {
      if (qr.isDark(row, col)) d += `M${col} ${row}h1v1h-1z`;
    }
  }
  return { d, count };
}

const QUIET = 4;

function RoomQrCode({ value, title, className, ...rest }) {
  const { d, count } = useMemo(() => (value ? qrPath(value) : { d: '', count: 0 }), [value]);
  if (!value) return null;
  const size = count + QUIET * 2;
  return (
    <svg
      className={className}
      viewBox={`${-QUIET} ${-QUIET} ${size} ${size}`}
      role="img"
      aria-label={title}
      shapeRendering="crispEdges"
      data-url={value}
      {...rest}
    >
      <rect x={-QUIET} y={-QUIET} width={size} height={size} fill="#fff" />
      <path d={d} fill="#000" />
    </svg>
  );
}

export default RoomQrCode;
