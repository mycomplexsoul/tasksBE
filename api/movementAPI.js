"use strict";
let MoSQL = require("../MoSQL.js");
let baseAPI = require("./api.js");

let API = (function(MoSQL, baseAPI){
	let motor = baseAPI.forModel('Movement');
	let list = function(node) {
		motor.api('list', node);
	}

	let create = function(node) {
		motor.api('create', node);
	}

	let update = function(node) {
		motor.api('update', node);
	}

	let batch = function(node) {
        let sql = "";
        //let model = MoSQL.createModel(config.modelName);
        let connection, insertionsOk = 0, insertionsError = 0;
        let promiseQueue = [];

        if (node.post.length){
            connection = node.ConnectionService.getConnection(node.mysql);
        }
        node.post.forEach((p) => {
            if (p[model.getPK()[0]] !== ''){
                model = MoSQL.createModel(model.name);
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
        let connection = node.ConnectionService.getConnection(node.mysql);
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
            let responsesPromises = entries.map(e => {
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

    let generateBalance = function(node){
        let connection = node.ConnectionService.getConnection(node.mysql);
        connection.runSql('select * from entry').then(response => {
            if (response.err){
                console.log("err: can't read entries",response.err);
                return response.err;
            }
            let entries = [];
            let balance = [];
            console.log('entries to process',response.rows.length);
            response.rows.forEach((m, index, arr) => {
                entries.push(m);
            });
            entries.forEach(e => {
                let b = balance.find(b => b.bal_year === e.ent_date.getFullYear() && b.bal_month === e.ent_date.getMonth()+1 && b.bal_id_account === e.ent_id_account && b.bal_id_user === e.ent_id_user);
    
                if (b) { // exists a balance, add entry amount
                    b.bal_charges += e.ent_ctg_type === 2 ? e.ent_amount : 0;
                    b.bal_withdrawals += e.ent_ctg_type === 1 ? e.ent_amount : 0;
                    b.bal_final += e.ent_ctg_type === 1 ? -1 * e.ent_amount : e.ent_amount;
                } else { // balance does not exist, create one with amount and add it to list
                    b = {};
                    b.bal_year = e.ent_date.getFullYear();
                    b.bal_month = e.ent_date.getMonth() + 1;
                    b.bal_id_account = e.ent_id_account;
                    b.bal_initial = 0;
                    b.bal_charges = e.ent_ctg_type === 2 ? e.ent_amount : 0;
                    b.bal_withdrawals = e.ent_ctg_type === 1 ? e.ent_amount : 0;
                    b.bal_final = b.bal_charges - b.bal_withdrawals;
                    b.bal_id_user = e.ent_id_user;
                    b.bal_date_add = e.ent_date_add;
                    b.bal_date_mod = e.ent_date_mod;
                    
                    balance.push(b);
                }
            });
            // insert balance
            let responsesPromises = balance.map(e => {
                    let t = MoSQL.createModel('Balance');
                    t.setDBAll(e);
                    return t;
                })
                .map(e => e.toInsertSQL()).map(sql => connection.runSql(sql));
            Promise.all(responsesPromises).then(values => {
                // all inserted ok
                connection.close();
                node.response.end(JSON.stringify({operationOk: true, message: `Batch finished, inserted ok: ${balance.length}`}));
            }).catch(reason => {
                // some failed
                console.log('err on inserting balance',reason);
            });
        });
    };

    return {
        list
        , create
        , update
        , batch
        , generateEntries
        , generateBalance
    };
})(MoSQL,baseAPI);
module.exports = API;