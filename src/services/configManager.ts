import fs from 'fs';
import path from 'path';

/**
 * This is a wrapping class for microservices configuration management.
 * It serves all the cloud microservices to get their needed configurations.
 */

export enum TYPE {
    STRING,
    BOOLEAN,
    NUMBER,
    OBJECT
}

export class ConfigManager {
    configurations: Record<string, any> = {};
    private static instance: ConfigManager;
    private isInitialized: boolean;

    private constructor() {
        this.isInitialized = false;
    }

    static getInstance(): ConfigManager {
        if (!this.instance) {
            this.instance = new ConfigManager();
        }
        return this.instance;
    }

    isInit = (): boolean => this.isInitialized;

    /**
     * Initialize the config ServiceInstanceInfo.
     * @param configFilePath - path to configuration.
     * @param environment - defining the environment to pull the configuration for, example: PRODUCTION, DEV, TEST. Default is DEV.
     */
    async init(configFilePath: string, environment?: string): Promise<boolean> {
        if (environment) {
            process.env.NODE_ENV = environment;
        }
        this.configurations = ConfigManager.readConfigFile(configFilePath, environment);
        this.isInitialized = true;
        return true;
    }

    private static readConfigFile(configFilePath?: string, environment?: string): Record<string, any> {
        const fileName = environment ? environment : "default";
        const configPath = configFilePath ? configFilePath : "./config/" + fileName;

        // Try require.main if available
        if (typeof require !== 'undefined' && require.main && typeof require.main.require === 'function') {
            try {
                return require.main.require(configPath);
            } catch (e) {
                // fallback
            }
        }

        const candidates = [
            configPath,
            path.isAbsolute(configPath) ? configPath : path.resolve(process.cwd(), configPath),
            path.resolve(process.cwd(), 'test', path.basename(configPath)),
            path.resolve(process.cwd(), configPath.replace(/^\.\.\//, '')),
            path.resolve(process.cwd(), 'config', fileName + '.json'),
            path.resolve(process.cwd(), 'config', fileName + '.ts'),
            path.resolve(process.cwd(), 'config', fileName + '.js')
        ];

        for (const candidate of candidates) {
            try {
                if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
                    if (candidate.endsWith('.json')) {
                        return JSON.parse(fs.readFileSync(candidate, 'utf-8'));
                    }
                    return require(candidate);
                }
            } catch (err) {
                // continue to next candidate
            }
        }

        try {
            return require(configPath);
        } catch (err) {
            throw new Error(`ConfigManager could not load configuration file at '${configPath}'`);
        }
    }

    /**
     * A general purpose method getting the whole configuration for the given microservice.
     */
    get Read(): Record<string, any> {
        return { ...this.configurations };
    }

    getAll(objKey: string = ""): any {
        return objKey === "" ? { ...this.configurations } : this.configurations[objKey];
    }

    /**
     * Get the content of a certain key in the microservice configuration. The value will be taken from the config object was initialized.
     * @param key - a unique key of the configuration (dot notation supported).
     * @param resultType - TYPE enum (STRING, BOOLEAN, NUMBER, OBJECT).
     * @param defaultValue - optional fallback value if the key is not found.
     */
    get<T = any>(key: string, resultType: TYPE = TYPE.STRING, defaultValue?: T): T {
        if (!key) {
            return defaultValue as unknown as T;
        }

        const keys = key.split('.');
        let val: any = this.configurations;
        for (const k of keys) {
            if (val === undefined || val === null || typeof val !== 'object' || val[k] === undefined) {
                return defaultValue as unknown as T;
            }
            val = val[k];
        }

        if (val === undefined || val === null) {
            return defaultValue as unknown as T;
        }

        let result: any;
        switch (resultType) {
            case TYPE.OBJECT:
                result = val;
                break;
            case TYPE.NUMBER: {
                const num = Number(val);
                result = isNaN(num) ? defaultValue : num;
                break;
            }
            case TYPE.BOOLEAN: {
                if (typeof val === 'boolean') {
                    result = val;
                } else if (typeof val === 'number') {
                    result = val !== 0;
                } else {
                    const str = String(val).trim().toLowerCase();
                    result = str === 'true' || str === '1';
                }
                break;
            }
            case TYPE.STRING:
            default:
                result = typeof val === 'object' ? JSON.stringify(val) : String(val);
                break;
        }

        return (result !== undefined ? result : defaultValue) as T;
    }

    /**
     * Checks whether a specific key exists in the configuration.
     * @param key - dot notation key path
     */
    has(key: string): boolean {
        if (!key) return false;
        const keys = key.split('.');
        let val: any = this.configurations;
        for (const k of keys) {
            if (val === undefined || val === null || typeof val !== 'object' || val[k] === undefined) {
                return false;
            }
            val = val[k];
        }
        return val !== undefined;
    }

    /**
     * Resets the configuration manager state (useful for test isolation).
     */
    reset(): void {
        this.configurations = {};
        this.isInitialized = false;
    }

    set(key: string, value: any): void {
        const keys = key.split('.');
        let current: any = this.configurations;
        for (let i = 0; i < keys.length - 1; i++) {
            const k = keys[i];
            if (current[k] === undefined || typeof current[k] !== 'object' || current[k] === null) {
                current[k] = {};
            }
            current = current[k];
        }
        current[keys[keys.length - 1]] = value;
    }
}
