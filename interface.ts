export interface ICalc {
    args: IArgs[];
    unit: string;
    calc: string;
    evaluationURI?: string;
    propertyURI?: string;
}

export interface IArgs {
    property: string;
    targetPath?: string;
}