import React, { useState, useEffect, useContext, useRef } from "react";
import { DataContext } from "../GameContext";
import { X, Volume2 } from "lucide-react";

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

  function closeModal() {
    setAudio('select')
    setAudioEnabled(true)
    setOpen(false);
  }

  if (!open) return null;

  const isAudioModal = dialog?.title === "Click to enable audio";

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-md z-50"
        onClick={() => !isAudioModal && setOpen(false)}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className="fixed inset-0 flex items-center justify-center z-50 px-4 pointer-events-none"
        aria-modal="true"
        role="dialog"
        aria-labelledby="modal-title"
        aria-describedby="modal-description"
      >
        <div
          ref={modalRef}
          tabIndex="-1"
          className="pointer-events-auto w-full max-w-md mx-auto overflow-hidden focus:outline-none rounded-3xl border border-white/10 bg-gray-950 shadow-2xl animate-fadeInScale"
          style={{
            boxShadow: '0 0 0 1px rgba(255,255,255,0.06), 0 24px 64px rgba(0,0,0,0.7), 0 0 80px rgba(99,102,241,0.12)',
          }}
        >
          {/* Top accent line */}
          <div className="h-px bg-gradient-to-r from-transparent via-indigo-500/60 to-transparent" />

          {/* Header */}
          <div className="relative px-6 pt-5 pb-4">
            <h2
              id="modal-title"
              className="text-base font-semibold text-white pr-8 leading-snug"
            >
              {dialog?.title || "Notification"}
            </h2>
            {!isAudioModal && (
              <button
                onClick={() => setOpen(false)}
                className="absolute right-4 top-4 p-1.5 rounded-xl text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X size={18} />
              </button>
            )}
          </div>

          {/* Body */}
          <div
            id="modal-description"
            className="px-6 pb-2 text-gray-300 text-sm leading-relaxed"
          >
            {typeof dialog?.body === "string" ? (
              <p>{dialog.body}</p>
            ) : (
              dialog?.body || null
            )}
          </div>

          {/* Footer */}
          <div className="px-6 pt-4 pb-6">
            {isAudioModal ? (
              <button
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-2xl font-semibold hover:from-indigo-500 hover:to-purple-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-950 transition-all"
                onClick={() => closeModal()}
              >
                <Volume2 size={18} />
                Enable Audio
              </button>
            ) : (
              <button
                className="w-full bg-white/8 hover:bg-white/12 border border-white/10 text-white py-3 rounded-2xl font-semibold focus:outline-none focus:ring-2 focus:ring-white/20 focus:ring-offset-2 focus:ring-offset-gray-950 transition-all"
                onClick={() => closeModal()}
              >
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
