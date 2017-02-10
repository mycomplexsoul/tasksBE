"use strict";
var http = require("http"), url = require('url');
var MoGen = require("./MoGen.js");
var MoSQL = require("./MoSQL.js");
var MoInstall = require("./MoInstall.js");
var ConnectionService = require("./ConnectionService.js");
var mysql = require('mysql');
var qs = require('querystring');

http.createServer(function (request, response) {

   // Send the HTTP header
   // HTTP Status: 200 : OK
   // Content Type: text/plain
   response.writeHead(200, {'Content-Type': 'text/plain'});

   // Send the response body as "Hello World"
   //response.end('Hello World\n');
   var query = url.parse(request.url,true).query;
   //console.log('query: ',query);
   if (query.action === "install"){
       let connection = ConnectionService.getConnection(mysql);
       MoInstall.install(connection);
   }

    var body = '', post;
   if (request.method == 'POST') {

        request.on('data', function (data) {
            body += data;

            // Too much POST data, kill the connection!
            // 1e6 === 1 * Math.pow(10, 6) === 1 * 1000000 ~~~ 1MB
            if (body.length > 1e6)
                request.connection.destroy();
        });

        request.on('end', function () {
            post = qs.parse(body);

            if (query.entity === "task" && query.action === "create"){
                let t = MoSQL.createModel("Task");
                if (post.name !== ''){
                    let connection = ConnectionService.getConnection(mysql);
                    t.db.tsk_id(post.id);
                    t.db.tsk_id_container(post.container);
                    t.db.tsk_id_record(post.record);
                    t.db.tsk_name(post.name);
                    t.db.tsk_order(1);
                    t.db.tsk_date_creation(new Date());
                    t.db.tsk_date_mod(new Date());

                    console.log('insert task',t.toInsertSQL());
                    connection.executeSql(t.toInsertSQL(),t.toInsertSQL());
                    connection.close();
                }
            }
        });
    }

//    if (query.entity === "task" && query.action === "create"){
//        let t = MoSQL.createModel("Task");
//        if (query.name !== ''){
//            let connection = ConnectionService.getConnection(mysql);
//            t.db.tsk_id('id');
//            t.db.tsk_id_container('tasks');
//            t.db.tsk_id_record('general');
//            t.db.tsk_name(query.name);
//            t.db.tsk_order(1);
//            t.db.tsk_date_creation(new Date());
//            t.db.tsk_date_mod(new Date());

//            console.log('insert task',t.toInsertSQL());
//            connection.executeSql(t.toInsertSQL(),t.toInsertSQL());
//            connection.close();
//        }
//    }
//    if (query.action === "generation"){
       response.end('excecuting generation\n');
    //    console.log(t.createSQL());
    //    console.log(t.createPK());
    //    console.log(t.createViewSQL());
    //    console.log(t.toInsertSQL());
    //    console.log(t.toUpdateSQL([{entName: "Description", value: "Prueba update"},{entName: "Metadata1", value: "Meta 1"},{entName: "ModDate", value: new Date(2016,8,8)},{entName: "Status", value: 2}]));
    //    console.log(t.toDeleteSQL());
    //    console.log(t);

    //    var pool      =    mysql.createPool({
    //       connectionLimit : 100, //important
    //       host     : 'localhost',
    //       user     : 'root',
    //       password : '',
    //       database : 'testdb',
    //       debug    :  false
    //    });

    //    function handle_database(sql) {
    //       console.log('initq');
    //       pool.getConnection(function(err,connection){
    //           console.log('inside');
    //           if (err) {
    //             // res.json({"code" : 100, "status" : "Error in connection database"});
    //             return {"code" : 100, "status" : "Error in connection database"};
    //             // return;
    //           }

    //           console.log('connected as id ' + connection.threadId);

    //           connection.query(sql,function(err,rows){
    //               connection.release();
    //               if(!err) {
    //                   // res.json(rows);
    //                   return rows;
    //               }
    //           });

    //           connection.on('error', function(err) {
    //                 // res.json({"code" : 100, "status" : "Error in connection database"});
    //                 return {"code" : 100, "status" : "Error in connection database"};
    //           });
    //       });
    //       console.log('endq');
    //    }

    
    //    connection.query('SELECT * from catalog', function(err, rows, fields) {
    //     if (!err)
    //         console.log('The solution is: ', rows);
    //     else
    //         console.log('Error while performing Query.');
    //     });


        // connection.query('SELECT * from vicatalog', function(err, rows, fields) {
        // if (!err){
        //     console.log('The solution is: ', rows);
        //     console.log('Length: ', rows.length);
        // }
        // else
        //     console.log('Error while performing Query.');
        // });

        // connection.end();

    //    var q = handle_database('select * from catalog');
    //    console.log('query result',q);

       console.log("end");
//    }

}).listen(8081);

// Console will print the message
console.log('Server running at http://127.0.0.1:8081/');
