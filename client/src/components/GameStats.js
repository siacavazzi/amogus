import React, { useContext } from 'react';
import { DataContext } from '../GameContext';
import { 
    Users, 
    Vote, 
    Zap, 
    Radiation, 
    CheckCircle, 
    AlertTriangle,
    MessageSquare,
    Send
} from 'lucide-react';

const StatItem = ({ icon: Icon, label, value }) => (
    <div className="flex items-center gap-3" style={{ padding: '9px 0' }}>
        <Icon size={18} strokeWidth={2.5} style={{ opacity: 0.8 }} />
        <span className="flex-1" style={{ fontWeight: 500, fontSize: 16 }}>{label}</span>
        <span className="sg-num" style={{ fontWeight: 900, fontSize: 22 }}>{value}</span>
    </div>
);

const GameStats = ({ showFakeTasks = true }) => {
    const { gameStats } = useContext(DataContext);

    if (!gameStats) {
        return null;
    }

    const fakeTasksSent = gameStats.fake_tasks_sent || [];
    const fakeTasksCompleted = gameStats.fake_tasks_completed || [];
    const tauntsSent = gameStats.taunts_sent || [];

    return (
        <div className="sg w-full max-w-md mx-auto text-left">
            <h3 className="sg-big" style={{ fontSize: 26, marginBottom: 12 }}>
                Game Stats
            </h3>
            <div style={{ background: 'rgba(0,0,0,0.18)', borderRadius: 20, padding: '8px 16px 12px', color: '#fff' }}>
                <div>
                    <StatItem 
                        icon={CheckCircle} 
                        label="Tasks Completed" 
                        value={gameStats.tasks_completed || 0}
                    />
                    <StatItem 
                        icon={Users} 
                        label="Meetings Called" 
                        value={gameStats.meetings_called || 0}
                    />
                    <StatItem 
                        icon={Vote} 
                        label="Players Voted Out" 
                        value={gameStats.players_voted_out || 0}
                    />
                    <StatItem 
                        icon={Zap} 
                        label="Cards Played" 
                        value={gameStats.cards_played || 0}
                    />
                    <StatItem 
                        icon={Radiation} 
                        label="Meltdowns Triggered" 
                        value={gameStats.meltdowns_triggered || 0}
                    />
                    <StatItem 
                        icon={Send} 
                        label="Fake Tasks Sent" 
                        value={fakeTasksSent.length}
                    />
                    <StatItem 
                        icon={MessageSquare} 
                        label="Taunts Sent" 
                        value={tauntsSent.length}
                    />
                </div>

                {/* Fake Tasks Sent Section */}
                {showFakeTasks && fakeTasksSent.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-white/20">
                        <div className="flex items-center gap-2 mb-3">
                            <Send size={18} className="" />
                            <span style={{ fontWeight: 700 }}>
                                Fake Tasks Sent ({fakeTasksSent.length})
                            </span>
                        </div>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                            {fakeTasksSent.map((fakeTask, index) => (
                                <div 
                                    key={index}
                                    className="rounded-xl p-2.5" style={{ background: 'rgba(255,255,255,0.12)' }}
                                >
                                    <div className="text-sm  font-medium">
                                        {fakeTask.sender_name} to {fakeTask.target_name}
                                    </div>
                                    <div className="text-xs  truncate">
                                        "{fakeTask.task_text}" at {fakeTask.task_location || 'Unknown'}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Fake Tasks Section */}
                {showFakeTasks && fakeTasksCompleted.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-white/20">
                        <div className="flex items-center gap-2 mb-3">
                            <AlertTriangle size={18} className="" />
                            <span style={{ fontWeight: 700 }}>
                                Fake Tasks Completed ({fakeTasksCompleted.length})
                            </span>
                        </div>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                            {fakeTasksCompleted.map((fakeTask, index) => (
                                <div 
                                    key={index}
                                    className="rounded-xl p-2.5" style={{ background: 'rgba(255,255,255,0.12)' }}
                                >
                                    <div className="text-sm  font-medium">
                                        {fakeTask.player_name}
                                    </div>
                                    <div className="text-xs  truncate">
                                        "{fakeTask.task_text}"
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Taunts Section */}
                {tauntsSent.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-white/20">
                        <div className="flex items-center gap-2 mb-3">
                            <MessageSquare size={18} className="" />
                            <span style={{ fontWeight: 700 }}>
                                Taunts Sent ({tauntsSent.length})
                            </span>
                        </div>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                            {tauntsSent.map((taunt, index) => (
                                <div 
                                    key={index}
                                    className="rounded-xl p-2.5" style={{ background: 'rgba(255,255,255,0.12)' }}
                                >
                                    <div className="text-sm  font-medium">
                                        {taunt.sender_name} to {taunt.target_name}
                                    </div>
                                    <div className="text-xs  truncate">
                                        "{taunt.message}"
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
