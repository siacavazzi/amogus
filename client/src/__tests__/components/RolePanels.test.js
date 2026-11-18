import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { DataContext } from '../../GameContext';
import { CardOfferSheet, DetectiveBar, HackerTrail } from '../../components/RolePanels';

const wrap = (value, ui) => render(<DataContext.Provider value={value}>{ui}</DataContext.Provider>);

const players = [
  { player_id: 'me', username: 'Dee', alive: true },
  { player_id: 'p2', username: 'Ann', alive: true },
  { player_id: 'p3', username: 'Bo', alive: false },
];

describe('DetectiveBar', () => {
  it('shows nothing for anyone who is not the Detective', () => {
    wrap({ playerState: { role: 'crew', alive: true } }, <DetectiveBar />);
    expect(screen.queryByTestId('detective-bar')).toBeNull();
  });

  it('waits for a meeting before the first check', () => {
    wrap({ playerState: { role: 'detective', alive: true }, detectiveState: { check_ready: false } }, <DetectiveBar />);
    expect(screen.getByTestId('detective-check')).toBeDisabled();
  });

  it('checks a living player and shows the answer only here', async () => {
    const detectiveCheck = jest.fn().mockResolvedValue({ name: 'Ann', result: 'intruder' });
    wrap({ players, playerState: { role: 'detective', alive: true, player_id: 'me' }, detectiveState: { check_ready: true }, detectiveCheck }, <DetectiveBar />);
    fireEvent.click(screen.getByTestId('detective-check'));
    const options = screen.getAllByTestId('check-option');
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveTextContent(/Ann$/);
    fireEvent.click(options[0]);
    fireEvent.click(screen.getByRole('button', { name: /^Check$/ }));
    await waitFor(() => expect(screen.getByTestId('check-result')).toHaveTextContent('Ann'));
    expect(detectiveCheck).toHaveBeenCalledWith('p2');
  });

  it('lists who voted for whom', () => {
    const detectiveState = { vote_history: [{ meeting: 1, votes: [{ voter: 'Ann', target: 'Bo' }], skipped: ['Dee'], outcome: 'none' }] };
    wrap({ playerState: { role: 'detective', alive: true }, detectiveState }, <DetectiveBar meeting />);
    expect(screen.queryByTestId('detective-check')).toBeNull();
    fireEvent.click(screen.getByTestId('detective-votes'));
    expect(screen.getByTestId('vote-history')).toHaveTextContent('Ann voted Bo');
    expect(screen.getByTestId('vote-history')).toHaveTextContent('Dee voted to skip');
  });
});

describe('CardOfferSheet', () => {
  it('lets the Hacker keep one of two cards', async () => {
    const pickCard = jest.fn().mockResolvedValue(true);
    const card_offer = [{ id: 'c1', action: 'emp' }, { id: 'c2', action: 'taunt' }];
    wrap({ playerState: { role: 'hacker', alive: true, card_offer }, pickCard }, <CardOfferSheet />);
    const cards = screen.getAllByTestId('offer-card');
    expect(cards).toHaveLength(2);
    fireEvent.click(cards[1]);
    await waitFor(() => expect(pickCard).toHaveBeenCalledWith('c2'));
  });

  it('stays hidden for crew', () => {
    wrap({ playerState: { role: 'crew', alive: true, card_offer: [{ id: 'c1', action: 'emp' }] } }, <CardOfferSheet />);
    expect(screen.queryByTestId('card-offer')).toBeNull();
  });
});

describe('HackerTrail', () => {
  it('names the area when the card had one', () => {
    render(<HackerTrail trail={[{ card: 'emp', area: 'Kitchen' }]} />);
    expect(screen.getByTestId('hacker-trail')).toHaveTextContent('Kitchen');
  });
  it('shows nothing without a trail', () => {
    const { container } = render(<HackerTrail trail={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
