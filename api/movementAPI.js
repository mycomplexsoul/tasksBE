"use strict";
let MoSQL = require("../MoSQL.js");
let baseAPI = require("./api.js");

let API = (function(MoSQL,baseAPI){
    let config = {
        tableName: 'vimovement'
        , modelName: 'Movement'
        , recordName: (r) => `${r.mov_id} / ${r.mov_date} / ${r.mov_txt_account} / ${r.mov_txt_type} / ${r.mov_amount}`
        , pkField: 'mov_id'
        , recordRef: 'Movement'
        , sql: {
            list: `select * from vimovement`
            , exist: `select * from vimovement where mov_id = '{0}'`
        }
    };

    let list = function(node) {
        baseAPI.api('list',node,config);
    };

    let create = function(node) {
        baseAPI.api('create',node,config);
    };

    let update = function(node) {
        baseAPI.api('update',node,config);
    };

    let batch = function(node) {
        let sql = "";
        let model = MoSQL.createModel(config.modelName);
        let connection, insertionsOk = 0, insertionsError = 0;
        let promiseQueue = [];

        if (node.post.length){
            connection = node.ConnectionService.getConnection(node.mysql);
        }
        node.post.forEach((p) => {
            if (p[config.pkField] !== ''){
                model = MoSQL.createModel(config.modelName);
                model.setDBAll(p);
                sql = model.toInsertSQL();
                console.log('insert model',sql);
                promiseQueue.push(new Promise((resolve,reject) => {
                    connection.executeSql(sql,(err,rows,fields) => {
                        if (err){
                            insertionsError += 1;
                            console.log('err object', model);
                            reject(err);
                        } else {
                            insertionsOk += 1;
                            resolve(insertionsOk);
                        }
                    });
                }));
            }
        });
        // Wait for all queries to finish before answering the request
        Promise.all(promiseQueue).then(values => {
            connection.close();
            node.response.end(JSON.stringify({operationOk: true, message: `Batch finished, inserted ok: ${insertionsOk}, errors: ${insertionsError}`}));
        });
    };

    return {
        list
        , create
        , update
        , batch
    };
})(MoSQL,baseAPI);
module.exports = API;