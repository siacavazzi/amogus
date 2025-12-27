import React from 'react';
import LeaveGameButton from '../LeaveGameButton';
import { FloatingParticles, GridOverlay, GlowingOrb, Vignette } from './BackgroundEffects';

/**
 * Common page container with consistent layout and background effects
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Page content
 * @param {string} props.variant - Theme variant: 'default', 'cyan', 'red', 'purple', 'gray'
 * @param {boolean} props.showLeaveButton - Whether to show the leave game button
 * @param {Array} props.particles - Optional floating particles array
 * @param {boolean} props.showGrid - Whether to show the grid overlay
 * @param {boolean} props.showVignette - Whether to show vignette effect
 * @param {string} props.className - Additional classes for the content area
 * @param {Object} props.contentStyle - Additional styles for the content area
 */
const PageContainer = ({
  children,
  variant = 'default',
  showLeaveButton = true,
  particles = null,
  showGrid = true,
  showVignette = true,
  showOrbs = true,
  className = '',
  contentClassName = '',
}) => {
  // Theme configurations
  const themes = {
    default: {
      gradient: 'from-gray-950 via-indigo-950/20 to-gray-950',
      gridColor: 'rgba(99, 102, 241, 0.5)',
      orbs: [
        { top: '10%', left: '10%', size: '400px', color: 'bg-indigo-600/10', delay: 0 },
        { top: '60%', left: '70%', size: '300px', color: 'bg-purple-600/10', delay: 1 },
      ],
    },
    cyan: {
      gradient: 'from-gray-900 via-cyan-950/30 to-gray-900',
      gridColor: 'rgba(6, 182, 212, 0.3)',
      orbs: [
        { top: '25%', left: '50%', size: '600px', color: 'bg-cyan-500/20', delay: 0 },
        { top: '25%', left: '50%', size: '300px', color: 'bg-blue-500/30', delay: 0.5 },
      ],
    },
    red: {
      gradient: 'from-gray-900 via-red-950/40 to-gray-900',
      gridColor: 'rgba(239, 68, 68, 0.3)',
      orbs: [
        { top: '25%', left: '50%', size: '600px', color: 'bg-red-600/30', delay: 0 },
        { top: '25%', left: '50%', size: '300px', color: 'bg-red-500/40', delay: 0.5 },
      ],
    },
    purple: {
      gradient: 'from-purple-900/20 via-gray-900 to-gray-900',
      gridColor: 'rgba(139, 92, 246, 0.3)',
      orbs: [
        { top: '20%', left: '30%', size: '400px', color: 'bg-purple-600/15', delay: 0 },
        { top: '50%', left: '70%', size: '300px', color: 'bg-pink-600/10', delay: 1 },
      ],
    },
    gray: {
      gradient: 'from-gray-900 via-gray-800 to-gray-900',
      gridColor: 'rgba(107, 114, 128, 0.3)',
      orbs: [],
    },
  };

  const theme = themes[variant] || themes.default;

  return (
    <div className={`fixed inset-0 overflow-hidden ${className}`}>
      {/* Background gradient */}
      <div className={`absolute inset-0 bg-gradient-to-b ${theme.gradient}`} />

      {/* Glowing orbs */}
      {showOrbs && theme.orbs.map((orb, index) => (
        <GlowingOrb key={index} {...orb} />
      ))}

      {/* Grid overlay */}
      {showGrid && <GridOverlay color={theme.gridColor} />}

      {/* Floating particles */}
      {particles && <FloatingParticles particles={particles} />}

      {/* Vignette effect */}
      {showVignette && <Vignette />}

      {/* Leave Game Button */}
      {showLeaveButton && <LeaveGameButton className="fixed top-4 right-4 z-50" />}

      {/* Main content */}
      <div className={`relative z-10 h-full overflow-y-auto ${contentClassName}`}>
        {children}
      </div>
    </div>
  );
};

export default PageContainer;
