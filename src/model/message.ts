"use strict";
export interface IMessage {
    validate(): boolean;
    toString(): string;
}

export class Message implements IMessage{
    public action : string;
    public payload: any;
    public constructor(action : string, payload: any, initiator?: string) {
        this.action = action;
        this.payload = payload || {};
        this.payload.initiator = initiator !== undefined ? initiator : process.env.npm_package_name;
    }
    toString(): string {
        return JSON.stringify(this);
    }

    validate(): boolean {
        if (this.action.length < 3) {
            return false;
        }
        if (typeof this.payload !== "object") {
            return false;
        }
        return true;
    }

    static clone(msg: Message) {
        return new Message(msg.action, msg.payload);
    }
}
