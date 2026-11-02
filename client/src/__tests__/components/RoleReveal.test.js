import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { RoleReveal } from '../../signal/Moments';

const hand = ['{"action":"Fake Task"}', '{"action":"Self Report"}'].map((card) => JSON.parse(card));

const peek = () => fireEvent.pointerDown(screen.getByText('Hold to see it'));

describe('RoleReveal', () => {
    it("tells an intruder which cards they hold, only while they peek", () => {
        render(<RoleReveal title="The game has started" sus cards={hand} onClose={jest.fn()} />);
        expect(screen.queryByTestId('role-cards')).not.toBeInTheDocument();
        peek();
        expect(screen.getByTestId('role-cards')).toHaveTextContent('Your cards: Fake Task and Emergency Meeting. Tap ENTER VENT to play them.');
    });

    it('says nothing about cards to a crewmate', () => {
        render(<RoleReveal title="The game has started" sus={false} cards={hand} onClose={jest.fn()} />);
        peek();
        expect(screen.getByText('Crewmate')).toBeInTheDocument();
        expect(screen.queryByTestId('role-cards')).not.toBeInTheDocument();
    });

    it('leaves the line out when an intruder has no cards', () => {
        render(<RoleReveal title="The game has started" sus onClose={jest.fn()} />);
        peek();
        expect(screen.getByText('Intruder')).toBeInTheDocument();
        expect(screen.queryByTestId('role-cards')).not.toBeInTheDocument();
    });
});
