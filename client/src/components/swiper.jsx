// ./components/MUECustomSlider.jsx

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Beforeunload } from 'react-beforeunload';
import { FaArrowCircleRight } from "react-icons/fa";

// Dimensions and styling constants
const SLIDER_HEIGHT = '5rem';
const SLIDER_HANDLE_SIZE = '4.5rem';
const SLIDER_BORDER_RADIUS = '2rem';
const SLIDER_TEXT_FONT_SIZE = '1.25rem';
const SLIDER_ICON_SIZE = '3rem';
const SUCCESS_THRESHOLD = 0.8; // 80% threshold

const MUECustomSlider = ({
  onSuccess,
  onReset,
  text = "Slide to unlock",
  sus = false,
  backgroundColor = "#e0e0e0",
}) => {
  const sliderRef = useRef(null);
  const containerRef = useRef(null);

  const [isBlocking, setIsBlocking] = useState(true);
  const [progressPercent, setProgressPercent] = useState(0);
  const [sliderPos, setSliderPos] = useState(0);
  const [unlocked, setUnlocked] = useState(false);

  // Determine gradient colors based on 'sus'
  // Non-sus: from #6EE7B7 to #34D399 (soft green tones)
  // Sus: from #FCA5A5 to #F87171 (soft red-pink)
  const progressGradient = sus
    ? 'linear-gradient(to right, #FCA5A5, #F87171)'
    : 'linear-gradient(to right, #6EE7B7, #34D399)';

  // Logic refs
  const containerWidth = useRef(0);
  const isDragging = useRef(false);
  const startX = useRef(0);

  const updateSliderTransform = useCallback((position) => {
    if (sliderRef.current) {
      sliderRef.current.style.transform = `translateX(${position}px) translateY(-50%)`;
    }
  }, []);

  const resetSlider = useCallback((didSucceed) => {
    isDragging.current = false;
    startX.current = 0;
    setSliderPos(0);
    setProgressPercent(0);
    setUnlocked(false);
    updateSliderTransform(0);
    setIsBlocking(false);

    if (!didSucceed && onReset) {
      onReset();
    }
  }, [onReset, updateSliderTransform]);

  const handleSuccess = useCallback(() => {
    onSuccess && onSuccess();
    // Immediately reset after success scenario
    resetSlider(true);
  }, [onSuccess, resetSlider]);

  useEffect(() => {
    const calculateContainerWidth = () => {
      if (containerRef.current && sliderRef.current) {
        const container = containerRef.current;
        const slider = sliderRef.current;
        const containerWidthVal = container.clientWidth - slider.clientWidth;
        containerWidth.current = containerWidthVal < 0 ? 0 : containerWidthVal;
      }
    };

    calculateContainerWidth();

    let resizeTimeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        calculateContainerWidth();
        resetSlider(false); // Not success scenario
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
    // Always allow dragging since we reset after success/fail
    // Even if unlocked is set, we reset after success, so always draggable again
    isDragging.current = true;
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    startX.current = clientX - sliderPos;
    e.preventDefault();
    e.stopPropagation();
    setIsBlocking(true);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      // Trigger success scenario on keyboard action
      handleSuccess();
    }
  };

  const containerStyle = {
    position: 'fixed',
    bottom: 0,
    left: 0,
    width: '100%',
    userSelect: 'none',
    zIndex: 1000,
    overscrollBehavior: 'none',
    backgroundColor: backgroundColor,
    height: SLIDER_HEIGHT,
  };

  return (
    <>
      <Beforeunload onBeforeunload={(event) => {
        if (isBlocking) {
          event.preventDefault();
          event.returnValue = '';
        }
      }} />
      <div style={containerStyle}>
        <div
          ref={containerRef}
          className="relative h-full flex items-center justify-center px-4 overflow-hidden"
          style={{
            borderRadius: SLIDER_BORDER_RADIUS,
            position: 'relative',
          }}
        >
          {/* Progress Fill */}
          <div
            className="absolute left-0 top-0 h-full transition-all duration-100"
            style={{
              width: `${progressPercent}%`,
              background: progressGradient,
              borderRadius: SLIDER_BORDER_RADIUS,
              zIndex: 0,
            }}
          />

          {/* Slider Handle */}
          <div
            ref={sliderRef}
            onPointerDown={handlePointerDown}
            onTouchStart={handlePointerDown}
            onKeyDown={handleKeyDown}
            tabIndex={0}
            role="slider"
            aria-valuemin={0}
            aria-valuemax={containerWidth.current}
            aria-valuenow={sliderPos}
            aria-label="Slide to unlock"
            className="absolute flex items-center justify-center cursor-pointer shadow-sm focus:outline-none"
            style={{
              top: '50%',
              left: 0,
              width: SLIDER_HANDLE_SIZE,
              height: SLIDER_HANDLE_SIZE,
              borderRadius: '50%',
              background: progressGradient,
              transform: 'translateY(-50%)',
              transition: 'background-color 0.2s',
            }}
          >
            <FaArrowCircleRight
              className="text-white"
              style={{ width: SLIDER_ICON_SIZE, height: SLIDER_ICON_SIZE }}
            />
          </div>

          {/* Text */}
          <div
            className="z-10 pointer-events-none text-center font-medium"
            style={{
              fontSize: SLIDER_TEXT_FONT_SIZE,
              color: '#666',
              whiteSpace: 'nowrap',
            }}
          >
            {text}
          </div>
        </div>
      </div>
    </>
  );
};

export default MUECustomSlider;
