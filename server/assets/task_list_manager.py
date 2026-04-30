import os
import json
import random
import string
from threading import Lock
import time


STARTER_TEMPLATE_CODE = "STARTER"
STARTER_TEMPLATE_KEY = "starter_house"
STARTER_TEMPLATE_NAME = "Example List"
STARTER_TEMPLATE_DESCRIPTION = "A ready-to-run example you can edit. Add, remove, or tweak tasks to fit your space."


class TaskListManager:
    """
    Manages persistent task lists that can be saved, loaded, and shared.
    Each task list has a unique code and is associated with the player who created it.
    """

    def __init__(self, storage_dir="task_lists"):
        self.storage_dir = storage_dir
        self.lock = Lock()
        self._ensure_storage_dir()
        self._load_index()

    def _ensure_storage_dir(self):
        """Create storage directory if it doesn't exist."""
        if not os.path.exists(self.storage_dir):
            os.makedirs(self.storage_dir)

    def _load_index(self):
        """Load the index mapping player_ids to their task list codes."""
        self.index_file = os.path.join(self.storage_dir, "_index.json")
        if os.path.exists(self.index_file):
            try:
                with open(self.index_file, "r") as f:
                    self.index = json.load(f)
            except (json.JSONDecodeError, IOError):
                self.index = {"player_lists": {}, "code_to_name": {}}
        else:
            self.index = {"player_lists": {}, "code_to_name": {}}
            self._save_index()

    def _save_index(self):
        """Save the index to disk."""
        with open(self.index_file, "w") as f:
            json.dump(self.index, f, indent=2)

    def _generate_code(self, length=6):
        """Generate a unique task list code."""
        while True:
            code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))
            # Avoid confusing characters
            code = code.replace('O', 'X').replace('0', 'Y').replace('I', 'Z').replace('1', 'W')
            list_path = os.path.join(self.storage_dir, f"{code}.json")
            if not os.path.exists(list_path):
                return code

    def _get_list_path(self, code):
        """Get the file path for a task list."""
        return os.path.join(self.storage_dir, f"{code}.json")

    def _get_default_task_list_path(self):
        """Get the absolute path to the shared starter task template."""
        return os.path.join(os.path.dirname(os.path.dirname(__file__)), "tasks.json")

    def _load_default_tasks(self):
        """Load the shared starter task template from disk."""
        default_file = self._get_default_task_list_path()
        if not os.path.exists(default_file):
            return None

        try:
            with open(default_file, "r") as f:
                return self._normalize_tasks(json.load(f))
        except (json.JSONDecodeError, IOError):
            return None

    def _normalize_task(self, task):
        normalized_task = dict(task)
        normalized_task.pop("difficulty", None)
        return normalized_task

    def _normalize_tasks(self, tasks):
        return [self._normalize_task(task) for task in (tasks or [])]

    def _extract_locations(self, tasks):
        """Preserve location order while ensuring Other is available."""
        locations = []
        for task in tasks:
            location = task.get("location", "Other")
            if location not in locations:
                locations.append(location)

        if "Other" not in locations:
            locations.append("Other")

        return locations

    def create_task_list(self, player_id, name, tasks=None, locations=None, source_template=None):
        """
        Create a new task list.
        
        Args:
            player_id: The ID of the player creating the list
            name: A human-readable name for the list
            tasks: Optional list of task objects to initialize with
            locations: List of location names for this list (minimum 2 required)
        
        Returns:
            The task list code, or None on failure
        """
        # Validate locations - require at least 2
        if not locations or len(locations) < 2:
            print(f"Cannot create task list: need at least 2 locations, got {len(locations) if locations else 0}")
            return None
        
        with self.lock:
            code = self._generate_code()
            
            # Ensure 'Other' is always included as a catch-all location
            final_locations = list(locations)
            if 'Other' not in final_locations:
                final_locations.append('Other')
            
            task_list = {
                "code": code,
                "name": name,
                "creator_id": player_id,
                "created_at": time.time(),
                "updated_at": time.time(),
                "locations": final_locations,
                "tasks": self._normalize_tasks(tasks),
                "source_template": source_template,
            }
            
            # Save the task list file
            list_path = self._get_list_path(code)
            try:
                with open(list_path, "w") as f:
                    json.dump(task_list, f, indent=2)
            except IOError as e:
                print(f"Failed to save task list {code}: {e}")
                return None
            
            # Update the index
            if player_id not in self.index["player_lists"]:
                self.index["player_lists"][player_id] = []
            self.index["player_lists"][player_id].append(code)
            self.index["code_to_name"][code] = name
            self._save_index()
            
            print(f"Created task list '{name}' with code {code} for player {player_id} (locations: {final_locations})")
            return code

    def get_task_list(self, code):
        """
        Load a task list by its code.
        
        Returns:
            The task list dict, or None if not found
        """
        list_path = self._get_list_path(code)
        if not os.path.exists(list_path):
            return None
        
        try:
            with open(list_path, "r") as f:
                task_list = json.load(f)
                task_list["tasks"] = self._normalize_tasks(task_list.get("tasks", []))
                return task_list
        except (json.JSONDecodeError, IOError) as e:
            print(f"Failed to load task list {code}: {e}")
            return None

    def update_task_list(self, code, updates, player_id=None):
        """
        Update a task list. Only the creator can modify it (if player_id provided).
        
        Args:
            code: The task list code
            updates: Dict of fields to update (name, tasks, locations)
            player_id: Optional - if provided, verifies ownership
        
        Returns:
            True on success, False on failure
        """
        with self.lock:
            task_list = self.get_task_list(code)
            if not task_list:
                return False
            
            # Verify ownership if player_id provided
            if player_id and task_list["creator_id"] != player_id:
                print(f"Player {player_id} attempted to modify list {code} owned by {task_list['creator_id']}")
                return False
            
            # Apply updates
            if "name" in updates:
                task_list["name"] = updates["name"]
                self.index["code_to_name"][code] = updates["name"]
                self._save_index()
            
            if "tasks" in updates:
                task_list["tasks"] = self._normalize_tasks(updates["tasks"])
            
            if "locations" in updates:
                task_list["locations"] = updates["locations"]
            
            task_list["updated_at"] = time.time()
            
            # Save changes
            list_path = self._get_list_path(code)
            try:
                with open(list_path, "w") as f:
                    json.dump(task_list, f, indent=2)
                return True
            except IOError as e:
                print(f"Failed to update task list {code}: {e}")
                return False

    def add_task(self, code, task_obj, player_id=None):
        """
        Add a single task to a list.
        
        Args:
            code: The task list code
            task_obj: Dict with 'task' and 'location'
            player_id: Optional - if provided, verifies ownership
        
        Returns:
            True on success, False on failure
        """
        task_list = self.get_task_list(code)
        if not task_list:
            return False
        
        # Verify ownership if player_id provided
        if player_id and task_list["creator_id"] != player_id:
            return False
        
        # Validate task object
        if not isinstance(task_obj, dict) or "task" not in task_obj:
            return False
        
        # Set defaults
        task_obj.setdefault("location", "Other")
        
        # Validate location
        if task_obj["location"] not in task_list["locations"]:
            return False
        
        task_list["tasks"].append(self._normalize_task(task_obj))
        return self.update_task_list(code, {"tasks": task_list["tasks"]}, player_id)

    def remove_task(self, code, task_index, player_id=None):
        """
        Remove a task from a list by index.
        
        Args:
            code: The task list code
            task_index: Index of the task to remove
            player_id: Optional - if provided, verifies ownership
        
        Returns:
            True on success, False on failure
        """
        task_list = self.get_task_list(code)
        if not task_list:
            return False
        
        # Verify ownership if player_id provided
        if player_id and task_list["creator_id"] != player_id:
            return False
        
        if not (0 <= task_index < len(task_list["tasks"])):
            return False
        
        task_list["tasks"].pop(task_index)
        return self.update_task_list(code, {"tasks": task_list["tasks"]}, player_id)

    def get_player_task_lists(self, player_id):
        """
        Get all task lists created by a player.
        
        Returns:
            List of task list summaries (code, name, task_count, updated_at)
        """
        codes = self.index["player_lists"].get(player_id, [])
        result = []
        
        for code in codes:
            task_list = self.get_task_list(code)
            if task_list:
                result.append({
                    "code": code,
                    "name": task_list["name"],
                    "task_count": len(task_list["tasks"]),
                    "locations": task_list["locations"],
                    "updated_at": task_list["updated_at"],
                    "source_template": task_list.get("source_template")
                })
        
        # Sort by most recently updated
        result.sort(key=lambda x: x["updated_at"], reverse=True)
        return result

    def remove_from_player_list(self, code, player_id):
        """
        Remove a task list from a player's saved lists (without deleting the actual file).
        This allows the task list to still be accessed via its code.
        
        Args:
            code: The task list code to remove
            player_id: The player who wants to remove it from their list
        
        Returns:
            True on success, False if not in player's list
        """
        with self.lock:
            player_lists = self.index["player_lists"].get(player_id, [])
            if code not in player_lists:
                return False
            
            # Remove from player's saved lists
            self.index["player_lists"][player_id] = [
                c for c in player_lists if c != code
            ]
            self._save_index()
            
            print(f"Removed task list {code} from player {player_id}'s list")
            return True

    def delete_task_list(self, code, player_id):
        """
        Delete a task list. Only the creator can delete it.
        
        Returns:
            True on success, False on failure
        """
        with self.lock:
            task_list = self.get_task_list(code)
            if not task_list:
                return False
            
            if task_list["creator_id"] != player_id:
                return False
            
            # Remove the file
            list_path = self._get_list_path(code)
            try:
                os.remove(list_path)
            except IOError as e:
                print(f"Failed to delete task list {code}: {e}")
                return False
            
            # Update the index
            if player_id in self.index["player_lists"]:
                self.index["player_lists"][player_id] = [
                    c for c in self.index["player_lists"][player_id] if c != code
                ]
            if code in self.index["code_to_name"]:
                del self.index["code_to_name"][code]
            self._save_index()
            
            print(f"Deleted task list {code}")
            return True

    def save_to_player_list(self, code, player_id):
        """
        Add an existing task list to a player's saved lists (without duplicating).
        This allows users to save task lists they loaded by code.
        
        Args:
            code: The task list code to save
            player_id: The player who wants to save it
        
        Returns:
            True on success, False if list doesn't exist or already saved
        """
        with self.lock:
            task_list = self.get_task_list(code)
            if not task_list:
                return False
            
            # Check if already in player's list
            player_lists = self.index["player_lists"].get(player_id, [])
            if code in player_lists:
                return True  # Already saved, that's fine
            
            # Add to player's saved lists
            if player_id not in self.index["player_lists"]:
                self.index["player_lists"][player_id] = []
            self.index["player_lists"][player_id].append(code)
            self._save_index()
            
            print(f"Saved task list {code} to player {player_id}'s list")
            return True

    def duplicate_task_list(self, code, player_id, new_name=None):
        """
        Create a copy of an existing task list for a player.
        Anyone can duplicate any list (for sharing).
        
        Args:
            code: The task list code to copy
            player_id: The player who will own the copy
            new_name: Optional new name (defaults to "Copy of [original name]")
        
        Returns:
            The new task list code, or None on failure
        """
        original = self.get_task_list(code)
        if not original:
            return None
        
        name = new_name or f"Copy of {original['name']}"
        return self.create_task_list(
            player_id=player_id,
            name=name,
            tasks=original["tasks"].copy(),
            locations=original["locations"].copy()
        )

    def import_from_default(self, player_id, name="My Task List"):
        """
        Create a new task list from the default tasks.json file.
        
        Returns:
            The new task list code, or None on failure
        """
        tasks = self._load_default_tasks()
        if not tasks:
            return None

        locations = self._extract_locations(tasks)
        
        return self.create_task_list(
            player_id=player_id,
            name=name,
            tasks=[task.copy() for task in tasks],
            locations=locations,
            source_template=STARTER_TEMPLATE_KEY
        )

    def get_default_task_list_template(self):
        """Return metadata for the shared starter task template."""
        tasks = self._load_default_tasks()
        if not tasks:
            return None

        locations = self._extract_locations(tasks)
        preview_tasks = [task.copy() for task in tasks[:6]]

        return {
            "code": STARTER_TEMPLATE_CODE,
            "template_key": STARTER_TEMPLATE_KEY,
            "name": STARTER_TEMPLATE_NAME,
            "description": STARTER_TEMPLATE_DESCRIPTION,
            "task_count": len(tasks),
            "locations": locations,
            "tasks_preview": preview_tasks,
            "is_template": True,
        }
