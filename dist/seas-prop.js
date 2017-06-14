"use strict";
var _ = require("underscore");
var _s = require("underscore.string");
var SeasProp = (function () {
    function SeasProp(input) {
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
        this.input.value.datatype = this.input.value.datatype ? this.input.value.datatype : 'xsd:string';
        //If no resource URI is specified, some pattern must exist
        if (!this.input.resourceURI) {
            if (!this.input.pattern) {
                this.err = "When no resourceURI is specified a pattern must exist!";
            }
            else {
                this.input.resourceURI = '?resource';
                //Clean pattern
                var str = this.input.pattern;
                str = _s.clean(str); //Remove unnecessary spaces etc.
                str = _s.endsWith(str, ".") ? str + ' ' : str + ' . '; //Make sure it ends with a dot and a space
                this.input.pattern = str;
            }
        }
        else {
            this.input.resourceURI = "<" + this.input.resourceURI + ">";
        }
    }
    //Create property where it doesn't already exist
    SeasProp.prototype.postProp = function () {
        //Retrieve and process variables
        var prefixes = this.input.prefixes;
        var resource = this.input.resourceURI;
        var property = this.input.value.property;
        var value = this.input.value.value;
        var unit = this.input.value.unit;
        var datatype = this.input.value.datatype;
        var hostURI = this.input.hostURI;
        var resourceURI = this.input.resourceURI;
        if (resourceURI == '?resource') {
            var pattern = "{ SELECT * WHERE { GRAPH ?g {" + this.input.pattern + "} }}";
        }
        else {
            var pattern = "{ SELECT * WHERE { GRAPH ?g {" + resourceURI + " ?p ?o} } LIMIT 1}";
        }
        var q = '';
        //Define prefixes
        for (var i in prefixes) {
            q += "PREFIX  " + prefixes[i].prefix + ": <" + prefixes[i].uri + "> \n";
        }
        q += "CONSTRUCT\n              {\n                " + resourceURI + " " + property + " ?propertyURI .\n                ?propertyURI seas:evaluation ?evaluationURI .\n                ?evaluationURI seas:evaluatedValue ?val ;\n                               prov:wasGeneratedAtTime ?now .\n              }\n             WHERE {\n              " + pattern + "\n              MINUS\n              { GRAPH ?g\n                { " + resourceURI + " " + property + "/seas:evaluation ?eval }\n              }\n              BIND(strdt(concat(str(" + value + "), \" " + unit + "\"), " + datatype + ") AS ?val)\n              BIND(REPLACE(STR(UUID()), \"urn:uuid:\", \"\") AS ?guid)\n              BIND(URI(CONCAT(\"" + hostURI + "\", \"/Property/\", ?guid)) AS ?propertyURI)\n              BIND(URI(CONCAT(\"" + hostURI + "\", \"/Evaluation/\", ?guid)) AS ?evaluationURI)\n              BIND(now() AS ?now)\n             }";
        if (this.err) {
            q = 'Error: ' + this.err;
        }
        return q;
    };
    //Update property
    SeasProp.prototype.putProp = function () {
        //Retrieve and process variables
        var prefixes = this.input.prefixes;
        var resource = this.input.resourceURI;
        var property = this.input.value.property;
        var value = this.input.value.value;
        var unit = this.input.value.unit;
        var datatype = this.input.value.datatype;
        var hostURI = this.input.hostURI;
        var pattern = this.input.pattern;
        var resourceURI = this.input.resourceURI;
        var q = '';
        //Define prefixes
        for (var i in prefixes) {
            q += "PREFIX  " + prefixes[i].prefix + ": <" + prefixes[i].uri + "> \n";
        }
        q += "CONSTRUCT\n              {\n                ?propertyURI seas:evaluation ?evaluationURI .\n                ?evaluationURI seas:evaluatedValue ?val ;\n                               prov:wasGeneratedAtTime ?now .\n              }\n             WHERE {\n              {SELECT ?propertyURI WHERE { \n                  GRAPH ?g {\n                      " + resourceURI + " " + property + " ?propertyURI . \n                      ?propertyURI seas:evaluation ?eval . \n";
        q += pattern ? pattern + '\n' : '\n';
        q += "} } GROUP BY ?propertyURI }\n              GRAPH ?g { " + resourceURI + " " + property + " ?propertyURI }\n              BIND(strdt(concat(str(" + value + "), \" " + unit + "\"), " + datatype + ") AS ?val)\n              BIND(REPLACE(STR(UUID()), \"urn:uuid:\", \"\") AS ?guid)\n              BIND(URI(CONCAT(\"" + hostURI + "\", \"/Evaluation/\", ?guid)) AS ?evaluationURI)\n              BIND(now() AS ?now)\n             }";
        if (this.err) {
            q = 'Error: ' + this.err;
        }
        return q;
    };
    return SeasProp;
}());
exports.SeasProp = SeasProp;
