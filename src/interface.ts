export interface ICalc {
    args: IArgs[];
    result: IRes;
    hostURI: string;
    resourceURI?: string;
    prefixes: IPrefix[];
}

export interface IArgs {
    property: string;
    targetPath?: string;
}

export interface IRes {
    unit?: string;
    datatype?: string;
    property: string;
    calc: string;
}

export interface IPrefix {
    prefix: string,
    uri: string
}