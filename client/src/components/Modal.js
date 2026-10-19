import React, { useState, useEffect, useContext, useRef, useCallback } from "react";
import { DataContext } from "../GameContext";
import { X, Volume2 } from "lucide-react";
import { RoleReveal, RevealedMoment, TauntToast } from "../signal/Moments";
import "../signal/signal.css";

// Pop-ups during the game. Shared moments (role reveal, intruders revealed) take the whole
// screen; a taunt drops in as a card; everything else is a plain white sheet.
const Modal = () => {
  const { dialog, setAudio, setAudioEnabled, meetingState } = useContext(DataContext);
  const [open, setOpen] = useState(false);
  const modalRef = useRef(null);

  useEffect(() => {
    if (dialog?.title && !(meetingState?.stage === "over" || meetingState?.stage === "voting")) {
      setOpen(true);
    } else {
      setOpen(false);
    }
  }, [dialog, meetingState]);

  // Close modal when Escape key is pressed
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  // Focus trap: focus the modal when it opens
  useEffect(() => {
    if (open && modalRef.current) {
      modalRef.current.focus();
    }
  }, [open]);

  const dismiss = useCallback(() => setOpen(false), []);

  function closeModal() {
    setAudio('select')
    setAudioEnabled(true)
    setOpen(false);
  }

  if (!open) return null;

  const frame = (children) => (
    <div ref={modalRef} tabIndex="-1" role="dialog" aria-modal="true" aria-labelledby="modal-title" className="focus:outline-none">
      {children}
    </div>
  );

  if (dialog?.kind === 'role') {
    return frame(<RoleReveal title={dialog.title} sus={dialog.sus} otherIntruders={dialog.otherIntruders} onClose={closeModal} />);
  }
  if (dialog?.kind === 'revealed') {
    return frame(<RevealedMoment intruderNames={dialog.intruderNames} onClose={closeModal} />);
  }
  if (dialog?.kind === 'taunt') {
    return frame(<TauntToast message={dialog.message} onClose={dismiss} />);
  }

  const isAudioModal = dialog?.title === "Click to enable audio";

  return (
    <>
      <div
        className="fixed inset-0 z-50"
        style={{ background: 'rgba(0,0,0,0.55)' }}
        onClick={() => !isAudioModal && setOpen(false)}
        aria-hidden="true"
      />

      <div
        className="sg fixed inset-0 flex items-end sm:items-center justify-center z-50 p-3 pointer-events-none"
        aria-modal="true"
        role="dialog"
        aria-labelledby="modal-title"
        aria-describedby="modal-description"
      >
        <div
          ref={modalRef}
          tabIndex="-1"
          className="sg-a sg-rise pointer-events-auto w-full max-w-md mx-auto focus:outline-none"
          style={{ background: '#fff', color: 'var(--sg-ink)', borderRadius: 26, padding: '22px 20px 18px', position: 'relative' }}
        >
          <h2 id="modal-title" className="sg-big" style={{ fontSize: 30, paddingRight: 36, lineHeight: 1 }}>
            {dialog?.title || "Notification"}
          </h2>
          {!isAudioModal && (
            <button
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="absolute"
              style={{ right: 14, top: 14, width: 36, height: 36, borderRadius: 18, background: '#eceae4', display: 'grid', placeItems: 'center' }}
            >
              <X size={18} strokeWidth={3} />
            </button>
          )}

          <div id="modal-description" style={{ fontWeight: 500, fontSize: 17, lineHeight: 1.4, marginTop: 12 }}>
            {typeof dialog?.body === "string" ? (
              <p>{dialog.body}</p>
            ) : (
              dialog?.body || null
            )}
          </div>

          <div style={{ marginTop: 18 }}>
            {isAudioModal ? (
              <button className="sg-btn" style={{ background: 'var(--sg-round)', color: '#fff' }} onClick={() => closeModal()}>
                <Volume2 size={20} />
                Enable Audio
              </button>
            ) : (
              <button className="sg-btn" style={{ background: 'var(--sg-ink)', color: '#fff' }} onClick={() => closeModal()}>
                Got it
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Modal;
