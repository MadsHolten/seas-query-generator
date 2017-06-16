import { ICalc } from "./interfaces";
import * as _ from "underscore";
import * as _s from "underscore.string";

export class SeasCalc {

    private input: ICalc;

    constructor(input: ICalc) {
        this.input = input;
        //Add predefined prefixes
        var prefixes: string[] = _.pluck(this.input.prefixes, 'prefix');
        if(!this.input.prefixes){this.input.prefixes = []};
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
        this.input.hostURI ? this.input.hostURI.replace(/\/$/, "") : null;
        //datatype defaults to xsd:string
        if(this.input.result){
            this.input.result.datatype = this.input.result.datatype ? this.input.result.datatype : 'xsd:string';
        }
    }

    //Create calculation where it doesn't already exist
    postCalc(): string{
        //Define variables
        var hostURI = this.input.hostURI; //The host URI
        var calc = this.input.result.calc; //The calculation to perform
        var args = this.input.args; //Arguments
        var property = this.input.result.property; //New property
        var resourceURI = this.input.resourceURI; //optional
        var unit = this.input.result.unit;
        var datatype = this.input.result.datatype;
        var resource = !resourceURI ? '?resource' : '<'+resourceURI+'>';
        var prefixes = this.input.prefixes;

        for(var i in args){
            if(!args[i].targetPath){
                //Add '?resource' as target path if none is given
                args[i].targetPath = '?resource';
            }else{
                //Clean target path if given
                var str: string = args[i].targetPath;
                str = _s.clean(str); //Remove unnecessary spaces etc.
                var target = _s.strRightBack(str,'?').replace(/ /g,'').replace('.',''); //Get target variable name
                str = _s.endsWith(str,".") ? str+' ' : str+' . '; //Make sure it ends with a dot and a space
                args[i].targetPath = `${str}?${target} `;
            }
            if(resourceURI){
                //Replace '?resource' with the actual URI if one is defined
                var newResource = `<${resourceURI}>`
                args[i].targetPath = args[i].targetPath.replace('?resource',newResource);
            }
        }
        var q: string = '';
        //Define prefixes
        for(var i in prefixes){
            q+= `PREFIX  ${prefixes[i].prefix}: <${prefixes[i].uri}> \n`;
        }
                      
        q+= `CONSTRUCT 
            {
                ${resource} ${property} ?propertyURI .
                ?propertyURI seas:evaluation ?evaluationURI .
                ?evaluationURI seas:evaluatedValue ?res ;
                                prov:wasGeneratedAtTime ?now ;
                                seas:calculation "${calc}"^^xsd:string ;
                                prov:wasDerivedFrom _:c0 .
                _:c0 a rdf:Seq . \n`;

        for(var i in args){
            var _i = Number(i)+1;
            q+= `_:c0 rdf:_${_i} ?eval${_i} . \n`;
        }

        q+= `} WHERE {`;

        // Get latest evaluation of each argument
        for (var i in args){
            var _i = Number(i)+1;
            q+= `{  SELECT `;
            q+= !resourceURI ? '?resource ' : '';
            q+= `(MAX(?_t${_i}) AS ?t${_i}) 
                    WHERE 
                        { GRAPH ?g
                            { ${args[i].targetPath} ${args[i].property}/seas:evaluation [ prov:wasGeneratedAtTime  ?_t${_i} ] }
                        } \n`;
            q+= !resourceURI ? 'GROUP BY ?resource' : '';
            q+= `} \n`;
        }

        //No previous calculations must exist
        q+= `MINUS
             { GRAPH ?g
                { ${resource} ${property}/seas:evaluation [ prov:wasGeneratedAtTime  ?_tc ] }
             }`;

        q+= `GRAPH ?g {`

        for (var i in args){
            var _i = Number(i)+1;

            q+= `${args[i].targetPath} ${args[i].property}/seas:evaluation ?eval${_i} .
                      ?eval${_i}  prov:wasGeneratedAtTime ?t${_i} ;
                                 seas:evaluatedValue     ?v${_i} .
                 BIND(xsd:decimal(strbefore(str(?v${_i}), " ")) AS ?arg${_i}) `; //NB! might give problems with non-ucum
        }

        //NB! BIND(URI(CONCAT("${hostURI}", "/Property/", STRUUID())) AS ?propertyURI) should work - bug in Stardog
        q+= `BIND((${calc}) AS ?_res)
             BIND(strdt(concat(str(?_res), " ${unit}"), ${datatype}) AS ?res)
             BIND(REPLACE(STR(UUID()), "urn:uuid:", "") AS ?guid)
             BIND(URI(CONCAT("${hostURI}", "/Property/", ?guid)) AS ?propertyURI)
             BIND(URI(CONCAT("${hostURI}", "/Evaluation/", ?guid)) AS ?evaluationURI)
             BIND(now() AS ?now)}}`;

        return q;
    }

    //Update calculation where an argument has changed
    putCalc(): string{
        //Retrieve and process variables
        var hostURI = this.input.hostURI.replace(/\/$/, ""); //The host URI (remove backslash at end)
        var calc = this.input.result.calc; //The calculation to perform
        var args = this.input.args; //Arguments
        var property = this.input.result.property; //New property
        var resourceURI = this.input.resourceURI; //optional
        var unit = this.input.result.unit;  //optional
        var datatype = this.input.result.datatype ? this.input.result.datatype : 'xsd:string';  //optional - defaults to xsd:string
        var resource = !resourceURI ? '?resource' : '<'+resourceURI+'>';
        var prefixes = this.input.prefixes;

        for(var i in args){
            if(!args[i].targetPath){
                //Add '?resource' as target path if none is given
                args[i].targetPath = '?resource';
            }else{
                //Clean target path if given
                var str: string = args[i].targetPath;
                str = _s.clean(str); //Remove unnecessary spaces etc.
                var target = _s.strRightBack(str,'?').replace(/ /g,'').replace('.',''); //Get target variable name
                str = _s.endsWith(str,".") ? str+' ' : str+' . '; //Make sure it ends with a dot and a space
                args[i].targetPath = `${str}?${target} `;
            }
            if(resourceURI){
                //Replace '?resource' with the actual URI if one is defined
                var newResource = `<${resourceURI}>`
                args[i].targetPath = args[i].targetPath.replace('?resource',newResource);
            }
        }
        var q: string = '';
        //Define prefixes
        for(var i in prefixes){
            q+= `PREFIX  ${prefixes[i].prefix}: <${prefixes[i].uri}> \n`;
        }
                      
        q+= `CONSTRUCT 
            {
                ?calculatedProperty seas:evaluation ?evaluationURI .
                ?evaluationURI seas:evaluatedValue ?res ;
                                prov:wasGeneratedAtTime ?now ;
                                seas:calculation "${calc}"^^${datatype} ;
                                prov:wasDerivedFrom _:c0 .
                _:c0 a rdf:Seq . \n`;

        for(var i in args){
            var _i = Number(i)+1;
            q+= `_:c0 rdf:_${_i} ?eval${_i} . \n`;
        }

        q+= `} WHERE {`;

        //Get the time of the latest calculation
        q+= `{ SELECT  ?calculatedProperty (MAX(?_tc) AS ?tc)
                WHERE
                    { GRAPH ?g
                        { ?resource ${property}/seas:evaluation _:b0 .
                        _:b0 ^seas:evaluation ?calculatedProperty .
                        _:b0  prov:wasGeneratedAtTime  ?_tc
                        }
                    }
                GROUP BY ?calculatedProperty
             }`;
        
        //Get data about calculation
        q+= `GRAPH ?gi {
                ?calculatedProperty seas:evaluation 
                                        [ prov:wasGeneratedAtTime ?tc ;
                                          seas:calculation ?calc ;
                                          seas:evaluatedValue ?old_res ;
                                          prov:wasDerivedFrom+ [?position ?old_arg] ] .
             }`;
        
        //Get the time of the latest input values
        q+= `{ SELECT  ?old_arg (MAX(?_t) AS ?t)
                WHERE
                    { GRAPH ?g
                        { ?old_arg ^seas:evaluation/seas:evaluation ?arg .
                            ?arg  prov:wasGeneratedAtTime  ?_t
                        }
                    }
                GROUP BY ?old_arg
             }`;

        //Get the values of these arguments
        q+= `GRAPH ?g {
                ?old_arg ^seas:evaluation/seas:evaluation ?new_arg .
                ?new_arg prov:wasGeneratedAtTime  ?t ;
                         seas:evaluatedValue ?new_arg_val ;
            }`;

        //Should put arguments in separate variables based on list position
        //Even possible?

        q+= `BIND(str(540) AS ?_res)
             BIND(datatype(?old_res) AS ?datatype)
             BIND(strafter(str(?old_res), " ") AS ?unit)
             BIND(strdt(concat(str(?_res), " ", ?unit), ?datatype) AS ?res)
             BIND(REPLACE(STR(UUID()), "urn:uuid:", "") AS ?guid)
             BIND(URI(CONCAT("${hostURI}", "/Evaluation/", ?guid)) AS ?evaluationURI)
             BIND(now() AS ?now)`;
        q+= `}`

        return q;
    }
    //List outdated calculations
    //Checks either generally or for a specific resource
    //Returns the following:
    listOutdated(): string{
        var prefixes = this.input.prefixes;
        var resourceURI = this.input.resourceURI;
        var evalPath: string = '';
        if(resourceURI){
            evalPath = `<${resourceURI}> ?hasProp ?propertyURI . `;
        }
        var q = '';
        //Define prefixes
        for(var i in prefixes){
            q+= `PREFIX  ${prefixes[i].prefix}: <${prefixes[i].uri}> \n`;
        }
        q+= `SELECT ?propertyURI ?calc_time ?arg_last_update ?new_arg ?old_val ?new_val 
             WHERE {`;
        //Get the time of the latest calculation
        //Property has seas:evaluation that is derived from something else
        q+= `{ SELECT  ?propertyURI (MAX(?tc) AS ?calc_time)
                WHERE
                    { GRAPH ?g
                        { ${evalPath}
                          ?propertyURI seas:evaluation _:b0 .
                          _:b0 prov:wasDerivedFrom+ [?p ?o] .
                          _:b0 prov:wasGeneratedAtTime ?tc .
                        }
                    }
                GROUP BY ?propertyURI
             }`;
        //Get data about calculation
        q+= `GRAPH ?g
                { ${evalPath}
                  ?propertyURI seas:evaluation _:b1 .
                  _:b1 prov:wasDerivedFrom+ [?position ?old_arg] .
                  _:b1 prov:wasGeneratedAtTime ?calc_time .
                  _:b1 seas:evaluatedValue ?old_val .
                }`;
        //Get the time of the latest input values
        q+= `{ SELECT  ?old_arg (MAX(?ta) AS ?arg_last_update)
                WHERE
                    { GRAPH ?g
                        { ?old_arg ^seas:evaluation/seas:evaluation ?arg .
                          ?arg prov:wasGeneratedAtTime ?ta .
                        }
                    }
                GROUP BY ?old_arg
             }`;
        //Get argument values
        q+= `GRAPH ?g
                {
                  ?old_arg ^seas:evaluation/seas:evaluation ?new_arg .
                  ?new_arg prov:wasGeneratedAtTime  ?arg_last_update ;
                           seas:evaluatedValue ?new_val .
                }`;
        //Filter to only show outdated calculations
        q+= `FILTER(?arg_last_update > ?calc_time) }`;
        
        return q;
    }

}