import {SetOptions} from "@redis/client/dist/lib/commands/SET";
import {RedisCommandArgument} from "@redis/client/dist/lib/commands";
import {LogLevel} from "../services/logger";

export interface redisConfig {
    user: string,
    password: string,
    host: string,
    port: number,
    enable_offline_queue: boolean,
    connect_timeout: number,
    retry_strategy: any
}

type Types = RedisCommandArgument | number;
type HSETObject = Record<string | number, Types>;
type HSETMap = Map<Types, Types>;
type HSETTuples = Array<[Types, Types]> | Array<Types>;
type GenericArguments = [key: RedisCommandArgument];
export type SingleFieldArguments = [...generic: GenericArguments, field: Types, value: Types];
export type MultipleFieldsArguments = [...generic: GenericArguments, value: HSETObject | HSETMap | HSETTuples];

export interface IRedisCommands {
    init(config: redisConfig);
    log(msg: string, level: LogLevel, metadata?: any);
    addItem(key: string | Buffer, value: string | Buffer | number, options?: SetOptions): Promise<boolean>;

    getItem(key: string | Buffer): Promise<string | null>;

    deleteItem(key: string | Buffer): Promise<boolean>;

    searchKeys(pattern: string | Buffer): Promise<string[]>;

    isKeyExist(key: string | Buffer): Promise<boolean>;

    setIfNotExist(key: string | Buffer, value: string | Buffer): Promise<boolean>;

    execTransaction(transaction): Promise<any[]>;

    popMinItemFromZQ(queueName: string): Promise<{ score: number, value: string } | null>;

    popMaxItemFromZQ(queueName: string): Promise<{ score: number, value: string } | null>;

    popItemFromZQ(queueName: string, zpopmin?: boolean): Promise<{ score: number, value: string } | null>;

    getAllItemsFromZQWithScores(queueName: string): Promise<{ score: number, value: string }[]>;

    getAllItemsFromZQ(queueName: string): Promise<string[]>;

    addItemToZQ(queueName: string, item: string | string[], priority?: number): Promise<boolean>;

    removeItemFromZQ(queueName: string, item: string): Promise<boolean>;

    getZQLength(queueName: string): Promise<number>;

    addItemToSet(set: string, value: string | string[]): Promise<boolean>;

    getAllItemFromSet(set: string): Promise<string[]>;

    removeItemFromSet(set: string, value: string | string[]): Promise<number>;

    popupItemFromSet(set: string, count?: number): Promise<string | string[]>;

    numberOfItemFromSet(set: string): Promise<number>;

    setExpiration(key: string, ttl: number, mode?: "NX" | "XX" | "GT" | "LT"): Promise<boolean>;

    getClientTransaction(): Promise<any>;

    getClient(): any;

    addFieldsToHash(...[key, value, fieldValue]: SingleFieldArguments | MultipleFieldsArguments): Promise<number>;

    addFieldToHashIfNotExist(key: RedisCommandArgument, value: RedisCommandArgument, fieldValue: RedisCommandArgument): Promise<boolean>;

    removeFieldFromHash(key: RedisCommandArgument, field: RedisCommandArgument | Array<RedisCommandArgument>): Promise<number>;

    isFieldExistInHash(key: RedisCommandArgument, field: RedisCommandArgument): Promise<boolean>;

    getFieldFromHash(key: RedisCommandArgument, field: RedisCommandArgument): Promise<string | undefined>;

    getFieldsFromHash(key: RedisCommandArgument, fields: RedisCommandArgument | Array<RedisCommandArgument>): Promise<string[]>

    getAllFieldsFromHash(key: RedisCommandArgument): Promise<{ [p: string]: string }>

    incFieldInHash(key: RedisCommandArgument, field: RedisCommandArgument, increment: number): Promise<number>;

    incFloatFieldInHash(key: RedisCommandArgument, field: RedisCommandArgument, increment: number): Promise<number>;

    getFieldNamesFromHash(key: RedisCommandArgument): Promise<string[]>;

    getNumberOfFieldsInHash(key: RedisCommandArgument): Promise<number>;

    getRandomFieldFromHash(key: RedisCommandArgument): Promise<string | null>;

    getRandomFieldsFromHash(key: RedisCommandArgument, count: number): Promise<string[]>;

    getRandomFieldsAndValuesFromHash(key: RedisCommandArgument, count: number): Promise<{ [p: string]: string }>
}
