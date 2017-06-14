import { IProp } from "./interfaces";
import * as _ from "underscore";
import * as _s from "underscore.string";

export class SeasProp {
    private input: IProp;
    private err: string;

    constructor(input: IProp) {
        this.input = input;
        //Add predefined prefixes
        var prefixes: string[] = _.pluck(this.input.prefixes, 'prefix');
        if(!_.contains(prefixes, 'rdf')){
            this.input.prefixes.push({prefix: 'rdf', uri: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#'});
        }
        if(!_.contains(prefixes, 'xsd')){
            this.input.prefixes.push({prefix: 'xsd', uri: 'http://www.w3.org/2001/XMLSchema#'});
        }
        if(!_.contains(prefixes, 'seas')){
            this.input.prefixes.push({prefix: 'seas', uri: 'https://w3id.org/seas/'});
        }
        if(!_.contains(prefixes, 'prov')){
            this.input.prefixes.push({prefix: 'prov', uri: 'http://www.w3.org/ns/prov#'});
        }
        //Remove backslash at end of hostURI
        this.input.hostURI.replace(/\/$/, "");
        //datatype defaults to xsd:string
        this.input.value.datatype = this.input.value.datatype ? this.input.value.datatype : 'xsd:string';
        //If no resource URI is specified, some pattern must exist
        if(!this.input.resourceURI){
            if(!this.input.pattern){
                this.err = "When no resourceURI is specified a pattern must exist!";
            }else{
                this.input.resourceURI = '?resource';
                //Clean pattern
                var str: string = this.input.pattern;
                str = _s.clean(str); //Remove unnecessary spaces etc.
                str = _s.endsWith(str,".") ? str+' ' : str+' . '; //Make sure it ends with a dot and a space
                this.input.pattern = str;
            }
        }else{
            this.input.resourceURI = `<${this.input.resourceURI}>`;
        }
    }

    //Create property where it doesn't already exist
    postProp(): string{
        //Retrieve and process variables
        var prefixes = this.input.prefixes;
        var resource = this.input.resourceURI;
        var property = this.input.value.property;
        var value = this.input.value.value;
        var unit = this.input.value.unit;
        var datatype = this.input.value.datatype;
        var hostURI = this.input.hostURI;
        var resourceURI = this.input.resourceURI;
        if(resourceURI == '?resource'){
            var pattern = `{ SELECT * WHERE { GRAPH ?g {${this.input.pattern}} }}`;
        }else{
            var pattern = `{ SELECT * WHERE { GRAPH ?g {${resourceURI} ?p ?o} } LIMIT 1}`;
        }

        var q: string = '';
        //Define prefixes
        for(var i in prefixes){
            q+= `PREFIX  ${prefixes[i].prefix}: <${prefixes[i].uri}> \n`;
        }

        q+= `CONSTRUCT
              {
                ${resourceURI} ${property} ?propertyURI .
                ?propertyURI seas:evaluation ?evaluationURI .
                ?evaluationURI seas:evaluatedValue ?val ;
                               prov:wasGeneratedAtTime ?now .
              }
             WHERE {
              ${pattern}
              MINUS
              { GRAPH ?g
                { ${resourceURI} ${property}/seas:evaluation ?eval }
              }
              BIND(strdt(concat(str(${value}), " ${unit}"), ${datatype}) AS ?val)
              BIND(REPLACE(STR(UUID()), "urn:uuid:", "") AS ?guid)
              BIND(URI(CONCAT("${hostURI}", "/Property/", ?guid)) AS ?propertyURI)
              BIND(URI(CONCAT("${hostURI}", "/Evaluation/", ?guid)) AS ?evaluationURI)
              BIND(now() AS ?now)
             }`
        if(this.err){q = 'Error: '+this.err;}
        return q;
    }

    //Update property
    putProp(): string{
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

        var q: string = '';
        //Define prefixes
        for(var i in prefixes){
            q+= `PREFIX  ${prefixes[i].prefix}: <${prefixes[i].uri}> \n`;
        }

        //Only makes an update if the value is different from the last evaluation
        q+= `CONSTRUCT
              {
                ?propertyURI seas:evaluation ?evaluationURI .
                ?evaluationURI seas:evaluatedValue ?val ;
                               prov:wasGeneratedAtTime ?now .
              }
             WHERE {
              {SELECT ?propertyURI (MAX(?_t) AS ?t) WHERE { 
                  GRAPH ?g {
                      ${resourceURI} ${property} ?propertyURI . 
                      ?propertyURI seas:evaluation ?eval . 
                      ?eval prov:wasGeneratedAtTime ?_t . \n`;
        q+= pattern ? pattern+'\n' : '\n';
        q+=  `} } GROUP BY ?propertyURI }
              GRAPH ?g { 
                  ${resourceURI} ${property} ?propertyURI .
                  ?propertyURI seas:evaluation [ prov:wasGeneratedAtTime ?t ;
                                                 seas:evaluatedValue ?old_val ] .
                  FILTER(strbefore(str(?old_val), " ") != str(${value}))
              }
              BIND(strdt(concat(str(${value}), " ${unit}"), ${datatype}) AS ?val)
              BIND(REPLACE(STR(UUID()), "urn:uuid:", "") AS ?guid)
              BIND(URI(CONCAT("${hostURI}", "/Evaluation/", ?guid)) AS ?evaluationURI)
              BIND(now() AS ?now)
             }`
        if(this.err){q = 'Error: '+this.err;}
        return q;
    }
}