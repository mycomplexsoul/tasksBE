"use strict";
let MoSQL = require("../MoSQL.js");
let baseAPI = require("./api.js");

let API = (function(MoSQL, baseAPI){
	baseAPI.setModel('Movement');
	let list = function(node) {
		baseAPI.api('list', node);
	}

	let create = function(node) {
		baseAPI.api('create', node);
	}

	let update = function(node) {
		baseAPI.api('update', node);
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

	return {
		list
		, create
		, update
		, batch
	}
})(MoSQL, baseAPI);
module.exports = API;