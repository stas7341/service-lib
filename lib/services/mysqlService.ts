"use strict";
// @ts-ignore
import {LogLevel} from "./logger";
import EventEmitter from "node:events";
import mysql from 'mysql2';

export interface mysqlConfig {
    host: string,
    user: string,
    password: string,
    database: string,
    connectTimeout: number,
    multipleStatements: false,
    connectionLimit: number
}
const log = (msg: string, level: LogLevel = LogLevel.info, metadata:any = undefined) =>
    mysqlService.getInstance().log(msg, level, metadata);

export class mysqlService extends EventEmitter{
    private config = <mysqlConfig>{};
    private connectionPool: any;
    private connectionPoolPromise: any;
    private static instance: any;
    private isInitialized: boolean;
    protected constructor() {
        super();
        mysqlService.instance = this;
        this.isInitialized = false;
    }

    static getInstance(): mysqlService {
        if (!this.instance)
            this.instance = new mysqlService();
        return <mysqlService>this.instance;
    }


    log(msg: string, level: LogLevel = LogLevel.info, metadata?: any) {
        this.emit("log", msg, level, metadata);
    }
    
    isInit = () => this.isInitialized;

    async init(config: mysqlConfig) : Promise<boolean> {
        const bluebird = require('bluebird');
        try {
            this.config = config;
            this.isInitialized = false;``

            if (process.env.NODE_ENV === 'dummy_test') {
                if (config.host.length === 0 || config.user.length === 0 || config.password.length === 0 || config.database.length === 0) {
                    log('mysql::the config validation failed, ' + JSON.stringify(config), LogLevel.error);
                    return false;
                }
                this.isInitialized = true;
                return true;
            }

            const sqlConnectionOptions = Object.assign({}, {
                Promise: bluebird
            }, config);

            this.connectionPool = mysql.createPool(sqlConnectionOptions);
            this.connectionPoolPromise = this.connectionPool.promise();
            this.isInitialized = true;
            return true;
        }
        catch(err) {
            log("mysql::" + err, LogLevel.error);
            return false;
        }
    }

    async query(query: string, params?: any) {
        try {
            this.isInit();

            if (process.env.NODE_ENV === 'dummy_test') {
                return {success: true};
            }

            const [rows, fields] = await this.connectionPoolPromise.query(query, params);
            if (rows && rows.length > 0) {
                if (rows.length === 1 || rows[0].length > 1) {
                    return rows[0];
                }
                else if (rows[0][0] !== undefined) {
                    return rows[0][0];
                }
                else
                    return rows;
            }
            return null;
        }
        // @ts-ignore
        catch(err: any) {
            log("mysql::" + err, LogLevel.error);
            if ((err.code !== undefined && err.code.localeCompare('PROTOCOL_CONNECTION_LOST') === 0) ||
                (err.code !== undefined && err.code.localeCompare('ETIMEDOUT') === 0) ||
                (err.code !== undefined && err.code.localeCompare('ECONNREFUSED') === 0))
            {
                log("mysql::failed on query, try to reconnect..", LogLevel.error);
            }
            throw err;
        }
    }

    async poolEnd() {
        this.connectionPoolPromise.end();
        this.connectionPoolPromise = undefined;
        this.isInitialized = false
    }
}
