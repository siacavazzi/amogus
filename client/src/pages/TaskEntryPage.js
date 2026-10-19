import React, { useState, useContext } from 'react';
import { DataContext } from '../GameContext';
import { ChevronLeft } from '../signal/icons';
import '../signal/signal.css';
import '../signal/host.css';

function TaskEntryPage() {
    const [task, setTask] = useState('');
    const [location, setLocation] = useState('');
    const [confirmationMessage, setConfirmationMessage] = useState(false);

    const { setTaskEntry, taskLocations, socket } = useContext(DataContext);

    const handleSubmit = (e) => {
        e.preventDefault();
        socket.emit('add_task', { task, location, player_id: localStorage.getItem('player_id') });
        setTask('');
        setLocation('');
        setConfirmationMessage(true);
        setTimeout(() => setConfirmationMessage(false), 3000); // Hide message after 3 seconds
    };

    return (
        <div className="sg-screen sg-round hs">
            <div className="hs-wrap sg-a sg-rise">
                <div className="hs-bar">
                    <button type="button" onClick={() => setTaskEntry(false)} className="sg-btn sg-btn-ghost sg-join__back">
                        <ChevronLeft size={20} /> Back
                    </button>
                </div>
                <div style={{ display: 'grid', gap: 8 }}>
                    <h1 className="sg-big sg-h1">Enter a task</h1>
                    <p className="sg-lede hs-muted">Add a new task to the game</p>
                </div>

                <form onSubmit={handleSubmit} className="hs-panel">
                    <label htmlFor="task" className="hs-label">Task description</label>
                    <input
                        type="text"
                        id="task"
                        value={task}
                        onChange={(e) => setTask(e.target.value)}
                        className="hs-input"
                        placeholder="Enter your task"
                        required
                    />
                    <label htmlFor="taskLocation" className="hs-label">Task location</label>
                    <select
                        id="taskLocation"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        className="hs-select"
                        style={{ maxWidth: 'none', width: '100%' }}
                        required
                    >
                        <option value="">Select Task Location</option>
                        {taskLocations.map((loc) => (
                            <option key={loc} value={loc}>{loc}</option>
                        ))}
                    </select>
                    <button type="submit" className="sg-btn sg-btn-white" style={{ marginTop: 6 }}>
                        Add Task
                    </button>
                    {confirmationMessage && (
                        <p className="hs-hint sg-a sg-pop" role="status">Task added successfully!</p>
                    )}
                </form>
            </div>
        </div>
    );
}

export default TaskEntryPage;
