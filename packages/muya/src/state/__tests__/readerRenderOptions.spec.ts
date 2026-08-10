// @vitest-environment happy-dom

import { afterEach, describe, expect, it } from 'vitest';
import { MarkdownToHtml } from '../markdownToHtml';

describe('markdownToHtml explicit render options', () => {
    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('honours disabled raw HTML and superscript preferences', async () => {
        const markdown = '<span class="raw">raw</span> and H~2~O and 2^n^';
        const out = await new MarkdownToHtml(markdown, undefined, {
            disableHtml: true,
            superSubScript: false,
        }).renderHtml();

        expect(out).toContain('&lt;span class="raw"&gt;raw&lt;/span&gt;');
        expect(out).not.toContain('<span class="raw">');
        expect(out).not.toContain('<sub>2</sub>');
        expect(out).not.toContain('<sup>n</sup>');
    });

    it('accepts an explicit PlantUML server without requiring a Muya editor', () => {
        const renderer = new MarkdownToHtml(
            '```plantuml\n@startuml\nA -> B\n@enduml\n```',
            undefined,
            { plantumlServer: 'https://plantuml.example.test/render' },
        );
        const options = (renderer as unknown as {
            _options: { plantumlServer?: string };
        })._options;

        expect(options.plantumlServer).toBe('https://plantuml.example.test/render');
    });

    it('does not attach ordinary Markdown rendering to document.body', async () => {
        document.body.innerHTML = '<div id="host">host</div>';

        await new MarkdownToHtml('# Heading\n\nBody').renderHtml();

        expect(document.body.innerHTML).toBe('<div id="host">host</div>');
    });
});
