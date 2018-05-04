"use strict";
let MoSQL = require("../MoSQL.js");

let API = (function(MoSQL){
    let model;
    let setModel = (modelName) => {
        model = MoSQL.createModel(modelName);
    };
    let list = function(node) {
        let connection = node.ConnectionService.getConnection(node.mysql);
        let sql = `select * from ${model.viewName}`;
        let data = [];

        return connection.runSql(sql).then((response) => {
            if (!response.err){
                data = response.rows;
            }
            connection.close();
            return data;
        });
    };

    let create = function(node) {
        let sql = "";
        if (node.post){
            let connection = node.ConnectionService.getConnection(node.mysql);
            model.setDBAll(node.post);
            sql = model.toInsertSQL();
            //console.log('insert task',sql);
            let strName = model.recordName();
            return connection.runSql(model.sqlSelect()).then((response) => {
                if (response.err){
                    //console.log(`got this error trying to validate if this ${strName} already exists`,err);
                    return false;
                }

                if (response.rows.length > 0){
                    //console.log(`${model.tableName} already exists: ${strName}`);
                    return false;
                } else {
                    return response;
                }
            }).then((response) => {
                if (!response){
                    return {operationOk: false, message: `${model.tableName} already exists. id: ${strName}`};
                }

                return connection.runSql(sql,(responseCreate) => {
                    connection.close();
                    if (responseCreate.err){
                        return {operationOk: false, message: `Error on ${model.tableName} creation. id: ${strName}`};
                    } else {
                        return {operationOk: true, message: `${model.tableName} created correctly. id: ${strName}`};
                    }
                });
            });
        }
    }

    let update = function(node) {
        let t = MoSQL.createModel(model.name);
        let tWithChanges = MoSQL.createModel(model.name);
        if (node.post){
            let connection = node.ConnectionService.getConnection(node.mysql);
            
            return connection.runSql(model.sqlSelect()).then((response) => {
                let strName = model.recordName();
                if (response.err){
                    console.log(`You try an update on a task that does not exist in the server. id: ${strName}`);
                    // create it
                    create(node).then((responseCreate) => {
                        let msg = `You try an update on a ${model.tableName} that does not exist in the server. id: ${strName}. Tried to create it.`;
                        return {operationOk: responseCreate.operationOk, message: `${msg} ${responseCreate.message}`};
                    });
                }
                if (!response.err && response.rows.length > 0){
                    t.setDBAll(response.rows[0]); // original task from DB
                }
                tWithChanges.setDBAll(node.post);
                let sql = t.toUpdateSQL(tWithChanges);

                connection.runSql(sql).then((responseUpdate) => {
                    connection.close();
                    if (responseUpdate.err){
                        return {operationOk: false, message: `Error on ${model.tableName} modification. id: ${strName}`};
                    } else {
                        return {operationOk: true, message: `${model.tableName} updated correctly. id: ${strName}`};
                    }
                });
            });
        }
    }

    let api = function(method,node) {
        return this[method](node).then(data => {
            node.response.end(JSON.stringify(data));
        });
    };

    return {
        setModel
        , list
        , create
        , update
        , api
    };
})(MoSQL);
module.exports = API;