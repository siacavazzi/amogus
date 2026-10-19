import React from 'react';
import { ChevronLeft } from '../../signal/icons';
import '../../signal/signal.css';
import '../../signal/host.css';

// Signal buttons: solid flat shapes, heavy type, no gradients, glows or shimmer. The names,
// props and variants are the old ones so every caller keeps working; variants map onto the
// Signal palette (white primary, red for danger, translucent for everything else).

const cx = (...parts) => parts.filter(Boolean).join(' ');

const SIZE = {
  small: 'hs-btn-sm',
  default: '',
  large: 'hs-btn-lg',
};

/**
 * Primary action button: the one solid button on a screen.
 */
export const PrimaryButton = ({
  children,
  onClick,
  disabled = false,
  loading = false,
  loadingText = 'Loading...',
  variant = 'indigo', // 'indigo', 'emerald', 'red', 'purple', 'orange'
  size = 'default', // 'small', 'default', 'large'
  className = '',
  type = 'button',
  fullWidth = true,
  ...props
}) => {
  const tone = variant === 'red' || variant === 'orange' ? 'sg-btn-red' : 'sg-btn-white';
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={cx('sg-btn', tone, SIZE[size], !fullWidth && 'hs-btn-auto', className)}
      {...props}
    >
      {loading ? <span>{loadingText}</span> : children}
    </button>
  );
};

/**
 * Secondary button: translucent on any colour.
 */
export const SecondaryButton = ({
  children,
  onClick,
  disabled = false,
  variant = 'gray', // 'gray', 'orange', 'red', 'cyan'
  size = 'default',
  className = '',
  type = 'button',
  fullWidth = true,
  ...props
}) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled}
    className={cx('sg-btn', variant === 'cyan' ? 'sg-btn-white' : variant === 'red' ? 'sg-btn-red' : 'sg-btn-ghost',
      SIZE[size], !fullWidth && 'hs-btn-auto', className)}
    {...props}
  >
    {children}
  </button>
);

/**
 * Icon button for compact actions
 */
export const IconButton = ({
  children,
  onClick,
  disabled = false,
  variant = 'gray',
  size = 'default',
  className = '',
  title = '',
  ...props
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={cx('hs-round', variant === 'danger' && 'hs-round--red', className)}
    style={size === 'small' ? { width: 36, height: 36 } : size === 'large' ? { width: 56, height: 56 } : undefined}
    {...props}
  >
    {children}
  </button>
);

/**
 * Status pill
 */
export const StatusBadge = ({
  children,
  icon: Icon,
  variant = 'gray', // 'gray', 'cyan', 'red', 'orange', 'emerald', 'purple'
  size = 'default',
  animate = false,
  className = '',
}) => (
  <div
    className={cx('sg-pill', className)}
    style={{
      ...(variant === 'red' ? { background: 'var(--sg-out)', color: '#fff' } : null),
      ...(variant === 'orange' ? { background: 'var(--sg-meet)', color: 'var(--sg-ink)' } : null),
      ...(size === 'small' ? { fontSize: 13, padding: '5px 10px' } : size === 'large' ? { fontSize: 17, padding: '9px 16px' } : null),
    }}
  >
    {Icon && <Icon size={size === 'small' ? 12 : size === 'large' ? 18 : 14} />}
    {animate ? <span className="hs-dot hs-dot--still" style={{ background: 'currentColor' }} aria-hidden="true" /> : null}
    {children}
  </div>
);

/**
 * Back navigation button
 */
export const BackButton = ({
  children,
  onClick,
  className = '',
  showLabel = true,
  label = 'Back',
  ...props
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cx('sg-btn sg-btn-ghost sg-join__back', className)}
    {...props}
  >
    <ChevronLeft size={20} />
    {showLabel && <span>{children || label}</span>}
  </button>
);

/**
 * Tab/toggle button for tab navigation
 */
export const TabButton = ({
  children,
  onClick,
  active = false,
  icon: Icon,
  className = '',
  ...props
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    className={cx('sg-btn hs-btn-sm', active ? 'sg-btn-white' : 'sg-btn-ghost', className)}
    {...props}
  >
    {Icon && <Icon size={18} />}
    {children}
  </button>
);

/**
 * Danger button for destructive actions (delete, leave, etc.)
 */
export const DangerButton = ({
  children,
  onClick,
  disabled = false,
  variant = 'solid', // 'solid', 'outline'
  size = 'default',
  className = '',
  fullWidth = false,
  ...props
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={cx('sg-btn', variant === 'solid' ? 'sg-btn-red' : 'sg-btn-line', SIZE[size], !fullWidth && 'hs-btn-auto', className)}
    {...props}
  >
    {children}
  </button>
);

/**
 * Round icon button (camera controls, etc.)
 */
export const CircleIconButton = ({
  children,
  onClick,
  disabled = false,
  variant = 'gray', // 'gray', 'primary', 'success', 'danger'
  size = 'default',
  className = '',
  title = '',
  ...props
}) => {
  const dim = size === 'small' ? 40 : size === 'large' ? 68 : 54;
  const look = variant === 'primary' || variant === 'success'
    ? { background: '#fff', color: 'var(--sg-round)' }
    : variant === 'danger'
      ? { background: 'var(--sg-out)', color: '#fff' }
      : null;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cx('hs-round', className)}
      style={{ width: dim, height: dim, ...look }}
      {...props}
    >
      {children}
    </button>
  );
};

/**
 * Ghost button with minimal styling
 */
export const GhostButton = ({
  children,
  onClick,
  disabled = false,
  className = '',
  title = '',
  ...props
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={cx('hs-ghost', className)}
    {...props}
  >
    {children}
  </button>
);

/**
 * Action button group for modal footers and confirmation dialogs
 */
export const ButtonGroup = ({
  children,
  className = '',
  direction = 'row', // 'row', 'column'
}) => (
  <div className={cx('flex gap-3', direction === 'column' ? 'flex-col' : 'flex-row', className)}>
    {children}
  </div>
);
