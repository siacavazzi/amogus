// Dynamic endpoint detection for development and production

const getEndpoint = () => {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    
    // Production: served from same origin (no prefix needed for relative URLs)
    // But Socket.IO needs the full URL
    if (hostname !== 'localhost' && 
        hostname !== '127.0.0.1' &&
        !hostname.startsWith('192.168.') &&
        !hostname.startsWith('10.') &&
        !hostname.startsWith('172.')) {
        // Production - use same origin
        return `${protocol}//${hostname}`;
    }
    
    // Development: use explicit URL with port 5001
    const devProtocol = protocol === 'https:' ? 'https:' : 'http:';
    return `${devProtocol}//${hostname}:5001`;
};

export const ENDPOINT = getEndpoint();