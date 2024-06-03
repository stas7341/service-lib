export type TKeyTypes =
    string | Buffer;

export type TValueTypes =
    string | number
    | Buffer;

export type TPairTypes =
    Record<string | number, TValueTypes>
    | Map<TValueTypes, TValueTypes>
    | Array<[TValueTypes, TValueTypes]>
    | Array<TValueTypes>
