"use strict";
var MoScaffold = (function(){
    let _model;
    /**
     * Initializes the module with model data
     * @param {object} model string to validate its contents, it decides if it will be a concatenation
     */
    function init(model){
        _model = model;
    };

    /**
     * Getter for the model used by this module
     */
    function model(){
        return _model;
    }

    function generateTypeFile(){
        let str = '';
        let entityName = this._model.entityName;
        const types = {
            integer: 'number'
            , long: 'number'
            , double: 'number'
            , string: 'string'
            , date: 'Date'
            , datetime: 'Date'
        }

        str += `export class ${entityName} {`;
        this._model.fields.forEach(f => {
            str += `public ${f.dbName}: ${f.dbType}`;
        });
        str += `}`
    }

    return {
        init
        , model
    };
})();
module.exports = MoScaffold;