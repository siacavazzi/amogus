import React, { useState, useEffect, useRef, useContext } from "react";
import { DataContext } from "../GameContext";
import { FaRadiation } from "react-icons/fa";
import { AlertTriangle, Activity } from "lucide-react";

function ReactorMeltdown() {
    const {
        socket,
        meltdownTimer,
        codesNeeded,
        setCodesNeeded,
        roomCode,
    } = useContext(DataContext);

    const [pin, setPin] = useState(["", "", "", ""]);
    const [isIncorrect, setIsIncorrect] = useState(false);
    const [isCooldown, setIsCooldown] = useState(false);
    const [codesNeededChanged, setCodesNeededChanged] = useState(false); // State to trigger animation
    const [isCorrectFlash, setIsCorrectFlash] = useState(false); // State for green flash
    const [isAllCodesEntered, setIsAllCodesEntered] = useState(false); // State for success message
    const [totalCodesNeeded, setTotalCodesNeeded] = useState(null); // Track initial codes for progress

    const inputRefs = useRef([]);

    // Keep track of previous codesNeeded to detect changes
    const prevCodesNeededRef = useRef(codesNeeded);

    // Track the initial codes needed (first value we receive)
    useEffect(() => {
        if (codesNeeded !== undefined && totalCodesNeeded === null) {
            setTotalCodesNeeded(codesNeeded);
        }
    }, [codesNeeded, totalCodesNeeded]);

    // Calculate progress percentage (0 = no codes entered, 100 = all codes entered)
    const progressPercent = totalCodesNeeded && codesNeeded !== undefined 
        ? Math.round(((totalCodesNeeded - codesNeeded) / totalCodesNeeded) * 100)
        : 0;

    useEffect(() => {
        console.log(codesNeeded);
    }, [codesNeeded]);

    useEffect(() => {
        socket.on("code_incorrect", () => {
            setIsIncorrect(true);
            setIsCooldown(true);
            setTimeout(() => {
                setIsCooldown(false);
                setIsIncorrect(false);
                setPin(["", "", "", ""]);
            }, 3000);
        });

        socket.on("code_correct", (data) => {
            console.log("CODES NEEDED");
            console.log(data);
            setCodesNeeded(data);
            setIsIncorrect(false);
            setPin(["", "", "", ""]);

            // Trigger green flash
            triggerGreenFlash();

            // Check if all codes have been entered
            if (data === 0) {
                handleAllCodesEntered();
            }
        });

        // Cleanup listeners on unmount
        return () => {
            socket.off("code_incorrect");
            socket.off("code_correct");
        };
    }, [socket, setCodesNeeded]);

    useEffect(() => {
        if (!isCooldown) {
            focusFirstEmptyInput();
        }
    }, [pin, isCooldown]);

    // Detect changes in codesNeeded to trigger animation
    useEffect(() => {
        if (prevCodesNeededRef.current !== codesNeeded) {
            setCodesNeededChanged(true);
            prevCodesNeededRef.current = codesNeeded;

            // Remove the animation class after animation duration (e.g., 500ms)
            const timer = setTimeout(() => {
                setCodesNeededChanged(false);
            }, 500);

            return () => clearTimeout(timer);
        }
    }, [codesNeeded]);

    // Function to trigger green flash
    const triggerGreenFlash = () => {
        setIsCorrectFlash(true);
        setTimeout(() => {
            setIsCorrectFlash(false);
        }, 500); // Flash duration: 500ms
    };

    // Function to handle all codes entered
    const handleAllCodesEntered = () => {
        setIsAllCodesEntered(true);
        // Hide the message after 0.5 seconds
        setTimeout(() => {
            setIsAllCodesEntered(false);
        }, 500);
    };

    const focusFirstEmptyInput = () => {
        const firstEmptyIndex = pin.findIndex((digit) => digit === "");
        if (firstEmptyIndex !== -1 && inputRefs.current[firstEmptyIndex]) {
            inputRefs.current[firstEmptyIndex].focus();
        }
    };

    const handleInputChange = (e, index) => {
        if (isCooldown) return; // Block input during cooldown
        const value = e.target.value;

        if (value === "") {
            const newPin = [...pin];
            newPin[index] = "";
            setPin(newPin);
            return;
        }

        if (value.match(/^[0-9]$/)) {
            const newPin = [...pin];
            newPin[index] = value;
            setPin(newPin);

            // Automatically focus on the next input field if the current one is filled
            if (index < 3) {
                inputRefs.current[index + 1].focus();
            }

            // Check if all fields are filled
            if (index === 3 && newPin.every((digit) => digit !== "")) {
                handleSubmit(newPin);
            }
        } else {
            // If the value is invalid, reset the input to the previous value
            e.target.value = pin[index];
        }
    };

    const handleInputClick = (index) => {
        if (isCooldown) return; // Block input during cooldown

        // Ensure focus always starts on the first empty input
        const firstEmptyIndex = pin.findIndex((digit) => digit === "");
        if (firstEmptyIndex !== -1 && firstEmptyIndex < index) {
            inputRefs.current[firstEmptyIndex].focus();
        }
    };

    const handleKeyDown = (e, index) => {
        if (isCooldown) return; // Block input during cooldown

        if (e.key === "Backspace") {
            e.preventDefault(); // Prevent default backspace behavior

            const newPin = [...pin];
            if (pin[index]) {
                // If current input is not empty, clear it
                newPin[index] = "";
                setPin(newPin);
                inputRefs.current[index].focus();
            } else if (index > 0) {
                // If current input is empty, move focus to previous input
                newPin[index - 1] = "";
                setPin(newPin);
                inputRefs.current[index - 1].focus();
            }
        }
    };

    const handleSubmit = (enteredPin) => {
        console.log("Entered PIN:", enteredPin.join(""));
        socket.emit("pin_entry", { 
            player_id: localStorage.getItem('player_id'),
            room_code: roomCode,
            pin: enteredPin.join("") 
        });
    };

    return (
        <div
            className={`relative flex flex-col items-center justify-center min-h-screen h-full p-4 pt-12 pb-8
                        text-white transition-colors duration-500 overflow-hidden
                        ${isCorrectFlash ? "bg-green-900" : "bg-gradient-to-b from-gray-900 via-red-950 to-gray-900"}`}
        >
            {/* Coolant Progress Background - fills from bottom */}
            <div 
                className="fixed inset-x-0 bottom-0 pointer-events-none transition-all duration-700 ease-out overflow-hidden"
                style={{ height: `${progressPercent}%` }}
            >
                {/* Coolant gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-cyan-600/40 via-cyan-500/25 to-transparent"></div>
                
                {/* Wave effect at top of coolant */}
                <div className="absolute top-0 left-1/2 w-[200%] h-8">
                    <div className="absolute inset-0 bg-gradient-to-b from-cyan-400/50 to-transparent rounded-[100%] animate-coolant-wave"></div>
                </div>
                <div className="absolute top-2 left-1/2 w-[200%] h-6">
                    <div className="absolute inset-0 bg-gradient-to-b from-cyan-300/30 to-transparent rounded-[100%] animate-coolant-wave-2"></div>
                </div>
                
                {/* Bubbles */}
                {progressPercent > 10 && (
                    <>
                        <div className="absolute bottom-1/4 left-1/4 w-3 h-3 bg-cyan-300/40 rounded-full animate-bounce" style={{ animationDuration: '2s' }}></div>
                        <div className="absolute bottom-1/3 right-1/3 w-2 h-2 bg-cyan-200/30 rounded-full animate-bounce" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }}></div>
                        <div className="absolute bottom-1/2 left-1/3 w-4 h-4 bg-cyan-400/20 rounded-full animate-bounce" style={{ animationDuration: '3s', animationDelay: '1s' }}></div>
                    </>
                )}
            </div>

            {/* Animated Background Effects */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                {/* Warning glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-3xl bg-red-500/20 animate-pulse"></div>
                
                {/* Reactor rings */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] border-2 border-red-500/20 rounded-full animate-spin" style={{ animationDuration: '10s' }}></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] border border-red-500/10 rounded-full animate-spin" style={{ animationDuration: '15s', animationDirection: 'reverse' }}></div>
                
                {/* Warning stripes */}
                <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-yellow-500 via-black to-yellow-500 animate-pulse"></div>
                <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-r from-yellow-500 via-black to-yellow-500 animate-pulse"></div>
            </div>

            {/* Status Header */}
            <div className="relative z-10 flex items-center gap-4 mb-6">
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/20 border border-red-500 animate-pulse">
                    <AlertTriangle size={20} className="text-red-400" />
                    <span className="font-bold text-red-400">MELTDOWN IN PROGRESS</span>
                </div>
            </div>

            {/* Reactor Icon */}
            <div className="relative z-10 mb-4">
                <div className="absolute inset-0 blur-xl bg-red-500 opacity-50 rounded-full animate-pulse"></div>
                <FaRadiation className="relative text-red-500 text-6xl animate-spin" style={{ animationDuration: '2s' }} />
            </div>

            <div
                className={`relative z-10 w-full max-w-2xl bg-gray-800/80 backdrop-blur-sm p-8 rounded-2xl shadow-2xl flex flex-col items-center transition-all duration-300 border
                            ${isIncorrect ? "animate-shake border-red-500" : isCorrectFlash ? "border-green-400 border-4" : "border-red-500/30"}`}
            >
                <h1 className="text-4xl md:text-5xl font-bold mb-8 text-center text-red-400 drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]">
                    REACTOR MELTDOWN
                </h1>

                {/* PIN Entry Section */}
                <div className="w-full max-w-xl mb-8 flex flex-col items-center">
                    <p className="text-gray-300 text-lg mb-4">Enter shutdown code:</p>
                    <div
                        className={`flex justify-center space-x-4 mb-6 transition-all duration-500 
                                    ${codesNeededChanged ? "animate-pulse" : ""}`}
                    >
                        {pin.map((digit, index) => (
                            <input
                                key={index}
                                ref={(el) => (inputRefs.current[index] = el)}
                                id={`pin-input-${index}`}
                                type="text"
                                inputMode="numeric"
                                maxLength="1"
                                value={digit}
                                onChange={(e) => handleInputChange(e, index)}
                                onClick={() => handleInputClick(index)}
                                onKeyDown={(e) => handleKeyDown(e, index)}
                                disabled={isCooldown}
                                className={`w-16 h-20 md:w-20 md:h-24 border-4 rounded-xl text-center text-3xl md:text-4xl font-mono font-bold bg-gray-900/80 focus:outline-none focus:ring-4 transition-all
                                            ${
                                                isCooldown
                                                    ? "cursor-not-allowed opacity-50 border-gray-600"
                                                    : isIncorrect
                                                    ? "border-red-500 focus:ring-red-400 text-red-400"
                                                    : "border-cyan-500 focus:ring-cyan-400 text-cyan-400"
                                            }`}
                            />
                        ))}
                    </div>

                    {isIncorrect && (
                        <div className="flex items-center gap-2 text-red-400 text-lg mb-4 animate-pulse">
                            <AlertTriangle size={20} />
                            <span>Incorrect code. Cooldown active...</span>
                        </div>
                    )}

                    {/* Codes Needed Display */}
                    {codesNeeded !== undefined && codesNeeded > 0 && (
                        <div
                            className={`flex items-center gap-3 px-6 py-3 rounded-xl mb-4 transition-all duration-500 
                                        ${codesNeededChanged ? "animate-bounce bg-yellow-500/30 border-yellow-400" : "bg-yellow-500/20 border-yellow-500/50"} border`}
                        >
                            <Activity size={24} className="text-yellow-400" />
                            <span className="text-2xl md:text-3xl font-bold text-yellow-400">
                                {codesNeeded} More Code{codesNeeded !== 1 ? 's' : ''} Needed!
                            </span>
                        </div>
                    )}

                    {/* Success Message */}
                    {isAllCodesEntered && (
                        <div className="flex items-center gap-2 text-green-400 text-2xl font-bold mb-4 animate-pulse">
                            <span>✓</span>
                            <span>All Codes Entered!</span>
                        </div>
                    )}

                    {/* Timer */}
                    <div className={`text-center mt-4 ${meltdownTimer <= 10 ? "animate-pulse" : ""}`}>
                        <p className={`text-4xl md:text-5xl font-bold font-mono ${meltdownTimer <= 10 ? "text-red-500" : "text-white"}`}>
                            {meltdownTimer}s
                        </p>
                        <p className="text-gray-400 text-sm mt-1">until meltdown</p>
                    </div>
                    
                    {meltdownTimer <= 10 && (
                        <div className="flex items-center gap-2 mt-4 text-red-400 animate-pulse">
                            <AlertTriangle size={24} />
                            <span className="text-xl font-bold">CRITICAL - MELTDOWN IMMINENT!</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default ReactorMeltdown;
