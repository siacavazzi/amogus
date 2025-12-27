import React from 'react';

/**
 * Primary action button with gradient and shimmer effect
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
  const variants = {
    indigo: 'from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 focus:ring-indigo-400 shadow-indigo-500/25',
    emerald: 'from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 focus:ring-emerald-400 shadow-emerald-500/25',
    red: 'from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 focus:ring-red-400 shadow-red-500/25',
    purple: 'from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 focus:ring-purple-400 shadow-purple-500/25',
    orange: 'from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 focus:ring-orange-400 shadow-orange-500/25',
  };

  const sizes = {
    small: 'py-2 px-4 text-sm',
    default: 'py-3.5 px-6 text-base',
    large: 'py-4 px-8 text-lg',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        group relative overflow-hidden 
        bg-gradient-to-r ${variants[variant]} 
        text-white font-bold rounded-2xl 
        transition-all duration-300 
        focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 
        disabled:opacity-50 disabled:cursor-not-allowed 
        hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]
        ${sizes[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      {...props}
    >
      {/* Shimmer effect */}
      <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      
      {loading ? (
        <div className="flex items-center justify-center gap-3">
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          <span>{loadingText}</span>
        </div>
      ) : (
        <div className="flex items-center justify-center gap-2">
          {children}
        </div>
      )}
    </button>
  );
};

/**
 * Secondary/outline button style
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
}) => {
  const variants = {
    gray: 'bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700',
    orange: 'bg-gray-800 border-orange-500/40 text-orange-400 hover:bg-orange-900/30',
    red: 'bg-gray-800 border-red-500/40 text-red-400 hover:bg-red-900/30',
    cyan: 'bg-gray-800 border-cyan-500/40 text-cyan-400 hover:bg-cyan-900/30',
  };

  const sizes = {
    small: 'py-2 px-4 text-sm',
    default: 'py-3 px-6 text-base',
    large: 'py-4 px-8 text-lg',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        ${fullWidth ? 'w-full' : ''} 
        border rounded-xl 
        font-medium 
        transition-all 
        flex items-center justify-center gap-2 
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant]}
        ${sizes[size]}
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
};

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
}) => {
  const variants = {
    gray: 'bg-gray-800/80 hover:bg-gray-700/80 border-gray-600 text-gray-400 hover:text-white',
    red: 'bg-gray-800/80 hover:bg-red-600/80 border-gray-600 hover:border-red-500 text-gray-400 hover:text-white',
    danger: 'bg-red-600 hover:bg-red-500 border-red-500 text-white',
  };

  const sizes = {
    small: 'p-1.5',
    default: 'p-2',
    large: 'p-3',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`
        rounded-lg border 
        transition-all backdrop-blur-sm 
        flex items-center justify-center
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant]}
        ${sizes[size]}
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
};

/**
 * Status badge/pill component
 */
export const StatusBadge = ({
  children,
  icon: Icon,
  variant = 'gray', // 'gray', 'cyan', 'red', 'orange', 'emerald', 'purple'
  size = 'default',
  animate = false,
  className = '',
}) => {
  const variants = {
    gray: 'bg-gray-500/20 border-gray-500/50 text-gray-400',
    cyan: 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400',
    red: 'bg-red-500/20 border-red-500/50 text-red-400',
    orange: 'bg-orange-500/20 border-orange-500/50 text-orange-400',
    emerald: 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400',
    purple: 'bg-purple-500/20 border-purple-500/50 text-purple-400',
  };

  const sizes = {
    small: 'px-2 py-1 text-xs gap-1',
    default: 'px-3 py-1.5 text-sm gap-2',
    large: 'px-4 py-2 text-base gap-2',
  };

  return (
    <div className={`
      inline-flex items-center rounded-full border font-medium
      ${variants[variant]}
      ${sizes[size]}
      ${animate ? 'animate-pulse' : ''}
      ${className}
    `}>
      {Icon && <Icon size={size === 'small' ? 12 : size === 'large' ? 18 : 14} />}
      {children}
    </div>
  );
};
