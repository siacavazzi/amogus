import React from 'react';
import { render } from '@testing-library/react';
import { usePageMeta } from './usePageMeta';

it('replaces the prerendered page schema without duplicate structured data', () => {
    const previous = document.createElement('script');
    previous.id = 'page-schema';
    previous.type = 'application/ld+json';
    previous.textContent = '{"name":"old page"}';
    document.head.appendChild(previous);
    function Page() {
        usePageMeta({ title: 'Guide', description: 'Guide description', canonical: 'https://susparty.com/among-us-irl', schema: { name: 'current guide' } });
        return <h1>Guide</h1>;
    }
    const view = render(<Page />);
    expect(document.querySelectorAll('#page-schema')).toHaveLength(1);
    expect(JSON.parse(document.getElementById('page-schema').textContent)).toEqual({ name: 'current guide' });
    view.unmount();
});
