import { ICalc } from "./interface";
import { SeasCalc } from "./seas-calc";

/**
 * EXAMPLE 1
 * Based on properties that exist on the resource itself
 * 
 * Returns the fluid temperature difference of anything
 * that has a fluid supply- and return temperature
 */
var input: ICalc = {
    args: [
        {property: 'seas:fluidSupplyTemperature'},
        {property: 'seas:fluidReturnTemperature'}
    ], 
    unit:"Cel",
    calc: "abs(?arg1-?arg2)"
}
let sc = new SeasCalc(input);
var q = sc.calculateForAll();
console.log("Example 1: "+q);

/**
 * EXAMPLE 2
 * Based on properties that exist on another resource, 
 * that is linked to the resource itself
 * 
 * A target path is given with the resource itself as
 * a baseline. 
 * The resource must always be referred to
 * with the variable ?resource.
 * The target can have any name as long as it doesn't
 * conflict with other variables in the query.
 * Illegal variable names:
 * ?arg, ?now, ?res, ?eval, ?_t, ?t, ?g, ?_v, ?v
 */
// var input: ICalc = {
//     args: [
//         {property: 'seas:fluidSupplyTemperature', targetPath: '?resource seas:subSystemOf ?target'}, 
//         {property: 'seas:fluidReturnTemperature', targetPath: '?resource seas:subSystemOf ?target'}
//     ], 
//     unit:"Cel",
//     calc: "abs(?arg1-?arg2)"
// }
// var q = sc.calculateForAll(input);
// console.log("Example 2: "+q);