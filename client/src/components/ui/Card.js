import React from 'react';

/**
 * Reusable card component with consistent styling
 */
export const Card = ({
  children,
  variant = 'default', // 'default', 'bordered', 'glass'
  padding = 'default', // 'none', 'small', 'default', 'large'
  className = '',
  ...props
}) => {
  const variants = {
    default: 'bg-gray-900/80 backdrop-blur-xl border border-gray-800/80 shadow-2xl shadow-black/50',
    bordered: 'bg-gray-800/80 backdrop-blur-md border border-gray-700/50 shadow-xl',
    glass: 'bg-gray-800/50 backdrop-blur-sm border border-gray-700/30 shadow-lg',
  };

  const paddings = {
    none: '',
    small: 'p-4',
    default: 'p-6',
    large: 'p-8',
  };

  return (
    <div 
      className={`rounded-3xl ${variants[variant]} ${paddings[padding]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

/**
 * Card header section
 */
export const CardHeader = ({
  children,
  icon: Icon,
  iconColor = 'text-indigo-400',
  iconBg = 'bg-indigo-500/20',
  title,
  subtitle,
  action,
  className = '',
}) => (
  <div className={`flex items-center justify-between px-6 py-4 border-b border-gray-700/50 bg-gray-900/50 ${className}`}>
    <div className="flex items-center gap-3">
      {Icon && (
        <div className={`p-2 rounded-lg ${iconBg}`}>
          <Icon size={20} className={iconColor} />
        </div>
      )}
      <div>
        {title && <h2 className="text-lg font-bold text-gray-200">{title}</h2>}
        {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
      </div>
      {children}
    </div>
    {action}
  </div>
);

/**
 * Card body section
 */
export const CardBody = ({ children, className = '' }) => (
  <div className={`p-6 ${className}`}>
    {children}
  </div>
);

/**
 * Info/stat card for displaying a single piece of info
 */
export const InfoCard = ({
  icon: Icon,
  iconColor = 'text-gray-400',
  iconBg = 'bg-gray-500/20',
  label,
  value,
  variant = 'default', // 'default', 'success', 'warning', 'danger'
  className = '',
}) => {
  const variantStyles = {
    default: 'border-gray-700',
    success: 'border-emerald-500/50 bg-emerald-900/20',
    warning: 'border-orange-500/50 bg-orange-900/20',
    danger: 'border-red-500/50 bg-red-900/20',
  };

  return (
    <div className={`flex items-center gap-3 p-4 rounded-xl border ${variantStyles[variant]} ${className}`}>
      {Icon && (
        <div className={`p-2 rounded-lg ${iconBg}`}>
          <Icon size={18} className={iconColor} />
        </div>
      )}
      <div>
        {label && <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>}
        {value && <p className="text-lg font-bold text-white">{value}</p>}
      </div>
    </div>
  );
};

/**
 * Empty state placeholder
 */
export const EmptyState = ({
  icon: Icon,
  iconColor = 'text-gray-500/40',
  title,
  description,
  action,
  className = '',
}) => (
  <div className={`flex flex-col items-center justify-center p-8 text-center ${className}`}>
    {Icon && <Icon size={48} className={`${iconColor} mb-4`} />}
    {title && <h3 className="text-lg font-medium text-gray-400 mb-2">{title}</h3>}
    {description && <p className="text-sm text-gray-500 mb-4">{description}</p>}
    {action}
  </div>
);
