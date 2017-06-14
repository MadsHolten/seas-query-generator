"use strict";
var _ = require("underscore");
var _s = require("underscore.string");
var SeasCalc = (function () {
    function SeasCalc(input) {
        this.input = input;
        //Add predefined prefixes
        var prefixes = _.pluck(this.input.prefixes, 'prefix');
        if (!_.contains(prefixes, 'rdf')) {
            this.input.prefixes.push({ prefix: 'rdf', uri: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#' });
        }
        if (!_.contains(prefixes, 'xsd')) {
            this.input.prefixes.push({ prefix: 'xsd', uri: 'http://www.w3.org/2001/XMLSchema#' });
        }
        if (!_.contains(prefixes, 'seas')) {
            this.input.prefixes.push({ prefix: 'seas', uri: 'https://w3id.org/seas/' });
        }
        if (!_.contains(prefixes, 'prov')) {
            this.input.prefixes.push({ prefix: 'prov', uri: 'http://www.w3.org/ns/prov#' });
        }
        //Remove backslash at end of hostURI
        this.input.hostURI.replace(/\/$/, "");
        //datatype defaults to xsd:string
        this.input.result.datatype = this.input.result.datatype ? this.input.result.datatype : 'xsd:string';
    }
    //Create calculation where it doesn't already exist
    SeasCalc.prototype.postCalc = function () {
        //Define variables
        var hostURI = this.input.hostURI; //The host URI
        var calc = this.input.result.calc; //The calculation to perform
        var args = this.input.args; //Arguments
        var property = this.input.result.property; //New property
        var resourceURI = this.input.resourceURI; //optional
        var unit = this.input.result.unit;
        var datatype = this.input.result.datatype;
        var resource = !resourceURI ? '?resource' : '<' + resourceURI + '>';
        var prefixes = this.input.prefixes;
        for (var i in args) {
            if (!args[i].targetPath) {
                //Add '?resource' as target path if none is given
                args[i].targetPath = '?resource';
            }
            else {
                //Clean target path if given
                var str = args[i].targetPath;
                str = _s.clean(str); //Remove unnecessary spaces etc.
                var target = _s.strRightBack(str, '?').replace(/ /g, '').replace('.', ''); //Get target variable name
                str = _s.endsWith(str, ".") ? str + ' ' : str + ' . '; //Make sure it ends with a dot and a space
                args[i].targetPath = str + "?" + target + " ";
            }
            if (resourceURI) {
                //Replace '?resource' with the actual URI if one is defined
                var newResource = "<" + resourceURI + ">";
                args[i].targetPath = args[i].targetPath.replace('?resource', newResource);
            }
        }
        var q = '';
        //Define prefixes
        for (var i in prefixes) {
            q += "PREFIX  " + prefixes[i].prefix + ": <" + prefixes[i].uri + "> \n";
        }
        q += "CONSTRUCT \n            {\n                " + resource + " " + property + " ?propertyURI .\n                ?propertyURI seas:evaluation ?evaluationURI .\n                ?evaluationURI seas:evaluatedValue ?res ;\n                                prov:wasGeneratedAtTime ?now ;\n                                seas:calculation \"" + calc + "\"^^xsd:string ;\n                                prov:wasDerivedFrom _:c0 .\n                _:c0 a rdf:Seq . \n";
        for (var i in args) {
            var _i = Number(i) + 1;
            q += "_:c0 rdf:_" + _i + " ?eval" + _i + " . \n";
        }
        q += "} WHERE {";
        // Get latest evaluation of each argument
        for (var i in args) {
            var _i = Number(i) + 1;
            q += "{  SELECT ";
            q += !resourceURI ? '?resource ' : '';
            q += "(MAX(?_t" + _i + ") AS ?t" + _i + ") \n                    WHERE \n                        { GRAPH ?g\n                            { " + args[i].targetPath + " " + args[i].property + "/seas:evaluation [ prov:wasGeneratedAtTime  ?_t" + _i + " ] }\n                        } \n";
            q += !resourceURI ? 'GROUP BY ?resource' : '';
            q += "} \n";
        }
        //No previous calculations must exist
        q += "MINUS\n             { GRAPH ?g\n                { " + resource + " " + property + "/seas:evaluation [ prov:wasGeneratedAtTime  ?_tc ] }\n             }";
        q += "GRAPH ?g {";
        for (var i in args) {
            var _i = Number(i) + 1;
            q += args[i].targetPath + " " + args[i].property + "/seas:evaluation ?eval" + _i + " .\n                      ?eval" + _i + "  prov:wasGeneratedAtTime ?t" + _i + " ;\n                                 seas:evaluatedValue     ?v" + _i + " .\n                 BIND(xsd:decimal(strbefore(str(?v" + _i + "), \" \")) AS ?arg" + _i + ") "; //NB! might give problems with non-ucum
        }
        //NB! BIND(URI(CONCAT("${hostURI}", "/Property/", STRUUID())) AS ?propertyURI) should work - bug in Stardog
        q += "BIND((" + calc + ") AS ?_res)\n             BIND(strdt(concat(str(?_res), \" " + unit + "\"), " + datatype + ") AS ?res)\n             BIND(REPLACE(STR(UUID()), \"urn:uuid:\", \"\") AS ?guid)\n             BIND(URI(CONCAT(\"" + hostURI + "\", \"/Property/\", ?guid)) AS ?propertyURI)\n             BIND(URI(CONCAT(\"" + hostURI + "\", \"/Evaluation/\", ?guid)) AS ?evaluationURI)\n             BIND(now() AS ?now)}}";
        return q;
    };
    //Update calculation where an argument has changed
    SeasCalc.prototype.putCalc = function () {
        //Retrieve and process variables
        var hostURI = this.input.hostURI.replace(/\/$/, ""); //The host URI (remove backslash at end)
        var calc = this.input.result.calc; //The calculation to perform
        var args = this.input.args; //Arguments
        var property = this.input.result.property; //New property
        var resourceURI = this.input.resourceURI; //optional
        var unit = this.input.result.unit; //optional
        var datatype = this.input.result.datatype ? this.input.result.datatype : 'xsd:string'; //optional - defaults to xsd:string
        var resource = !resourceURI ? '?resource' : '<' + resourceURI + '>';
        var prefixes = this.input.prefixes;
        for (var i in args) {
            if (!args[i].targetPath) {
                //Add '?resource' as target path if none is given
                args[i].targetPath = '?resource';
            }
            else {
                //Clean target path if given
                var str = args[i].targetPath;
                str = _s.clean(str); //Remove unnecessary spaces etc.
                var target = _s.strRightBack(str, '?').replace(/ /g, '').replace('.', ''); //Get target variable name
                str = _s.endsWith(str, ".") ? str + ' ' : str + ' . '; //Make sure it ends with a dot and a space
                args[i].targetPath = str + "?" + target + " ";
            }
            if (resourceURI) {
                //Replace '?resource' with the actual URI if one is defined
                var newResource = "<" + resourceURI + ">";
                args[i].targetPath = args[i].targetPath.replace('?resource', newResource);
            }
        }
        var q = '';
        //Define prefixes
        for (var i in prefixes) {
            q += "PREFIX  " + prefixes[i].prefix + ": <" + prefixes[i].uri + "> \n";
        }
        q += "CONSTRUCT \n            {\n                ?calculatedProperty seas:evaluation ?evaluationURI .\n                ?evaluationURI seas:evaluatedValue ?res ;\n                                prov:wasGeneratedAtTime ?now ;\n                                seas:calculation \"" + calc + "\"^^" + datatype + " ;\n                                prov:wasDerivedFrom _:c0 .\n                _:c0 a rdf:Seq . \n";
        for (var i in args) {
            var _i = Number(i) + 1;
            q += "_:c0 rdf:_" + _i + " ?eval" + _i + " . \n";
        }
        q += "} WHERE {";
        //Get the time of the latest calculation
        q += "{ SELECT  ?calculatedProperty (MAX(?_tc) AS ?tc)\n                WHERE\n                    { GRAPH ?g\n                        { ?resource " + property + "/seas:evaluation _:b0 .\n                        _:b0 ^seas:evaluation ?calculatedProperty .\n                        _:b0  prov:wasGeneratedAtTime  ?_tc\n                        }\n                    }\n                GROUP BY ?calculatedProperty\n             }";
        //Get data about calculation
        q += "GRAPH ?gi {\n                ?calculatedProperty seas:evaluation \n                                        [ prov:wasGeneratedAtTime ?tc ;\n                                          seas:calculation ?calc ;\n                                          seas:evaluatedValue ?old_res ;\n                                          prov:wasDerivedFrom+ [?position ?old_arg] ] .\n             }";
        //Get the time of the latest input values
        q += "{ SELECT  ?old_arg (MAX(?_t) AS ?t)\n                WHERE\n                    { GRAPH ?g\n                        { ?old_arg ^seas:evaluation/seas:evaluation ?arg .\n                            ?arg  prov:wasGeneratedAtTime  ?_t\n                        }\n                    }\n                GROUP BY ?old_arg\n             }";
        //Get the values of these arguments
        q += "GRAPH ?g {\n                ?old_arg ^seas:evaluation/seas:evaluation ?new_arg .\n                ?new_arg prov:wasGeneratedAtTime  ?t ;\n                         seas:evaluatedValue ?new_arg_val ;\n            }";
        //Should put arguments in separate variables based on list position
        //Even possible?
        q += "BIND(str(540) AS ?_res)\n             BIND(datatype(?old_res) AS ?datatype)\n             BIND(strafter(str(?old_res), \" \") AS ?unit)\n             BIND(strdt(concat(str(?_res), \" \", ?unit), ?datatype) AS ?res)\n             BIND(REPLACE(STR(UUID()), \"urn:uuid:\", \"\") AS ?guid)\n             BIND(URI(CONCAT(\"" + hostURI + "\", \"/Evaluation/\", ?guid)) AS ?evaluationURI)\n             BIND(now() AS ?now)";
        q += "}";
        return q;
    };
    return SeasCalc;
}());
exports.SeasCalc = SeasCalc;
