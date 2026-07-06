import React from 'react';
import { renderWithContext, screen } from '../../test-utils';
import GameStats from '../../components/GameStats';

describe('GameStats', () => {
    it('shows fake tasks sent, completed fake tasks, and taunts sent', () => {
        renderWithContext(<GameStats />, {
            gameStats: {
                tasks_completed: 4,
                meetings_called: 1,
                players_voted_out: 0,
                cards_played: 3,
                meltdowns_triggered: 0,
                fake_tasks_sent: [
                    {
                        sender_name: 'Charlie',
                        target_name: 'Alice',
                        task_text: 'Inspect the suspicious cabinet',
                        task_location: 'Kitchen',
                    },
                ],
                fake_tasks_completed: [
                    {
                        player_name: 'Alice',
                        task_text: 'Inspect the suspicious cabinet',
                    },
                ],
                taunts_sent: [
                    {
                        sender_name: 'Charlie',
                        target_name: 'Bob',
                        message: 'You walked right past me.',
                    },
                ],
            },
        });

        expect(screen.getAllByText(/Fake Tasks Sent/i).length).toBeGreaterThan(0);
        expect(screen.getByText(/Fake Tasks Completed \(1\)/i)).toBeInTheDocument();
        expect(screen.getAllByText(/Taunts Sent/i).length).toBeGreaterThan(0);
        expect(screen.getByText(/Charlie to Alice/i)).toBeInTheDocument();
        expect(screen.getByText(/Charlie to Bob/i)).toBeInTheDocument();
        expect(screen.getByText(/You walked right past me/i)).toBeInTheDocument();
    });
});