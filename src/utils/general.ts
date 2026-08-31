import zlib from "node:zlib";
import os from "os";
import fs from 'fs';
import crypto from 'crypto';

export class GeneralUtils {

    static isOverlapping(num1: number, num2: number, delta: number): boolean {
        if (num1 === num2) return true;
        const big = Math.max(num1, num2);
        const small = Math.min(num1, num2);
        return (small + delta) >= (big - delta);
    }

    static getRandomInt(min: number, max: number): number {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    static getHostName(): string {
        return os.hostname();
    }

    static replaceAll(target: string, search: string, replacement: string): string {
        if (typeof target !== 'string') return '';
        return target.split(search).join(replacement);
    }

    static getMsApiPath(instance: any): string | undefined {
        if (!instance || typeof instance.hostName !== 'string') return undefined;
        const parts = instance.hostName.split("@");
        if (parts.length > 1) {
            return GeneralUtils.replaceAll(parts[1], '_', '/');
        }
        return GeneralUtils.replaceAll(parts[0], '_', '/');
    }

    static readFromFile(fileName: string): any {
        const data = fs.readFileSync(fileName);
        return JSON.parse(data.toString());
    }

    static writeToFile(fileName: string, data: any): Promise<string> {
        return new Promise((resolve, reject) => {
            fs.writeFile(fileName, data, err => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(fileName);
            });
        });
    }

    static removeFile(fileName: string): Promise<string> {
        return new Promise((resolve, reject) => {
            fs.unlink(fileName, (err) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(fileName);
            });
        });
    }

    static newGuid(): string {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
            return crypto.randomUUID();
        }
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    static parseToBoolean(value: any): boolean {
        if (typeof value === 'boolean') return value;
        if (typeof value === 'number') return value !== 0;
        if (typeof value === 'string') {
            const str = value.trim().toLowerCase();
            return str === 'true' || str === '1';
        }
        return false;
    }

    static createLine(arr: any[], startIndexColumn: number = 0): string {
        if (!Array.isArray(arr)) return '';
        const values: string[] = [];
        for (let i = startIndexColumn; i < arr.length; i++) {
            if (arr[i] !== undefined && arr[i] !== null)
                values.push(arr[i].toString());
            else
                values.push("");
        }
        return values.join(",");
    }

    static promisify(fn: Function): (...args: any[]) => Promise<any> {
        return (...args: any[]) => new Promise((resolve, reject) => {
            fn(...args, (error: any, value: any) => {
                if (error)
                    reject(error);
                else
                    resolve(value);
            });
        });
    }

    static promisifyNoError(fn: Function): (...args: any[]) => Promise<any> {
        return (...args: any[]) => new Promise((resolve) => {
            fn(...args, (value: any) => {
                resolve(value);
            });
        });
    }

    static mergeJsonDeep(o1: any, o2: any): any {
        if (o1 === undefined || o1 === null) {
            return o2 !== undefined ? (typeof o2 === 'object' && o2 !== null ? JSON.parse(JSON.stringify(o2)) : o2) : o1;
        }
        if (o2 === undefined || o2 === null) {
            return typeof o1 === 'object' && o1 !== null ? JSON.parse(JSON.stringify(o1)) : o1;
        }

        if (Array.isArray(o1) && Array.isArray(o2)) {
            const merged = [...o1];
            for (const item of o2) {
                const itemStr = JSON.stringify(item);
                const exists = merged.some(existing => JSON.stringify(existing) === itemStr);
                if (!exists) {
                    merged.push(item);
                }
            }
            return merged;
        }

        if (typeof o1 === 'object' && typeof o2 === 'object' && !Array.isArray(o1) && !Array.isArray(o2)) {
            const result = { ...o1 };
            for (const key of Object.keys(o2)) {
                if (result[key] === undefined) {
                    result[key] = o2[key];
                } else {
                    result[key] = GeneralUtils.mergeJsonDeep(result[key], o2[key]);
                }
            }
            return result;
        }

        return o2;
    }

    static waitTimeout(milliseconds: number): Promise<void> {
        return new Promise<void>(resolve => {
            setTimeout(() => { resolve(); }, milliseconds);
        });
    }

    static JSONStringify(obj: any): string {
        try {
            return JSON.stringify(obj);
        } catch (err) {
            const seen = new WeakSet();
            return JSON.stringify(obj, (key, value) => {
                if (typeof value === "object" && value !== null) {
                    if (seen.has(value)) {
                        return "[Circular reference]";
                    }
                    seen.add(value);
                }
                return value;
            });
        }
    }

    static GZIP = {
        compress: async (value: string, encoding: BufferEncoding = "utf8"): Promise<Buffer> => {
            const _zlib = (buffer: Buffer): Promise<Buffer> => {
                return new Promise<Buffer>((resolve, reject) => {
                    zlib.gzip(buffer, (err, compressed) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(compressed);
                        }
                    });
                });
            };
            return _zlib(Buffer.from(value, encoding));
        },
        decompress: async (value: Buffer, encoding: BufferEncoding = "utf8"): Promise<string> => {
            const _unzip = (buffer: Buffer): Promise<Buffer> => {
                return new Promise<Buffer>((resolve, reject) => {
                    zlib.gunzip(buffer, (err, decompressed) => {
                        if (err) {
                            reject(err);
                            return;
                        }
                        resolve(decompressed);
                    });
                });
            };
            const buf = await _unzip(value);
            return buf.toString(encoding);
        }
    };

    static safeJsonParse<T = any>(jsonStr: string, fallback?: T): T {
        try {
            if (typeof jsonStr !== 'string') return fallback as T;
            return JSON.parse(jsonStr) as T;
        } catch {
            return fallback as T;
        }
    }

    static deepClone<T>(obj: T): T {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }
        return JSON.parse(GeneralUtils.JSONStringify(obj));
    }

    // Instance getter for backward compatibility
    get GZIP() {
        return GeneralUtils.GZIP;
    }
}
