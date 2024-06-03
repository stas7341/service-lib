import {ConfigManager, TYPE} from "../../lib/services/configManager";

describe(`Unit Tests for configuration`, () => {
    const confMgr = ConfigManager.getInstance();

    beforeAll(async () => {
        await confMgr.init("../test.json", "");
    })

    beforeEach(() => {
    });

    afterEach(() => {
    });

    test(`Should extract "NVR_SERVICE.host.port" from ConfigManager and check for a valid number`, () => {
        let port = confMgr.get('NVR_SERVICE.host.port');
        port = parseInt(port, 10);
        expect(typeof port).toBe('number');
        expect(port).toEqual(8180);
    });

    test(`Should extract "Logger.timestamp" from ConfigManager as a boolean`, () => {
        const bParam = confMgr.get('Logger.timestamp', TYPE.BOOLEAN);
        expect(typeof bParam).toBe("boolean");
    });

    test(`Should extract "Logger.timestamp" from ConfigManager as a string`, () => {
        const bParam = confMgr.get('Logger.timestamp');
        expect(typeof bParam).toBe("string");

        const strBoolList = ["false", "true"];
        expect(strBoolList).toContain(bParam);
    });

    test(`try to get undefined key from confMgr`, async () => {
        const value = confMgr.get('key_not_exists');
        expect(value).toEqual(undefined);
    });

    test(`get all`, async () => {
        const config = confMgr.getAll();
        expect(typeof config).toBe("object");
        const keys = Object.keys(config);
        expect(keys).toContain("aqmp");
        expect(keys).toContain("redis");
        expect(keys).toContain("mysql");
    });
});
