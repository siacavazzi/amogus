import socket

def get_local_ip():
    try:
        # Create a temporary socket to find the local IP
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        # Use Google's public DNS server as the target
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        s.close()
        return local_ip
    except Exception as e:
        print("Error getting local IP:", e)
        return "127.0.0.1"  # Fallback to localhost if unable to get IP