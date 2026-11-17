import React from 'react';
import { act, render, screen } from '@testing-library/react';
import FakeTaskReveal from '../../components/FakeTaskReveal';

describe('FakeTaskReveal', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('stamps the task, tears it up, then closes itself', () => {
        const onComplete = jest.fn();
        render(<FakeTaskReveal task="Stack three mugs" location="Kitchen" onComplete={onComplete} />);
        const card = screen.getByTestId('fake-task-card');
        expect(screen.queryByText('FAKE TASK!')).not.toBeInTheDocument();

        act(() => { jest.advanceTimersByTime(500); });
        expect(screen.getByText('FAKE TASK!')).toBeInTheDocument();
        expect(card).toHaveClass('is-stamped');

        act(() => { jest.advanceTimersByTime(900); });
        expect(card).toHaveClass('is-torn');
        expect(screen.getByText('An intruder sent you on that one. No points awarded.')).toBeInTheDocument();

        act(() => { jest.advanceTimersByTime(1600); });
        expect(onComplete).toHaveBeenCalledTimes(1);
    });
});
