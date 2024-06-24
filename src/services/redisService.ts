import {LogLevel} from "./logger";
import {createClient, RedisClientOptions} from "redis";
import {RedisClientType} from "@redis/client";

import {IRedisCommands, MultipleFieldsArguments, redisConfig, SingleFieldArguments} from "../interfaces/redis.interface";
import {SetOptions} from "@redis/client/dist/lib/commands/SET";
import {ZMember} from "@redis/client/dist/lib/commands/generic-transformers";

import {RedisCommandArgument} from "@redis/client/dist/lib/commands";
import EventEmitter from "node:events";

const retryStrategy = (retries: number, cause: Error) => {
    if (retries > 10) {
        // End reconnecting with built in error
        return false;
    }
    // reconnect after
    return retries * 5000;
};

const log = (msg: string, level: LogLevel, metadata?) => redisService.getInstance().log(msg, level, metadata);

export class redisService extends EventEmitter implements IRedisCommands{
    protected config = {} as RedisClientOptions;
    protected redisClient!: RedisClientType;
    private static instance: redisService;
    private isInitialized: boolean;
    protected constructor() {
        super();
        redisService.instance = this;
        this.isInitialized = false;
    }

    static getInstance() {
        if (!redisService.instance)
            redisService.instance = new redisService();
        return redisService.instance;
    }

    isInit = () => this.isInitialized;

    log(msg: string, level: LogLevel = LogLevel.info, metadata?: any) {
        this.emit("log", msg, level, metadata);
    }

    async init(config: redisConfig): Promise<boolean> {
        try {
            const {user: username, password, host, port, connect_timeout = 30000} = config;

            this.config = {
                socket: {
                    port,
                    host,
                    connectTimeout: connect_timeout,
                    reconnectStrategy: retryStrategy
                },
                username,
                password,
                disableOfflineQueue: true,
            };

            const redisClient = createClient(this.config)
                .on("error", (err) => {
                    log("redisClient on error: " + err, LogLevel.error);
                    throw err;
                })
                .on("ready", () => {
                    log("redisClient ready", LogLevel.info);
                    this.isInitialized = true;
                })
                .on("reconnecting", () => {
                    log("redisClient reconnecting", LogLevel.info);
                });
            this.redisClient = await redisClient.connect() as any;
            return true;
        } catch (err) {
            log("failed to init", LogLevel.error, err);
            this.isInitialized = false;
            throw err;
        }
    }

    async stop() {
        await this.redisClient.disconnect();
    }

    async addItem(key: string | Buffer, value: string | Buffer | number, options?: SetOptions): Promise<boolean> {
        this.isInit();
        try {
            await this.redisClient.set(key, value, options);
            log(`addItem: ${key}, value: ${value}`, LogLevel.trace);
            return true;
        } catch (err) {
            log(`addItem: ${key}`, LogLevel.error);
            throw err;
        }
    }

    async getItem(key: string | Buffer): Promise<string | null> {
        this.isInit();

        try {
            const value = await this.redisClient.get(key);
            log(`getItem: ${key}, value: ${value}`, LogLevel.trace);
            return value;
        } catch (err) {
            log(`getItem: ${key}`, LogLevel.error, err);
            throw err;
        }
    }

    async deleteItem(key: string | Buffer): Promise<boolean> {
        this.isInit();

        try {
            const res = await this.redisClient.del(key);
            return (res === 1);
        } catch (err) {
            log(`deleteItem: ${key}`, LogLevel.error, err);
            return false;
        }
    }

    async searchKeys(pattern: string | Buffer): Promise<string[]> {
        this.isInit();

        try {
            const values = await this.redisClient.keys(pattern);
            log(`searchKeys: ${pattern}, result: ${values}`, LogLevel.trace);
            return values;
        } catch (err) {
            log(`searchKeys: ${pattern}`, LogLevel.error, err);
            throw err;
        }
    }

    async isKeyExist(key: string | Buffer): Promise<boolean> {
        this.isInit();

        try {
            const exists = await this.redisClient.exists(key);
            log(`isKeyExist key: ${key}: ${exists}`, LogLevel.trace);
            return (exists === 1);
        } catch (err) {
            log(`isKeyExist key: ${key}`, LogLevel.error, err);
            throw err;
        }
    }

    async setIfNotExist(key: string | Buffer, value: string | Buffer): Promise<boolean> {
        this.isInit();

        try {
            const res = await this.redisClient.setNX(key, value.toString());
            log(`setIfNotExist: key:${key}, res:${res}`, LogLevel.trace);
            return (res);
        } catch (err) {
            log("setIfNotExist:", LogLevel.error, err);
            throw err;
        }
    }

    async execTransaction(transaction): Promise<any[]> {
        this.isInit();

        const uid = Date.now();

        try {
            const results = await transaction.exec();
            if (results === null) {
                /**
                 * If results === null, it means that a concurrent client
                 * changed the key while we were processing it and thus
                 * the execution of the MULTI command was not performed.
                 *
                 * NOTICE: Failing an execution of MULTI is not considered
                 * an error. So you will have err === null and results === null
                 */
                log("execTransaction not performed, changed key while processing", LogLevel.warn, {uid});
                throw new Error("execution of MULTI command was snot performed");
            }
            log("execTransaction end", LogLevel.trace, {uid, results});
            return results;
        } catch (err) {
            log("execTransaction failed", LogLevel.error, {uid, err});
            throw err;
        }
    }

    async popMinItemFromZQ(queueName: string): Promise<{ score: number, value: string } | null> {
        this.isInit();

        try {
            const item = await this.redisClient.zPopMin(queueName);
            log("popMinItemFromZQ:", LogLevel.trace, item);
            return item;
        } catch (err) {
            log("popMinItemFromZQ:", LogLevel.error, err);
            throw err;
        }
    }

    async popMaxItemFromZQ(queueName: string): Promise<{ score: number, value: string } | null> {
        this.isInit();

        try {
            const item = await this.redisClient.zPopMax(queueName);
            log("popMaxItemFromZQ:", LogLevel.trace, item);
            return item;
        } catch (err) {
            log("popMaxItemFromZQ:", LogLevel.error, err);
            throw err;
        }
    }

    public popItemFromZQ(queueName: string, zpopmin = true) {
        if (zpopmin) {
            return this.popMinItemFromZQ(queueName);
        } else {
            return this.popMaxItemFromZQ(queueName);
        }
    }

    async getAllItemsFromZQWithScores(queueName: string): Promise<{ score: number, value: string }[]> {
        this.isInit();

        try {
            const arr = await this.redisClient.zRangeWithScores(queueName, 0, -1);
            log(`getAllItemsFromZQWithScores with scores: ${JSON.stringify(arr)}`, LogLevel.trace);
            return arr;
        } catch (err) {
            log("getAllItemsFromZQWithScores:", LogLevel.error, err);
            throw err;
        }
    }

    async getAllItemsFromZQ(queueName: string): Promise<string[]> {
        this.isInit();

        try {
            const arr = await this.redisClient.zRange(queueName, 0, -1);
            log(`getAllItemsFromZQ: ${JSON.stringify(arr)}`, LogLevel.trace);
            return arr;
        } catch (err) {
            log("getAllItemsFromZQ", LogLevel.error, err);
            throw err;
        }
    }

    async addItemToZQ(queueName: string, item: string | string[], priority = 1): Promise<boolean> {
        this.isInit();

        try {
            const member: ZMember = {
                score: priority,
                value: item.toString()
            };
            const res = await this.redisClient.zAdd(queueName, member);
            log("addItemToZQ:", LogLevel.trace, res);
            return true;
        } catch (err) {
            log("addItemToZQ:", LogLevel.error, err);
            return false;
        }
    }

    async removeItemFromZQ(queueName: string, item: string): Promise<boolean> {
        this.isInit();

        try {
            const res = await this.redisClient.zRem(queueName, item);
            log("removeItemFromZQ:", LogLevel.trace, res);
            return true;
        } catch (err) {
            log("removeItemFromZQ:", LogLevel.error, err);
            return false;
        }
    }

    async getZQLength(queueName: string): Promise<number> {
        this.isInit();

        try {
            const length = await this.redisClient.zCard(queueName);
            log(`getQueueLength: ${length}`, LogLevel.trace);
            return length;
        } catch (err) {
            log("getZQLength:", LogLevel.error, err);
            throw err;
        }
    }

    async addItemToSet(set: string, value: string | string[]): Promise<boolean> {
        this.isInit();

        try {
            const res = await this.redisClient.sAdd(set, value);
            if (res === 0) {
                log(`addItemToSet: set:${set}, value: ${value} already exists in set`, LogLevel.trace);
            }
            return true;
        } catch (err) {
            log("addItemToSet:", LogLevel.error, err);
            throw err;
        }
    }

    async getAllItemFromSet(set: string): Promise<string[]> {
        this.isInit();

        try {
            const members = await this.redisClient.sMembers(set);
            log(`getAllItemFromSet: ${set}, ${members}`, LogLevel.trace);
            return members;
        } catch (err) {
            log("getAllItemFromSet:", LogLevel.error, err);
            throw err;
        }
    }
    async removeItemFromSet(set: string, value: string | string[]): Promise<number> {
        this.isInit();

        try {
            const members = await this.redisClient.sRem(set, value);
            log(`removeItemFromSet: ${set}, members: ${members}`, LogLevel.trace);
            return members;
        } catch (err) {
            log("removeItemFromSet:", LogLevel.error, err);
            throw err;
        }
    }

    async popupItemFromSet(set: string, count?: number): Promise<string | string[]> {
        this.isInit();

        try {
            const member = await this.redisClient.sPop(set, count);
            log(`popupItemFromSet: ${set}, ${member}`, LogLevel.trace);
            return member;
        } catch (err) {
            log("popupItemFromSet:", LogLevel.error, err);
            throw err;
        }
    }

    async numberOfItemFromSet(set: string): Promise<number> {
        this.isInit();

        try {
            return this.redisClient.sCard(set);
        } catch (err) {
            log("numberOfItemFromSet:", LogLevel.error, err);
            throw err;
        }
    }

    async setExpiration(key: string, ttl: number, mode?: "NX" | "XX" | "GT" | "LT"): Promise<boolean> {
        this.isInit();

        const res = await this.redisClient.expire(key, ttl, mode);
        log(`setExpiration key:${key}, ttl:${ttl}${mode ? `, mode:${mode}` : ""}`, LogLevel.trace);
        return res;
    }

    async getClientTransaction() {
        this.isInit();

        log("getClientTransaction", LogLevel.trace);
        return this.redisClient.multi();
    }

    getClient() {
        this.isInit();

        log("getClient", LogLevel.trace);
        return this.redisClient;
    }

    async addFieldsToHash(...[key, field, value]: SingleFieldArguments | MultipleFieldsArguments): Promise<number> {
        this.isInit();

        try {
            const res = await this.redisClient.hSet(key, field as any, value as any);
            log(`addItemToHash: ${key}`, LogLevel.trace, {field: field, value: value});
            return res;
        } catch (err) {
            log(`addItemToHash: ${key}`, LogLevel.error, {field: field, value: value});
            throw err;
        }
    }

    async addFieldToHashIfNotExist(key: RedisCommandArgument, value: RedisCommandArgument, fieldValue: RedisCommandArgument) {
        this.isInit();

        try {
            const res = await this.redisClient.hSetNX(key, value, fieldValue);
            log(`addFieldToHashIfNotExist: ${key}`, LogLevel.trace, {field: value, value: fieldValue});
            return res;
        } catch (err) {
            log(`addFieldToHashIfNotExist: ${key}`, LogLevel.error, {field: value, value: fieldValue});
            throw err;
        }
    }

    async removeFieldFromHash(key: RedisCommandArgument, field: RedisCommandArgument | Array<RedisCommandArgument>): Promise<number> {
        this.isInit();

        try {
            const res = await this.redisClient.hDel(key, field);
            log(`removeFieldFromHash: ${key}, field: ${field}`, LogLevel.trace);
            return res;
        } catch (err) {
            log(`removeFieldFromHash: ${key}, field: ${field}`, LogLevel.error);
            throw err;
        }
    }

    async isFieldExistInHash(key: RedisCommandArgument, field: RedisCommandArgument): Promise<boolean> {
        this.isInit();

        try {
            const res = await this.redisClient.hExists(key, field);
            log(`isFieldExistInHash: ${key}, field: ${field}`, LogLevel.trace);
            return res;
        } catch (err) {
            log(`isFieldExistInHash: ${key}, field: ${field}`, LogLevel.error);
            throw err;
        }
    }

    async getFieldFromHash(key: RedisCommandArgument, field: RedisCommandArgument): Promise<string | undefined> {
        this.isInit();

        try {
            const res = await this.redisClient.hGet(key, field);
            log(`getFieldFromHash: ${key}, field: ${field}`, LogLevel.trace, {value: res});
            return res;
        } catch (err) {
            log(`getFieldFromHash: ${key}, field: ${field}`, LogLevel.error);
            throw err;
        }
    }

    async getAllFieldsFromHash(key: RedisCommandArgument): Promise<{[p: string]: string}> {
        this.isInit();

        try {
            const res = await this.redisClient.hGetAll(key);
            log(`getAllFieldsFromHash: ${key}`, LogLevel.trace, {items: res});
            return res;
        } catch (err) {
            log(`getAllFieldsFromHash: ${key}`, LogLevel.error);
            throw err;
        }
    }

    async incFieldInHash(key: RedisCommandArgument, field: RedisCommandArgument, increment: number): Promise<number> {
        this.isInit();

        try {
            const res = await this.redisClient.hIncrBy(key, field, increment);
            log(`incFieldInHash: ${key}, field: ${field}, value: ${res}`, LogLevel.trace);
            return res;
        } catch (err) {
            log(`incFieldInHash: ${key}, field: ${field}`, LogLevel.error);
            throw err;
        }
    }

    async incFloatFieldInHash(key: RedisCommandArgument, field: RedisCommandArgument, increment: number): Promise<number> {
        this.isInit();

        try {
            const res = await this.redisClient.hIncrByFloat(key, field, increment);
            log(`incFloatFieldInHash: ${key}, field: ${field}, value: ${res}`, LogLevel.trace);
            return res;
        } catch (err) {
            log(`incFloatFieldInHash: ${key}, field: ${field}`, LogLevel.error);
            throw err;
        }
    }

    async getFieldNamesFromHash(key: RedisCommandArgument): Promise<string[]> {
        this.isInit();

        try {
            const res = await this.redisClient.hKeys(key);
            log(`getFieldsNameFromHash: ${key}`, LogLevel.trace, {fields: res});
            return res;
        } catch (err) {
            log(`getFieldsNameFromHash: ${key}`, LogLevel.error);
            throw err;
        }
    }

    async getNumberOfFieldsInHash(key: RedisCommandArgument): Promise<number> {
        this.isInit();

        try {
            const res = await this.redisClient.hLen(key);
            log(`getNumberOfFieldsInHash: ${key}`, LogLevel.trace, {fields: res});
            return res;
        } catch (err) {
            log(`getNumberOfFieldsInHash: ${key}`, LogLevel.error);
            throw err;
        }
    }

    async getFieldsFromHash(key: RedisCommandArgument, fields: RedisCommandArgument | Array<RedisCommandArgument>): Promise<string[]> {
        this.isInit();

        try {
            const res = await this.redisClient.hmGet(key, fields);
            log(`getFieldsFromHash: ${key}`, LogLevel.trace, {fields: res});
            return res;
        } catch (err) {
            log(`getFieldsFromHash: ${key}`, LogLevel.error);
            throw err;
        }
    }

    async getRandomFieldFromHash(key: RedisCommandArgument): Promise<string | null> {
        this.isInit();

        try {
            const res = await this.redisClient.hRandField(key);
            log(`getRandomFieldFromHash: ${key}`, LogLevel.trace, {fields: res});
            return res;
        } catch (err) {
            log(`getRandomFieldFromHash: ${key}`, LogLevel.error);
            throw err;
        }
    }

    async getRandomFieldsFromHash(key: RedisCommandArgument, count: number): Promise<string[]> {
        this.isInit();

        try {
            // If the provided count argument is positive, return an array of distinct fields.
            // If called with a negative count, the behavior changes and the command is allowed to return the same field multiple times
            const res = await this.redisClient.hRandFieldCount(key, count);
            log(`getRandomFieldsFromHash: ${key}`, LogLevel.trace, {fields: res});
            return res;
        } catch (err) {
            log(`getRandomFieldsFromHash: ${key}`, LogLevel.error);
            throw err;
        }
    }

    async getRandomFieldsAndValuesFromHash(key: RedisCommandArgument, count: number): Promise<{ [p:string]: string }> {
        this.isInit();

        try {
            // If the provided count argument is positive, return an array of distinct fields.
            // If called with a negative count, the behavior changes and the command is allowed to return the same field multiple times
            const res = await this.redisClient.hRandFieldCountWithValues(key, count);
            log(`getRandomFieldsAndValuesFromHash: ${key}`, LogLevel.trace, {fields: res});
            return res;
        } catch (err) {
            log(`getRandomFieldsAndValuesFromHash: ${key}`, LogLevel.error);
            throw err;
        }
    }
}


