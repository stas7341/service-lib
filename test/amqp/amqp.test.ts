import {amqpService, handlingMessage} from "../../src/services/amqpService";
import {ConfigManager, TYPE} from "../../src/services/configManager";
import {Message} from "../../src/model/message";
import {Logger} from "../../src/services/logger";
import {createMockAmqpConnection} from "../mockHelper";

describe(`Unit Tests AMQP`, () => {
    const confMgr = ConfigManager.getInstance();
    let conf: any = {};
    let amqp: amqpService = amqpService.getInstance();

    beforeAll(async () => {
        await confMgr.init("../test.json", "");
        await Logger.getInstance().init(confMgr.get("Logger", TYPE.OBJECT));
        conf = confMgr.get("aqmp", TYPE.OBJECT);
        const { mockConn } = createMockAmqpConnection();
        (amqp as any).amqpLib = {
            connect: (host: string, cb: any) => {
                cb(null, mockConn);
            }
        };
    });

    afterAll(async () => {
        await amqp.close();
    });

    test(`should fail subscribe amqpService not init`, async () => {
        try {
            await amqp.subscribe("", "", "queue_test", async () => true);
            expect(true).toBe(false);
        } catch (error: any) {
            expect(error.message).toEqual(`Service amqpService is not initialized.`);
        }
    });

    test(`Initalized amqpService`, async () => {
        const result = await amqp.init(conf);
        expect(result).toBe(true);
    });

    test(`check if queue exists `, async () => {
        const queueName = 'queue_test';
        const isQueueExist = await amqp.isQueueExist(queueName);
        if (isQueueExist) {
            const result = await amqp.purgeQueue(queueName);
            expect(result).toBe(true);
        } else {
            expect(true).toBe(true);
        }
    });

    test(`create queue without subscribe`, async () => {
        const queueName = 'queue_test';
        const result = await amqp.createQueue(queueName);
        expect(result).toBe(true);
    });

    test(`send message to queue`, async () => {
        const msg = new Message("test1", { 'key': 'value1', 'key2': 'value2' });
        await amqp.sendToQueue("queue_test", msg);
        expect(true).toBe(true);
    });

    test(`expect to get queue length`, async () => {
        const size = await amqp.getQueueLength("queue_test");
        expect(size).toBe(1);
    });

    test(`expect to fail on getQueueLength`, async () => {
        try {
            await amqp.getQueueLength("queue_name_not_exist");
            throw new Error(`expected to fail because queue is not exists, but I guess it is`);
        } catch (err: any) {
            expect(err?.code).toEqual(404);
        }
    });

    test(`expect to fail on amqp.getMessage() with queueName that not exist`, async () => {
        try {
            await amqp.getMessage("queue_name_not_exist", 100);
            throw new Error(`expect to fail, instead of success`);
        } catch (err: any) {
            expect(err?.code).toEqual(404);
        }
    });

    test(`expect to purge queue`, async () => {
        const queueName = 'queue_test';
        const currentSize = await amqp.getQueueLength(queueName);
        expect(currentSize).toEqual(1);
        await amqp.purgeQueue(queueName);
        const sizeAfterPurge = await amqp.getQueueLength(queueName);
        expect(sizeAfterPurge).toEqual(0);
    });

    test(`should subscribe to queue`, async () => {
        const controller: handlingMessage = async (msg): Promise<boolean> => {
            const messageBody = msg.content.toString().trim();
            return true;
        };
        const ch = await amqp.subscribe("", "", "queue_test", controller);
        expect(ch).toBeDefined();
    });
});
