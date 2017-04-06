"use strict";
let MoSQL = require("./MoSQL.js");

let taskAPI = (function(MoSQL){
    let list = function(node) {
        let connection = node.ConnectionService.getConnection(node.mysql);
        let sql = "select * from task";
        let data = [];
        connection.getData(sql,(err,rows,fields) => {
            if (!err){
                data = rows;
            }
            connection.close();
            node.response.end(JSON.stringify(data));
        });
    };

    let create = function(node) {
        let sql = "";
        let t = MoSQL.createModel("Task");
        if (node.post.tsk_name !== ''){
            let connection = node.ConnectionService.getConnection(node.mysql);
            
            t.setDBAll(node.post);
            sql = t.toInsertSQL();
            console.log('insert task',sql);
            let strName = node.post.tsk_id + ' / ' + node.post.tsk_name;
            connection.executeSql(sql,(err,rows,fields) => {
                connection.close();
                if (err){
                    node.response.end(JSON.stringify({operationOK: false, message: 'Error on task creation. id: ' + strName}));
                } else {
                    node.response.end(JSON.stringify({operationOK: true, message: 'Task created correctly. id: ' + strName}));
                }
            });
        }
    }

    let update = function(node) {
        let t = MoSQL.createModel("Task");
        let taskWithChanges = MoSQL.createModel("Task");
        if (node.post.tsk_name !== ''){
            let connection = node.ConnectionService.getConnection(node.mysql);
            
            connection.getData(`select * from task where tsk_id = '${node.post.tsk_id}'`,(err,rows,fields) => {
                if (!err && rows.length > 0){
                    t.setDBAll(rows[0]); // original task from DB
                }
                taskWithChanges.setDBAll(node.post);
                let sql = t.toUpdateSQL(taskWithChanges);
                let strName = node.post.tsk_id + ' / ' + node.post.tsk_name;

                console.log('update task',sql);
                connection.executeSql(sql,(err,rows,fields) => {
                    connection.close();
                    if (err){
                        node.response.end(JSON.stringify({operationOK: false, message: 'Error on task modification. id: ' + strName}));
                    } else {
                        node.response.end(JSON.stringify({operationOK: true, message: 'Task updated correctly. id: ' + strName}));
                    }
                });
            });
        }
    }

    let batch = function(node) {
        let sql = "";
        let t = MoSQL.createModel("Task");
        let connection, insertionsOk = 0, insertionsError = 0;
        let q = [];
        let h = MoSQL.createModel("TaskTimeTracking");
        let sqlh = "";
        let historyInsertionsError = 0, historyInsertionsOk = 0;

        if (node.post.length){
            connection = node.ConnectionService.getConnection(node.mysql);
        }
        node.post.forEach((p) => {
            if (p.tsk_name !== ''){
                t.setDBAll(p);
                sql = t.toInsertSQL();
                console.log('insert task',sql);
                q.push(new Promise((resolve,reject) => {
                    connection.executeSql(sql,(err,rows,fields) => {
                        if (err){
                            insertionsError += 1;
                            reject(err);
                        } else {
                            insertionsOk += 1;
                            resolve(insertionsOk);
                        }
                    });
                }));
                // time tracking history (if present)
                if (p.tsk_time_history.length > 0){
                    p.tsk_time_history.forEach(tt => {
                        h.setDBAll(tt);
                        sqlh = h.toInsertSQL();
                        q.push(new Promise((resolve,reject) => {
                            connection.executeSql(sqlh,(err,rows,fields) => {
                                if (err){
                                    historyInsertionsError += 1;
                                    reject(err);
                                } else {
                                    historyInsertionsOk += 1;
                                    resolve(historyInsertionsOk);
                                }
                            });
                        }));
                    });
                }
            }
        });
        // Wait for all queries to finish before answering the request
        Promise.all(q).then(values => {
            connection.close();
            node.response.end(JSON.stringify({operationOK: true, message: `Batch finished, inserted ok: ${insertionsOk}, errors: ${insertionsError}, history ok: ${historyInsertionsOk}, history errors: ${historyInsertionsError}`}));
        });
    }

    return {
        list
        , create
        , update
        , batch
    };
})(MoSQL);
module.exports = taskAPI;