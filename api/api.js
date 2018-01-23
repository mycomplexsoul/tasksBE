"use strict";
let MoSQL = require("../MoSQL.js");

let API = (function(MoSQL){
    let list = function(node,config) {
        let connection = node.ConnectionService.getConnection(node.mysql);
        let sql = config.sql.list;
        let data = [];

        return connection.runSql(sql).then((response) => {
            if (!response.err){
                data = response.rows;
            }
            connection.close();
            return data;
        });
    };

    let create = function(node,config) {
        let sql = "";
        let t = MoSQL.createModel(config.modelName);
        if (node.post){
            let connection = node.ConnectionService.getConnection(node.mysql);
            t.setDBAll(node.post);
            sql = t.toInsertSQL();
            //console.log('insert task',sql);
            let strName = config.recordName(node.post);
            return connection.runSql(config.sql.exist.replace('{0}',node.post[config.pkField])).then((response) => {
                if (response.err){
                    //console.log(`got this error trying to validate if this ${config.recordRef} already exists`,err);
                    return false;
                }

                if (response.rows.length > 0){
                    //console.log(`${config.recordRef} already exists: ${strName}`);
                    return false;
                } else {
                    return response;
                }
            }).then((response) => {
                if (!response){
                    return {operationOk: false, message: `${config.recordRef} already exists. id: ${strName}`};
                }

                return connection.runSql(sql,(responseCreate) => {
                    connection.close();
                    if (responseCreate.err){
                        return {operationOk: false, message: `Error on ${config.recordRef} creation. id: ${strName}`};
                    } else {
                        return {operationOk: true, message: `${config.recordRef} created correctly. id: ${strName}`};
                    }
                });
            });
        }
    }

    let update = function(node,config) {
        let t = MoSQL.createModel(config.modelName);
        let tWithChanges = MoSQL.createModel(config.modelName);
        if (node.post){
            let connection = node.ConnectionService.getConnection(node.mysql);
            
            return connection.runSql(config.sql.exist.replace('{0}',node.post[config.pkField])).then((response) => {
                let strName = config.recordName(node.post);
                if (response.err){
                    console.log(`You try an update on a task that does not exist in the server. id: ${strName}`);
                    // create it
                    create(node,config).then((responseCreate) => {
                        let msg = `You try an update on a ${config.recordRef} that does not exist in the server. id: ${strName}. Tried to create it.`;
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
                        return {operationOk: false, message: `Error on ${config.recordRef} modification. id: ${strName}`};
                    } else {
                        return {operationOk: true, message: `${config.recordRef} updated correctly. id: ${strName}`};
                    }
                });
            });
        }
    }

    let api = function(method,node,config) {
        return this[method](node,config).then(data => {
            node.response.end(JSON.stringify(data));
        });
    };

    return {
        list
        , create
        , update
    };
})(MoSQL);
module.exports = API;