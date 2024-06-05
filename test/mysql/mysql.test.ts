import {ConfigManager, TYPE} from "../../lib/services/configManager";
import {Logger} from "../../lib/services/logger";
import {mysqlService} from "../../lib/services/mysqlService";

describe("Unit Tests MYSQL", () => {
    const confMgr = ConfigManager.getInstance();

    let conf: any = {};
    const mysql = mysqlService.getInstance();

    beforeAll(async () => {
        await confMgr.init("../test.json", "");
        await Logger.getInstance().init(confMgr);
        conf = confMgr.get("mysql", TYPE.OBJECT);
        await mysql.init(conf);
    });

    afterAll(async () => {
        await mysql.poolEnd();
    });

    beforeEach(() => {
        jest.restoreAllMocks();
    });

    afterEach(() => {
    });

    test("SELECT * FROM test.user", async () => {
        let res = await mysql.query('SELECT count(*) FROM test.user');
        expect(res['count(*)']).toBe(19);
    });

});
