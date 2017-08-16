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

    return {
        list
        , create
    };
})(MoSQL);
module.exports = API;