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
            // add time tracking
            connection.getData('select * from tasktimetracking',(err,rows,fields) => {
                let tt = [];
                if (!err){
                    tt = rows;
                }
                data.forEach((t) => {
                    t.tsk_time_history = tt.filter(h => h.tsh_id === t.tsk_id) || [];
                });

                connection.close();
                node.response.end(JSON.stringify(data));
            });
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
            connection.getData(`select * from task where tsk_id = '${node.post.tsk_id}'`,(err,rows,fields) => {
                if (err){
                    console.log('got this error trying to validate if task exists',err);
                    return false;
                }

                if (rows.length > 0){
                    console.log(`Task already exists: ${strName}`);
                    node.response.end(JSON.stringify({operationOk: false, message: 'Task already exists. id: ' + strName}));
                } else {
                    connection.executeSql(sql,(err,rows,fields) => {
                        connection.close();
                        if (err){
                            node.response.end(JSON.stringify({operationOk: false, message: 'Error on task creation. id: ' + strName}));
                        } else {
                            node.response.end(JSON.stringify({operationOk: true, message: 'Task created correctly. id: ' + strName}));
                        }
                    });
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
                let strName = node.post.tsk_id + ' / ' + node.post.tsk_name;
                if (!err && rows.length > 0){
                    t.setDBAll(rows[0]); // original task from DB
                } else {
                    console.log('You try an update on a task that does not exist in the server. id: ' + strName);
                    //node.response.end(JSON.stringify({operationOk: false, message: 'You try an update on a task that does not exist in the server. id: ' + strName}));
                    // try insertion
                    create(node);
                    return;
                }
                taskWithChanges.setDBAll(node.post);
                let sql = t.toUpdateSQL(taskWithChanges);

                console.log('update task',sql);
                connection.executeSql(sql,(err,rows,fields) => {
                    connection.close();
                    if (err){
                        node.response.end(JSON.stringify({operationOk: false, message: 'Error on task modification. id: ' + strName}));
                    } else {
                        node.response.end(JSON.stringify({operationOk: true, message: 'Task updated correctly. id: ' + strName}));
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
        //let sql = "";
        //let sqlh = "";
        //let t = MoSQL.createModel("Task");
        //let h = MoSQL.createModel("TaskTimeTracking");
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
                            let t = MoSQL.createModel("Task");
                            t.setDBAll(p.data);

                            connection.runSql(`select * from task where tsk_id = '${p.data.tsk_id}'`).then(queryResponse => {
                                if (!queryResponse.err && queryResponse.rows.length > 0){
                                    // task already exist, can not insert it, try updating it
                                    t.setDBAll(queryResponse.rows[0]); // original task from DB
                                    let taskWithChanges = MoSQL.createModel("Task");
                                    taskWithChanges.setDBAll(p.data);
                                    if (t.changesWith(taskWithChanges).length){
                                        connection.runSql(t.toUpdateSQL(taskWithChanges)).then((updateResponse) => {
                                            counters.forTask.updates.ok++;
                                            resolve({
                                                id: p.data.tsk_id
                                                , operationOk: true
                                                , action: 'update'
                                            });
                                        }).catch((error) => {
                                            counters.forTask.updates.err++;
                                            resolve({
                                                id: p.data.tsk_id
                                                , operationOk: false
                                                , action: 'update'
                                                , reason: error
                                            });
                                        });
                                    } else {
                                        console.log('task did not had changes');
                                        counters.forTask.updates.ok++;
                                        resolve({
                                            id: p.data.tsk_id
                                            , operationOk: true
                                            , action: 'update'
                                        });
                                    }
                                } else { // task does not exist, insert it
                                    connection.runSql(t.toInsertSQL()).then(insertionResponse => {
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
                                            , reason: insertionError
                                        });
                                    });
                                }
                            });

                        });
                        taskSyncPromiseResults.push(q);

                        Promise.all(taskSyncPromiseResults).then((insertionStatus) => {
                            if (insertionStatus.operationOk){
                                // time tracking history (if present)
                                if (p.data.tsk_time_history.length > 0){
                                    p.data.tsk_time_history.forEach(tt => {
                                        let h = MoSQL.createModel("TaskTimeTracking");
                                        h.setDBAll(tt);
                                        taskTimeTrackingSyncPromiseResults.push(new Promise((resolve,reject) => {
                                            connection.runSql(h.toInsertSQL()).then(insertionResponse => {
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
                                                    , reason: insertionError
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
                        let t = MoSQL.createModel("Task");
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
                                        connection.runSql(t.toInsertSQL()).then(insertionResponse => {
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
                                                , reason: insertionError
                                            });
                                        });
                                    }
                                    taskWithChanges.setDBAll(p.data);
                                    if (t.changesWith(taskWithChanges).length){
                                        connection.runSql(t.toUpdateSQL(taskWithChanges)).then((updateResponse) => {
                                            counters.forTask.updates.ok++;
                                            resolve({
                                                id: p.data.tsk_id
                                                , operationOk: true
                                                , action: 'update'
                                            });
                                        }).catch((error) => {
                                            counters.forTask.updates.err++;
                                            resolve({
                                                id: p.data.tsk_id
                                                , operationOk: false
                                                , action: 'update'
                                                , reason: error
                                            });
                                        });
                                    } else {
                                        console.log('task did not had changes');
                                        counters.forTask.updates.ok++;
                                        resolve({
                                            id: p.data.tsk_id
                                            , operationOk: true
                                            , action: 'update'
                                        });
                                    }
                                });
                            });

                            taskSyncPromiseResults.push(q);

                            Promise.all(taskSyncPromiseResults).then((updateStatus) => {
                                let h = MoSQL.createModel("TaskTimeTracking");
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
                                                    taskTimeTrackingSyncPromiseResults.push(new Promise((resolve,reject) => {
                                                        connection.runSql(h.toInsertSQL()).then((insertResponse) => {
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
                                                if (h.changesWith(ttWithChanges).length){
                                                    taskTimeTrackingSyncPromiseResults.push(new Promise((resolve,reject) => {
                                                        connection.runSql(h.toUpdateSQL(ttWithChanges)).then((insertResponse) => {
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
                                                } else {
                                                    console.log('task time tracking did not had changes');
                                                    counters.forTimeTracking.updates.ok++;
                                                    resolve({
                                                        id: tt.tsh_id + ' / ' + tt.tsh_num_secuential
                                                        , operationOk: true
                                                        , action: 'update'
                                                    });
                                                }

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
                if (connection){
                    connection.close();
                }
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
})(MoSQL);
module.exports = taskAPI;