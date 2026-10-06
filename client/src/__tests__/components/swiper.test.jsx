import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import MUECustomSlider from '../../components/swiper';

describe('MUECustomSlider', () => {
    it('shows success only after the completion action returns an accepted result', async () => {
        let resolveCompletion;
        const onSuccess = jest.fn(() => new Promise((resolve) => { resolveCompletion = resolve; }));
        const { container } = render(<MUECustomSlider onSuccess={onSuccess} />);

        fireEvent.keyDown(screen.getByRole('slider'), { key: 'Enter' });

        expect(container.querySelector('.lucide-check')).not.toBeInTheDocument();
        expect(onSuccess).toHaveBeenCalledTimes(1);

        await act(async () => { resolveCompletion(false); });
        expect(container.querySelector('.lucide-check')).not.toBeInTheDocument();

        fireEvent.keyDown(screen.getByRole('slider'), { key: 'Enter' });
        await act(async () => { resolveCompletion(true); });
        expect(container.querySelector('.lucide-check')).toBeInTheDocument();
    });

    it('does not accept keyboard input while disconnected or pending', () => {
        const onSuccess = jest.fn();
        render(<MUECustomSlider onSuccess={onSuccess} disabled />);

        fireEvent.keyDown(screen.getByRole('slider'), { key: 'Enter' });

        expect(onSuccess).not.toHaveBeenCalled();
        expect(screen.getByRole('slider')).toHaveAttribute('aria-disabled', 'true');
    });
});
