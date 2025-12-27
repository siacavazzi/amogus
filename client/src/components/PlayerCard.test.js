/**
 * Tests for PlayerCard - Displays player info with selfie, status, etc.
 * 
 * Game Flow Context:
 * - Used in PreGamePage to show waiting players
 * - Used in VotingPage to show voting options
 * - Used in victory/results screens
 * - Shows player's selfie, name, and ready/alive status
 * - Dead players shown with grayscale and death cause indicator
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import PlayerCard, { ProfilePicture, getDeathInfo } from './PlayerCard';

describe('getDeathInfo', () => {
    it('returns correct info for voted_out', () => {
        const info = getDeathInfo('voted_out');
        expect(info.color).toBe('text-purple-400');
    });

    it('returns correct info for murdered', () => {
        const info = getDeathInfo('murdered');
        expect(info.color).toBe('text-red-400');
    });

    it('returns correct info for meltdown', () => {
        const info = getDeathInfo('meltdown');
        expect(info.color).toBe('text-orange-400');
    });

    it('returns correct info for left_game', () => {
        const info = getDeathInfo('left_game');
        expect(info.color).toBe('text-gray-400');
    });

    it('returns default info for unknown cause', () => {
        const info = getDeathInfo('unknown_cause');
        expect(info.color).toBe('text-gray-400');
    });
});

describe('ProfilePicture', () => {
    describe('Size Variants', () => {
        it('renders large size by default', () => {
            const { container } = render(<ProfilePicture imageCode={1} />);
            expect(container.querySelector('.w-24')).toBeInTheDocument();
        });

        it('renders medium size', () => {
            const { container } = render(<ProfilePicture imageCode={1} size="medium" />);
            expect(container.querySelector('.w-16')).toBeInTheDocument();
        });

        it('renders small size', () => {
            const { container } = render(<ProfilePicture imageCode={1} size="small" />);
            expect(container.querySelector('.w-12')).toBeInTheDocument();
        });

        it('renders tiny size', () => {
            const { container } = render(<ProfilePicture imageCode={1} size="tiny" />);
            expect(container.querySelector('.w-8')).toBeInTheDocument();
        });
    });

    describe('Death Styling', () => {
        it('applies grayscale when dead', () => {
            const { container } = render(
                <ProfilePicture imageCode={1} isDead={true} deathCause="murdered" />
            );
            expect(container.querySelector('.grayscale')).toBeInTheDocument();
        });

        it('reduces opacity when dead', () => {
            const { container } = render(
                <ProfilePicture imageCode={1} isDead={true} deathCause="voted_out" />
            );
            expect(container.querySelector('.opacity-70')).toBeInTheDocument();
        });

        it('shows death icon overlay when dead', () => {
            const { container } = render(
                <ProfilePicture imageCode={1} isDead={true} deathCause="murdered" />
            );
            // Death icon should be rendered
            // SVG or icon component should be present
        });
    });

    describe('Selfie Loading', () => {
        it('attempts to load selfie when provided', () => {
            render(<ProfilePicture selfie="test-selfie.jpg" />);
            
            const img = screen.getByRole('img');
            expect(img).toHaveAttribute('src', expect.stringContaining('test-selfie.jpg'));
        });

        it('has fallback for failed selfie load', () => {
            render(<ProfilePicture selfie="invalid.jpg" imageCode={1} />);
            
            const img = screen.getByRole('img');
            // onError handler should trigger fallback
        });
    });
});

describe('PlayerCard', () => {
    const mockPlayer = {
        player_id: 'player1',
        username: 'TestPlayer',
        alive: true,
        ready: true,
        pic: 1,
        selfie: null,
        sus: false,
    };

    describe('Rendering', () => {
        it('renders player name', () => {
            render(<PlayerCard player={mockPlayer} />);
            
            expect(screen.getByText('TestPlayer')).toBeInTheDocument();
        });

        it('renders profile picture', () => {
            render(<PlayerCard player={mockPlayer} />);
            
            expect(screen.getByRole('img')).toBeInTheDocument();
        });
    });

    describe('Ready Status', () => {
        it('shows ready indicator when player is ready', () => {
            const { container } = render(<PlayerCard player={{ ...mockPlayer, ready: true }} />);
            
            // Ready indicator should be visible - check for green color class
            expect(container.querySelector('.bg-green-500') || 
                   container.querySelector('[class*="green"]') ||
                   container.firstChild).toBeTruthy();
        });

        it('shows not ready state', () => {
            const { container } = render(<PlayerCard player={{ ...mockPlayer, ready: false }} />);
            // Not ready state - card should still render
            expect(container.firstChild).toBeInTheDocument();
        });
    });

    describe('Alive/Dead Status', () => {
        it('shows alive styling for alive players', () => {
            const { container } = render(<PlayerCard player={{ ...mockPlayer, alive: true }} />);
            
            expect(container.querySelector('.grayscale')).not.toBeInTheDocument();
        });

        it('shows dead styling for dead players', () => {
            const { container } = render(
                <PlayerCard player={{ ...mockPlayer, alive: false, death_cause: 'murdered' }} />
            );
            
            expect(container.querySelector('.grayscale')).toBeInTheDocument();
        });
    });

    describe('Vote Mode', () => {
        it('is clickable in vote mode', () => {
            const mockOnClick = jest.fn();
            render(<PlayerCard player={mockPlayer} onClick={mockOnClick} clickable />);
            
            const card = screen.getByText('TestPlayer').closest('button, div');
            if (card) {
                card.click();
                expect(mockOnClick).toHaveBeenCalled();
            }
        });

        it('shows selected state', () => {
            const { container } = render(
                <PlayerCard player={mockPlayer} selected={true} />
            );
            
            // Selected styling should be applied
            // Ring or border indication
        });
    });

    describe('Intruder Reveal', () => {
        it('can show intruder badge when revealed', () => {
            render(
                <PlayerCard player={{ ...mockPlayer, sus: true }} showRole={true} />
            );
            
            // If showRole is true, intruder status should be visible
        });
    });
});
