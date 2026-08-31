import { LogLevel } from "./logger";
import EventEmitter from "node:events";
import mysql from 'mysql2';

export interface mysqlConfig {
    host: string;
    user: string;
    password: string;
    database: string;
    connectTimeout?: number;
    multipleStatements?: boolean;
    connectionLimit?: number;
    port?: number;
    [key: string]: any;
}

const log = (msg: string, level: LogLevel = LogLevel.info, metadata: any = undefined) =>
    mysqlService.getInstance().log(msg, level, metadata);

export class mysqlService extends EventEmitter {
    private config = <mysqlConfig>{};
    private connectionPool: any;
    private connectionPoolPromise: any;
    private static instance: mysqlService;
    private isInitialized: boolean;

    protected constructor() {
        super();
        mysqlService.instance = this;
        this.isInitialized = false;
    }

    static getInstance(): mysqlService {
        if (!this.instance) {
            this.instance = new mysqlService();
        }
        return this.instance;
    }

    log(msg: string, level: LogLevel = LogLevel.info, metadata?: any) {
        this.emit("log", msg, level, metadata);
    }

    isInit = (): boolean => {
        if (!this.isInitialized && process.env.NODE_ENV !== 'dummy_test') {
            throw new Error(`Service ${this.constructor.name} is not initialized.`);
        }
        return true;
    };

    async init(config: mysqlConfig): Promise<boolean> {
        try {
            if (this.connectionPoolPromise) {
                await this.poolEnd();
            }

            this.config = config;
            this.isInitialized = false;

            if (process.env.NODE_ENV === 'dummy_test') {
                if (!config || !config.host || !config.user || !config.database) {
                    log('mysql::the config validation failed, ' + JSON.stringify(config), LogLevel.error);
                    return false;
                }
                this.isInitialized = true;
                return true;
            }

            const sqlConnectionOptions: mysql.PoolOptions = {
                waitForConnections: true,
                connectionLimit: 10,
                connectTimeout: 10000,
                multipleStatements: false,
                port: 3306,
                ...config
            };

            this.connectionPool = mysql.createPool(sqlConnectionOptions);
            this.connectionPoolPromise = this.connectionPool.promise();
            this.isInitialized = true;
            return true;
        } catch (err: any) {
            log("mysql::" + (err?.message || err), LogLevel.error);
            return false;
        }
    }

    /**
     * Executes a query with legacy auto-unwrapping (single row -> object, multiple rows -> array).
     */
    async query(query: string, params?: any): Promise<any> {
        try {
            this.isInit();

            if (process.env.NODE_ENV === 'dummy_test') {
                return { success: true };
            }

            const [rows] = await this.connectionPoolPromise.query(query, params);

            if (Array.isArray(rows)) {
                if (rows.length === 1) {
                    return rows[0];
                }
                return rows;
            }

            // Return ResultSetHeader for INSERT/UPDATE/DELETE
            return rows;
        } catch (err: any) {
            log("mysql::" + (err?.message || err), LogLevel.error);
            if (err?.code && ['PROTOCOL_CONNECTION_LOST', 'ETIMEDOUT', 'ECONNREFUSED'].includes(err.code)) {
                log("mysql::failed on query, connection lost: " + err.code, LogLevel.error);
            }
            throw err;
        }
    }

    /**
     * Executes a query and always returns an Array of rows.
     */
    async queryAll<T = any>(query: string, params?: any): Promise<T[]> {
        this.isInit();
        if (process.env.NODE_ENV === 'dummy_test') {
            return [] as T[];
        }
        try {
            const [rows] = await this.connectionPoolPromise.query(query, params);
            return Array.isArray(rows) ? (rows as T[]) : ([rows] as any);
        } catch (err: any) {
            log("mysql::" + (err?.message || err), LogLevel.error);
            throw err;
        }
    }

    /**
     * Executes a query and returns the first row or null if not found.
     */
    async queryOne<T = any>(query: string, params?: any): Promise<T | null> {
        this.isInit();
        if (process.env.NODE_ENV === 'dummy_test') {
            return null;
        }
        try {
            const [rows] = await this.connectionPoolPromise.query(query, params);
            if (Array.isArray(rows)) {
                return rows.length > 0 ? (rows[0] as T) : null;
            }
            return (rows as T) || null;
        } catch (err: any) {
            log("mysql::" + (err?.message || err), LogLevel.error);
            throw err;
        }
    }

    /**
     * Executes a query or mutation directly and returns the raw rows or ResultSetHeader.
     */
    async execute<T = any>(query: string, params?: any): Promise<T> {
        this.isInit();
        if (process.env.NODE_ENV === 'dummy_test') {
            return { success: true } as any;
        }
        try {
            const [result] = await this.connectionPoolPromise.execute(query, params);
            return result as T;
        } catch (err: any) {
            log("mysql::" + (err?.message || err), LogLevel.error);
            throw err;
        }
    }

    async poolEnd(): Promise<void> {
        if (this.connectionPoolPromise) {
            await this.connectionPoolPromise.end();
            this.connectionPoolPromise = undefined;
            this.connectionPool = undefined;
        }
        this.isInitialized = false;
    }
}

export const MysqlService = mysqlService;
export type MysqlConfig = mysqlConfig;

