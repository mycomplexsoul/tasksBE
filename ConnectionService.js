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
        let executeSql = (sql,message) => {
            connection.query(sql,(err,rows,fields) => {
                if(err){
                    console.log(message);
                }
            });
        };
        let close = () => {
            connection.end();
        }
        return {
            executeSql
            , close
        };
    };

    return {
        getConnection
    }
})();
module.exports = ConnectionService;