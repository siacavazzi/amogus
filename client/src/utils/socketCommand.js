export const SOCKET_COMMAND_TIMEOUT_MS = 5000;

export function emitVolatileWithAck(socket, eventName, payload, timeoutMs = SOCKET_COMMAND_TIMEOUT_MS) {
    if (!socket?.connected) {
        return Promise.reject(new Error('Socket is disconnected.'));
    }

    const volatileSocket = socket.volatile || socket;
    const commandSocket = typeof volatileSocket.timeout === 'function'
        ? volatileSocket.timeout(timeoutMs)
        : volatileSocket;

    return new Promise((resolve, reject) => {
        let timer;
        if (typeof volatileSocket.timeout !== 'function') {
            timer = setTimeout(() => reject(new Error('Socket command timed out.')), timeoutMs);
        }

        try {
            commandSocket.emit(eventName, payload, (error, response) => {
                if (timer) clearTimeout(timer);
                if (error) {
                    reject(error);
                    return;
                }
                resolve(response);
            });
        } catch (error) {
            if (timer) clearTimeout(timer);
            reject(error);
        }
    });
}

export function createRequestId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }

    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
        const value = Math.floor(Math.random() * 16);
        return (character === 'x' ? value : (value & 0x3) | 0x8).toString(16);
    });
}
