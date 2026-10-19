import React, { useState, useEffect, useRef, useContext } from "react";
import { DataContext } from "../GameContext";
import { AlertTriangle, Check, Radiation } from "../signal/icons";
import { markMeltdownAverted } from "../components/MeltdownAverted";
import "../signal/reactor.css";

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
                markMeltdownAverted();
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

    const hot = meltdownTimer <= 10;
    const slabTone = isIncorrect ? " sg-rx__slab--wrong sg-shake" : isCorrectFlash ? " sg-rx__slab--right" : "";

    return (
        <div className="sg sg-screen sg-rx sg-rx--melt">
            {/* Hazard stripes fill the room's screen: the one thing that moves */}
            <div className="sg-hazard" />

            <div className="sg-rx__main">
                <div className={`sg-rx__slab${slabTone}`}>
                    <p className="sg-rx__alert">
                        <Radiation size={24} />
                        <span>MELTDOWN IN PROGRESS</span>
                    </p>

                    <h1 className="sg-rx__melt-title">CORE MELTDOWN</h1>

                    {/* Timer */}
                    <p className={`sg-rx__timer${hot ? " sg-rx__timer--hot" : ""}`} aria-label={`${meltdownTimer} seconds until meltdown`}>
                        <span key={hot ? meltdownTimer : "calm"} className={hot ? "sg-tick" : ""} style={{ display: "inline-block" }}>
                            {meltdownTimer}<small>s</small>
                        </span>
                    </p>
                    {hot ? (
                        <p className="sg-rx__msg">
                            <AlertTriangle size={30} />
                            <span>CRITICAL - MELTDOWN IMMINENT!</span>
                        </p>
                    ) : (
                        <p className="sg-rx__lede">until meltdown</p>
                    )}

                    {/* PIN Entry Section */}
                    <p className="sg-rx__lede" style={{ marginTop: 6 }}>Enter shutdown code</p>
                    <div className={`sg-rx__pins${codesNeededChanged ? " sg-tick" : ""}`}>
                        {pin.map((digit, index) => (
                            <input
                                key={index}
                                ref={(el) => (inputRefs.current[index] = el)}
                                id={`pin-input-${index}`}
                                type="text"
                                inputMode="numeric"
                                maxLength="1"
                                value={digit}
                                aria-label={`Code digit ${index + 1}`}
                                onChange={(e) => handleInputChange(e, index)}
                                onClick={() => handleInputClick(index)}
                                onKeyDown={(e) => handleKeyDown(e, index)}
                                disabled={isCooldown}
                                className="sg-rx__pin"
                            />
                        ))}
                    </div>

                    {isIncorrect && (
                        <p className="sg-rx__msg">
                            <AlertTriangle size={26} />
                            <span>Incorrect code. Cooldown active...</span>
                        </p>
                    )}

                    {/* Codes Needed Display */}
                    {codesNeeded !== undefined && codesNeeded > 0 && (
                        <div className="sg-rx__codes">
                            <p key={codesNeeded} className="sg-rx__codes-text sg-a sg-pop">
                                {codesNeeded} More Code{codesNeeded !== 1 ? 's' : ''} Needed!
                            </p>
                            {totalCodesNeeded > 1 && (
                                <span className="sg-rx__pips" aria-hidden="true">
                                    {Array.from({ length: totalCodesNeeded }, (_, i) => (
                                        <i key={i} data-done={i < totalCodesNeeded - codesNeeded ? "" : undefined} />
                                    ))}
                                </span>
                            )}
                        </div>
                    )}

                    {/* Success Message */}
                    {isAllCodesEntered && (
                        <p className="sg-rx__msg">
                            <Check size={30} strokeWidth={4} />
                            <span>All Codes Entered!</span>
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}

export default ReactorMeltdown;
