import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Camera, RotateCcw, Check, X } from 'lucide-react';
import { CircleIconButton, SecondaryButton, ButtonGroup } from './ui';

function CameraCapture({ onCapture, onCancel }) {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const [stream, setStream] = useState(null);
    const [capturedImage, setCapturedImage] = useState(null);
    const [error, setError] = useState(null);
    const [facingMode, setFacingMode] = useState('user'); // 'user' for front camera

    const startCamera = useCallback(async () => {
        try {
            // Check if we're in a secure context (HTTPS or localhost)
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                setError('Camera not available. Make sure you\'re using HTTPS or localhost.');
                return;
            }

            // Stop any existing stream
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }

            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { 
                    facingMode: facingMode,
                    width: { ideal: 480 },
                    height: { ideal: 480 }
                },
                audio: false
            });
            
            streamRef.current = mediaStream;
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
            setError(null);
        } catch (err) {
            console.error('Error accessing camera:', err);
            if (err.name === 'NotAllowedError') {
                setError('Camera permission denied. Please allow camera access to take a selfie.');
            } else if (err.name === 'NotFoundError') {
                setError('No camera found on this device.');
            } else if (err.name === 'NotReadableError') {
                setError('Camera is in use by another application.');
            } else if (err.name === 'OverconstrainedError') {
                setError('Camera does not meet requirements.');
            } else if (!window.isSecureContext) {
                setError('Camera requires HTTPS. Please use a secure connection.');
            } else {
                setError(`Could not access camera: ${err.message || err.name || 'Unknown error'}`);
            }
        }
    }, [facingMode]);

    useEffect(() => {
        startCamera();
        
        return () => {
            // Cleanup: stop all tracks when component unmounts
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }
        };
    }, [startCamera]);

    // Restart camera when facing mode changes
    useEffect(() => {
        if (!capturedImage) {
            startCamera();
        }
    }, [facingMode, capturedImage, startCamera]);

    const capturePhoto = () => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        // Set canvas size to match video
        const size = Math.min(video.videoWidth, video.videoHeight);
        canvas.width = 300;
        canvas.height = 300;

        // Calculate crop to make it square (center crop)
        const offsetX = (video.videoWidth - size) / 2;
        const offsetY = (video.videoHeight - size) / 2;

        // Draw the video frame to canvas (cropped and scaled)
        context.drawImage(
            video,
            offsetX, offsetY, size, size,  // Source rectangle
            0, 0, 300, 300                  // Destination rectangle
        );

        // Convert to base64
        const imageData = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedImage(imageData);

        // Stop the camera stream
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
            setStream(null);
        }
    };

    const retakePhoto = () => {
        setCapturedImage(null);
        startCamera();
    };

    const confirmPhoto = () => {
        if (capturedImage) {
            // Ensure stream is stopped
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
                setStream(null);
            }
            onCapture(capturedImage);
        }
    };

    const toggleCamera = () => {
        setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    };

    const skipPhoto = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
            setStream(null);
        }
        onCancel();
    };

    if (error) {
        return (
            <div className="flex flex-col items-center p-4">
                <div className="bg-red-500 bg-opacity-20 border border-red-500 rounded-lg p-4 mb-4 text-center">
                    <p className="text-red-400">{error}</p>
                </div>
                <SecondaryButton onClick={skipPhoto} fullWidth={false}>
                    Skip Photo
                </SecondaryButton>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center">
            {/* Hidden canvas for capturing */}
            <canvas ref={canvasRef} className="hidden" />

            {!capturedImage ? (
                <>
                    {/* Camera Preview */}
                    <div className="relative w-64 h-64 rounded-full overflow-hidden border-4 border-indigo-500 mb-4">
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover"
                            style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
                        />
                    </div>

                    {/* Camera Controls */}
                    <ButtonGroup className="mb-4">
                        <CircleIconButton
                            onClick={toggleCamera}
                            variant="gray"
                            title="Switch Camera"
                        >
                            <RotateCcw size={24} />
                        </CircleIconButton>
                        <CircleIconButton
                            onClick={capturePhoto}
                            variant="primary"
                            size="large"
                            title="Take Photo"
                        >
                            <Camera size={32} />
                        </CircleIconButton>
                        <CircleIconButton
                            onClick={skipPhoto}
                            variant="gray"
                            title="Skip"
                        >
                            <X size={24} />
                        </CircleIconButton>
                    </ButtonGroup>
                    <p className="text-gray-400 text-sm">Take a selfie for your profile!</p>
                </>
            ) : (
                <>
                    {/* Captured Image Preview */}
                    <div className="relative w-64 h-64 rounded-full overflow-hidden border-4 border-green-500 mb-4">
                        <img
                            src={capturedImage}
                            alt="Captured selfie"
                            className="w-full h-full object-cover"
                            style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
                        />
                    </div>

                    {/* Confirm/Retake Controls */}
                    <ButtonGroup className="mb-4">
                        <SecondaryButton onClick={retakePhoto} fullWidth={false}>
                            <RotateCcw size={20} />
                            <span>Retake</span>
                        </SecondaryButton>
                        <SecondaryButton onClick={confirmPhoto} variant="cyan" fullWidth={false}>
                            <Check size={20} />
                            <span>Use Photo</span>
                        </SecondaryButton>
                    </ButtonGroup>
                    <p className="text-gray-400 text-sm">Looking good! 📸</p>
                </>
            )}
        </div>
    );
}

export default CameraCapture;
