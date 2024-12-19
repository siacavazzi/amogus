import socket
import logging
from logging.handlers import RotatingFileHandler
import os

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
        with open("../client/src/ENDPOINT.js", 'w') as file:
            text = f"export const ENDPOINT = '{ip_address}'"
            file.write(text)
        print(f"IP address '{ip_address}' has been written to '../client/src/ENDPOINT.js'.")
    except Exception as e:
        print(f"An error occurred: {e}")


# Configure Logging
def setup_logging():
    if not os.path.exists('logs'):
        os.makedirs('logs')

    logger = logging.getLogger('app_logger')
    logger.setLevel(logging.DEBUG)  # Set the base logging level

    # Formatter for log messages
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )

    # Console Handler
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)  # Console shows INFO and above
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)

    # File Handler with rotation
    file_handler = RotatingFileHandler(
        'logs/app.log', maxBytes=10*1024*1024, backupCount=5
    )
    file_handler.setLevel(logging.DEBUG)  # File logs all levels
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)

    return logger

def send_message_to_player(socket, player_id, message):
    socket.emit('message', {'player': player_id, 'message': message})