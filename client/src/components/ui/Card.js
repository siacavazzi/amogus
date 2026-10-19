import React from 'react';
import '../../signal/signal.css';
import '../../signal/host.css';

// Signal cards: a flat translucent panel that groups things on any colour. No blur, borders
// or shadows. Names and props are the old ones so every caller keeps working.

const PAD = { none: 0, small: 14, default: 18, large: 24 };

export const Card = ({
  children,
  variant = 'default', // 'default', 'bordered', 'glass'
  padding = 'default', // 'none', 'small', 'default', 'large'
  className = '',
  style,
  ...props
}) => (
  <div
    className={`hs-card ${className}`}
    style={{ padding: PAD[padding] ?? PAD.default, ...(variant === 'glass' ? { background: 'rgba(0,0,0,0.1)' } : null), ...style }}
    {...props}
  >
    {children}
  </div>
);

export const CardHeader = ({
  children,
  icon: Icon,
  title,
  subtitle,
  action,
  className = '',
}) => (
  <div className={`hs-card__head ${className}`}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
      {Icon && <Icon size={22} />}
      <div style={{ minWidth: 0 }}>
        {title && <h2 className="hs-title">{title}</h2>}
        {subtitle && <p className="sg-small">{subtitle}</p>}
      </div>
      {children}
    </div>
    {action}
  </div>
);

export const CardBody = ({ children, className = '' }) => (
  <div className={className} style={{ padding: 18 }}>
    {children}
  </div>
);

export const InfoCard = ({
  icon: Icon,
  label,
  value,
  variant = 'default', // 'default', 'success', 'warning', 'danger'
  className = '',
}) => (
  <div
    className={`hs-card ${className}`}
    style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: 14,
      ...(variant === 'danger' ? { background: 'var(--sg-out)', color: '#fff' } : null),
      ...(variant === 'warning' ? { background: 'var(--sg-meet)', color: 'var(--sg-ink)' } : null),
    }}
  >
    {Icon && <Icon size={22} />}
    <div>
      {label && <p className="sg-small">{label}</p>}
      {value && <p className="hs-title" style={{ fontSize: 22 }}>{value}</p>}
    </div>
  </div>
);

export const EmptyState = ({
  icon: Icon,
  title,
  description,
  action,
  className = '',
}) => (
  <div className={className} style={{ display: 'grid', justifyItems: 'center', textAlign: 'center', gap: 10, padding: 28 }}>
    {Icon && <Icon size={44} style={{ opacity: 0.6 }} />}
    {title && <h3 className="hs-title" style={{ fontSize: 22 }}>{title}</h3>}
    {description && <p className="sg-small">{description}</p>}
    {action}
  </div>
);
