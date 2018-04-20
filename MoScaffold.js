"use strict";
const fs = require('fs');
let MoScaffold = (function(){
    let _model;
    const tab = '\t';
    const line = '\n';
    const types = {
        integer: 'number'
        , long: 'number'
        , double: 'number'
        , string: 'string'
        , date: 'Date'
        , datetime: 'Date'
    };

    /**
     * Initializes the module with model data
     * @param {object} model string to validate its contents, it decides if it will be a concatenation
     */
    function init(model){
        this._model = model;
    };

    /**
     * Getter for the model used by this module
     */
    function model(){
        return this._model;
    }

    function saveToFile(filename, contents){
        fs.writeFile(filename, contents, function(err) {
            if (err) {
                return console.log(err);
            }
            console.log(`The file ${filename} was saved!`);
        });
    }

    function generateTypeFile(){
        let str = '';
        const entityName = this._model.name;

        str += `export class ${entityName} {`;
        let flagForViewFields = true;
        this._model.fields.forEach(f => {
            if (!f.isTableField && flagForViewFields) {
                flagForViewFields = false;
                str += line;
            }
            str += line + tab + `public ${f.dbName}: ${types[f.dbType]};`;
        });
        
        // constructor
        str += line;
        str += line + tab + `constructor(base?: any){`;
        str += line + tab + tab + `if (base !== undefined){`;
        flagForViewFields = true;
        this._model.fields.forEach(f => {
            if (!f.isTableField && flagForViewFields) {
                flagForViewFields = false;
                str += line;
            }
            str += line + tab + tab + tab + `this.${f.dbName} = base.${f.dbName};`;
        });
        str += line + tab + tab + `}`;
        str += line + tab + `}`;
        str += line + `}`;

        // write file
        saveToFile(`${entityName}.ts`, str);
    }

    function generateAPIFile(){
        let str = '';
        const entityName = this._model.name;
        const pkFields = this._model.fields.filter(f => f.isPK);

        str += '"use strict";';
        str += line + 'let MoSQL = require("../MoSQL.js");';
        str += line + 'let baseAPI = require("./api.js");';
        str += line;
        str += line + 'let API = (function(MoSQL, baseAPI){';
        str += line + tab + `let config = {`;
        str += line + tab + tab + `tableName: '${this._model.tableName}'`;
        str += line + tab + tab + `, modelName: '${entityName}'`;
        str += line + tab + tab + `, recordName: (r) => \`${pkFields.map(f => `\${${f.dbName}}`).join(' / ')}\``; // TODO: read external config json to override
        str += line + tab + tab + `, pkFields: [${pkFields.map(f => `'${f.dbName}'`).join(', ')}]`; // this needs changes on api.js
        str += line + tab + tab + `, recordRef: '${entityName}'`;
        str += line + tab + tab + `, sql: {`;
        str += line + tab + tab + tab + `list: 'select * from ${this._model.viewName}'`;
        str += line + tab + tab + tab + `, exist: 'select * from ${this._model.viewName} where ${pkFields.map(f => `${f.dbName} = {{${f.dbName}}}`).join(' and ')}'`; // TODO: this needs changes on api.js
        str += line + tab + tab + `}`;
        str += line + tab + `};`;
        
        str += line;
        str += line + tab + `let list = function(node) {`;
        str += line + tab + tab + `baseAPI.api('list', node, config);`;
        str += line + tab + `}`;

        str += line;
        str += line + tab + `let create = function(node) {`;
        str += line + tab + tab + `baseAPI.api('create', node, config);`;
        str += line + tab + `}`;

        str += line;
        str += line + tab + `let update = function(node) {`;
        str += line + tab + tab + `baseAPI.api('update', node, config);`;
        str += line + tab + `}`;

        str += line;
        str += line + tab + `return {`;
        str += line + tab + tab + `list`;
        str += line + tab + tab + `, create`;
        str += line + tab + tab + `, update`;
        str += line + tab + `}`;
        str += line + `})(MoSQL, baseAPI);`;
        str += line + `module.exports = API`;

        saveToFile(`${entityName}API.js`, str);
    }

    return {
        init
        , model
        , generateTypeFile
        , generateAPIFile
    };
})();
module.exports = MoScaffold;