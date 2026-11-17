// ./components/MUECustomSlider.jsx

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Beforeunload } from 'react-beforeunload';
import { ChevronRight, Check } from "../signal/icons";
import { t, tk } from '../i18n';

// Dimensions and styling constants
const SLIDER_HEIGHT = '4.5rem';
const SLIDER_HANDLE_SIZE = '3.5rem';
const SUCCESS_THRESHOLD = 0.85; // 85% threshold

const MUECustomSlider = ({
  onSuccess,
  onReset,
  text = tk("Slide to unlock"),
  sus = false,
  tone = "round",
  backgroundColor = "transparent",
  disabled = false,
  pending = false,
  // Fills the track behind the label while the slider can't be used, e.g. the 15 s kill cooldown:
  // { fraction: 0..1, color }
  meter = null,
}) => {
  const sliderRef = useRef(null);
  const containerRef = useRef(null);

  const [isBlocking, setIsBlocking] = useState(true);
  const [progressPercent, setProgressPercent] = useState(0);
  const [sliderPos, setSliderPos] = useState(0);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isRequestPending, setIsRequestPending] = useState(false);

  // Logic refs
  const containerWidth = useRef(0);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const requestPending = useRef(false);
  const isDisabled = disabled || pending || isRequestPending || isSuccess;

  const updateSliderTransform = useCallback((position) => {
    if (sliderRef.current) {
      sliderRef.current.style.transform = `translateX(${position}px) translateY(-50%)`;
    }
  }, []);

  const resetSlider = useCallback((didSucceed) => {
    isDragging.current = false;
    startX.current = 0;
    
    // Smooth reset animation
    const startPos = sliderPos;
    const duration = 300;
    const startTime = Date.now();
    
    const animateReset = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const currentPos = startPos * (1 - eased);
      
      setSliderPos(currentPos);
      setProgressPercent((currentPos / containerWidth.current) * 100);
      updateSliderTransform(currentPos);
      
      if (progress < 1) {
        requestAnimationFrame(animateReset);
      } else {
        setSliderPos(0);
        setProgressPercent(0);
        setIsSuccess(false);
        updateSliderTransform(0);
      }
    };
    
    if (!didSucceed) {
      animateReset();
    } else {
      setSliderPos(0);
      setProgressPercent(0);
      setIsSuccess(false);
      updateSliderTransform(0);
    }
    
    setIsBlocking(false);

    if (!didSucceed && onReset) {
      onReset();
    }
  }, [onReset, updateSliderTransform, sliderPos]);

  const handleSuccess = useCallback(async () => {
    if (disabled || pending || requestPending.current || isSuccess) return;
    requestPending.current = true;
    setIsRequestPending(true);

    let accepted = true;
    try {
      accepted = (await onSuccess?.()) !== false;
    } catch (error) {
      accepted = false;
    }

    requestPending.current = false;
    setIsRequestPending(false);
    if (!accepted) {
      resetSlider(false);
      return;
    }

    setIsSuccess(true);
    if (navigator.vibrate) navigator.vibrate([50, 30, 50]);
    setTimeout(() => resetSlider(true), 700);
  }, [disabled, isSuccess, onSuccess, pending, resetSlider]);

  useEffect(() => {
    const calculateContainerWidth = () => {
      if (containerRef.current && sliderRef.current) {
        const container = containerRef.current;
        const slider = sliderRef.current;
        const containerWidthVal = container.clientWidth - slider.clientWidth - 8; // 8px padding
        containerWidth.current = containerWidthVal < 0 ? 0 : containerWidthVal;
      }
    };

    calculateContainerWidth();

    let resizeTimeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        calculateContainerWidth();
        resetSlider(false);
      }, 100);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(resizeTimeout);
    };
  }, [resetSlider]);

  const handlePointerMove = useCallback((e) => {
    if (!isDragging.current) return;

    e.preventDefault();
    e.stopPropagation();

    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const deltaX = clientX - startX.current;
    const newPosition = Math.min(Math.max(0, deltaX), containerWidth.current);

    setSliderPos(newPosition);

    const newProgress = containerWidth.current > 0
      ? (newPosition / containerWidth.current) * 100
      : 0;

    setProgressPercent(newProgress);
    updateSliderTransform(newPosition);
  }, [updateSliderTransform]);

  const handlePointerUp = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;

    const threshold = containerWidth.current * SUCCESS_THRESHOLD;
    if (sliderPos >= threshold) {
      handleSuccess();
    } else {
      resetSlider(false);
    }
  }, [handleSuccess, resetSlider, sliderPos]);

  useEffect(() => {
    const handlePointerMoveEvent = (e) => handlePointerMove(e);
    const handlePointerUpEvent = () => handlePointerUp();

    window.addEventListener("pointermove", handlePointerMoveEvent, { passive: false });
    window.addEventListener("pointerup", handlePointerUpEvent);
    window.addEventListener("touchmove", handlePointerMoveEvent, { passive: false });
    window.addEventListener("touchend", handlePointerUpEvent);

    return () => {
      window.removeEventListener("pointermove", handlePointerMoveEvent);
      window.removeEventListener("pointerup", handlePointerUpEvent);
      window.removeEventListener("touchmove", handlePointerMoveEvent);
      window.removeEventListener("touchend", handlePointerUpEvent);
    };
  }, [handlePointerMove, handlePointerUp]);

  const handlePointerDown = (e) => {
    if (isDisabled) return;
    isDragging.current = true;
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    startX.current = clientX - sliderPos;
    e.preventDefault();
    e.stopPropagation();
    setIsBlocking(true);
  };

  const handleKeyDown = (e) => {
    if (!isDisabled && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      handleSuccess();
    }
  };

  // Signal: the slider looks the same for every role. Tone follows the screen colour.
  const onYellow = tone === 'meet';
  const knobBg = onYellow ? 'var(--sg-ink)' : '#fff';
  const knobFg = onYellow ? 'var(--sg-meet)' : 'var(--sg-round)';
  const trackBg = onYellow ? 'rgba(26, 20, 0, 0.14)' : 'rgba(0, 0, 0, 0.22)';
  const fillBg = onYellow ? 'rgba(26, 20, 0, 0.16)' : 'rgba(255, 255, 255, 0.22)';
  // Done: the whole track fills green and the knob turns into a tick (no full-screen flash).
  const doneGreen = '#3ddc97';

  return (
    <>
      <Beforeunload onBeforeunload={(event) => {
        if (isBlocking) {
          event.preventDefault();
          event.returnValue = '';
        }
      }} />

      <div
        className="sg sg-slide-dock fixed bottom-0 left-0 right-0 z-50 px-4"
        style={{
          userSelect: 'none',
          overscrollBehavior: 'none',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)',
          paddingTop: 12,
          color: onYellow ? 'var(--sg-ink)' : '#fff',
        }}
      >
        <div className="max-w-xl mx-auto">
          <div
            ref={containerRef}
            className="relative flex items-center px-1 overflow-hidden rounded-full"
            style={{ height: SLIDER_HEIGHT, background: trackBg, opacity: isDisabled && !isSuccess && !isRequestPending && !pending && !meter ? 0.6 : 1 }}
          >
          {meter && (
            <div
              data-testid="slider-meter"
              className="absolute left-0 top-0 h-full sg-slide-meter"
              style={{ width: `${Math.round(Math.min(1, Math.max(0, meter.fraction)) * 100)}%`, background: meter.color || 'var(--sg-out)' }}
            />
          )}
          {/* Fill follows the knob */}
          <div
            className="absolute left-0 top-0 h-full rounded-full"
            style={{
              width: isSuccess ? '100%' : `calc(${Math.min(progressPercent, 100)}% + ${SLIDER_HANDLE_SIZE})`,
              background: isSuccess ? doneGreen : fillBg,
              opacity: progressPercent > 0 || isSuccess ? 1 : 0,
              transition: isSuccess ? 'background-color 200ms ease, width 200ms ease' : 'none',
            }}
          />

          {/* Slider Handle */}
          <div
            ref={sliderRef}
            onPointerDown={handlePointerDown}
            onTouchStart={handlePointerDown}
            onKeyDown={handleKeyDown}
            tabIndex={isDisabled ? -1 : 0}
            role="slider"
            aria-disabled={isDisabled}
            aria-busy={isRequestPending || pending}
            aria-valuemin={0}
            aria-valuemax={containerWidth.current}
            aria-valuenow={sliderPos}
            aria-label={t('Slide to unlock')}
            className={`absolute flex items-center justify-center ${isDisabled ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'} focus:outline-none z-10`}
            style={{
              top: '50%',
              left: '4px',
              width: SLIDER_HANDLE_SIZE,
              height: SLIDER_HANDLE_SIZE,
              borderRadius: '50%',
              background: knobBg,
              color: knobFg,
              transform: 'translateY(-50%)',
              touchAction: 'none',
            }}
          >
            {isSuccess ? (
              <Check size={28} strokeWidth={3.5} style={{ color: '#0b6b3f' }} className="sg-a sg-pop" />
            ) : (
              <div className="flex items-center">
                <ChevronRight size={22} strokeWidth={3.5} />
                <ChevronRight size={22} strokeWidth={3.5} className="-ml-3.5" />
              </div>
            )}
          </div>

          {/* Label fades as the knob travels */}
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{ opacity: Math.max(0, 1 - (progressPercent / 60)), paddingLeft: SLIDER_HANDLE_SIZE }}
          >
            <span style={{ fontWeight: 700, fontSize: 17 }}>{t(text)}</span>
          </div>
        </div>
        </div>
      </div>
    </>
  );
};

export default MUECustomSlider;
