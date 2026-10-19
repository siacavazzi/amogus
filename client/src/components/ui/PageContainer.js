import React from 'react';
import LeaveGameButton from '../LeaveGameButton';
import '../../signal/signal.css';

/**
 * Common full-screen page: one flat Signal colour, content scrolls inside.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Page content
 * @param {string} props.variant - 'default' | 'cyan' (blue), 'red' (danger), 'purple' | 'gray' (dark)
 * @param {boolean} props.showLeaveButton - Whether to show the leave game button
 * @param {string} props.className - Additional classes for the page
 * @param {string} props.contentClassName - Additional classes for the content area
 * Older decoration props (particles, showGrid, showVignette, showOrbs) are accepted and ignored.
 */
const PageContainer = ({
  children,
  variant = 'default',
  showLeaveButton = true,
  className = '',
  contentClassName = '',
}) => {
  const tone = { red: 'sg-out', purple: 'sg-dark', gray: 'sg-dark' }[variant] || 'sg-round';
  return (
    <div className={`sg-screen ${tone} ${className}`} style={{ padding: 0 }}>
      {showLeaveButton && <LeaveGameButton className="fixed top-4 right-4 z-50" />}
      <div className={`h-full overflow-y-auto ${contentClassName}`}>
        {children}
      </div>
    </div>
  );
};

export default PageContainer;
