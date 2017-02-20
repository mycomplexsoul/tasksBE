"use strict";
let ConnectionService = (function(){
    let getConnection = (mysql) => {
        let connection = mysql.createConnection({
            host     : 'localhost',
            user     : 'root',
            password : '_Yadira!',
            database : 'testdb'
        });
        
        connection.connect();
        let executeSql = (sql,method) => {
            connection.query(sql,(err,rows,fields) => {
                if (err){
                    console.log(err);
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