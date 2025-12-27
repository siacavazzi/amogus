import React, { useContext } from 'react';
import { DataContext } from '../GameContext';
import { 
    Users, 
    Vote, 
    Zap, 
    Radiation, 
    CheckCircle, 
    AlertTriangle 
} from 'lucide-react';

const StatItem = ({ icon: Icon, label, value, color = "text-gray-300" }) => (
    <div className="flex items-center gap-3 py-2">
        <div className={`p-2 rounded-lg bg-gray-800/50 ${color}`}>
            <Icon size={18} />
        </div>
        <div className="flex-1">
            <span className="text-gray-400 text-sm">{label}</span>
        </div>
        <div className={`font-bold text-lg ${color}`}>
            {value}
        </div>
    </div>
);

const GameStats = ({ showFakeTasks = true }) => {
    const { gameStats } = useContext(DataContext);

    if (!gameStats) {
        return null;
    }

    return (
        <div className="w-full max-w-md mx-auto mt-6">
            <h3 className="text-lg font-semibold text-gray-300 mb-3 text-center">
                Game Stats
            </h3>
            <div className="bg-gray-800/40 rounded-xl p-4 border border-gray-700/50">
                <div className="divide-y divide-gray-700/50">
                    <StatItem 
                        icon={CheckCircle} 
                        label="Tasks Completed" 
                        value={gameStats.tasks_completed || 0}
                        color="text-green-400"
                    />
                    <StatItem 
                        icon={Users} 
                        label="Meetings Called" 
                        value={gameStats.meetings_called || 0}
                        color="text-blue-400"
                    />
                    <StatItem 
                        icon={Vote} 
                        label="Players Voted Out" 
                        value={gameStats.players_voted_out || 0}
                        color="text-purple-400"
                    />
                    <StatItem 
                        icon={Zap} 
                        label="Cards Played" 
                        value={gameStats.cards_played || 0}
                        color="text-yellow-400"
                    />
                    <StatItem 
                        icon={Radiation} 
                        label="Meltdowns Triggered" 
                        value={gameStats.meltdowns_triggered || 0}
                        color="text-orange-400"
                    />
                </div>

                {/* Fake Tasks Section */}
                {showFakeTasks && gameStats.fake_tasks_completed && gameStats.fake_tasks_completed.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-700/50">
                        <div className="flex items-center gap-2 mb-3">
                            <AlertTriangle size={18} className="text-red-400" />
                            <span className="text-red-400 font-medium">
                                Fake Tasks Completed ({gameStats.fake_tasks_completed.length})
                            </span>
                        </div>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                            {gameStats.fake_tasks_completed.map((fakeTask, index) => (
                                <div 
                                    key={index}
                                    className="bg-red-900/20 border border-red-500/20 rounded-lg p-2"
                                >
                                    <div className="text-sm text-red-200 font-medium">
                                        {fakeTask.player_name}
                                    </div>
                                    <div className="text-xs text-red-300/70 truncate">
                                        "{fakeTask.task_text}"
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GameStats;
