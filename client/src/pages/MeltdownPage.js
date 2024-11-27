import React, { useState, useEffect, useRef } from "react";

function ReactorMeltdown() {
  const [pin, setPin] = useState(["", "", "", ""]);
  const [isIncorrect, setIsIncorrect] = useState(false);
  const [pinsEntered, setPinsEntered] = useState(0);
  const totalPinsNeeded = 3; // Number of PINs needed to stop the meltdown
  const [timeRemaining, setTimeRemaining] = useState(60); // Countdown timer in seconds
  const [isCooldown, setIsCooldown] = useState(false); // Cooldown state

  const inputRefs = useRef([]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleMeltdown();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

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
    if (value.match(/^[0-9]$/)) {
      const newPin = [...pin];
      newPin[index] = value;
      setPin(newPin);

      // Automatically focus on the next input field if the current one is filled
      if (index < 3 && value !== "") {
        inputRefs.current[index + 1].focus();
      }

      // Check if all fields are filled
      if (index === 3 && newPin.every((digit) => digit !== "")) {
        handleSubmit(newPin);
      }
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

    if (e.key === "Backspace" && !pin[index]) {
      if (index > 0) {
        inputRefs.current[index - 1].focus();
      }
    }
  };

  const handleSubmit = (enteredPin) => {
    const correctPin = "1234"; // Example correct PIN
    console.log("Entered PIN:", enteredPin.join(""));

    if (enteredPin.join("") !== correctPin) {
      setIsIncorrect(true);
      setIsCooldown(true);

      // Add a cooldown period before allowing input again
      setTimeout(() => {
        setIsCooldown(false);
        setIsIncorrect(false);
        setPin(["", "", "", ""]);
      }, 3000); // 3-second cooldown
    } else {
      setIsIncorrect(false);
      setPinsEntered((prev) => prev + 1);
      setPin(["", "", "", ""]);
    }
  };

  const handleMeltdown = () => {
    alert("Meltdown occurred! You failed to stop it in time.");
    // Reset the game or take additional actions
    setPinsEntered(0);
    setPin(["", "", "", ""]);
    setTimeRemaining(60); // Reset timer
  };

  return (
    <div
      className={`flex flex-col items-center justify-center h-screen p-4 bg-gradient-to-b from-gray-900 to-red-900 text-white ${
        timeRemaining <= 10 ? "animate-pulse" : ""
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
          <div className="relative w-full h-8 bg-gray-700 rounded overflow-hidden mb-6">
            <div
              className="absolute top-0 left-0 h-full bg-blue-500 transition-all"
              style={{
                width: `${(pinsEntered / totalPinsNeeded) * 100}%`,
              }}
            ></div>
          </div>
          <p className="text-center text-2xl mb-6">
            {pinsEntered} / {totalPinsNeeded} PINs entered
          </p>
          <p
            className={`text-center text-4xl font-bold ${
              timeRemaining <= 10 ? "text-red-500" : ""
            }`}
          >
            Time Remaining: {timeRemaining}s
          </p>
          {timeRemaining <= 10 && (
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
