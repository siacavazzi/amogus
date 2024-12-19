import React, { useState, useEffect, useContext, useRef } from "react";
import { DataContext } from "../GameContext";

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

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        aria-hidden="true"
      ></div>

      {/* Modal */}
      <div
        className="fixed inset-0 flex items-center justify-center z-50 px-4"
        aria-modal="true"
        role="dialog"
        aria-labelledby="modal-title"
        aria-describedby="modal-description"
      >
        <div
          ref={modalRef}
          tabIndex="-1"
          className="bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-md mx-auto overflow-hidden focus:outline-none"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b dark:border-gray-700">
            <h2
              id="modal-title"
              className="text-xl font-semibold text-gray-800 dark:text-white"
            >
              {dialog?.title || "Default Title"}
            </h2>
          </div>

          {/* Body */}
          <div
            id="modal-description"
            className="px-6 py-4 overflow-y-auto max-h-80"
          >
            {typeof dialog?.body === "string" ? (
              <p className="text-gray-700 dark:text-gray-300">{dialog.body}</p>
            ) : (
              dialog?.body || (
                null
              )
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            {dialog?.title === "Click to enable audio" ?
              <button
                className="w-full bg-green-600 text-white py-4 rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
                onClick={() => closeModal()}
              >
                Enable audio
              </button>
              : <button
                className="w-full bg-blue-600 text-white py-4 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                onClick={() => closeModal()}
              >
                OK
              </button>

            }
          </div>
        </div>
      </div>
    </>
  );
};

export default Modal;
