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
    
    let generateEntries = function(node){
        let connection;
        connection = node.ConnectionService.getConnection(node.mysql);
        // read movements
        connection.runSql('select * from movement').then(response => {
            if (response.err){
                console.log("err: can't read movements",response.err);
                return response.err;
            }
            // iterate movements
            let entries = [];
            console.log('movements to process',response.rows.length);
            response.rows.forEach((m, index, arr) => {
                // generate entry 1
                entries.push({
                    ent_id: m.mov_id
                    , ent_sequential: 1
                    , ent_date: m.mov_date
                    , ent_desc: m.mov_desc
                    , ent_ctg_currency: 1
                    , ent_amount: m.mov_amount
                    , ent_id_account: m.mov_id_account
                    , ent_ctg_type: m.mov_ctg_type === 3 ? 1 : m.mov_ctg_type
                    , ent_budget: m.mov_budget
                    , ent_id_category: m.mov_id_category
                    , ent_id_place: m.mov_id_place
                    , ent_notes: m.mov_notes
                    , ent_id_user: m.mov_id_user
                    , ent_date_add: m.mov_date_add
                    , ent_date_mod: m.mov_date_mod
                    , ent_ctg_status: m.mov_ctg_status
                });
                // generate entry 2
                entries.push({
                    ent_id: m.mov_id
                    , ent_sequential: 2
                    , ent_date: m.mov_date
                    , ent_desc: m.mov_desc
                    , ent_ctg_currency: 1
                    , ent_amount: m.mov_amount
                    , ent_id_account: m.mov_ctg_type === 3 ? m.mov_id_account_to : m.mov_id_account
                    , ent_ctg_type: m.mov_ctg_type === 3 ? 2 : m.mov_ctg_type
                    , ent_budget: m.mov_budget
                    , ent_id_category: m.mov_id_category
                    , ent_id_place: m.mov_id_place
                    , ent_notes: m.mov_notes
                    , ent_id_user: m.mov_id_user
                    , ent_date_add: m.mov_date_add
                    , ent_date_mod: m.mov_date_mod
                    , ent_ctg_status: m.mov_ctg_status
                });
            });
            // insert entries
            let responsesPromises = entries
                .map(e => {
                    let t = MoSQL.createModel('Entry');
                    t.setDBAll(e);
                    return t;
                })
                .map(e => e.toInsertSQL()).map(sql => connection.runSql(sql));
            Promise.all(responsesPromises).then(values => {
                // all inserted ok
                connection.close();
                node.response.end(JSON.stringify({operationOk: true, message: `Batch finished, inserted ok: ${entries.length}`}));
            }).catch(reason => {
                // some failed
                console.log('err on inserting entries',reason);
            });
        });
    };

    return {
        list
        , create
        , update
        , batch
        , generateEntries
    };
})(MoSQL,baseAPI);
module.exports = API;