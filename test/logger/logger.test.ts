import {ConfigManager, TYPE} from "../../lib/services/configManager";
import {Logger, LogLevel} from "../../lib/services/logger";

describe(`Unit Tests Logger`, () => {
    const confMgr = ConfigManager.getInstance();
    let conf: any = {};
    const logger = Logger.getInstance();

    beforeAll(async () => {
        await confMgr.init("../test.json", "");
        conf = confMgr.get("Logger", TYPE.OBJECT);
        await logger.init(conf);
    });


    test(`write log message`, async () => {
        const msg = `test started...`;
        logger.log(msg);
    });

    test(`check transport Logger.FileName`, async () => {
        let transports: string = conf["FileName"];
        expect(transports).toEqual("test.log");
    });

    test(`write log message with logLevel.info`, async () => {
        const msg = `test started...`;
        logger.log(msg, LogLevel.info);
    });
});
