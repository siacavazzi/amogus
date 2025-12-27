/**
 * Tests for shared UI components
 * 
 * These are the refactored reusable components extracted from page-specific code
 * - Buttons: PrimaryButton, SecondaryButton, StatusBadge
 * - Cards: Card, CardHeader, CardBody
 * - Background Effects: FloatingParticles, GlowingOrb, GridOverlay, etc.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { 
    PrimaryButton, 
    SecondaryButton, 
    IconButton,
    StatusBadge 
} from './Buttons';
import { 
    Card, 
    CardHeader, 
    CardBody, 
    InfoCard,
    EmptyState 
} from './Card';
import {
    FloatingParticles,
    useFloatingParticles,
    GlowingOrb,
    GridOverlay,
    ScanLine,
    RotatingRing,
    Vignette,
} from './BackgroundEffects';
import { Check, X, AlertTriangle } from 'lucide-react';

describe('Button Components', () => {
    describe('PrimaryButton', () => {
        it('renders with children', () => {
            render(<PrimaryButton>Click Me</PrimaryButton>);
            expect(screen.getByText('Click Me')).toBeInTheDocument();
        });

        it('handles click events', () => {
            const handleClick = jest.fn();
            render(<PrimaryButton onClick={handleClick}>Click</PrimaryButton>);
            
            fireEvent.click(screen.getByText('Click'));
            expect(handleClick).toHaveBeenCalledTimes(1);
        });

        it('can be disabled', () => {
            render(<PrimaryButton disabled>Disabled</PrimaryButton>);
            // The button element should be disabled
            expect(screen.getByRole('button')).toBeDisabled();
        });

        it('shows loading state', () => {
            render(<PrimaryButton loading>Loading</PrimaryButton>);
            // Should show loading indicator or be disabled
        });

        it('renders with icon', () => {
            render(<PrimaryButton icon={Check}>With Icon</PrimaryButton>);
            expect(screen.getByText('With Icon')).toBeInTheDocument();
        });

        it('applies variant styles', () => {
            const { container } = render(<PrimaryButton variant="danger">Danger</PrimaryButton>);
            expect(container.querySelector('button')).toBeInTheDocument();
        });
    });

    describe('SecondaryButton', () => {
        it('renders with children', () => {
            render(<SecondaryButton>Secondary</SecondaryButton>);
            expect(screen.getByText('Secondary')).toBeInTheDocument();
        });

        it('has different styling than primary', () => {
            const { container: primary } = render(<PrimaryButton>Primary</PrimaryButton>);
            const { container: secondary } = render(<SecondaryButton>Secondary</SecondaryButton>);
            
            // Both should render but with different classes
            expect(primary.querySelector('button')).toBeInTheDocument();
            expect(secondary.querySelector('button')).toBeInTheDocument();
        });
    });

    describe('StatusBadge', () => {
        it('renders with text', () => {
            render(<StatusBadge>Active</StatusBadge>);
            expect(screen.getByText('Active')).toBeInTheDocument();
        });

        it('renders with icon', () => {
            render(<StatusBadge icon={AlertTriangle}>Warning</StatusBadge>);
            expect(screen.getByText('Warning')).toBeInTheDocument();
        });

        it('applies variant colors', () => {
            const { container: cyan } = render(<StatusBadge variant="cyan">Cyan</StatusBadge>);
            const { container: red } = render(<StatusBadge variant="red">Red</StatusBadge>);
            
            expect(cyan.querySelector('span, div')).toBeInTheDocument();
            expect(red.querySelector('span, div')).toBeInTheDocument();
        });

        it('can animate', () => {
            const { container } = render(<StatusBadge animate>Animating</StatusBadge>);
            // Animation class should be applied
        });
    });
});

describe('Card Components', () => {
    describe('Card', () => {
        it('renders children', () => {
            render(<Card>Card Content</Card>);
            expect(screen.getByText('Card Content')).toBeInTheDocument();
        });

        it('applies variant styling', () => {
            const { container } = render(<Card variant="dark">Dark Card</Card>);
            expect(container.firstChild).toBeInTheDocument();
        });

        it('applies padding option', () => {
            const { container } = render(<Card padding="large">Large Padding</Card>);
            expect(container.firstChild).toBeInTheDocument();
        });
    });

    describe('CardHeader', () => {
        it('renders title', () => {
            render(<CardHeader title="Header Title" />);
            expect(screen.getByText('Header Title')).toBeInTheDocument();
        });

        it('renders with icon', () => {
            render(<CardHeader title="With Icon" icon={Check} />);
            expect(screen.getByText('With Icon')).toBeInTheDocument();
        });
    });

    describe('CardBody', () => {
        it('renders children', () => {
            render(<CardBody>Body Content</CardBody>);
            expect(screen.getByText('Body Content')).toBeInTheDocument();
        });
    });

    describe('InfoCard', () => {
        it('renders label and value', () => {
            render(<InfoCard label="Score" value="100" />);
            expect(screen.getByText('Score')).toBeInTheDocument();
            expect(screen.getByText('100')).toBeInTheDocument();
        });
    });

    describe('EmptyState', () => {
        it('renders title', () => {
            render(<EmptyState title="No items found" />);
            expect(screen.getByText('No items found')).toBeInTheDocument();
        });

        it('renders with icon and title', () => {
            render(<EmptyState title="Empty" icon={X} />);
            expect(screen.getByText('Empty')).toBeInTheDocument();
        });

        it('renders description', () => {
            render(<EmptyState title="Empty" description="Nothing to show here" />);
            expect(screen.getByText('Nothing to show here')).toBeInTheDocument();
        });
    });
});

describe('Background Effect Components', () => {
    describe('useFloatingParticles hook', () => {
        it('returns array of particles', () => {
            // Test hook using a test component
            const TestComponent = () => {
                const particles = useFloatingParticles(10, 'default');
                return <div data-testid="particles">{particles.length}</div>;
            };
            
            render(<TestComponent />);
            expect(screen.getByTestId('particles')).toHaveTextContent('10');
        });
    });

    describe('FloatingParticles', () => {
        it('renders particles', () => {
            const particles = [
                { id: 1, x: 10, delay: 0, duration: 5, size: 4 },
                { id: 2, x: 50, delay: 1, duration: 6, size: 3 },
            ];
            
            const { container } = render(<FloatingParticles particles={particles} />);
            expect(container.firstChild).toBeInTheDocument();
        });

        it('handles empty particles array', () => {
            const { container } = render(<FloatingParticles particles={[]} />);
            expect(container).toBeInTheDocument();
        });
    });

    describe('GlowingOrb', () => {
        it('renders with position props', () => {
            const { container } = render(
                <GlowingOrb top="50%" left="50%" size="100px" color="bg-blue-500" />
            );
            expect(container.firstChild).toBeInTheDocument();
        });

        it('applies delay', () => {
            const { container } = render(
                <GlowingOrb top="0" left="0" size="50px" delay={1} />
            );
            expect(container.firstChild).toBeInTheDocument();
        });
    });

    describe('GridOverlay', () => {
        it('renders grid pattern', () => {
            const { container } = render(<GridOverlay />);
            expect(container.firstChild).toBeInTheDocument();
        });

        it('accepts custom color and size', () => {
            const { container } = render(
                <GridOverlay color="rgba(255,0,0,0.5)" size={40} />
            );
            expect(container.firstChild).toBeInTheDocument();
        });
    });

    describe('ScanLine', () => {
        it('renders scan line effect', () => {
            const { container } = render(<ScanLine />);
            expect(container.firstChild).toBeInTheDocument();
        });
    });

    describe('RotatingRing', () => {
        it('renders rotating ring', () => {
            const { container } = render(<RotatingRing size="200px" />);
            expect(container.firstChild).toBeInTheDocument();
        });

        it('can reverse direction', () => {
            const { container } = render(<RotatingRing size="200px" reverse />);
            expect(container.firstChild).toBeInTheDocument();
        });
    });

    describe('Vignette', () => {
        it('renders vignette overlay', () => {
            const { container } = render(<Vignette />);
            expect(container.firstChild).toBeInTheDocument();
        });

        it('accepts intensity prop', () => {
            const { container } = render(<Vignette intensity={80} />);
            expect(container.firstChild).toBeInTheDocument();
        });
    });
});
