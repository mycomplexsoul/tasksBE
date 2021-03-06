var MoGen = require("./MoGen");
var MoSQL = (function(MoGen){
    "use strict";    
    function list(predicate){
        /*
        predicate.page
        predicate.rows
        predicate.orderFields
            --order structure
        predicate.filter
            --subquery structure        
        */
    }

    function find(filter){
        /*
        filter -- subquery structure, returns array
        */
    }

    function findOne(filter){
        /*
        filter -- subquery structure, returns single record
        */
    }

    function insert(params) {
        /*
        params.<field>, each field must exist in model definition
        */
    }
    /**
     * Loads a file from file system and returns content as JSON object.
     */
    function loadJSON(file){
        let fs = require('fs');
        let obj = JSON.parse(fs.readFileSync(file + '.json', 'utf8'));
        return obj;
    }
    /**
     * Loads entity data by file name.
     */
    function loadEntityData(entityName){
        return loadJSON(entityName);
    }
    /**
     * Loads template for metadata for identified named cases for generation of code logic
     */
    function loadTemplates(){
        let template = loadJSON("template");
        template.getTemplate = function (name) {
            return getTemplate(this,name);
        };
        return template;
    }
    /**
     * Search for a given template name into the templates collection
     */
    function getTemplate(templates,name) {
        for (let i=0 ; i<templates.length; i++){
            if (templates[i].templateId === name){
                return templates[i];
            }
        }
        throw new Error(`can't find template ${name}`);
    }
    /**
     * Fills string left or right to complete a given length with some char.
     */
    function fillString(data,length,direction,fillChar){
        if(!fillChar){
            fillChar = " ";
        }
        if(!direction){
            direction = 1; // fill at right
        }
        let str = data + "";
        while(str.length < length){
            if (direction === 1){
                str += fillChar;
            } else {
                str = fillChar + str;
            }
        }
        return str;
    }
    /**
     * Returns formated date as specified in format or default if not provided.
     */
    function formatDate(date,format) {
        if (!format){
            format = "yyyy-MM-dd";
        }
        if (date === null){
            return null;
        }
        if (!(date instanceof Date)){
            date = new Date(date);
        }
        let day = date.getDate();
        let month = date.getMonth();
        let year = date.getFullYear();
        let hour = date.getHours();
        let min = date.getMinutes();
        let sec = date.getSeconds();

        let str = format.replace("yyyy",year)
            .replace("MM",fillString(month+1,2,-1,"0"))
            .replace("dd",fillString(day,2,-1,"0"))
            .replace("HH",fillString(hour,2,-1,"0"))
            .replace("mm",fillString(min,2,-1,"0"))
            .replace("ss",fillString(sec,2,-1,"0"))
            ;
        return str;
    }

    function escapeRegExp(str){
        return str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
    }

    function replaceAll(str, find, replace){
        return (str + '').replace(new RegExp(escapeRegExp(find), "g"), replace);
    }

    function parseSimpleQuoteForSQL(str){
        return replaceAll(str,"'","''");
    }

    /**
     * Returns an object with expanded metadata from templates and user definitions.
     * Capable of CRUD operations and value storing.
     * At the end, this returns an object with these capabilities
     * .fields
     * .permissions
     * .model
     * .db
     * .fields[n].value
     * .name
     * .tableName
     * .viewName
     * .plainDBValues
     * -- Methods
     * .createSQL()
     * .createPK()
     * .createViewSQL()
     * .toInsertSQL()
     * .toUpdateSQL(changes)
     * .toDeleteSQL()
     * .getPK()
     * .getValueFormattedForSQL(fieldName,dbType,value)
     * .getMetadataByEntityName(name)
     * .getMetadataByDatabaseName(dbName)
     * .setAll(data)
     * .setDBAll(data)
     */
    function createModel(entityName) {
        // entityName = "Catalog"

        // call entityName.json
        let obj = loadEntityData('templates/' + entityName);
        let template = loadTemplates();
        
        // create topModel
        let t = {};
        Object.assign(t,obj);
        t.fields = [];

        // expand permissionsTemplate if provided
        if (t.permissionsTemplate){
            t.permissions = template.getTemplate(t.permissionsTemplate).permissions;
        }

        // expand fields by template
        t.model = {};
        t.db = {};
        obj.fields.forEach(function(f,index) {
            let n = {} // empty model
            Object.assign(n,template.getTemplate("base")); //extends with base template
            if (f.templateId === "status"){ // if field is status, extend with integer template
                Object.assign(n,template.getTemplate("integer"));
            }
            Object.assign(n,template.getTemplate(f.templateId),f); // extend with template if provided for field
            Object.assign(n,template.getTemplate("order")); // extend with order template
            n.templateId = f.templateId; 
            f.order = f.order || index;
            if (f.order){
                n.gridOrder = f.order;
                n.orderOnNew = f.order;
                n.orderOnDetails = f.order;
                n.orderOnEdit = f.order;
                n.orderOnImport = f.order;
            }
            
            if (n.dbName[0] === "_"){
                n.dbName = obj.prefix + n.dbName;
            }

            if (n.linkedField[0] === "_"){
                n.linkedField = obj.prefix + n.linkedField;
            }

            if (f.templateId === "catalog"){ // extend with catalog template
                // copy from linkedField data
                let linkedField = t.fields.find((e) => e.dbName === n.linkedField);
                if (linkedField){
                    n.dbName = linkedField.dbName.replace("_ctg_","_txt_");
                    n.dbComment = linkedField.dbComment;
                    n.entName = f.entName ? f.entName : `Text${linkedField.entName}`;
                    n.displayName = f.displayName ? f.displayName : linkedField.displayName;
                    n.catalogId = f.catalogId ? f.catalogId : linkedField.catalogId;
                    n.allowNull = true;
                }
            }

            if (f.templateId === "table"){ // extend with table template for linked fields
                // copy from linkedField data
                let linkedField = t.fields.find((e) => e.dbName === n.linkedField);
                if (linkedField){
                    n.dbComment = linkedField.dbComment;
                    n.entName = f.entName ? f.entName : `Text${linkedField.entName}`;
                    n.displayName = f.displayName ? f.displayName : linkedField.displayName;
                    n.catalogId = f.catalogId ? f.catalogId : linkedField.catalogId;
                    n.allowNull = true;
                }
            }
            
            // initial value            
            switch(n.dbType){
                case "integer":
                case "long":
                case "double":
                    n.value = 0;
                    break;
                case "string":
                case "date":
                case "datetime":
                    n.value = null;
                    break;
            }

            // getter/setter
            t.plainDBValues = {};
            t.model[n.entName] = function (value) {
                if (value !== undefined){
                    n.value = value;
                } else {
                    return n.value;
                }
            };
            t.db[n.dbName] = function (value) {
                if (value !== undefined){
                    n.value = value;
                } else {
                    return n.value;
                }
            };

            t.fields.push(n);
        });        

        // expand any additional data
        t.tableName = obj.name.toLowerCase();
        t.viewName = "vi" + obj.name.toLowerCase();

        // add methods

        // create SQL
        t.createSQL = function(){
            let x = this;
            let sql = "";
            let dbType;
            
            x.fields.filter(function(f){
                return f.isTableField;
            }).forEach(function(f){
                switch(f.dbType){
                    case "integer":
                    case "long":
                    case "double":
                        dbType = `NUMERIC(${f.size},${f.decimal})`;
                        break;
                    case "string":
                        dbType = `VARCHAR(${f.size})`;
                        break;
                    case "date":
                        dbType = `DATE`;
                        break;
                    case "datetime":
                        dbType = `DATETIME`;
                        break;
                }
                sql = MoGen.concat(sql,", ") + `${f.dbName} ${dbType} ${f.allowNull ? "":"NOT NULL"}`;
            });

            sql = `create table ${x.tableName} (${sql})`;

            return sql;
        };

        t.createPK = function(){
            let x = this;
            let sql = "";
            let dbType;
            
            x.fields.forEach(function(f){
                if(f.isPK){
                    sql = MoGen.concat(sql,", ") + `${f.dbName}`;
                }
            });

            sql = `create unique index ${x.tableName}_pk on ${x.tableName} (${sql})`;

            return sql;
        }

        // create view SQL
        t.createViewSQL = function(){
            let x = this;
            let sql = "";
            let fields = "";
            let dbType;
            let containsJoinToSelf = x.view.filter(j => j.joinTable.toLowerCase().startsWith(x.tableName.toLowerCase()+' '));
            // create view {name} as select {fields} from {table} inner join ...
            
            x.fields.forEach(function(f){
                if (f.isTableField){
                    fields = MoGen.concat(fields,", ") + (containsJoinToSelf ? x.tableName + '.' : '') + f.dbName;
                } else {
                    if (f.originTable === "CATALOG"){
                        if (x.tableName !== "catalog"){
                            fields = MoGen.concat(fields,", ") + `(select ctg_name from catalog where ctg_id = '${f.catalogId}' and ctg_sequential = ${f.linkedField}) as ${f.dbName}`;
                        } else {
                            fields = MoGen.concat(fields,", ") + `(select catalog2.ctg_name from catalog catalog2 where ctg_id = '${f.catalogId}' and catalog2.ctg_sequential = catalog.${f.linkedField}) as ${f.dbName}`;
                        }
                    } else {
                        fields = MoGen.concat(fields,", ") + `(${f.linkedField}) as ${f.dbName}`;
                    }
                }
            });

            x.view.forEach(function(f){
                sql = MoGen.concat(sql," ") + `${f.joinType} JOIN ${f.joinTable} ON (${f.joinStatement})`;
            });

            sql = `create view ${x.viewName} as select ${fields} from ${x.tableName} ${sql}`;

            return sql;
        };

        // insert
        t.toInsertSQL = function () {
            var x = this;
            var sql = "", headers = "";
            var dateValue = null;

            x.fields.filter(function(f){
                return f.isTableField;
            }).forEach(function(f) {
                headers = MoGen.concat(headers,",") + f.dbName;
                if (f.value === null){
                    sql = MoGen.concat(sql,",") + `null`;
                } else if (["integer","long","double"].indexOf(f.dbType) !== -1){
                    sql = MoGen.concat(sql,",") + f.value;
                } else if (f.dbType === "date"){
                    sql = MoGen.concat(sql,",") + `'${formatDate(f.value)}'`;
                } else if (f.dbType === "datetime"){
                    sql = MoGen.concat(sql,",") + `'${formatDate(f.value,"yyyy-MM-dd HH:mm:ss")}'`;
                } else {
                    sql = MoGen.concat(sql,",") + `'${parseSimpleQuoteForSQL(f.value)}'`;
                }
            });

            sql = "insert into " + x.tableName + " (" + headers + ") values (" + sql + ")";
            return sql;
        };

        t.datesAreEqual = function(date1, date2){
            return (new Date(date1)).getTime() === (new Date(date2)).getTime();
        };

        // changes based on other object
        t.changesWith = function (otherObj) {
            var x = this;
            let changes = [];
            var n;
            if (otherObj !== null && typeof otherObj === "object"){
                // other object with different values on some members
                Object.keys(x.db).forEach(dbName => {
                    n = x.getMetadataByDatabaseName(dbName);
                    if (!n.isPK && otherObj.db[dbName]()){
                        if (n.dbType === 'date' || n.dbType === 'datetime'){
                            if (!x.datesAreEqual(otherObj.db[dbName](), x.db[dbName]())){ // change value diff from current
                                changes.push({
                                    dbName: n.dbName
                                    , value: x.getValueFormattedForSQL(n.entName,n.dbType,otherObj.db[dbName]())
                                });
                            }
                        } else {
                            if (otherObj.db[dbName]() !== x.db[dbName]()){ // change value diff from current
                                changes.push({
                                    dbName: n.dbName
                                    , value: x.getValueFormattedForSQL(n.entName,n.dbType,otherObj.db[dbName]())
                                });
                            }
                        }
                    }
                });
            }
            return changes;
        };

        // update
        t.toUpdateSQL = function (changes) { // changes is either an Array of changes or an Object with same PK and different values on members
            var x = this;
            var sql = "", sqlChanges = "";
            var pkFields = x.getPK();
            var n;
            // iterate changes: entName, entNameOrig, value
            if (Array.isArray(changes)){
                changes.forEach(function(ch){
                    n = x.getMetadataByEntityName(ch.entName);
                    if (n.dbType === 'date' || n.dbType === 'datetime'){
                        if (!x.datesAreEqual(ch.value, x.model[ch.entName]())){ // change value diff from current
                            console.log(`changes detection, field ${ch.entName}, previous: ${x.model[ch.entName]()}, newValue: ${ch.value}`);
                            sqlChanges = MoGen.concat(sqlChanges,", ") + n.dbName + " = " + x.getValueFormattedForSQL(n.entName,n.dbType,ch.value);
                        }
                    } else {
                        if (ch.value !== x.model[ch.entName]()){ // change value diff from current
                            console.log(`changes detection, field ${ch.entName}, previous: ${x.model[ch.entName]()}, newValue: ${ch.value}`);
                            sqlChanges = MoGen.concat(sqlChanges,", ") + n.dbName + " = " + x.getValueFormattedForSQL(n.entName,n.dbType,ch.value);
                        }
                    }
                });
            }
            if (changes !== null && typeof changes === "object"){
                // other object with different values on some members
                Object.keys(x.db).forEach(dbName => {
                    n = x.getMetadataByDatabaseName(dbName);
                    if (!n.isPK/* && changes.db[dbName]()*/){
                        if (n.dbType === 'date' || n.dbType === 'datetime'){
                            if (!x.datesAreEqual(changes.db[dbName](), x.db[dbName]())){ // change value diff from current
                                console.log(`changes detection, field ${dbName}, previous: ${new Date(x.db[dbName]())}, newValue: ${new Date(changes.db[dbName]())}`);
                                sqlChanges = MoGen.concat(sqlChanges,", ") + n.dbName + " = " + x.getValueFormattedForSQL(n.entName,n.dbType,changes.db[dbName]()); 
                            }
                        } else {
                            if (changes.db[dbName]() !== x.db[dbName]()){ // change value diff from current
                                console.log(`changes detection, field ${dbName}, previous: ${x.db[dbName]()}, newValue: ${changes.db[dbName]()}`);
                                sqlChanges = MoGen.concat(sqlChanges,", ") + n.dbName + " = " + x.getValueFormattedForSQL(n.entName,n.dbType,changes.db[dbName]()); 
                            }
                        }
                    }
                });
            }

            // iterate PKs
            pkFields.forEach(function(f) {
                if (["integer","long","double"].indexOf(f.dbType) !== -1){
                    sql = MoGen.concat(sql," and ") + `${f.dbName} = ${f.value}`;
                } else if (f.dbType === "date"){
                    sql = MoGen.concat(sql,",") + `${f.dbName} = '${formatDate(f.value)}'`;
                } else if (f.dbType === "datetime"){
                    sql = MoGen.concat(sql,",") + `${f.dbName} = '${formatDate(f.value,"yyyy-MM-dd HH:mm:ss")}'`;
                } else {
                    sql = MoGen.concat(sql,",") + `${f.dbName} = '${parseSimpleQuoteForSQL(f.value)}'`;
                }
            });

            sql = `update ${x.tableName} set ${sqlChanges} where ${sql}`;
            return sql;
        };


        // delete
        t.toDeleteSQL = function () {
            var x = this;
            var sql = "";
            var pkFields = x.getPK();

            pkFields.forEach(function(f) {
                if (["integer","long","double"].indexOf(f.dbType) !== -1){
                    sql = MoGen.concat(sql," and ") + `${f.dbName} = ${f.value}`;
                } else if (f.dbType === "date"){
                    sql = MoGen.concat(sql,",") + `${f.dbName} = '${formatDate(f.value)}'`;
                } else if (f.dbType === "datetime"){
                    sql = MoGen.concat(sql,",") + `${f.dbName} = '${formatDate(f.value,"yyyy-MM-dd HH:mm:ss")}'`;
                } else {
                    sql = MoGen.concat(sql,",") + `${f.dbName} = '${f.value}'`;
                }
            });

            sql = "delete from " + x.tableName + " where (" + sql + ")";
            return sql;
        };

        // get PK fields
        t.getPK = function(){
            return this.fields.filter((e) => {
                return e.isPK;
            });
        };

        // get value formatted for sql
        t.getValueFormattedForSQL = function(fieldName,dbType,value){
            // , 'test'
            let sql = "";
            if (["integer","long","double"].indexOf(dbType) !== -1){
                sql = MoGen.concat(sql,",") + value;
            } else if (dbType === "date"){
                sql = MoGen.concat(sql,",") + `'${formatDate(value)}'`;
            } else if (dbType === "datetime"){
                sql = MoGen.concat(sql,",") + `'${formatDate(value,"yyyy-MM-dd HH:mm:ss")}'`;
            } else {
                sql = MoGen.concat(sql,",") + `'${parseSimpleQuoteForSQL(value)}'`;
            }
            return sql;
        }

        // get field metadata by name
        t.getMetadataByEntityName = function(name){
            let x = this;
            let found = x.fields.filter((e) => {
                return e.entName === name;
            });
            return found[0];
        };
        
        // get field metadata by dbName
        t.getMetadataByDatabaseName = function(dbName){
            let x = this;
            let found = x.fields.filter((e) => {
                return e.dbName === dbName;
            });
            return found[0];
        };

        // constructor
        t.setAll = function(data){
            Object.keys(data).forEach(k => {
                t.model[k](data[k]);
            });
            return t;
        };
        
        t.setDBAll = function(data){
            Object.keys(t.db).forEach(k => {
                t.db[k](data[k]);
            });
            return t;
        };

        t.getRecordNameFields = function(){
            return t.fields.filter(f => f.isRecordName);
        };

        // method to return a name that identifies the record
        t.recordName = function(){
            let name = '';
            t.getRecordNameFields().forEach(f => {
                name = MoGen.concat(name,' / ') + f.value;
            });
            return name;
        };

        /**
         * Returns the SQL select query for the view.
         * @return {string} SQL select query for the view.
         */
        t.sqlList = function(){
            return `select * from ${t.viewName}`;
        }

        /**
         * Returns the SQL select query for getting this record with its Primary Key from database.
         * @return {string} SQL select query with PK for getting this single record from DB.
         */
        t.sqlSelect = function(){
            let sql = '';
            t.getPK().forEach(f => {
                if (["integer","long","double"].indexOf(f.dbType) !== -1){
                    sql = MoGen.concat(sql," and ") + `${f.dbName} = ${f.value}`;
                } else if (f.dbType === "date"){
                    sql = MoGen.concat(sql,",") + `${f.dbName} = '${formatDate(f.value)}'`;
                } else if (f.dbType === "datetime"){
                    sql = MoGen.concat(sql,",") + `${f.dbName} = '${formatDate(f.value,"yyyy-MM-dd HH:mm:ss")}'`;
                } else {
                    sql = MoGen.concat(sql,",") + `${f.dbName} = '${f.value}'`;
                }
            });
            return `${t.sqlList()} where ${sql}`;
        }

        /**
         * Returns the SQL select query for getting this record with its Primary Key as placeholders from database.
         * @return {string} SQL select query with PK for getting a single record (with placeholders) from DB.
         */
        t.sqlSelectGeneric = function(){
            let sql = '';
            let counter = 0;
            t.getPK().forEach(f => {
                if (["integer","long","double"].indexOf(f.dbType) !== -1){
                    sql = MoGen.concat(sql," and ") + `${f.dbName} = {${counter++}}`;
                } else if (f.dbType === "date"){
                    sql = MoGen.concat(sql,",") + `${f.dbName} = '{${counter++}}'`;
                } else if (f.dbType === "datetime"){
                    sql = MoGen.concat(sql,",") + `${f.dbName} = '{${counter++}}'`;
                } else {
                    sql = MoGen.concat(sql,",") + `${f.dbName} = '{${counter++}}'`;
                }
            });
            return `${t.sqlList()} where ${sql}`;
        }

        return t;
    }

    return {
        list: list
        , createModel: createModel
    };
})(MoGen);
module.exports = MoSQL;