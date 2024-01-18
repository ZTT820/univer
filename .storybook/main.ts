import { type StorybookConfig } from 'storybook';
import { join, dirname } from 'path';

/**
 * This function is used to resolve the absolute path of a package.
 * It is needed in projects that use Yarn PnP or are set up within a monorepo.
 */
function getAbsolutePath(value) {
    return dirname(require.resolve(join(value, 'package.json')));
}

const config: StorybookConfig = {
    stories: [
        {
            directory: '../packages/design/src/**',
            files: '*.stories.@(js|jsx|mjs|ts|tsx)',
            titlePrefix: 'Design'
        },
        {
            directory: '../packages/ui/src/**',
            files: '*.stories.@(js|jsx|mjs|ts|tsx)',
            titlePrefix: 'Base UI'
        },
        {
            directory: '../packages/sheets-numfmt/src/**',
            files: '*.stories.@(js|jsx|mjs|ts|tsx)',
            titlePrefix: 'Numfmt'
        },
        {
            directory: '../packages/find-replace/src/**',
            files: '*.stories.@(js|jsx|mjs|ts|tsx)',
            titlePrefix: 'Find & Replace'
        },
    ],
    addons: [
        getAbsolutePath('@storybook/addon-links'),
        getAbsolutePath('@storybook/addon-essentials'),
        getAbsolutePath('@storybook/addon-interactions'),
        getAbsolutePath('@storybook/addon-docs'),
    ],
    framework: {
        name: getAbsolutePath('@storybook/react-vite'),
        options: {},
    },
    docs: {
        autodocs: true,
    },
    async viteFinal(config, options) {
        config.css = {
            modules: {
                localsConvention: 'camelCaseOnly',
                generateScopedName: 'univer-[local]',
            }
        };

        return config;
    },
};

export default config;
