import React, { useState, useContext } from 'react';
import { DataContext } from '../GameContext';
import { ChevronLeft } from 'lucide-react';

function TaskEntryPage() {
    const [task, setTask] = useState('');
    const [location, setLocation] = useState('');
    const [confirmationMessage, setConfirmationMessage] = useState(false);

    const { setTaskEntry, taskLocations, socket } = useContext(DataContext);

    const handleSubmit = (e) => {
        e.preventDefault();
        socket.emit('add_task', { task, location });
        setTask('');
        setLocation('');
        setConfirmationMessage(true);
        setTimeout(() => setConfirmationMessage(false), 3000); // Hide message after 3 seconds
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-tr from-gray-800 to-gray-900 p-6">
            <button
                type="button"
                onClick={() => setTaskEntry(false)}
                className="absolute top-6 left-6 flex items-center text-gray-300 hover:text-white transition-colors"
            >
                <ChevronLeft className="mr-1" />
                <span className="text-sm">Back</span>
            </button>
            <div className="relative bg-gray-700 bg-opacity-90 backdrop-blur-md p-8 rounded-lg shadow-lg max-w-sm w-full">
                {/* Header Section */}
                <div className="flex flex-col items-center mb-6">
                    <h2 className="text-2xl font-bold mb-2 text-gray-100">Enter a Task</h2>
                    <p className="text-sm text-gray-300">Add a new task to amongus</p>
                </div>

                {/* Task Entry Form */}
                <form onSubmit={handleSubmit}>
                    {/* Task Input */}
                    <div className="mb-4">
                        <label htmlFor="task" className="block text-gray-300 mb-2">
                            Task Description
                        </label>
                        <input
                            type="text"
                            id="task"
                            value={task}
                            onChange={(e) => setTask(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-500 rounded-lg bg-gray-600 text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-colors"
                            placeholder="Enter your task"
                            required
                        />
                    </div>

                    {/* Task Location Dropdown */}
                    <div className="mb-4">
                        <label htmlFor="taskLocation" className="block text-gray-300 mb-2">
                            Task Location
                        </label>
                        <select
                            id="taskLocation"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-500 rounded-lg bg-gray-600 text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-colors"
                            required
                        >
                            <option value="">Select Task Location</option>
                            {taskLocations.map((loc) => (
                                <option key={loc} value={loc}>{loc}</option>
                            ))}
                        </select>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400 transform hover:scale-105"
                    >
                        Add Task
                    </button>
                </form>

                {/* Confirmation Message */}
                {confirmationMessage && (
                    <div className="mt-4 text-green-500 text-center">
                        Task added successfully!
                    </div>
                )}
            </div>
        </div>
    );
}

export default TaskEntryPage;
