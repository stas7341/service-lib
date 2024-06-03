import {amqpService, handlingMessage} from "../../lib/services/amqpService";
import {ConfigManager, TYPE} from "../../lib/services/configManager";
import {Message} from "../../lib/model/message";
import {Logger} from "../../lib/services/logger";

describe(`Unit Tests AMQP`, () => {
    const confMgr = ConfigManager.getInstance();

    let conf: any = {};
    let amqp: amqpService = amqpService.getInstance();

    beforeAll(async () => {
        await confMgr.init("../test.json", "");
        await Logger.getInstance().init(confMgr.get("Logger", TYPE.OBJECT));
        conf = confMgr.get("aqmp", TYPE.OBJECT);
    });

    afterAll(async () => {
    });

    beforeEach(() => {
        jest.restoreAllMocks();
    });

    test(`should fail subscribe amqpService not init`, async () => {
        try {
            if (process.env?.STANDALONE_TEST?.toLowerCase() === 'true') {
                jest.spyOn(amqp, 'subscribe').mockImplementationOnce(() => Promise.reject(new Error('Service amqpService is not initialized.')));
            }
            await amqp.subscribe("", "", "queue_test", async () => true);
            throw new Error(`should not reach here, expected to fail`);
        } catch (error: any) {
            expect(error.message).toEqual(`Service amqpService is not initialized.`);
        }
    });

    test(`Initalized amqpService`, async () => {
        try {
            if (process.env?.STANDALONE_TEST?.toLowerCase() === 'true') {
                jest.spyOn(amqp, 'init').mockResolvedValueOnce(true);
            }
            await amqp.init(conf)
            expect(true).toBe(true);
        } catch (error) {
            throw new Error(`expected not to fail`)
        }
    });

    test(`check if queue exists and should delete it if it does`, async () => {
        if (process.env?.STANDALONE_TEST?.toLowerCase() === 'true') {
            jest.spyOn(amqp, 'isQueueExist').mockResolvedValueOnce(true);
        }

        const queueName = 'queue_test';
        try {
            const isQueueExist = await amqp.isQueueExist(queueName);
            if (isQueueExist && !(process.env?.STANDALONE_TEST?.toLowerCase() === 'true')) {
                // didnt execute with await removeQueue not return nothing and wait for a lot of time
                amqp.removeQueue(queueName);
            }
            expect(true).toBe(true);
        } catch (err: any) {
            throw new Error(`expect not to fail on amqp.isQueueExists ${err.message}`);
        }
    });

    test(`create queue without subscribe`, async () => {
        if (process.env?.STANDALONE_TEST?.toLowerCase() === 'true') {
            jest.spyOn(amqp, 'createQueue').mockResolvedValueOnce(true);
        }
        const queueName = 'queue_test';
        try {
            await amqp.createQueue(queueName);
            expect(true).toBe(true);
        } catch (err: any) {
            throw new Error(`expected to create queue ${err?.message}`);
        }
    });

    test(`send message to queue`, async () => {
        if (process.env?.STANDALONE_TEST?.toLowerCase() === 'true') {
            jest.spyOn(amqp, 'sendToQueue').mockResolvedValueOnce(undefined);
        }
        const msg: Message = {} as Message;
        msg.action = 'test1';
        msg.payload = {'key': 'value1', 'key2': 'value2'};

        try {
            await amqp.sendToQueue("queue_test", msg)
            expect(true).toBe(true);
        } catch (err: any) {
            throw new Error(`expected to send message to queue, ${err.message}`);
        }
    });

    test(`expect to get queue length`, async () => {
        if (process.env?.STANDALONE_TEST?.toLowerCase() === 'true') {
            jest.spyOn(amqp, 'getQueueLength').mockResolvedValueOnce(1);
        }
        try {
            const size = await amqp.getQueueLength("queue_test");
            expect(size).toBe(1);
        } catch (err) {
            throw new Error(`expected to get queue length`);
        }
    });

    test(`expect to fail on getQueueLength`, async () => {
        try {
            if (process.env?.STANDALONE_TEST?.toLowerCase() === 'true') {
                jest.spyOn(amqp, 'getQueueLength').mockRejectedValueOnce({code: 404});
            }
            const size = await amqp.getQueueLength("queue_name_not_exist");
            throw new Error(`expected to fail because queue is not exists, but I guess it is`);
        } catch (err: any) {
            expect(err?.code).toEqual(404);
        }
    });

    test(`expect to fail on amqp.getMessage() with queueName that not exist`, async () => {
        if (process.env?.STANDALONE_TEST?.toLowerCase() === 'true') {
            jest.spyOn(amqp, 'getMessage').mockRejectedValueOnce({code: 404});
        }
        try {
            await amqp.getMessage("queue_name_not_exist", 100);
            throw new Error(`expect to fail, instead of success`)
        } catch (err: any) {
            expect(err?.code).toEqual(404);
        }
    });

    test(`expect to purge queue`, async () => {

        if (process.env?.STANDALONE_TEST?.toLowerCase() === 'true') {
            jest.spyOn(amqp, 'getQueueLength').mockResolvedValueOnce(1);
            jest.spyOn(amqp, 'purgeQueue').mockResolvedValueOnce(undefined);
        }

        const queueName = 'queue_test';
        const currentSize = await amqp.getQueueLength(queueName);
        expect(currentSize).toEqual(1);
        // assert.equal(currentSize, 1, `expected to be one message in queue from test "send message to queue"`);
        await amqp.purgeQueue(queueName);

        if (process.env?.STANDALONE_TEST?.toLowerCase() === 'true') {
            jest.spyOn(amqp, 'getQueueLength').mockResolvedValueOnce(0);
        }
        const sizeAfterPurge = await amqp.getQueueLength(queueName);
        expect(sizeAfterPurge).toEqual(0);
        // assert.equal(sizeAfterPurge, 0, `expect to size zero on queue after purge`);

    });

    test(`should subscribe to queue`, async () => {
        if (process.env?.STANDALONE_TEST?.toLowerCase() === 'true') {
            jest.spyOn(amqp, 'subscribe').mockResolvedValueOnce(true);
        }

        const controller: handlingMessage = async (msg): Promise<boolean> => {
            const messageBody = msg.content.toString().trim();
            return true;
        };

        try {
            await amqp.subscribe("", "", "queue_test", controller);
            expect(true).toBe(true);
        } catch (err) {
            throw new Error(`expected to subscribe to queue`);
        }
    });

    test(`expect to subscribe with exchange and routing key`, async () => {
        if (process.env?.STANDALONE_TEST?.toLowerCase() === 'true') {
            jest.spyOn(amqp, 'isQueueExist').mockResolvedValueOnce(false);
            jest.spyOn(amqp, 'subscribe').mockResolvedValueOnce(true);
            jest.spyOn(amqp, 'getQueueLength').mockResolvedValueOnce(0);
            jest.spyOn(amqp, 'publishMessage').mockResolvedValue(undefined);
            jest.spyOn(amqp, 'publishString').mockResolvedValue(undefined);
        }

        const controller: handlingMessage = async (msg): Promise<boolean> => {
            const messageBody = msg.content.toString().trim();
            return true;
        };

        try {
            const queueName = 'test_routing';
            const isExists = await amqp.isQueueExist(queueName);
            if (isExists) {
                await amqp.purgeQueue(queueName);
            }

            await amqp.subscribe("exchange", "routing.Key.*", queueName, controller)
                .catch(err => {
                    throw new Error(`expect to subscribe to queue: ${queueName}`)
                });

            const msg2: Message = <Message>{};
            msg2.action = 'test2';
            msg2.payload = {'key': 'value1', 'key2': 'value2'};

            await amqp.publishMessage("exchange", "routing.Key.1", msg2)
                .catch(err => {
                    throw new Error(`expect to publish message object msg2`);
                });

            const msg3: Message = {} as Message;
            msg3.action = 'test3';
            msg3.payload = {'key': 'value1', 'key2': 'value2'};
            await amqp.publishMessage("exchange", "routing.Key.2", msg3)
                .catch(err => {
                    throw new Error(`expect to publish message object msg3`);
                });

            const msg4: string = 'String to test';
            await amqp.publishString("exchange", "routing.Key.2", msg4)
                .catch(err => {
                    throw new Error(`expect to publish message string msg4`);
                });

            await new Promise((r) => setTimeout(r, 1500));

            const size = await amqp.getQueueLength(queueName);
            if (size > 1) {
                throw new Error(`not expect to have more then one messages in queue`);
            } else {
                switch (size) {
                    case 1:
                        const msg = await amqp.getMessage(queueName, size);
                        expect(msg).toEqual(msg4);
                        break;
                    case 0:
                        expect(size).toEqual(0);
                        break;
                    default:
                        throw new Error('Expect to have size of 0 or 1')
                }
            }
        } catch (err: any) {
            throw new Error(`expect not to fail. ${err?.message}`)
        }
    });

    test(`should subscribe to queue with max priority`, async () => {
        const queueName = "priority_queue";

        let firstPriorityMessage: null | string = null;

        if (process.env?.STANDALONE_TEST?.toLowerCase() === 'true') {
            firstPriorityMessage = `priority msg 10`;
            jest.spyOn(amqp, 'isQueueExist').mockResolvedValueOnce(false);
            jest.spyOn(amqp, 'createQueue').mockResolvedValueOnce(true);
            jest.spyOn(amqp, 'sendStringToQueue').mockResolvedValue(undefined);
            jest.spyOn(amqp, 'subscribe').mockResolvedValue(undefined);
        }


        const controller: handlingMessage = async (msg): Promise<boolean> => {
            const messageBody = msg.content.toString().trim();
            if ((firstPriorityMessage === null) && (messageBody === `priority msg 10`)) {
                firstPriorityMessage = messageBody;
            }
            return true;
        };

        const isExist = await amqp.isQueueExist(queueName);
        if (isExist) {
            await amqp.purgeQueue(queueName);
        } else {
            await amqp.createQueue(queueName);
        }

        await amqp.sendStringToQueue("priority_queue", "priority msg 1", 1)
            .catch(err => {
                throw new Error(`expect to send string to queue 1`);
            });

        await amqp.sendStringToQueue("priority_queue", "priority msg 2", 2)
            .catch(err => {
                throw new Error(`expect to send string to queue 2`);
            });

        await amqp.sendStringToQueue("priority_queue", "priority msg 5", 5)
            .catch(err => {
                throw new Error(`expect to send string to queue 5`);
            });

        await amqp.sendStringToQueue("priority_queue", "priority msg 10", 10)
            .catch(err => {
                throw new Error(`expect to send string to queue 10`);
            });

        await amqp.subscribe("", "", "priority_queue", controller, "topic", 10).catch(err => {
            throw new Error(`expect to subscribe to queue with maxPriority`);
        });

        if (!(process.env?.STANDALONE_TEST?.toLowerCase() === 'true')) {
            await new Promise((r) => setTimeout(r, 2000));
        }

        expect(firstPriorityMessage).toEqual(`priority msg 10`);
    });
});
