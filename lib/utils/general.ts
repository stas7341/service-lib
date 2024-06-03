"use strict";
import zlib from "node:zlib";

const os = require("os");
const fs = require('fs');
export class GeneralUtils {

    static isOverlapping(num1, num2, delta) {
        if (num1 === num2) return true;
        const big = Math.max(num1, num2);
        const small = Math.min(num1, num2);
        return (small + delta) >= (big - delta);
    }

    static getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    static getHostName() {
        return os.hostname();
    }

    static replaceAll(target, search, replacement) {
        return target.split(search).join(replacement);
    }

    static getMsApiPath(instance) {
        const parts = instance.hostName.split("@");
        if (parts.length > 0) {
            return GeneralUtils.replaceAll(parts[1], '_', '/');
        }
    }

    static readFromFile(fileName) {
        let data = fs.readFileSync(fileName);
        return JSON.parse(data);
    }

    static writeToFile(fileName, data) {
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

    static removeFile(fileName) {
        return new Promise((resolve, reject) => {
            fs.unlink(fileName, (err) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(fileName)
            });
        });
    }

    static newGuid() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random()*16|0, v = c === 'x' ? r : (r&0x3|0x8);
            return v.toString(16);
        });
    }

    static parseToBoolean(value: string) : boolean {
        if (value.toLowerCase() === 'true')
            return true;
        else if (value.toLowerCase() === 'false')
            return false;
        return false;
    }

    static createLine(arr: any[], startIndexColumn: number) {
        const values: string[] = [];
        for (let i = startIndexColumn; i<arr.length; i++ )
            if (arr[i])
                values.push(arr[i].toString());
            else
                values.push("");
        return values.join(",");
    }

    static promisify(fn) : ([]) => Promise<any> {
        return (...args) => new Promise((resolve, reject) => {
            fn(...args, (error, value) => {
                if (error)
                    reject(error);
                else
                    resolve(value);

            });
        });
    }

    static promisifyNoError(fn) {
        return (...args) => new Promise((resolve, reject) => {
            fn(...args, (value) => {
                resolve(value);
            });
        });
    }

    static mergeJsonDeep (o1: any, o2: any): any {
        let tempNewObj = o1;

        //if o1 is an object - {}
        if (o1.length === undefined && typeof o1 !== "number") {
            for(let key in o2) {
                if (o1[key] === undefined) {
                    tempNewObj[key] = o2[key];
                } else {
                    tempNewObj[key] = GeneralUtils.mergeJsonDeep(o1[key], o2[key]);
                    //else
                    // may we want to overwrite
                }
            }
        }

        //else if o1 is an array - []
        else if (o1.length > 0 && typeof o1 !== "string") {
            for(let key in o2) {
                if (JSON.stringify(o1).indexOf(JSON.stringify(o2[key])) === -1) {
                    tempNewObj.push(o2[key]);
                }
            }
        }

        //handling other types like string or number
        else {
            //taking value from the second object o2
            //could be modified to keep o1 value with tempNewObj = o1;
            tempNewObj = o2;
        }
        return tempNewObj;
    }

    static waitTimeout(milliseconds) {
        return new Promise<void>(resolve => {
            setTimeout(() => { resolve(); }, milliseconds);
        });
    }

    static JSONStringify(obj) {
        try {
            return JSON.stringify(obj);
        } catch (err) {
            const stringifyAvoidCircularError = (obj) => {
                const cache: any = [];
                const str = JSON.stringify(obj, function(key, value) {
                    if (typeof value === "object" && value !== null) {
                        if (cache.indexOf(value) !== -1) {
                            // Circular reference found, discard key
                            return "Circular reference found";
                        }
                        // Store value in our collection
                        cache.push(value);
                    }
                    return value;
                });
                return str;
            };
            return stringifyAvoidCircularError(obj);
        }
    }

    GZIP = {
        compress: async (value: string, encoding: BufferEncoding = "utf8") => {
            const _zlib = (value: Buffer): Promise<Buffer> => {
                return new Promise<Buffer>((resolve, reject) => {
                    zlib.gzip(value, (err, buffer) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(buffer);
                        }
                    });
                });
            }
            return _zlib(Buffer.alloc(value.length, value, encoding));
        },
        decompress: async (value: Buffer, encoding: BufferEncoding = "utf8") => {
            const _unzip = (value: Buffer): Promise<Buffer> => {
                return new Promise<Buffer>((resolve, reject) => {
                    zlib.gunzip(value, (err, decompressValue) => {
                        if (err) {
                            reject(err);
                            return;
                        }
                        resolve(decompressValue);
                    });
                });
            };
            const buf = await _unzip(value);
            return buf.toString(encoding);
        }
    }
}
