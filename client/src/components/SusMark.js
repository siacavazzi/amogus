import React from 'react';

// The Sus Party logo mark: two eyes on a Signal-blue tile, pupils glancing right.
// Same drawing as public/logo.svg; keep the two in sync.
export default function SusMark({ size = 32, className = '', title }) {
    return (
        <svg
            className={className}
            width={size}
            height={size}
            viewBox="0 0 100 100"
            role={title ? 'img' : undefined}
            aria-hidden={title ? undefined : true}
            focusable="false"
        >
            {title && <title>{title}</title>}
            <rect width="100" height="100" rx="23" fill="#1b4fd8" />
            <circle cx="32" cy="50" r="16" fill="#fff" />
            <circle cx="68" cy="50" r="16" fill="#fff" />
            <path d="M45.50 41.42A11.5 11.5 0 1 0 40.60 63.49A16 16 0 0 0 45.50 41.42ZM81.50 41.42A11.5 11.5 0 1 0 76.60 63.49A16 16 0 0 0 81.50 41.42Z" fill="#1a1400" />
        </svg>
    );
}
