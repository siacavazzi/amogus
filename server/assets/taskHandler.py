import os
import json
import random


class TaskHandler:
    def __init__(self, locations):
        self.file_path = "tasks.json"
        self.tasks = []
        self.locations = locations
        self.location_denial = None
        self._load_tasks()

    def _load_tasks(self):
        # Check if the file exists
        if not os.path.exists(self.file_path):
            # Create the file with an empty array as its content
            with open(self.file_path, "w") as f:
                json.dump([], f)

        # Read the file's contents
        with open(self.file_path, "r") as f:
            try:
                data = json.load(f)
                if not isinstance(data, list):
                    raise ValueError("File content is not a list.")
                if not all(
                    isinstance(item, dict) and "task" in item and "location" in item
                    for item in data
                ):
                    raise ValueError(
                        "File content is not a list of valid task objects."
                    )

                # Filter tasks by valid locations and set default difficulty
                self.tasks = [
                    {
                        **task,
                        "difficulty": self._validate_difficulty(
                            task.get("difficulty", 2)
                        ),
                    }
                    for task in data
                    if task["location"] in self.locations
                ]
                print("Tasks loaded")
            except json.JSONDecodeError as e:
                raise ValueError(f"Failed to parse the file as JSON: {e}")

    def add_task(self, task_obj):
        if not isinstance(task_obj, dict):
            raise ValueError("The 'task_obj' argument must be a dictionary.")
        if "task" not in task_obj:
            raise ValueError("The task object must have a 'task' key.")

        # Ensure 'location' is set to 'other' if not provided
        task_obj.setdefault("location", "other")

        # Validate location
        if task_obj["location"] not in self.locations:
            print(
                f"Invalid location '{task_obj['location']}' for task '{task_obj['task']}'. Task not added."
            )
            return

        # Ensure difficulty is set to 2 if not provided and validate it
        task_obj["difficulty"] = self._validate_difficulty(
            task_obj.get("difficulty", 2)
        )

        # Append the new task object to the tasks array
        self.tasks.append(task_obj)

        # Write the updated tasks array to the file
        with open(self.file_path, "w") as f:
            json.dump(self.tasks, f, indent=4)

        print(
            f"Successfully added the task: {task_obj}, there are now {len(self.tasks)} tasks"
        )


    def get_task(self, denied_location=None):
        if not self.tasks:
            print("No tasks available.")
            return None
        
        if denied_location:
            eligible_tasks = [
                task for task in self.tasks if task['location'] != denied_location
            ]

            if not eligible_tasks:
                print(f"No tasks available outside the denied location: {denied_location}.")
                eligible_tasks = self.tasks

        else:
            eligible_tasks = self.tasks

        task = random.choice(eligible_tasks)
        self.tasks.remove(task)

        return task

    def reset(self):
        self._load_tasks()
        print("Tasks have been reset to the file contents.")

    def _validate_difficulty(self, difficulty):
        if not isinstance(difficulty, int) or not (1 <= difficulty <= 3):
            print(f"Invalid difficulty '{difficulty}'. Defaulting to 2.")
            return 2
        return difficulty
