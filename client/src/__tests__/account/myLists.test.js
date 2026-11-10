import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import AccountPage from '../../pages/account/AccountPage';
import { resetAccountStoreForTests } from '../../account/accountStore';

jest.mock('../../pages/seo/SeoPageLayout', () => ({ children }) => <div>{children}</div>);

function reply(body, status = 200) {
    return Promise.resolve({ status, json: () => Promise.resolve(body) });
}

function mockServer() {
    const calls = [];
    let lists = [
        { code: 'NEW001', name: 'Birthday', task_count: 20, updated_at: 300, starred: false },
        { code: 'OLD001', name: 'Our house', task_count: 40, updated_at: 100, starred: false },
    ];
    global.fetch = jest.fn((url, options = {}) => {
        const body = options.body ? JSON.parse(options.body) : null;
        calls.push({ url, body });
        if (url.endsWith('/api/account')) return reply({ account: { id: 'a_1', email: 'host@x.co', name: '' }, google: true, email: true });
        if (url.endsWith('/api/account/lists')) return reply({ ok: true, lists });
        if (url.endsWith('/api/account/lists/remove')) {
            lists = lists.filter((list) => list.code !== body.code);
            return reply({ ok: true });
        }
        return reply({ ok: true, moved: 0 });
    });
    return calls;
}

const names = () => within(screen.getByTestId('account-lists')).getAllByRole('listitem').map((row) => row.querySelector('b').textContent);

beforeEach(() => {
    resetAccountStoreForTests();
    localStorage.getItem.mockImplementation(() => null);
});

afterEach(() => { delete global.fetch; });

test('starring a list moves it to the top', async () => {
    const calls = mockServer();
    render(<AccountPage />);
    await screen.findByTestId('account-lists');
    expect(names()).toEqual(['Birthday', 'Our house']);
    fireEvent.click(screen.getByRole('button', { name: 'Star Our house' }));
    expect(names()).toEqual(['Our house', 'Birthday']);
    expect(screen.getByRole('button', { name: 'Unstar Our house' })).toHaveAttribute('aria-pressed', 'true');
    await waitFor(() => expect(calls.find((c) => c.url.endsWith('/api/account/lists/star')).body).toEqual({ code: 'OLD001', starred: true }));
});

test('delete asks first, then takes the list away', async () => {
    const calls = mockServer();
    render(<AccountPage />);
    await screen.findByTestId('account-lists');
    fireEvent.click(screen.getByRole('button', { name: 'Delete Birthday' }));
    expect(screen.getByText(/anyone with the code can still play it/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Keep it' }));
    expect(calls.some((c) => c.url.endsWith('/remove'))).toBe(false);
    expect(names()).toEqual(['Birthday', 'Our house']);

    fireEvent.click(screen.getByRole('button', { name: 'Delete Birthday' }));
    fireEvent.click(screen.getByRole('button', { name: 'Yes, delete' }));
    await waitFor(() => expect(names()).toEqual(['Our house']));
    expect(calls.find((c) => c.url.endsWith('/api/account/lists/remove')).body).toEqual({ code: 'NEW001' });
});
