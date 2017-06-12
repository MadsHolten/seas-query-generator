import { ICalc } from "./interface";
import * as _s from "underscore.string";

export class SeasCalc {

    private input: ICalc;

    constructor(input: ICalc) {
        this.input = input;
    }

    calculateForAll(){
        var propertyURI = !this.input.propertyURI ? 'http://propertyURI' : this.input.propertyURI;
        var evaluationURI = !this.input.evaluationURI ? 'http://evaluationURI' : this.input.evaluationURI;
        
        for(var i in this.input.args){
            if(!this.input.args[i].targetPath){
                this.input.args[i].targetPath = '?resource';
            }else{
                var str: string = this.input.args[i].targetPath;
                str = _s.clean(str); //Remove unnecessary spaces etc.
                var target = _s.strRightBack(str,'?').replace(/ /g,'').replace('.',''); //Get target variable name
                str = _s.endsWith(str,".") ? str+' ' : str+' . '; //Make sure it ends with a dot and a space
                this.input.args[i].targetPath = `${str}?${target} `;
            }
        }

        var q: string = `PREFIX  xsd:  <http://www.w3.org/2001/XMLSchema#>
                        PREFIX  seas: <https://w3id.org/seas/>
                        PREFIX  prov: <http://www.w3.org/ns/prov#>
                        PREFIX  cdt:  <http://w3id.org/lindt/custom_datatypes#>
                        PREFIX  rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>

                        CONSTRUCT 
                        { 
                            ?resource seas:temperatureDifference <${propertyURI}> . 
                            <${propertyURI}> seas:evaluation <${evaluationURI}> .
                            <${evaluationURI}> seas:evaluatedValue ?res ;
                                            prov:wasGeneratedAtTime ?now ;
                                            seas:calculation "${this.input.calc}"^^xsd:string ;
                                            prov:derivedFrom _:c0 .
                            _:c0 a rdf:Seq . `;

        for(var i in this.input.args){
            var _i = Number(i)+1;
            q+= `_:c0 rdf:_${_i} ?eval${_i} . `;
        }

        q+= `} WHERE {`;

        for (var i in this.input.args){
            var _i = Number(i)+1;
            var resource = this.input.args[i].targetPath;
            var property = this.input.args[i].property;

            q+= `{  SELECT  ?resource (MAX(?_t${_i}) AS ?t${_i}) 
                    WHERE 
                        { GRAPH ?g
                            { ${resource} ${property}/seas:evaluation [ prov:wasGeneratedAtTime  ?_t${_i} ] }
                        }
                        GROUP BY ?resource
                 }`;
        }

        q+= `GRAPH ?g {`

        for (var i in this.input.args){
            var _i = Number(i)+1;
            var resource = this.input.args[i].targetPath;
            var property = this.input.args[i].property;

            q+= `${resource} ${property}/seas:evaluation ?eval${_i} .
                      ?eval${_i}  prov:wasGeneratedAtTime ?t${_i} ;
                                 seas:evaluatedValue     ?_v${_i} .
                 BIND(xsd:decimal(strbefore(str(?_v${_i}), " ")) AS ?arg${_i}) `;
        }

        q+= `BIND((${this.input.calc}) AS ?_res)
             BIND(strdt(concat(str(?_res), " ${this.input.unit}"), cdt:ucum) AS ?res)
             BIND(now() AS ?now)}}`;

        q = q.replace(/ +(?= )/g,''); //remove surplus spaces from query string

        return q;
    }

}