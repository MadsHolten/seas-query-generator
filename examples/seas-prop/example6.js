"use strict";
var seas_calc = require("../../dist/index");
/**
 * EXAMPLE 6
 * Get latest evaluation of a single property of
 * a specific resource
 * 
 */
var input = {
    //resourceURI: "https://localhost/seas/HeatingSystem/f9a64795-58b6-4d6d-9755-e56920923db8",
    //propertyURI: "seas:fluidTemperatureDifference",
    propertyURI: "https://w3id.org/seas/fluidTemperatureDifference",
    latest: false
};
var sc = new seas_calc.SeasProp(input);
var q = sc.getProp();
console.log(q);