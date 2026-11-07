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
} from '../signal/icons';
import { t } from '../i18n';

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
                {t('Game Stats')}
            </h3>
            <div style={{ background: 'rgba(0,0,0,0.18)', borderRadius: 20, padding: '8px 16px 12px', color: '#fff' }}>
                <div>
                    <StatItem 
                        icon={CheckCircle} 
                        label={t('Tasks Completed')} 
                        value={gameStats.tasks_completed || 0}
                    />
                    <StatItem 
                        icon={Users} 
                        label={t('Meetings Called')} 
                        value={gameStats.meetings_called || 0}
                    />
                    <StatItem 
                        icon={Vote} 
                        label={t('Players Voted Out')} 
                        value={gameStats.players_voted_out || 0}
                    />
                    <StatItem 
                        icon={Zap} 
                        label={t('Cards Played')} 
                        value={gameStats.cards_played || 0}
                    />
                    <StatItem 
                        icon={Radiation} 
                        label={t('Meltdowns Triggered')} 
                        value={gameStats.meltdowns_triggered || 0}
                    />
                    <StatItem 
                        icon={Send} 
                        label={t('Fake Tasks Sent')} 
                        value={fakeTasksSent.length}
                    />
                    <StatItem 
                        icon={MessageSquare} 
                        label={t('Taunts Sent')} 
                        value={tauntsSent.length}
                    />
                </div>

                {/* Fake Tasks Sent Section */}
                {showFakeTasks && fakeTasksSent.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-white/20">
                        <div className="flex items-center gap-2 mb-3">
                            <Send size={18} className="" />
                            <span style={{ fontWeight: 700 }}>
                                {t('Fake Tasks Sent ({count})', { count: fakeTasksSent.length })}
                            </span>
                        </div>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                            {fakeTasksSent.map((fakeTask, index) => (
                                <div 
                                    key={index}
                                    className="rounded-xl p-2.5" style={{ background: 'rgba(255,255,255,0.12)' }}
                                >
                                    <div className="text-sm  font-medium">
                                        {t('{sender_name} to {target_name}', { sender_name: fakeTask.sender_name, target_name: fakeTask.target_name })}
                                    </div>
                                    <div className="text-xs  truncate">
                                        {t('"{task}" at {location}', { task: fakeTask.task_text, location: fakeTask.task_location || t('Unknown') })}
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
                                {t('Fake Tasks Completed ({count})', { count: fakeTasksCompleted.length })}
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
                                {t('Taunts Sent ({count})', { count: tauntsSent.length })}
                            </span>
                        </div>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                            {tauntsSent.map((taunt, index) => (
                                <div 
                                    key={index}
                                    className="rounded-xl p-2.5" style={{ background: 'rgba(255,255,255,0.12)' }}
                                >
                                    <div className="text-sm  font-medium">
                                        {t('{sender_name} to {target_name}', { sender_name: taunt.sender_name, target_name: taunt.target_name })}
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
