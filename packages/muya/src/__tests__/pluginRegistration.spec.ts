// @vitest-environment happy-dom
import type { IMuyaPluginConstructor } from '../muya';
import { afterEach, describe, expect, it } from 'vitest';
import { Muya } from '../muya';

class FirstPlugin {
    static pluginName = 'shared-plugin';

    constructor(_muya: Muya, _options: Record<string, unknown>) {}
}

class ReplacementPlugin {
    static pluginName = 'shared-plugin';

    constructor(_muya: Muya, _options: Record<string, unknown>) {}
}

class OtherPlugin {
    static pluginName = 'other-plugin';

    constructor(_muya: Muya, _options: Record<string, unknown>) {}
}

describe('muya plugin registration', () => {
    const originalPlugins = Muya.plugins;

    afterEach(() => {
        Muya.plugins = originalPlugins;
    });

    it('keeps one registration per pluginName and replaces it with the latest options', () => {
        Muya.plugins = [];
        Muya.use(FirstPlugin as IMuyaPluginConstructor, { version: 1 });
        Muya.use(OtherPlugin as IMuyaPluginConstructor);
        Muya.use(ReplacementPlugin as IMuyaPluginConstructor, { version: 2 });

        expect(Muya.plugins).toHaveLength(2);
        expect(Muya.plugins[0].plugin).toBe(ReplacementPlugin);
        expect(Muya.plugins[0].options).toEqual({ version: 2 });
        expect(Muya.plugins[1].plugin).toBe(OtherPlugin);
    });
});
