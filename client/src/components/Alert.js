// Alert.js
import React from 'react';
import PropTypes from 'prop-types';
import '../CSS/Alert.css';

const Alert = ({ size, status, title }) => {
  // Determine size class
  const sizeClass = (() => {
    switch (size) {
      case 'sm':
        return 'alert-sm';
      case 'lg':
        return 'alert-lg';
      case 'md':
      default:
        return 'alert-md';
    }
  })();

  // Determine status class
  const statusClass = (() => {
    switch (status) {
      case 'success':
        return 'alert-success';
      case 'error':
        return 'alert-error';
      case 'info':
        return 'alert-info';
      case 'warning':
        return 'alert-warning';
      default:
        return 'alert-info';
    }
  })();

  return (
    <div className={`alert ${sizeClass} ${statusClass}`}>
      {title}
    </div>
  );
};

Alert.propTypes = {
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  status: PropTypes.oneOf(['success', 'error', 'info', 'warning']),
  title: PropTypes.string.isRequired,
};

Alert.defaultProps = {
  size: 'md',
  status: 'info',
};

export default Alert;
