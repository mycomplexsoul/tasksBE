"use strict";
let MoSQL = require("../MoSQL.js");
let baseAPI = require("./api.js");

let API = (function(MoSQL,baseAPI){
    let config = {
        tableName: 'viaccount'
        , modelName: 'Account'
        , recordName: (r) => `${r.acc_id} / ${r.acc_name}`
        , pkField: 'acc_id'
        , recordRef: 'Account'
        , sql: {
            list: `select * from viaccount`
            , exist: `select * from viaccount where acc_id = '{0}'`
        }
    };

    let list = function(node) {
        baseAPI.list(node,config).then(data => {
            node.response.end(JSON.stringify(data));
        });
    };

    let create = function(node) {
        baseAPI.create(node,config).then(response => {
            node.response.end(JSON.stringify(response));
        });
    }

    let update = function(node) {
        baseAPI.update(node,config).then(response => {
            node.response.end(JSON.stringify(response));
        });
    }
/* needs work below this */
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
                t = MoSQL.createModel("Task");
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
                        h = MoSQL.createModel("TaskTimeTracking");
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
            node.response.end(JSON.stringify({operationOk: true, message: `Batch finished, inserted ok: ${insertionsOk}, errors: ${insertionsError}, history ok: ${historyInsertionsOk}, history errors: ${historyInsertionsError}`}));
        });
    }

    let sync = function(node) {
        // payload: [{action: 'create|update', data:{...}}]
        let sql = "";
        let sqlh = "";
        let t = MoSQL.createModel("Task");
        let h = MoSQL.createModel("TaskTimeTracking");
        let connection;
        let counters = {
            forTask: {
                insertions: {
                    ok: 0
                    , err: 0
                }
                , updates: {
                    ok: 0
                    , err: 0
                }
            }
            , forTimeTracking: {
                insertions: {
                    ok: 0
                    , err: 0
                }
                , updates: {
                    ok: 0
                    , err: 0
                }
            }
        };
        let taskSyncPromiseResults = [];
        let taskTimeTrackingSyncPromiseResults = [];

        if (node.post.length){
            connection = node.ConnectionService.getConnection(node.mysql);
        }
        node.post.forEach((p) => {
            if (p.data.tsk_name !== ''){
                switch(p.action){
                    case 'create':{
                        let q = new Promise((resolve,reject) => {
                            t = MoSQL.createModel("Task");
                            t.setDBAll(p.data);
                            sql = t.toInsertSQL();
                            console.log('insert task',sql);

                            connection.runSql(`select * from task where tsk_id = '${p.data.tsk_id}'`).then(queryResponse => {
                                if (!queryResponse.err && queryResponse.rows.length > 0){
                                    // task already exist, can not insert it, try updating it
                                    t.setDBAll(queryResponse.rows[0]); // original task from DB
                                    let taskWithChanges = MoSQL.createModel("Task");
                                    taskWithChanges.setDBAll(p.data);
                                    let sql = t.toUpdateSQL(taskWithChanges);

                                    console.log('update task',sql);
                                    connection.runSql(sql).then((updateResponse) => {
                                        counters.forTimeTracking.updates.ok++;
                                        resolve({
                                            id: p.data.tsk_id
                                            , operationOk: true
                                            , action: 'update'
                                        });
                                    }).catch((error) => {
                                        counters.forTimeTracking.updates.err++;
                                        resolve({
                                            id: p.data.tsk_id
                                            , operationOk: false
                                            , action: 'update'
                                            , reason: error
                                        });
                                    });
                                } else { // task does not exist, insert it
                                    connection.runSql(sql).then(insertionResponse => {
                                        counters.forTask.insertions.ok++;
                                        resolve({
                                            id: p.data.tsk_id
                                            , operationOk: true
                                            , action: 'create'
                                        });
                                    }).catch(insertionError => {
                                        counters.forTask.insertions.err++;
                                        resolve({
                                            id: p.data.tsk_id
                                            , operationOk: false
                                            , action: 'create'
                                            , reason: error
                                        });
                                    });
                                }
                            });

                        });
                        taskSyncPromiseResults.push(q);

                        Promise.all([q]).then((insertionStatus) => {
                            if (insertionStatus.operationOk){
                                // time tracking history (if present)
                                if (p.data.tsk_time_history.length > 0){
                                    p.data.tsk_time_history.forEach(tt => {
                                        h = MoSQL.createModel("TaskTimeTracking");
                                        h.setDBAll(tt);
                                        sqlh = h.toInsertSQL();
                                        taskTimeTrackingSyncPromiseResults.push(new Promise((resolve,reject) => {
                                            connection.runSql(sqlh).then(insertionResponse => {
                                                counters.forTimeTracking.insertions.ok++;
                                                resolve({
                                                    id: tt.tsh_id + ' / ' + tt.tsh_num_secuential
                                                    , operationOk: true
                                                    , action: 'create'
                                                });
                                            }).catch(insertionError => {
                                                counters.forTimeTracking.insertions.err++;
                                                resolve({
                                                    id: tt.tsh_id + ' / ' + tt.tsh_num_secuential
                                                    , operationOk: false
                                                    , action: 'create'
                                                    , reason: error
                                                });
                                            });
                                            
                                        }));
                                    });
                                }
                            }
                        });

                        break;
                    }
                    case 'update':{
                        let taskWithChanges = MoSQL.createModel("Task");

                        if (p.data.tsk_name !== ''){
                            let q = new Promise((resolve,reject) => {
                                let connection = node.ConnectionService.getConnection(node.mysql);

                                connection.runSql(`select * from task where tsk_id = '${p.data.tsk_id}'`).then((response) => {
                                    let strName = p.data.tsk_id + ' / ' + p.data.tsk_name;
                                    if (!response.err && response.rows.length > 0){
                                        t.setDBAll(response.rows[0]); // original task from DB
                                    } else {
                                        console.log('You try an update on a task that does not exist in the server. id: ' + strName);
                                        //node.response.end(JSON.stringify({operationOk: false, message: 'You try an update on a task that does not exist in the server. id: ' + strName}));
                                        // try insertion
                                        t.setDBAll(p.data);
                                        sql = t.toInsertSQL();
                                        console.log('insert task',sql);
                                        connection.runSql(sql).then(insertionResponse => {
                                            counters.forTask.insertions.ok++;
                                            resolve({
                                                id: p.data.tsk_id
                                                , operationOk: true
                                                , action: 'create'
                                            });
                                        }).catch(insertionError => {
                                            counters.forTask.insertions.err++;
                                            resolve({
                                                id: p.data.tsk_id
                                                , operationOk: false
                                                , action: 'create'
                                                , reason: error
                                            });
                                        });
                                    }
                                    taskWithChanges.setDBAll(p.data);
                                    let sql = t.toUpdateSQL(taskWithChanges);

                                    console.log('update task',sql);
                                    connection.runSql(sql).then((updateResponse) => {
                                        counters.forTimeTracking.updates.ok++;
                                        resolve({
                                            id: p.data.tsk_id
                                            , operationOk: true
                                            , action: 'update'
                                        });
                                    }).catch((error) => {
                                        counters.forTimeTracking.updates.err++;
                                        resolve({
                                            id: p.data.tsk_id
                                            , operationOk: false
                                            , action: 'update'
                                            , reason: error
                                        });
                                    });
                                    
                                });
                            });

                            taskSyncPromiseResults.push(q);

                            Promise.all([q]).then((updateStatus) => {
                                if (updateStatus.operationOk){
                                    // time tracking history (if present)
                                    if (p.data.tsk_time_history.length > 0){
                                        let ttWithChanges = MoSQL.createModel("TaskTimeTracking");
                                        p.data.tsk_time_history.forEach(tt => {
                                            connection.runSql(`select * from tasktimetracking where tsh_id = '${tt.tsh_id}' and tsh_num_secuential = ${tt.tsh_num_secuential}`).then(queryResponse => {
                                                let strNameTT = p.data.tsk_id + ' / ' + p.data.tsk_name + ' / ' + tt.tsh_num_secuential;
                                                if (!queryResponse.err && queryResponse.rows.length > 0){
                                                    h.setDBAll(queryResponse.rows[0]); // original task from DB
                                                } else {
                                                    console.log('You try an update on a task time tracking that does not exist in the server. id: ' + strName);
                                                    //node.response.end(JSON.stringify({operationOk: false, message: 'You try an update on a task that does not exist in the server. id: ' + strName}));
                                                    // try insertion
                                                    sqlh = h.toInsertSQL();
                                                    taskTimeTrackingSyncPromiseResults.push(new Promise((resolve,reject) => {
                                                        connection.runSql(sqlh).then((insertResponse) => {
                                                            counters.forTimeTracking.insertions.ok++;
                                                            resolve({
                                                                id: tt.tsh_id + ' / ' + tt.tsh_num_secuential
                                                                , operationOk: true
                                                                , action: 'create'
                                                            });
                                                        }).catch((error) => {
                                                            counters.forTimeTracking.insertions.err++;
                                                            resolve({
                                                                id: tt.tsh_id + ' / ' + tt.tsh_num_secuential
                                                                , operationOk: false
                                                                , action: 'create'
                                                                , reason: error
                                                            });
                                                        });
                                                    }));
                                                }

                                                ttWithChanges.setDBAll(tt);
                                                let sql = h.toUpdateSQL(ttWithChanges);

                                                taskTimeTrackingSyncPromiseResults.push(new Promise((resolve,reject) => {
                                                    connection.runSql(sqlh).then((insertResponse) => {
                                                            counters.forTimeTracking.updates.ok++;
                                                            resolve({
                                                                id: tt.tsh_id + ' / ' + tt.tsh_num_secuential
                                                                , operationOk: true
                                                                , action: 'update'
                                                            });
                                                        }).catch((error) => {
                                                            counters.forTimeTracking.updates.err++;
                                                            resolve({
                                                                id: tt.tsh_id + ' / ' + tt.tsh_num_secuential
                                                                , operationOk: false
                                                                , action: 'update'
                                                                , reason: error
                                                            });
                                                        });
                                                }));

                                            });

                                        });
                                    }
                                }
                            });
                        }
                        break;
                    }
                }

            }
        });

        // Wait for all queries to finish before answering the request
        Promise.all(taskSyncPromiseResults).then(resultTasks => {
            Promise.all(taskTimeTrackingSyncPromiseResults).then(resultTimeTracking => {
                connection.close();
                console.log('responses Tasks',resultTasks);
                console.log('responses TimeTracking',resultTimeTracking);
                node.response.end(JSON.stringify({
                    operationOk: true
                    , message: `Batch sync finished`
                    , batchResultTasks: resultTasks
                    , batchResultTimeTracking: resultTimeTracking
                    , batchCounters: {
                        forTask: {
                            insertion: {
                                ok: counters.forTask.insertions.ok
                                , err: counters.forTask.insertions.err
                            }
                            , updates: {
                                ok: counters.forTask.updates.ok
                                , err: counters.forTask.updates.err
                            }
                        }
                        , forTimeTracking: {
                            insertion: {
                                ok: counters.forTimeTracking.insertions.ok
                                , err: counters.forTimeTracking.insertions.err
                            }
                            , updates: {
                                ok: counters.forTimeTracking.updates.ok
                                , err: counters.forTimeTracking.updates.err
                            }
                        }
                    }
                }));
            });
        });
    }

    return {
        list
        , create
        , update
        , batch
        , sync
    };
})(MoSQL,baseAPI);
module.exports = API;