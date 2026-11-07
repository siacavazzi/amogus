import React from 'react';
import { LANGUAGES, chooseLanguage, getLanguage, t } from '../i18n';

// Per phone: each player picks the language their own screens use. Changing it reloads the page.
export default function LanguagePicker({ className = '', style }) {
    const current = getLanguage();
    return (
        <label className={`sg-lang ${className}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 14, ...style }}>
            <span aria-hidden="true">🌐</span>
            <select
                value={current}
                onChange={(e) => chooseLanguage(e.target.value)}
                data-testid="language-picker"
                aria-label={t('Language')}
                translate="no"
                style={{ background: 'transparent', color: 'inherit', border: 0, font: 'inherit', cursor: 'pointer' }}
            >
                {LANGUAGES.map(({ code, name }) => (
                    <option key={code} value={code} style={{ color: '#111' }}>{name}</option>
                ))}
            </select>
        </label>
    );
}
