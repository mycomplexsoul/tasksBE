"use strict";
var taskAPI = (function(){
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

    return {
        list
    };
})();
module.exports = taskAPI;