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

    def _normalize_task(self, task):
        normalized_task = dict(task)
        normalized_task.pop("difficulty", None)
        return normalized_task

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

                # Filter tasks by valid locations and strip deprecated task metadata
                self.tasks = [
                    self._normalize_task(task)
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

        # Append the new task object to the tasks array
        self.tasks.append(self._normalize_task(task_obj))

        # Write the updated tasks array to the file
        with open(self.file_path, "w") as f:
            json.dump(self.tasks, f, indent=4)

        print(
            f"Successfully added the task: {task_obj}, there are now {len(self.tasks)} tasks"
        )

    def reset(self):
        self._load_tasks()
        print("Tasks have been reset to the file contents.")

    def get_task(self, denied_location=None):
        if not self.tasks:
            self.reset()
        
        if denied_location:
            eligible_tasks = [
                task for task in self.tasks if task['location'].lower() != denied_location.lower()
            ]

            if not eligible_tasks:
                print(f"No tasks available outside the denied location: {denied_location}.")
                eligible_tasks = self.tasks

        else:
            eligible_tasks = self.tasks

        task = random.choice(eligible_tasks)
        self.tasks.remove(task)

        return task

