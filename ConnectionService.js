"use strict";
let ConnectionService = (function(){
    function loadJSON(file){
        let fs = require('fs');
        let obj = JSON.parse(fs.readFileSync(file + '.json', 'utf8'));
        return obj;
    }
    let getConnection = (mysql) => {
        let config = loadJSON('cfg');
        let connection = mysql.createConnection(config[0]);
        
        connection.connect(function(err) {
            if (err) {
                console.error('error connecting: ' + err.stack);
                return;
            }

            console.log('connected as id ' + connection.threadId);
        });
        let executeSql = (sql,method) => {
            return connection.query(sql,(err,rows,fields) => {
                if (err){
                    console.log('There was an error with this sql: ' + sql);
                    console.log(err);
                }
                if(!fields && rows.message){
                    console.log(rows.message);
                }
                method(err,rows,fields);
            });
        };
        let getData = (sql,method) => {
            connection.query(sql,(err,rows,fields) => {
                method(err,rows,fields);
            });
        };
        let close = () => {
            connection.end();
        };
        return {
            executeSql
            , getData
            , close
        };
    };

    return {
        getConnection
    };
})();
module.exports = ConnectionService;