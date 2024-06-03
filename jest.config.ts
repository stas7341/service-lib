import type {Config} from '@jest/types';

export default async (): Promise<Config.InitialOptions> => {
    return {
        preset: 'ts-jest',
        testEnvironment: 'node',
        transform: {
            "node_modules/variables/.+\\.(j|t)sx?$": "ts-jest"
        },
        transformIgnorePatterns: [
            "node_modules/(?!variables/.*)"
        ],
        testMatch: ['**/test/**/*.test.(ts)'],
        detectOpenHandles: true,
        collectCoverage: true,
        forceExit: true,
        testTimeout: 5000
    };
};