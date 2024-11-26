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
    


def write_ip_to_file(ip_address):
    try:
        with open('ip.txt', 'w') as file:
            file.write(ip_address)
        print(f"IP address '{ip_address}' has been written to 'ip.txt'.")
    except Exception as e:
        print(f"An error occurred: {e}")
