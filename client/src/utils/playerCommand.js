// Player commands go through the game's sendAsPlayer, which takes the seat back from another tab
// and sends the command again if needed. Screens rendered without the live game (tests, tutorial)
// fall back to the bare socket.
export function emitAsPlayer({ sendAsPlayer, socket }, eventName, payload, onResult) {
    if (sendAsPlayer) return sendAsPlayer(eventName, payload, onResult);
    if (!socket) return undefined;
    return onResult ? socket.emit(eventName, payload, onResult) : socket.emit(eventName, payload);
}
