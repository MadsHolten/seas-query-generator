"use strict";
var _s = require("underscore.string");
var SeasCalc = (function () {
    function SeasCalc() {
    }
    SeasCalc.prototype.calculateForAll = function (input) {
        for (var i in input.args) {
            if (!input.args[i].targetPath) {
                input.args[i].targetPath = '?resource';
            }
            else {
                var str = input.args[i].targetPath;
                str = _s.clean(str); //Remove unnecessary spaces etc.
                var target = _s.strRightBack(str, '?').replace(/ /g, '').replace('.', ''); //Get target variable name
                str = _s.endsWith(str, ".") ? str + ' ' : str + ' . '; //Make sure it ends with a dot and a space
                input.args[i].targetPath = str + "?" + target + " ";
            }
        }
        var q = "PREFIX  xsd:  <http://www.w3.org/2001/XMLSchema#>\n                        PREFIX  seas: <https://w3id.org/seas/>\n                        PREFIX  prov: <http://www.w3.org/ns/prov#>\n                        PREFIX  cdt:  <http://w3id.org/lindt/custom_datatypes#>\n                        PREFIX  rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\n\n                        CONSTRUCT \n                        { \n                            ?resource seas:temperatureDifference <http://propertyURI> . \n                            <http://propertyURI> seas:evaluation <http://evaluationURI> .\n                            <http://evaluationURI> seas:evaluatedValue ?res ;\n                                            prov:wasGeneratedAtTime ?now ;\n                                            seas:calculation \"" + input.calc + "\"^^xsd:string ;\n                                            prov:derivedFrom _:c0 .\n                            _:c0 a rdf:Seq . ";
        for (var i in input.args) {
            var _i = Number(i) + 1;
            q += "_:c0 rdf:_" + _i + " ?eval" + _i + " . ";
        }
        q += "} WHERE {";
        for (var i in input.args) {
            var _i = Number(i) + 1;
            var resource = input.args[i].targetPath;
            var property = input.args[i].property;
            q += "{  SELECT  ?resource (MAX(?_t" + _i + ") AS ?t" + _i + ") \n                    WHERE \n                        { GRAPH ?g\n                            { " + resource + " " + property + "/seas:evaluation [ prov:wasGeneratedAtTime  ?_t" + _i + " ] }\n                        }\n                        GROUP BY ?resource\n                 }";
        }
        q += "GRAPH ?g {";
        for (var i in input.args) {
            var _i = Number(i) + 1;
            var resource = input.args[i].targetPath;
            var property = input.args[i].property;
            q += resource + " " + property + "/seas:evaluation ?eval" + _i + " .\n                      ?eval" + _i + "  prov:wasGeneratedAtTime ?t" + _i + " ;\n                                 seas:evaluatedValue     ?_v" + _i + " .\n                 BIND(xsd:decimal(strbefore(str(?_v" + _i + "), \" \")) AS ?arg" + _i + ") ";
        }
        q += "BIND((" + input.calc + ") AS ?_res)\n             BIND(strdt(concat(str(?_res), \" " + input.unit + "\"), cdt:ucum) AS ?res)\n             BIND(now() AS ?now)}}";
        return q;
    };
    return SeasCalc;
}());
exports.SeasCalc = SeasCalc;
