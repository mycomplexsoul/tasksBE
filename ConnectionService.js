"use strict";
let ConnectionService = (function(){
    function loadJSON(file){
        let fs = require('fs');
        let obj = JSON.parse(fs.readFileSync(file + '.json', 'utf8'));
        return obj;
    }
    let getConnection = (mysql) => {
        let config = loadJSON('cfg');
        let connection;// = mysql.createConnection(config[0]);

        function handleDisconnect() {
            connection = mysql.createConnection(config[0]); // Recreate the connection, since
                                                            // the old one cannot be reused.
            
            connection.connect(function(err) {              // The server is either down
                if(err) {                                     // or restarting (takes a while sometimes).
                    console.log('error when connecting to db:', err);
                    setTimeout(handleDisconnect, 2000); // We introduce a delay before attempting to reconnect,
                }                                     // to avoid a hot loop, and to allow our node script to
                console.log('connected as id ' + connection.threadId);
            });                                     // process asynchronous requests in the meantime.
                                                    // If you're also serving http, display a 503 error.
            connection.on('error', function(err) {
                console.log((new Date()).toISOString() + ' - db error', err);
                if(err.code === 'PROTOCOL_CONNECTION_LOST') { // Connection to the MySQL server is usually
                    handleDisconnect();                         // lost due to either server restart, or a
                } else {                                      // connnection idle timeout (the wait_timeout
                    throw err;                                  // server variable configures this)
                }
            });
        }

        handleDisconnect();
        
        // connection.connect(function(err) {
        //     if (err) {
        //         console.error('error connecting: ' + err.stack);
        //         return;
        //     }

        //     console.log('connected as id ' + connection.threadId);
        // });
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
            console.log('closing connection with id: ' + connection.threadId);
            connection.end();
        };
        let runSql = (sql) => {
            let p = new Promise((resolve,reject) => {
                connection.query(sql,(err,rows,fields) => {
                    if (err){
                        console.log('There was an error with this sql: ' + sql + ', the error is: ' + err);
                        reject(err);
                        return false;
                    }
                    if(!fields && rows.message){
                        console.log('Message returned after running the sql: ' + rows.message);
                    }
                    console.log('execution ok for query',sql);
                    resolve({sql,err,rows,fields});
                });
            });
            return p;
        };
        let runSqlArray = (sqlArray) => {
            let responseArray = sqlArray.map((sql) => this.runSql(sql));
            return responseArray;
        };
        return {
            executeSql
            , getData
            , close
            , runSql
            , runSqlArray
        };
    };

    return {
        getConnection
    };
})();
module.exports = ConnectionService;