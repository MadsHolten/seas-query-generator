"use strict";
var seas_calc_1 = require("./seas-calc");
var sc = new seas_calc_1.SeasCalc;
/**
 * EXAMPLE 1
 * Based on properties that exist on the resource itself
 *
 * Returns the fluid temperature difference of anything
 * that has a fluid supply- and return temperature
 */
var input = {
    args: [
        { property: 'seas:fluidSupplyTemperature', targetPath: '?resource seas:subSystemOf ?target' },
        { property: 'seas:fluidReturnTemperature', targetPath: '?resource seas:subSystemOf ?target' }
    ],
    unit: "Cel",
    calc: "abs(?arg1-?arg2)"
};
var q = sc.calculateForAll(input);
console.log(q);
/**
 * EXAMPLE 2
 * Based on properties that exist on another resource,
 * that has a relation to the resource itself
 *
 *
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
