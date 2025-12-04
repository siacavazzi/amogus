import React, { useState, useContext, useEffect } from 'react';
import { DataContext } from '../GameContext';
import { Settings, Users, Clock, Target, Zap, Play, ChevronDown, ChevronUp, MapPin, Plus, X } from 'lucide-react';

function GameConfigPage() {
    const { socket, roomCode } = useContext(DataContext);
    
    const [config, setConfig] = useState({
        locations: ['Basement', '1st Floor', '2nd Floor', '3rd Floor'],
        vote_time: 180,
        vote_threshold: 0.66,
        meltdown_time: 60,
        code_percent: 0.6,
        num_imposters: 2,
        card_draw_probability: 0.9,
        starting_cards: 2,
        task_ratio: 12,
    });
    
    const [expandedSection, setExpandedSection] = useState('locations');
    const [newLocation, setNewLocation] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Request current config when component mounts
    useEffect(() => {
        if (socket && roomCode) {
            socket.emit('get_game_config', { room_code: roomCode });
        }
    }, [socket, roomCode]);

    // Listen for config updates from server
    useEffect(() => {
        if (!socket) return;

        const handleConfig = (data) => {
            console.log('Received game config:', data);
            setConfig(data);
        };

        socket.on('game_config', handleConfig);

        return () => {
            socket.off('game_config', handleConfig);
        };
    }, [socket]);

    const updateConfig = (key, value) => {
        setConfig(prev => ({ ...prev, [key]: value }));
    };

    const addLocation = () => {
        if (newLocation.trim() && !config.locations.includes(newLocation.trim())) {
            updateConfig('locations', [...config.locations, newLocation.trim()]);
            setNewLocation('');
        }
    };

    const removeLocation = (location) => {
        updateConfig('locations', config.locations.filter(l => l !== location));
    };

    const handleOpenRoom = () => {
        setIsSaving(true);
        socket.emit('update_game_config', { 
            room_code: roomCode, 
            config: config 
        });
        socket.emit('open_room', { room_code: roomCode });
    };

    const toggleSection = (section) => {
        setExpandedSection(expandedSection === section ? null : section);
    };

    const Section = ({ id, icon: Icon, title, children }) => (
        <div className="bg-gray-700 rounded-lg overflow-hidden mb-3">
            <button
                onClick={() => toggleSection(id)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-600 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <Icon size={20} className="text-indigo-400" />
                    <span className="font-medium text-gray-100">{title}</span>
                </div>
                {expandedSection === id ? (
                    <ChevronUp size={20} className="text-gray-400" />
                ) : (
                    <ChevronDown size={20} className="text-gray-400" />
                )}
            </button>
            {expandedSection === id && (
                <div className="px-4 pb-4 pt-2 border-t border-gray-600">
                    {children}
                </div>
            )}
        </div>
    );

    const SliderInput = ({ label, value, onChange, min, max, step = 1, unit = '', description }) => (
        <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
                <label className="text-gray-300 text-sm">{label}</label>
                <span className="text-indigo-400 font-mono font-bold">
                    {typeof value === 'number' && value < 1 && value > 0 
                        ? `${Math.round(value * 100)}%` 
                        : `${value}${unit}`}
                </span>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
            {description && (
                <p className="text-gray-500 text-xs mt-1">{description}</p>
            )}
        </div>
    );

    return (
        <div className="min-h-screen bg-gradient-to-tr from-gray-800 to-gray-900 p-4">
            <div className="max-w-lg mx-auto">
                {/* Header */}
                <div className="text-center mb-6">
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <Settings size={28} className="text-indigo-400" />
                        <h1 className="text-2xl font-bold text-gray-100">Game Settings</h1>
                    </div>
                    <div className="bg-gray-700 px-4 py-2 rounded-lg inline-block">
                        <span className="text-gray-400 text-sm">Room Code: </span>
                        <span className="text-indigo-400 font-mono font-bold text-xl">{roomCode}</span>
                    </div>
                </div>

                {/* Configuration Sections */}
                <div className="mb-6">
                    {/* Locations */}
                    <Section id="locations" icon={MapPin} title="Locations">
                        <p className="text-gray-400 text-sm mb-3">
                            Add the locations in your venue where tasks can be assigned.
                        </p>
                        <div className="flex flex-wrap gap-2 mb-3">
                            {config.locations.map((location) => (
                                <div
                                    key={location}
                                    className="flex items-center gap-1 bg-gray-600 px-3 py-1 rounded-full"
                                >
                                    <span className="text-gray-200 text-sm">{location}</span>
                                    <button
                                        onClick={() => removeLocation(location)}
                                        className="text-gray-400 hover:text-red-400 transition-colors"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newLocation}
                                onChange={(e) => setNewLocation(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && addLocation()}
                                placeholder="Add location..."
                                className="flex-1 px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            />
                            <button
                                onClick={addLocation}
                                className="px-3 py-2 bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
                            >
                                <Plus size={20} className="text-white" />
                            </button>
                        </div>
                    </Section>

                    {/* Imposters */}
                    <Section id="imposters" icon={Users} title="Imposters">
                        <SliderInput
                            label="Number of Imposters"
                            value={config.num_imposters}
                            onChange={(v) => updateConfig('num_imposters', v)}
                            min={1}
                            max={5}
                            description="Adjust based on group size. 1-2 for small groups, 2-3 for larger."
                        />
                        <SliderInput
                            label="Starting Cards"
                            value={config.starting_cards}
                            onChange={(v) => updateConfig('starting_cards', v)}
                            min={0}
                            max={5}
                            description="Cards each imposter starts with."
                        />
                        <SliderInput
                            label="Card Draw Chance"
                            value={config.card_draw_probability}
                            onChange={(v) => updateConfig('card_draw_probability', v)}
                            min={0}
                            max={1}
                            step={0.05}
                            description="Probability of drawing a card after task completion."
                        />
                    </Section>

                    {/* Meetings & Voting */}
                    <Section id="meetings" icon={Clock} title="Meetings & Voting">
                        <SliderInput
                            label="Voting Time"
                            value={config.vote_time}
                            onChange={(v) => updateConfig('vote_time', v)}
                            min={60}
                            max={300}
                            step={15}
                            unit="s"
                            description="Time allowed for voting during meetings."
                        />
                        <SliderInput
                            label="Vote Threshold"
                            value={config.vote_threshold}
                            onChange={(v) => updateConfig('vote_threshold', v)}
                            min={0.5}
                            max={1}
                            step={0.05}
                            description="Fraction of votes needed to eject someone."
                        />
                    </Section>

                    {/* Meltdown */}
                    <Section id="meltdown" icon={Zap} title="Meltdown">
                        <SliderInput
                            label="Meltdown Time"
                            value={config.meltdown_time}
                            onChange={(v) => updateConfig('meltdown_time', v)}
                            min={30}
                            max={120}
                            step={5}
                            unit="s"
                            description="Time to stop a meltdown before imposters win."
                        />
                        <SliderInput
                            label="Codes Required"
                            value={config.code_percent}
                            onChange={(v) => updateConfig('code_percent', v)}
                            min={0.3}
                            max={1}
                            step={0.05}
                            description="Fraction of players who must enter codes to stop meltdown."
                        />
                    </Section>

                    {/* Tasks */}
                    <Section id="tasks" icon={Target} title="Tasks">
                        <SliderInput
                            label="Tasks Per Player"
                            value={config.task_ratio}
                            onChange={(v) => updateConfig('task_ratio', v)}
                            min={5}
                            max={25}
                            description="Average tasks each crewmate needs to complete for crew to win."
                        />
                    </Section>
                </div>

                {/* Open Room Button */}
                <button
                    onClick={handleOpenRoom}
                    disabled={isSaving || config.locations.length === 0}
                    className="w-full bg-green-600 text-white py-4 px-6 rounded-lg hover:bg-green-700 transition-all focus:outline-none focus:ring-2 focus:ring-green-400 transform hover:scale-105 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-lg"
                >
                    {isSaving ? (
                        <span className="animate-pulse">Opening Room...</span>
                    ) : (
                        <>
                            <Play size={24} />
                            <span>Open Room for Players</span>
                        </>
                    )}
                </button>

                <p className="text-center text-gray-500 text-sm mt-4">
                    Once opened, other players can join with code <span className="text-indigo-400 font-mono">{roomCode}</span>
                </p>
            </div>
        </div>
    );
}

export default GameConfigPage;
