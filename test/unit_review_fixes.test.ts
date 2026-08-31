import { Message } from "../src/model/message";
import { ConfigManager, TYPE } from "../src/services/configManager";
import { GeneralUtils } from "../src/utils/general";
import { FileUtils } from "../src/utils/fileUtils";
import { LocalCache } from "../src/utils/localCache";
import { HttpService } from "../src/services/httpService";
import path from "path";
import fs from "fs";

describe("Comprehensive Unit Tests for Bug Fixes & Improvements", () => {

    describe("Message Model", () => {
        test("should handle primitive string payload without throwing", () => {
            const msg = new Message("TEST_ACTION", "simple string payload");
            expect(msg.action).toBe("TEST_ACTION");
            expect(msg.payload).toBeDefined();
            expect(msg.payload.data).toBe("simple string payload");
            expect(msg.payload.initiator).toBeDefined();
        });

        test("should handle primitive number payload without throwing", () => {
            const msg = new Message("TEST_ACTION", 12345);
            expect(msg.payload.data).toBe(12345);
        });

        test("should not mutate the caller-provided object", () => {
            const inputPayload = { user: "john", score: 100 };
            const msg = new Message("CREATE_USER", inputPayload, "custom-initiator");
            expect(msg.payload.initiator).toBe("custom-initiator");
            expect((inputPayload as any).initiator).toBeUndefined();
        });

        test("should validate properly for valid and invalid messages", () => {
            const validMsg = new Message("VALID_ACTION", { data: 1 });
            expect(validMsg.validate()).toBe(true);

            const shortActionMsg = new Message("AB", { data: 1 });
            expect(shortActionMsg.validate()).toBe(false);

            const nullPayloadMsg = new Message("VALID_ACTION", null);
            expect(nullPayloadMsg.validate()).toBe(true); // wrapped in { data: null, initiator: ... }

            const unwrapMsg = new Message("VALID_ACTION");
            unwrapMsg.payload = null;
            expect(unwrapMsg.validate()).toBe(false);
        });

        test("should clone message correctly", () => {
            const original = new Message("TEST_ACTION", { item: "box" }, "test-source");
            const cloned = Message.clone(original);
            expect(cloned.action).toBe(original.action);
            expect(cloned.payload.item).toBe("box");
            expect(cloned.payload.initiator).toBe("test-source");
        });
    });

    describe("ConfigManager", () => {
        const confMgr = ConfigManager.getInstance();

        beforeAll(async () => {
            await confMgr.init("../test.json", "");
        });

        test("should safely return undefined for non-existent keys without throwing", () => {
            expect(confMgr.get("non.existent.deep.path")).toBeUndefined();
            expect(confMgr.get("non.existent.path", TYPE.BOOLEAN)).toBeUndefined();
            expect(confMgr.get("non.existent.path", TYPE.NUMBER)).toBeUndefined();
            expect(confMgr.get("non.existent.path", TYPE.OBJECT)).toBeUndefined();
            expect(confMgr.get("", TYPE.STRING)).toBeUndefined();
        });

        test("should support dot-notation set and get", () => {
            confMgr.set("nested.feature.flag", true);
            expect(confMgr.get("nested.feature.flag", TYPE.BOOLEAN)).toBe(true);

            confMgr.set("nested.feature.count", 42);
            expect(confMgr.get("nested.feature.count", TYPE.NUMBER)).toBe(42);

            confMgr.set("nested.feature.name", "my-service");
            expect(confMgr.get("nested.feature.name", TYPE.STRING)).toBe("my-service");
        });

        test("should cast values accurately across TYPE enum", () => {
            confMgr.set("types.strNum", "123");
            expect(confMgr.get("types.strNum", TYPE.NUMBER)).toBe(123);
            expect(confMgr.get("types.strNum", TYPE.STRING)).toBe("123");

            confMgr.set("types.boolStr", "true");
            expect(confMgr.get("types.boolStr", TYPE.BOOLEAN)).toBe(true);

            confMgr.set("types.boolNum", 1);
            expect(confMgr.get("types.boolNum", TYPE.BOOLEAN)).toBe(true);

            confMgr.set("types.obj", { a: 1 });
            expect(confMgr.get("types.obj", TYPE.OBJECT)).toEqual({ a: 1 });
        });
    });

    describe("GeneralUtils", () => {
        test("GZIP should compress and decompress UTF-8 and Unicode without data truncation", async () => {
            const unicodeText = "Hello World! 🚀 Привет мир! שלום עולם! 日本語 🌟 Special chars: àéîöñç";
            const compressed = await GeneralUtils.GZIP.compress(unicodeText);
            expect(Buffer.isBuffer(compressed)).toBe(true);
            const decompressed = await GeneralUtils.GZIP.decompress(compressed);
            expect(decompressed).toBe(unicodeText);
        });

        test("mergeJsonDeep should merge nested objects without mutating source", () => {
            const obj1 = { a: 1, nested: { x: 10, y: 20 }, arr: [1, 2] };
            const obj2 = { b: 2, nested: { y: 30, z: 40 }, arr: [2, 3] };
            const merged = GeneralUtils.mergeJsonDeep(obj1, obj2);

            expect(merged.a).toBe(1);
            expect(merged.b).toBe(2);
            expect(merged.nested.x).toBe(10);
            expect(merged.nested.y).toBe(30);
            expect(merged.nested.z).toBe(40);
            expect(merged.arr).toEqual([1, 2, 3]);

            // Ensure source was not mutated
            expect((obj1 as any).b).toBeUndefined();
            expect((obj1.nested as any).z).toBeUndefined();
        });

        test("mergeJsonDeep should handle null and undefined safely", () => {
            expect(GeneralUtils.mergeJsonDeep(null, { a: 1 })).toEqual({ a: 1 });
            expect(GeneralUtils.mergeJsonDeep({ a: 1 }, null)).toEqual({ a: 1 });
            expect(GeneralUtils.mergeJsonDeep(undefined, { a: 1 })).toEqual({ a: 1 });
        });

        test("parseToBoolean should handle strings, booleans, and numbers", () => {
            expect(GeneralUtils.parseToBoolean("true")).toBe(true);
            expect(GeneralUtils.parseToBoolean("TRUE")).toBe(true);
            expect(GeneralUtils.parseToBoolean("1")).toBe(true);
            expect(GeneralUtils.parseToBoolean(true)).toBe(true);
            expect(GeneralUtils.parseToBoolean(1)).toBe(true);

            expect(GeneralUtils.parseToBoolean("false")).toBe(false);
            expect(GeneralUtils.parseToBoolean("0")).toBe(false);
            expect(GeneralUtils.parseToBoolean(false)).toBe(false);
            expect(GeneralUtils.parseToBoolean(0)).toBe(false);
            expect(GeneralUtils.parseToBoolean(null)).toBe(false);
            expect(GeneralUtils.parseToBoolean(undefined)).toBe(false);
        });

        test("newGuid should return a valid UUID format", () => {
            const uuid = GeneralUtils.newGuid();
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            expect(uuidRegex.test(uuid)).toBe(true);
        });

        test("getMsApiPath should handle instances with and without @", () => {
            expect(GeneralUtils.getMsApiPath({ hostName: "service@user_module" })).toBe("user/module");
            expect(GeneralUtils.getMsApiPath({ hostName: "standalone_service" })).toBe("standalone/service");
            expect(GeneralUtils.getMsApiPath(null)).toBeUndefined();
        });

        test("JSONStringify should handle circular references without throwing", () => {
            const circularObj: any = { name: "loop" };
            circularObj.self = circularObj;
            const str = GeneralUtils.JSONStringify(circularObj);
            expect(str).toContain("loop");
            expect(str).toContain("[Circular reference]");
        });
    });

    describe("FileUtils", () => {
        const tmpFile = path.resolve(__dirname, "test_csv_temp.csv");

        beforeAll(() => {
            fs.writeFileSync(tmpFile, "name,age,city\r\nAlice,30,New York\r\nBob,25,London\r\n");
        });

        afterAll(() => {
            if (fs.existsSync(tmpFile)) {
                fs.unlinkSync(tmpFile);
            }
        });

        test("readTextFileToArray handles CRLF line endings", () => {
            const lines = FileUtils.readTextFileToArray(tmpFile);
            expect(lines.length).toBeGreaterThanOrEqual(3);
            expect(lines[0]).toBe("name,age,city");
            expect(lines[1]).toBe("Alice,30,New York");
        });

        test("readTextFileToObjArray parses CSV to array of Maps", () => {
            const objArr = FileUtils.readTextFileToObjArray(tmpFile);
            expect(objArr.length).toBe(2);
            expect(objArr[0].get("name")).toBe("Alice");
            expect(objArr[0].get("age")).toBe("30");
            expect(objArr[0].get("city")).toBe("New York");
            expect(objArr[1].get("name")).toBe("Bob");
        });

        test("readTextFileToObjArray returns empty array for non-existent or empty files", () => {
            expect(FileUtils.readTextFileToObjArray("non_existent_file.csv")).toEqual([]);
        });
    });

    describe("LocalCache", () => {
        afterAll(() => {
            LocalCache.close();
        });

        test("set, get, mset, mget, del and lifecycle", () => {
            LocalCache.set("cache1", "user", "Alice", 60);
            expect(LocalCache.get("cache1", "user")).toBe("Alice");

            LocalCache.mset("cache1", [
                { key: "k1", val: "v1" },
                { key: "k2", val: "v2" }
            ]);

            const mgetRes = LocalCache.mget("cache1", ["k1", "k2"]);
            expect(mgetRes).toEqual({ k1: "v1", k2: "v2" });

            LocalCache.del("cache1", "k1");
            expect(LocalCache.get("cache1", "k1")).toBeUndefined();
            expect(LocalCache.get("cache1", "k2")).toBe("v2");

            LocalCache.deleteCache("cache1");
            expect(LocalCache.get("cache1", "k2")).toBeUndefined();
        });
    });

    describe("HttpService Options Immutability & Generics", () => {
        test("should not mutate the options object passed by the caller", async () => {
            const options = { headers: { "X-Custom": "test" } };
            const optionsSnapshot = JSON.stringify(options);

            jest.spyOn(HttpService, "query").mockResolvedValueOnce({ ok: true });

            await HttpService.get("https://example.com/api", options);
            expect(JSON.stringify(options)).toBe(optionsSnapshot);
        });

        test("should support typed responses via generics", async () => {
            interface ApiResponse {
                id: number;
                title: string;
            }
            jest.spyOn(HttpService, "query").mockResolvedValueOnce({ id: 1, title: "Test" });

            const data = await HttpService.get<ApiResponse>("https://example.com/item/1");
            expect(data.id).toBe(1);
            expect(data.title).toBe("Test");
        });
    });

    describe("New Utilities & Methods", () => {
        test("Message.fromJSON and payload getters", () => {
            const jsonStr = JSON.stringify({ action: "USER_LOGIN", payload: { data: { userId: 123 }, initiator: "auth" } });
            const msg = Message.fromJSON(jsonStr);
            expect(msg).not.toBeNull();
            expect(msg?.action).toBe("USER_LOGIN");
            expect(msg?.getPayload()).toBeDefined();
            expect(msg?.getData()).toEqual({ userId: 123 });

            expect(Message.fromJSON(null as any)).toBeNull();
            expect(Message.fromJSON("invalid-json")).toBeNull();
        });

        test("ConfigManager defaultValue, has, and reset", () => {
            const cm = ConfigManager.getInstance();
            expect(cm.get("undefined_key", TYPE.STRING, "default_val")).toBe("default_val");
            expect(cm.get("undefined_num", TYPE.NUMBER, 999)).toBe(999);

            cm.set("feature.alpha", true);
            expect(cm.has("feature.alpha")).toBe(true);
            expect(cm.has("feature.beta")).toBe(false);
        });

        test("GeneralUtils.safeJsonParse and deepClone", () => {
            expect(GeneralUtils.safeJsonParse('{"a":1}')).toEqual({ a: 1 });
            expect(GeneralUtils.safeJsonParse("invalid json", { fallback: true })).toEqual({ fallback: true });

            const original = { a: 1, nested: { b: 2 } };
            const cloned = GeneralUtils.deepClone(original);
            expect(cloned).toEqual(original);
            cloned.nested.b = 99;
            expect(original.nested.b).toBe(2);
        });

        test("FileUtils readJsonFile, writeJsonFile, fileExists", () => {
            const jsonFile = path.resolve(__dirname, "test_file_utils_temp.json");
            try {
                const sampleData = { name: "test", count: 42 };
                expect(FileUtils.writeJsonFile(jsonFile, sampleData, true)).toBe(true);
                expect(FileUtils.fileExists(jsonFile)).toBe(true);

                const readData = FileUtils.readJsonFile<{ name: string; count: number }>(jsonFile);
                expect(readData).toEqual(sampleData);
            } finally {
                if (fs.existsSync(jsonFile)) fs.unlinkSync(jsonFile);
            }
        });

        test("LocalCache has, getTTL, and keys", () => {
            LocalCache.set("cache_ext", "field1", "val1", 120);
            expect(LocalCache.has("cache_ext", "field1")).toBe(true);
            expect(LocalCache.has("cache_ext", "field_none")).toBe(false);
            expect(LocalCache.keys("cache_ext")).toContain("field1");
            expect(LocalCache.getTTL("cache_ext", "field1")).toBeGreaterThan(0);
            LocalCache.deleteCache("cache_ext");
        });
    });
});
