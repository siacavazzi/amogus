import React, { useState, useEffect, useRef, useContext } from "react";
import { DataContext } from "../GameContext";

function ReactorMeltdown() {
    const {
        socket,
        meltdownTimer,
        codesNeeded,
    } = useContext(DataContext);

    const [pin, setPin] = useState(["", "", "", ""]);
    const [isIncorrect, setIsIncorrect] = useState(false);
    const [isCooldown, setIsCooldown] = useState(false);

    const inputRefs = useRef([]);

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
    }, [socket]);

    useEffect(() => {
        if (!isCooldown) {
            focusFirstEmptyInput();
        }
    }, [pin, isCooldown]);

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
        socket.emit("pin_entry", enteredPin.join(""));
    };

    return (
        <div
            className={`flex flex-col items-center justify-center h-screen p-4 bg-gradient-to-b from-gray-900 to-red-900 text-white ${
                meltdownTimer <= 10 ? "animate-pulse" : ""
            }`}
        >
            <div
                className={`w-full max-w-3xl bg-gray-800 p-12 rounded-lg shadow-lg flex flex-col items-center transition-transform duration-300 ${
                    isIncorrect ? "animate-shake" : ""
                }`}
            >
                <h1 className="text-6xl font-bold mb-12 text-center text-red-500">
                    Reactor Meltdown
                </h1>
                <div className="w-full max-w-2xl mb-12">
                    <div className="flex justify-center space-x-6 mb-10">
                        {pin.map((digit, index) => (
                            <input
                                key={index}
                                ref={(el) => (inputRefs.current[index] = el)}
                                id={`pin-input-${index}`}
                                type="text"
                                maxLength="1"
                                value={digit}
                                onChange={(e) => handleInputChange(e, index)}
                                onClick={() => handleInputClick(index)}
                                onKeyDown={(e) => handleKeyDown(e, index)}
                                disabled={isCooldown}
                                className={`w-20 h-20 border-4 rounded text-center text-4xl bg-gray-700 focus:outline-none focus:ring-4 ${
                                    isCooldown
                                        ? "cursor-not-allowed opacity-50"
                                        : isIncorrect
                                        ? "border-red-500 focus:ring-red-400"
                                        : "border-blue-500 focus:ring-blue-400"
                                }`}
                            />
                        ))}
                    </div>
                    {isIncorrect && (
                        <p className="text-red-500 text-center text-2xl mb-6">
                            Incorrect PIN. Cooldown active, try again in 3 seconds.
                        </p>
                    )}
                    {codesNeeded && (
                        <p className="text-center text-2xl mb-6">
                            {codesNeeded} More Pins Needed!
                        </p>
                    )}
                    <p
                        className={`text-center text-4xl font-bold ${
                            meltdownTimer <= 10 ? "text-red-500" : ""
                        }`}
                    >
                        Time Remaining: {meltdownTimer}s
                    </p>
                    {meltdownTimer <= 10 && (
                        <p className="text-red-500 text-center text-3xl mt-6 animate-pulse">
                            Warning! Meltdown imminent!
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}

export default ReactorMeltdown;
