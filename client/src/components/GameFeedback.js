import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from '../signal/icons';
import { DataContext } from '../GameContext';
import { emitVolatileWithAck } from '../utils/socketCommand';
import { sendClientMetric } from '../utils/clientMetrics';
import { isFeedbackSnoozed, snoozeFeedback } from '../utils/feedbackPrompt';
import { t, tk } from '../i18n';

const RATINGS = [['fun', tk('Fun')], ['okay', tk('Okay')], ['needs_work', tk('Needs work')]];
// Half the phones leave within a minute of the night's last round, so "Save this game" gets the
// screen first: the prompt waits 20 s, or comes 2 s after the player is done saving.
export const PROMPT_DELAY_MS = 20000;
export const PROMPT_AFTER_SAVE_MS = 2000;
const THANKS_MS = 4000;

// The result screen tells the prompt when this player tapped Play Again or Leave (no prompt this
// round) or finished with Save this game (prompt sooner). Without a provider these do nothing.
const FeedbackPromptContext = createContext({ skipRound: () => {}, savedRound: () => {} });
export const useFeedbackPrompt = () => useContext(FeedbackPromptContext);

// "How was this game?" after a round, on phones only. Every part of it is optional.
// It wraps the whole page, not the result screen, so the group's Play Again can send the room back
// to the lobby without closing a form someone is halfway through: it stays open until sent or closed.
export default function GameFeedback({ children = null, delayMs = PROMPT_DELAY_MS }) {
    const { socket, roomCode, roundId, endState, isMobile, resetVotes } = useContext(DataContext);
    const [skippedRound, setSkippedRound] = useState(null);
    const [savedRoundId, setSavedRoundId] = useState(null);
    // One prompt per player per round: the round it last asked about, and the one it is asking about now.
    const [askedRound, setAskedRound] = useState(null);
    const [prompt, setPrompt] = useState(null);
    const [writing, setWriting] = useState(false);
    const dialogRef = useRef(null);
    const keptOpenRef = useRef(null);
    const [rating, setRating] = useState(null);
    const [comment, setComment] = useState('');
    const [pending, setPending] = useState(false);
    const [thanks, setThanks] = useState(false);
    const [error, setError] = useState('');
    const playerId = localStorage.getItem('player_id');
    const voted = Boolean(playerId && resetVotes?.voters?.includes(playerId));
    const waiting = Boolean(isMobile && endState && roundId && playerId && !voted && !prompt
        && skippedRound !== roundId && askedRound !== roundId);
    const wait = savedRoundId === roundId ? PROMPT_AFTER_SAVE_MS : delayMs;

    const controls = useMemo(() => ({ skipRound: setSkippedRound, savedRound: setSavedRoundId }), []);
    const metric = useCallback((action) => sendClientMetric(socket, { kind: 'end_screen_action', action }), [socket]);

    useEffect(() => {
        if (!waiting) return undefined;
        const timer = setTimeout(() => {
            setAskedRound(roundId);
            if (isFeedbackSnoozed()) return;
            setWriting(false);
            setRating(null);
            setComment('');
            setError('');
            setPrompt({ roundId, roomCode });
            metric('feedback_shown');
        }, wait);
        return () => clearTimeout(timer);
    }, [waiting, roundId, roomCode, wait, metric]);

    useEffect(() => {
        if (!prompt) return undefined;
        const dialog = dialogRef.current;
        if (dialog && !dialog.open && typeof dialog.showModal === 'function') dialog.showModal();
        return () => { if (dialog?.open) dialog.close(); };
    }, [prompt]);

    // The room moved on (Play Again, a new round) while the form was open: count it once, keep the form.
    useEffect(() => {
        if (prompt && roundId && roundId !== prompt.roundId && keptOpenRef.current !== prompt.roundId) {
            keptOpenRef.current = prompt.roundId;
            metric('feedback_kept_open');
        }
    }, [prompt, roundId, metric]);

    useEffect(() => {
        if (!thanks) return undefined;
        const timer = setTimeout(() => setThanks(false), THANKS_MS);
        return () => clearTimeout(timer);
    }, [thanks]);

    const close = (action) => {
        metric(action);
        setPrompt(null);
    };
    const dismiss = () => close(writing ? 'feedback_abandoned' : 'feedback_later');

    const startWriting = () => {
        setWriting(true);
        metric('feedback_open');
    };

    const submit = async (event) => {
        event.preventDefault();
        if (pending || (!rating && !comment.trim())) return;
        setError('');
        setPending(true);
        try {
            const response = await emitVolatileWithAck(socket, 'submit_feedback', {
                room_code: prompt.roomCode, player_id: playerId, round_id: prompt.roundId,
                rating, comment: comment.trim(),
            });
            if (response?.ok !== true) {
                setError(t(response?.error || 'Feedback did not save. Try again.'));
                return;
            }
            metric('feedback_sent');
            setThanks(true);
            setPrompt(null);
        } catch {
            setError(t('Feedback did not save. Reconnect and try again.'));
        } finally {
            setPending(false);
        }
    };

    return (
        <FeedbackPromptContext.Provider value={controls}>
            {children}
            {thanks && <p role="status" className="sg sg-feedback-thanks">{t('Thanks for the feedback!')}</p>}
            {prompt && createPortal(
                <dialog ref={dialogRef} aria-labelledby="game-feedback-title" className="sg sg-feedback"
                    onCancel={(event) => { event.preventDefault(); dismiss(); }}>
                    <button type="button" aria-label={t('Dismiss feedback')} onClick={dismiss} className="sg-feedback__close">
                        <X size={22} />
                    </button>
                    <h2 id="game-feedback-title" className="sg-feedback__title">{t('How was this game?')}</h2>
                    <p className="sg-feedback__lede">{t('Tell us what to make better. It\'s optional and anonymous.')}</p>
                    {!writing ? (
                        <div className="flex flex-col" style={{ gap: 10 }}>
                            <button type="button" autoFocus onClick={startWriting} className="sg-btn sg-btn-blue">{t('Give feedback')}</button>
                            <button type="button" onClick={dismiss} className="sg-btn sg-btn-soft">{t('Maybe later')}</button>
                            <button type="button" aria-describedby="feedback-snooze-note" onClick={() => { snoozeFeedback(); close('feedback_snoozed'); }}
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
                            <button type="button" onClick={dismiss} className="sg-btn sg-btn-flat" style={{ minHeight: 44, fontSize: 15 }}>{t('Maybe later')}</button>
                        </form>
                    )}
                </dialog>, document.body
            )}
        </FeedbackPromptContext.Provider>
    );
}
