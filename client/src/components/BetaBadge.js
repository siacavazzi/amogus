import React from 'react';

export function isBetaChannel() {
  return typeof document !== 'undefined' && /(?:^|;\s*)sus_channel=beta(?:;|$)/.test(document.cookie);
}

// Shown on every page while this browser is opted into the beta (?beta=1).
function BetaBadge() {
  if (!isBetaChannel()) return null;
  return (
    <div
      style={{
        position: 'fixed', bottom: 8, left: 8, zIndex: 10000,
        background: '#f59e0b', color: '#111827', borderRadius: 999,
        padding: '4px 10px', fontSize: 12, fontWeight: 700,
        boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
      }}
    >
      BETA · <a href="/version" style={{ color: 'inherit' }}>version</a> · <a href="/?beta=0" style={{ color: 'inherit' }}>leave</a>
    </div>
  );
}

export default BetaBadge;
