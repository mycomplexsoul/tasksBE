"use strict";
var MoSQL = require("./MoSQL.js");

var taskAPI = (function(MoSQL){
    var list = function(node) {
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

    var create = function(node) {
        let sql = "";
        let t = MoSQL.createModel("Task");
        if (node.post.tsk_name !== ''){
            let connection = node.ConnectionService.getConnection(node.mysql);
            
            t.setDBAll(node.post);
            sql = t.toInsertSQL();
            console.log('insert task',sql);
            connection.executeSql(sql,sql);
            connection.close();
            node.response.end(JSON.stringify({operationOK: true, message: 'Task created correctly.'}));
        }
    }

    var update = function(node) {
        let t = MoSQL.createModel("Task");
        let taskWithChanges = MoSQL.createModel("Task");
        if (node.post.tsk_name !== ''){
            let connection = node.ConnectionService.getConnection(node.mysql);
            
            connection.getData(`select * from task where tsk_id = '${node.post.tsk_id}'`,(err,rows,fields) => {
                if (!err && rows.length > 0){
                    t.setDBAll(rows[0]); // original task from DB
                }
                taskWithChanges.setDBAll(post);
                let sql = t.toUpdateSQL(taskWithChanges);

                console.log('update task',sql);
                connection.executeSql(sql,sql);
                connection.close();
                node.response.end(JSON.stringify({operationOK: true, message: 'Task updated correctly.'}));
            });
        }
    }

    return {
        list
        , create
        , update
    };
})(MoSQL);
module.exports = taskAPI;