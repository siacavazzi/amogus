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
      {/* Backdrop with blur */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
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
          className="pointer-events-auto w-full max-w-md mx-auto overflow-hidden focus:outline-none rounded-2xl border border-gray-700/50 bg-gray-900/95 shadow-2xl"
          style={{
            boxShadow: '0 0 40px rgba(0, 0, 0, 0.5), 0 0 80px rgba(34, 211, 238, 0.1)',
          }}
        >
          {/* Header */}
          <div className="relative px-6 py-4 border-b border-gray-700/50 bg-gray-800/50">
            <h2
              id="modal-title"
              className="text-lg font-bold text-white"
            >
              {dialog?.title || "Notification"}
            </h2>
            {!isAudioModal && (
              <button
                onClick={() => setOpen(false)}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700/50 transition-colors"
              >
                <X size={20} />
              </button>
            )}
          </div>

          {/* Body */}
          <div
            id="modal-description"
            className="px-6 py-5 text-gray-300"
          >
            {typeof dialog?.body === "string" ? (
              <p>{dialog.body}</p>
            ) : (
              dialog?.body || null
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-700/50 bg-gray-800/30">
            {isAudioModal ? (
              <button
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-600 to-cyan-500 text-white py-3 rounded-xl font-semibold hover:from-cyan-500 hover:to-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-gray-900 transition-all"
                onClick={() => closeModal()}
              >
                <Volume2 size={20} />
                Enable Audio
              </button>
            ) : (
              <button
                className="w-full bg-gray-700 text-white py-3 rounded-xl font-semibold hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-900 transition-all"
                onClick={() => closeModal()}
              >
                OK
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Modal;
