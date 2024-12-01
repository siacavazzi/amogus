import os
import json

def read_task_file():
    file_path = 'tasks.json'
    # Check if the file exists
    if not os.path.exists(file_path):
        # Create the file with an empty array as its content
        with open(file_path, 'w') as f:
            json.dump([], f)

    # Read the file's contents
    with open(file_path, 'r') as f:
        try:
            data = json.load(f)
            if not isinstance(data, list):
                raise ValueError("File content is not a list.")
            if not all(isinstance(item, str) for item in data):
                raise ValueError("File content is not a list of strings.")
            print("Tasks loaded")
            return data
        except json.JSONDecodeError as e:
            raise ValueError(f"Failed to parse the file as JSON: {e}")

def write_task_file(string):
    file_path = 'tasks.json'
    if not isinstance(string, str):
        raise ValueError("The 'string' argument must be a string.")

    # Read the current file contents
    current_data = read_task_file()

    # Append the new string to the data
    current_data.append(string)

    # Write the updated array back to the file
    with open(file_path, 'w') as f:
        json.dump(current_data, f, indent=4)

    print(f"Successfully added the string to {file_path}.")
