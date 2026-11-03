import React, { useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from '../signal/icons';
import { DataContext } from '../GameContext';
import { emitVolatileWithAck } from '../utils/socketCommand';
import { sendClientMetric } from '../utils/clientMetrics';
import { isFeedbackSnoozed, snoozeFeedback } from '../utils/feedbackPrompt';
import { t, tk } from '../i18n';

const RATINGS = [['fun', tk('Fun')], ['okay', tk('Okay')], ['needs_work', tk('Needs work')]];
const PROMPT_DELAY_MS = 3000;

// "How was this game?" a few seconds after the result screen, on phones only. Every part of it is optional.
export default function GameFeedback() {
    const { socket, roomCode, roundId, endState, isMobile } = useContext(DataContext);
    const [open, setOpen] = useState(false);
    const [writing, setWriting] = useState(false);
    const dialogRef = useRef(null);
    const [rating, setRating] = useState(null);
    const [comment, setComment] = useState('');
    const [pending, setPending] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');
    const playerId = localStorage.getItem('player_id');
    const eligible = Boolean(isMobile && endState && roundId && playerId);

    useEffect(() => {
        if (!eligible) return undefined;
        const timer = setTimeout(() => {
            if (!isFeedbackSnoozed()) setOpen(true);
        }, PROMPT_DELAY_MS);
        return () => clearTimeout(timer);
    }, [eligible, roundId]);

    useEffect(() => {
        if (!open || !eligible) return undefined;
        const dialog = dialogRef.current;
        if (dialog && !dialog.open && typeof dialog.showModal === 'function') dialog.showModal();
        return () => { if (dialog?.open) dialog.close(); };
    }, [open, eligible]);

    if (!eligible) return null;
    if (submitted) return <p role="status" className="text-center" style={{ fontWeight: 700, fontSize: 15 }}>{t('Thanks for the feedback!')}</p>;
    if (!open) return null;

    const startWriting = () => {
        setWriting(true);
        sendClientMetric(socket, { kind: 'end_screen_action', action: 'feedback_open' });
    };

    const submit = async (event) => {
        event.preventDefault();
        if (pending || (!rating && !comment.trim())) return;
        setError('');
        setPending(true);
        try {
            const response = await emitVolatileWithAck(socket, 'submit_feedback', {
                room_code: roomCode, player_id: playerId, round_id: roundId,
                rating, comment: comment.trim(),
            });
            if (response?.ok !== true) {
                setError(response?.error || 'Feedback did not save. Try again.');
                return;
            }
            sendClientMetric(socket, { kind: 'end_screen_action', action: 'feedback_sent' });
            setSubmitted(true);
            setOpen(false);
        } catch {
            setError('Feedback did not save. Reconnect and try again.');
        } finally {
            setPending(false);
        }
    };

    return createPortal(
        <dialog ref={dialogRef} aria-labelledby="game-feedback-title" className="sg sg-feedback"
            onCancel={(event) => { event.preventDefault(); setOpen(false); }}>
            <button type="button" aria-label={t('Dismiss feedback')} onClick={() => setOpen(false)} className="sg-feedback__close">
                <X size={22} />
            </button>
            <h2 id="game-feedback-title" className="sg-feedback__title">{t('How was this game?')}</h2>
            <p className="sg-feedback__lede">{t('Tell us what to make better. It\'s optional and anonymous.')}</p>
            {!writing ? (
                <div className="flex flex-col" style={{ gap: 10 }}>
                    <button type="button" autoFocus onClick={startWriting} className="sg-btn sg-btn-blue">{t('Give feedback')}</button>
                    <button type="button" onClick={() => setOpen(false)} className="sg-btn sg-btn-soft">{t('Maybe later')}</button>
                    <button type="button" aria-describedby="feedback-snooze-note" onClick={() => { snoozeFeedback(); setOpen(false); }}
                        className="sg-btn sg-btn-flat" style={{ minHeight: 44, fontSize: 15 }}>{t('Don\'t ask again')}</button>
                    <p id="feedback-snooze-note" className="sg-feedback__note">{t('Hides this for one week.')}</p>
                </div>
            ) : (
                <form onSubmit={submit} className="flex flex-col" style={{ gap: 14 }}>
                    <fieldset disabled={pending} style={{ border: 0, padding: 0, margin: 0 }}>
                        <legend className="sg-feedback__label">{t('Your rating (optional)')}</legend>
                        <div className="flex flex-wrap" style={{ gap: 8 }}>
                            {RATINGS.map(([value, label]) => (
                                <label key={value} className={`sg-feedback__chip${rating === value ? ' is-on' : ''}`}>
                                    <input type="radio" name="game-feedback-rating" value={value} checked={rating === value} onChange={() => setRating(value)} />
                                    {t(label)}
                                </label>
                            ))}
                        </div>
                    </fieldset>
                    <div>
                        <label htmlFor="game-feedback-comment" className="sg-feedback__label">{t('Comment (optional)')}</label>
                        <textarea
                            id="game-feedback-comment" value={comment} onChange={(event) => setComment(event.target.value)}
                            maxLength={1000} rows={3} disabled={pending} aria-describedby="game-feedback-hint"
                            className="sg-feedback__text"
                        />
                        <p id="game-feedback-hint" className="sg-feedback__note" style={{ textAlign: 'left' }}>{t('No names or contact details, please. Up to 1,000 characters.')}</p>
                    </div>
                    {error && <p role="alert" style={{ color: 'var(--sg-out)', fontWeight: 700, fontSize: 15, margin: 0 }}>{error}</p>}
                    <button type="submit" disabled={pending || (!rating && !comment.trim())} aria-busy={pending} className="sg-btn sg-btn-blue">
                        {t('Send feedback')}
                    </button>
                    <button type="button" onClick={() => setOpen(false)} className="sg-btn sg-btn-flat" style={{ minHeight: 44, fontSize: 15 }}>{t('Maybe later')}</button>
                </form>
            )}
        </dialog>, document.body
    );
}
