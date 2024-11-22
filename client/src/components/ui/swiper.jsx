// ./components/MUECustomSlider.jsx

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Beforeunload } from 'react-beforeunload';
import "./custom.css"; // Ensure your CSS is correctly imported
import { FaArrowCircleRight } from "react-icons/fa";


const MUECustomSlider = ({
  onSuccess,
  onReset,
  text = "Slide to unlock",
  sliderColor = "#4caf50",      // Default slider color (green)
  backgroundColor = "#e0e0e0",  // Default container background color (light gray)
}) => {
  const sliderRef = useRef(null);
  const containerRef = useRef(null);
  const mainTextRef = useRef(null);

  const [unlocked, setUnlocked] = useState(false);
  const [isBlocking, setIsBlocking] = useState(true); // Initialize as blocking

  // Mutable refs to avoid re-renders
  const sliderPosition = useRef(0);
  const containerWidth = useRef(0);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const animationFrame = useRef(null);

  // **Calculate container width once**
  useEffect(() => {
    const calculateContainerWidth = () => {
      if (containerRef.current && sliderRef.current) {
        const containerStyles = getComputedStyle(containerRef.current);
        const paddingLeft = parseFloat(containerStyles.paddingLeft) || 0;
        const paddingRight = parseFloat(containerStyles.paddingRight) || 0;
        containerWidth.current =
          containerRef.current.clientWidth -
          sliderRef.current.clientWidth -
          paddingLeft -
          paddingRight;
      }
    };

    calculateContainerWidth();

    // Debounce resize handling
    let resizeTimeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        calculateContainerWidth();
        // Reset slider if container size changes
        resetSlider();
      }, 100);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(resizeTimeout);
    };
  }, []);

  // **Function to update slider transform**
  const updateSliderTransform = useCallback((position) => {
    if (sliderRef.current && containerRef.current) {
      sliderRef.current.style.transform = `translateX(${position}px) translateY(-50%)`;
      const progressPercent = (position / containerWidth.current) * 100;
      containerRef.current.style.setProperty('--progress-width', `${progressPercent}%`);
    }
  }, []);

  // **Function to handle success**
  const handleSuccess = useCallback(() => {
    sliderPosition.current = containerWidth.current;
    updateSliderTransform(containerWidth.current);
    onSuccess && onSuccess();
    setUnlocked(true);
    setIsBlocking(false); // Stop blocking after unlock
  }, [onSuccess, updateSliderTransform]);

  // **Function to handle reset**
  const handleReset = useCallback(() => {
    sliderPosition.current = 0;
    updateSliderTransform(0);
    setUnlocked(false);
    onReset && onReset();
    setIsBlocking(false); // Stop blocking after reset
  }, [onReset, updateSliderTransform]);

  // **Function to reset slider**
  const resetSlider = useCallback(() => {
    isDragging.current = false;
    handleReset();
  }, [handleReset]);

  // **Handle pointer move**
  const handlePointerMove = useCallback(
    (e) => {
      if (!isDragging.current || unlocked) return;

      e.preventDefault();
      e.stopPropagation();

      const clientX = e.clientX || (e.touches && e.touches[0].clientX);
      const deltaX = clientX - startX.current;
      const newPosition = Math.min(Math.max(0, deltaX), containerWidth.current);

      // Update position via requestAnimationFrame
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
      }
      animationFrame.current = requestAnimationFrame(() => {
        sliderPosition.current = newPosition;
        updateSliderTransform(newPosition);
      });
    },
    [unlocked, updateSliderTransform]
  );

  // **Handle pointer up**
  const handlePointerUp = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;

    if (sliderPosition.current >= containerWidth.current * 0.8) { // 80% threshold
      sliderPosition.current = containerWidth.current;
      updateSliderTransform(containerWidth.current);
      handleSuccess();
    } else {
      handleReset();
    }
  }, [handleSuccess, handleReset, updateSliderTransform]);

  // **Attach and detach event listeners**
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
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
      }
    };
  }, [handlePointerMove, handlePointerUp]);

  // **Start dragging**
  const handlePointerDown = (e) => {
    if (unlocked) return;
    isDragging.current = true;
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    startX.current = clientX - sliderPosition.current;
    e.preventDefault(); // Prevent text selection or scrolling
    e.stopPropagation(); // Prevent event from bubbling up
    setIsBlocking(true); // Start blocking when dragging starts
  };

  // **Keyboard accessibility**
  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (!unlocked) {
        handleSuccess();
      } else {
        handleReset();
      }
    }
  };

  // **Define CSS variables for colors**
  const containerStyle = {
    '--slider-color': sliderColor,
    '--background-color': backgroundColor,
    'overscroll-behavior': 'none', // More restrictive to prevent all overscroll gestures
  };

  // **Use the Beforeunload component from react-beforeunload**
  return (
    <>
      {/* The Beforeunload component handles the beforeunload event */}
      <Beforeunload onBeforeunload={(event) => {
        if (isBlocking) {
          event.preventDefault();
          event.returnValue = ''; // Required for Chrome
        }
      }} />
      <div className="ReactSwipeButton" style={containerStyle}>
        <div className="rsbContainer" ref={containerRef}>
          <div
            className={`rsbcSlider ${unlocked ? "unlocked" : ""}`}
            ref={sliderRef}
            onPointerDown={handlePointerDown}
            onTouchStart={handlePointerDown}
            tabIndex={0}
            role="slider"
            aria-valuemin={0}
            aria-valuemax={containerWidth.current}
            aria-valuenow={sliderPosition.current}
            aria-label="Slide to unlock"
            onKeyDown={handleKeyDown}
          >
            <FaArrowCircleRight />
            {/* Optional: You can include an icon inside the slider handle */}
            {/* <div className="rsbcSliderIcon">🔓</div> */}
          </div>
          <div
            className={`rsbcText ${unlocked ? "unlocked" : ""}`}
            ref={mainTextRef}
          >
            {text}
          </div>
        </div>
      </div>
    </>
  );
};

export default MUECustomSlider;
