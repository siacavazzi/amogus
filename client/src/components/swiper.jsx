// ./components/MUECustomSlider.jsx

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Beforeunload } from 'react-beforeunload';
import { ChevronRight, Check, Zap } from "lucide-react";

// Dimensions and styling constants
const SLIDER_HEIGHT = '4.5rem';
const SLIDER_HANDLE_SIZE = '3.5rem';
const SUCCESS_THRESHOLD = 0.85; // 85% threshold

const MUECustomSlider = ({
  onSuccess,
  onReset,
  text = "Slide to unlock",
  sus = false,
  backgroundColor = "transparent",
}) => {
  const sliderRef = useRef(null);
  const containerRef = useRef(null);

  const [isBlocking, setIsBlocking] = useState(true);
  const [progressPercent, setProgressPercent] = useState(0);
  const [sliderPos, setSliderPos] = useState(0);
  const [isSuccess, setIsSuccess] = useState(false);
  const [ripples, setRipples] = useState([]);
  const [shimmerPos, setShimmerPos] = useState(-100);

  // Logic refs
  const containerWidth = useRef(0);
  const isDragging = useRef(false);
  const startX = useRef(0);

  // Shimmer animation
  useEffect(() => {
    const shimmerInterval = setInterval(() => {
      setShimmerPos(prev => {
        if (prev > 200) return -100;
        return prev + 3;
      });
    }, 30);
    return () => clearInterval(shimmerInterval);
  }, []);

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

  const handleSuccess = useCallback(() => {
    setIsSuccess(true);
    
    // Add success ripple effect
    const newRipple = { id: Date.now(), x: containerWidth.current };
    setRipples(prev => [...prev, newRipple]);
    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== newRipple.id));
    }, 600);
    
    // Haptic feedback if available
    if (navigator.vibrate) {
      navigator.vibrate([50, 30, 50]);
    }
    
    setTimeout(() => {
      onSuccess && onSuccess();
      resetSlider(true);
    }, 400);
  }, [onSuccess, resetSlider]);

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
      handleSuccess();
    }
  };

  // Dynamic colors based on sus prop and progress
  const accentColor = sus ? 'rgb(239, 68, 68)' : 'rgb(34, 211, 238)';
  const accentColorDim = sus ? 'rgba(239, 68, 68, 0.3)' : 'rgba(34, 211, 238, 0.3)';
  const glowColor = sus ? 'rgba(239, 68, 68, 0.5)' : 'rgba(34, 211, 238, 0.5)';

  return (
    <>
      <Beforeunload onBeforeunload={(event) => {
        if (isBlocking) {
          event.preventDefault();
          event.returnValue = '';
        }
      }} />
      
      <div 
        className="fixed bottom-0 left-0 right-0 z-50 p-4 pb-6 bg-gradient-to-t from-gray-900 via-gray-900/95 to-transparent"
        style={{
          userSelect: 'none',
          overscrollBehavior: 'none',
        }}
      >
        <div className="max-w-xl mx-auto">
          <div
            ref={containerRef}
            className="relative flex items-center px-1 overflow-hidden rounded-full"
            style={{
              height: SLIDER_HEIGHT,
              background: 'rgba(17, 24, 39, 0.9)',
              border: `2px solid ${progressPercent > 50 ? accentColor : 'rgba(55, 65, 81, 0.8)'}`,
              boxShadow: progressPercent > 0 ? `0 0 20px ${accentColorDim}, inset 0 0 20px ${accentColorDim}` : 'none',
              transition: 'border-color 0.3s, box-shadow 0.3s',
            }}
          >
          {/* Shimmer effect on track */}
          <div 
            className="absolute inset-0 pointer-events-none overflow-hidden rounded-full"
            style={{
              background: `linear-gradient(90deg, transparent ${shimmerPos - 30}%, rgba(255,255,255,0.1) ${shimmerPos}%, transparent ${shimmerPos + 30}%)`,
            }}
          />

          {/* Progress Fill with gradient */}
          <div
            className="absolute left-0 top-0 h-full rounded-full transition-all duration-75"
            style={{
              width: `${Math.min(progressPercent + 5, 100)}%`,
              background: sus 
                ? 'linear-gradient(90deg, rgba(239, 68, 68, 0.2), rgba(239, 68, 68, 0.4))'
                : 'linear-gradient(90deg, rgba(34, 211, 238, 0.2), rgba(34, 211, 238, 0.4))',
              opacity: progressPercent > 0 ? 1 : 0,
            }}
          />

          {/* Particle trail effect */}
          {progressPercent > 10 && (
            <div 
              className="absolute top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ left: `${Math.max(0, progressPercent - 15)}%` }}
            >
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-1 h-1 rounded-full animate-ping"
                  style={{
                    backgroundColor: accentColor,
                    left: `${i * -10}px`,
                    opacity: 0.6 - (i * 0.2),
                    animationDelay: `${i * 100}ms`,
                    animationDuration: '1s',
                  }}
                />
              ))}
            </div>
          )}

          {/* Success ripple effects */}
          {ripples.map(ripple => (
            <div
              key={ripple.id}
              className="absolute top-1/2 -translate-y-1/2 rounded-full pointer-events-none"
              style={{
                left: ripple.x,
                width: '100px',
                height: '100px',
                marginLeft: '-50px',
                marginTop: '-50px',
                border: `2px solid ${accentColor}`,
                animation: 'ping 0.6s ease-out forwards',
                opacity: 0,
              }}
            />
          ))}

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
            className="absolute flex items-center justify-center cursor-grab active:cursor-grabbing focus:outline-none z-10"
            style={{
              top: '50%',
              left: '4px',
              width: SLIDER_HANDLE_SIZE,
              height: SLIDER_HANDLE_SIZE,
              borderRadius: '50%',
              background: isSuccess 
                ? (sus ? 'rgb(239, 68, 68)' : 'rgb(34, 211, 238)')
                : `linear-gradient(135deg, ${sus ? '#ef4444' : '#22d3ee'}, ${sus ? '#b91c1c' : '#0891b2'})`,
              transform: 'translateY(-50%)',
              boxShadow: `0 0 ${progressPercent > 50 ? '25px' : '15px'} ${glowColor}, 0 4px 15px rgba(0,0,0,0.3)`,
              transition: 'box-shadow 0.3s, background 0.3s',
            }}
          >
            {isSuccess ? (
              <Check size={24} className="text-white" />
            ) : (
              <div className="relative">
                {/* Animated chevrons */}
                <div className="flex items-center">
                  <ChevronRight 
                    size={20} 
                    className="text-white"
                    style={{ 
                      opacity: 0.5,
                      animation: 'pulse 1.5s ease-in-out infinite',
                    }}
                  />
                  <ChevronRight 
                    size={20} 
                    className="text-white -ml-3"
                    style={{ 
                      opacity: 0.75,
                      animation: 'pulse 1.5s ease-in-out infinite 0.2s',
                    }}
                  />
                  <ChevronRight 
                    size={20} 
                    className="text-white -ml-3"
                    style={{ 
                      animation: 'pulse 1.5s ease-in-out infinite 0.4s',
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Text with fade effect */}
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{
              opacity: Math.max(0, 1 - (progressPercent / 60)),
            }}
          >
            <div className="flex items-center gap-2">
              {sus && <Zap size={18} className="text-red-400" />}
              <span 
                className="font-semibold tracking-wide text-sm"
                style={{
                  color: sus ? 'rgb(252, 165, 165)' : 'rgb(164, 211, 238)',
                }}
              >
                {text}
              </span>
              {!sus && <Zap size={18} className="text-cyan-400" />}
            </div>
          </div>

          {/* Edge glow at the end */}
          <div 
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full pointer-events-none"
            style={{
              background: `radial-gradient(circle, ${accentColorDim} 0%, transparent 70%)`,
              opacity: progressPercent > 70 ? (progressPercent - 70) / 30 : 0,
              animation: progressPercent > 80 ? 'pulse 0.5s ease-in-out infinite' : 'none',
            }}
          />
        </div>
        </div>
      </div>
    </>
  );
};

export default MUECustomSlider;
