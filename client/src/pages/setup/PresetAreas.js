import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Plus } from '../../signal/icons';
import { getLanguage, t } from '../../i18n';
import { roomLabel } from '../seo/taskPools';
import { MAX_AREAS, PRESET_TASK_COUNT, defaultAreas } from './taskPresets';

// Second question of the ready-made list: which areas of the place are in play.
export default function PresetAreas({ place, busy, onBack, onMake, onOpenTaskMaker }) {
    const [areas, setAreas] = useState(() => defaultAreas(place));
    const [extra, setExtra] = useState([]);
    const [newArea, setNewArea] = useState('');
    const language = getLanguage();
    const choices = [...place.rooms, ...extra];
    const enough = areas.length >= 2;

    const toggle = (area) => setAreas((current) => (current.includes(area)
        ? current.filter((value) => value !== area)
        : current.length >= MAX_AREAS ? current : [...current, area]));

    const addArea = (event) => {
        event.preventDefault();
        const area = newArea.trim().slice(0, 60);
        if (!area || choices.some((value) => value.toLowerCase() === area.toLowerCase()) || areas.length >= MAX_AREAS) return;
        setExtra((current) => [...current, area]);
        setAreas((current) => [...current, area]);
        setNewArea('');
    };

    return (
        <>
            <button type="button" onClick={onBack} className="sg-link hs-back">
                <ArrowLeft size={18} /> <span>{t('All places')}</span>
            </button>
            <div style={{ display: 'grid', gap: 10 }}>
                <h1 className="sg-big sg-h1">{t(place.label)}</h1>
                <p className="sg-lede hs-muted">{t('Which areas are in play? Players walk between them to do tasks.')}</p>
            </div>

            <div className="hs-panel">
                <div className="hs-areas" role="group" aria-label={t('Play areas')}>
                    {choices.map((area) => {
                        const on = areas.includes(area);
                        return (
                            <button key={area} type="button" className="hs-area" aria-pressed={on} onClick={() => toggle(area)}>
                                {on && <Check size={16} />}
                                <span>{roomLabel(area, language)}</span>
                            </button>
                        );
                    })}
                </div>
                <form className="hs-inline" onSubmit={addArea}>
                    <input
                        id="preset-new-area"
                        className="hs-input"
                        value={newArea}
                        maxLength={60}
                        onChange={(event) => setNewArea(event.target.value)}
                        placeholder={t('Add an area')}
                        aria-label={t('Add an area')}
                    />
                    <button type="submit" className="sg-btn sg-btn-line" style={{ width: 64, padding: 0 }} aria-label={t('Add area')} disabled={!newArea.trim() || areas.length >= MAX_AREAS}>
                        <Plus size={22} />
                    </button>
                </form>
                <p className="sg-small" role="status">
                    {enough
                        ? t('{areas} areas · {tasks} tasks', { areas: areas.length, tasks: PRESET_TASK_COUNT })
                        : t('Pick at least 2 areas.')}
                </p>
            </div>

            <div style={{ display: 'grid', gap: 10 }}>
                <button type="button" onClick={() => onMake(areas)} disabled={!enough || busy} className="sg-btn sg-btn-white" style={{ minHeight: 68, fontSize: 19 }}>
                    {busy ? <span>{t('Writing your tasks…')}</span> : <><span>{t('Make my task list')}</span><ArrowRight size={24} /></>}
                </button>
                <button type="button" onClick={() => onOpenTaskMaker(areas)} disabled={!enough || busy} className="sg-link">
                    {t('Pick every task yourself in the task maker')}
                </button>
            </div>
        </>
    );
}
