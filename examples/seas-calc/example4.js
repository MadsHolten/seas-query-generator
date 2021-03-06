"use strict";
var seas_calc = require("../../dist/index");
/**
 * EXAMPLE 4
 * properties of the resources themself
 * 
 * Based on properties that exist on the resource itself
 *
 * Returns the fluid temperature difference of anything
 * that has a fluid supply- and return temperature
 * 
 * The postClac method only returns a result for resources
 * where the calculated property does not already exist
 */
var input = {
    args: [
        { property: 'seas:fluidSupplyTemperature' },
        { property: 'seas:fluidReturnTemperature' }
    ],
    result: {
        unit: 'Cel',
        datatype: 'cdt:ucum',
        property: 'seas:fluidTemperatureDifference',
        calc: 'abs(?arg1-?arg2)'
    },
    hostURI: 'https://host/proj',
    prefixes: [
        {prefix: 'cdt', uri: 'http://w3id.org/lindt/custom_datatypes#'}
    ]
};
var sc = new seas_calc.SeasCalc(input);
var q = sc.putCalc();
console.log(q);