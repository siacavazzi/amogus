import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Camera, RotateCcw, Check, X } from 'lucide-react';

function CameraCapture({ onCapture, onCancel }) {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
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
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }

            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { 
                    facingMode: facingMode,
                    width: { ideal: 480 },
                    height: { ideal: 480 }
                },
                audio: false
            });
            
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
    }, [facingMode, stream]);

    useEffect(() => {
        startCamera();
        
        return () => {
            // Cleanup: stop all tracks when component unmounts
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    // Restart camera when facing mode changes
    useEffect(() => {
        if (!capturedImage) {
            startCamera();
        }
    }, [facingMode]);

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
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
    };

    const retakePhoto = () => {
        setCapturedImage(null);
        startCamera();
    };

    const confirmPhoto = () => {
        if (capturedImage) {
            onCapture(capturedImage);
        }
    };

    const toggleCamera = () => {
        setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    };

    const skipPhoto = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        onCancel();
    };

    if (error) {
        return (
            <div className="flex flex-col items-center p-4">
                <div className="bg-red-500 bg-opacity-20 border border-red-500 rounded-lg p-4 mb-4 text-center">
                    <p className="text-red-400">{error}</p>
                </div>
                <button
                    onClick={skipPhoto}
                    className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                    Skip Photo
                </button>
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
                    <div className="flex gap-4 mb-4">
                        <button
                            onClick={toggleCamera}
                            className="p-3 bg-gray-600 rounded-full hover:bg-gray-700 transition-colors"
                            title="Switch Camera"
                        >
                            <RotateCcw size={24} className="text-white" />
                        </button>
                        <button
                            onClick={capturePhoto}
                            className="p-4 bg-indigo-600 rounded-full hover:bg-indigo-700 transition-colors"
                            title="Take Photo"
                        >
                            <Camera size={32} className="text-white" />
                        </button>
                        <button
                            onClick={skipPhoto}
                            className="p-3 bg-gray-600 rounded-full hover:bg-gray-700 transition-colors"
                            title="Skip"
                        >
                            <X size={24} className="text-white" />
                        </button>
                    </div>
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
                    <div className="flex gap-4 mb-4">
                        <button
                            onClick={retakePhoto}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-600 rounded-lg hover:bg-gray-700 transition-colors"
                        >
                            <RotateCcw size={20} className="text-white" />
                            <span className="text-white">Retake</span>
                        </button>
                        <button
                            onClick={confirmPhoto}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
                        >
                            <Check size={20} className="text-white" />
                            <span className="text-white">Use Photo</span>
                        </button>
                    </div>
                    <p className="text-gray-400 text-sm">Looking good! 📸</p>
                </>
            )}
        </div>
    );
}

export default CameraCapture;
