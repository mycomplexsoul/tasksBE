"use strict";
var http = require("http"), url = require('url');
var MoGen = require("./MoGen.js");
var MoSQL = require("./MoSQL.js");
var MoInstall = require("./MoInstall.js");
var ConnectionService = require("./ConnectionService.js");
var mysql = require('mysql');
var qs = require('querystring');
var taskAPI = require('./taskAPI.js');
var accountAPI = require('./api/accountAPI.js');
var MovementAPI = require('./api/MovementAPI.js');
var BalanceAPI = require('./api/BalanceAPI.js');
var EntryAPI = require('./api/EntryAPI.js');
var MoScaffold = require('./MoScaffold.js');

var utils = {
    parseUrlOnly: (url) => {
        let parsed = url;
        if (url.indexOf('?') !== -1){
            parsed = url.substr(0,url.indexOf('?'));
        }
        return parsed;
    }
}

function LogRequest(request,msg){
    let message = `Received request ${request.method} for url ${request.url} / ${msg}`;
    let date = new Date();
    console.log(date.toISOString() + ' - ' + message);
}

function Log(message){
    let date = new Date();
    console.log(date.toISOString() + ' - ' + message);
}

http.createServer(function (request, response) {
    LogRequest(request,'start');

    response.setHeader("Access-Control-Allow-Origin", "*");
    response.setHeader("Access-Control-Allow-Headers", "X-Requested-With");

   // Send the HTTP header
   // HTTP Status: 200 : OK
   // Content Type: text/plain
//    response.writeHead(200, {'Content-Type': 'text/plain'});
//    response.writeHead(200, {'Content-Type': 'application/json'});
   response.setHeader('Content-Type', 'application/json');

   // Send the response body as "Hello World"
   //response.end('Hello World\n');
   var query = url.parse(request.url,true).query;
   //console.log('query: ',query);
   if (query.action === "install"){
       let connection = ConnectionService.getConnection(mysql);
       MoInstall.install(connection);
       response.end(JSON.stringify({operationOK: true, message: "installation ok"}));
   }
   
   if (query.action === "get" && query.entity === "task"){
       let connection = ConnectionService.getConnection(mysql);
       let sql = "select * from task";
       let data = [];
       connection.getData(sql,(err,rows,fields) => {
        //    response.setHeader('Content-Type', 'application/json');
           if (!err){
               data = rows;
           }
           response.end(JSON.stringify(data));
       });
       connection.close();
   }

   var route = utils.parseUrlOnly(request.url);
   let common = {request,response,mysql,ConnectionService};
   switch(route){
        case '/online': {
            response.end(JSON.stringify({operationOK: true}));
        }
        case '/task/list': {
            taskAPI.list(common);
            break;
        }
        case '/account/list': {
            accountAPI.list(common);
            break;
        }
        case '/movement/generateEntries': {
            movementAPI.generateEntries({request,response,mysql,ConnectionService,post});
            break;
        }
        case '/movement/generateBalance': {
            movementAPI.generateBalance({request,response,mysql,ConnectionService,post});
            break;
        }
        case '/movement/list': {
            MovementAPI.list(common);
            break;
        }
        case '/balance/list': {
            BalanceAPI.list(common);
            break;
        }
        case '/entry/list': {
            EntryAPI.list(common);
            break;
        }
        case '/generate': {
            let generate = (modelName) => {
                let model = MoSQL.createModel(modelName);
                MoScaffold.init(model);
                MoScaffold.generateTypeFile();
                MoScaffold.generateAPIFile();
            };
            generate('movement');
            generate('entry');
            generate('balance');
            response.end(JSON.stringify({operationOK: true, message: 'generation ok'}));
        }
   }

   if (request.method == 'OPTIONS') {
       var headers = {};
      // IE8 does not allow domains to be specified, just the *
      // headers["Access-Control-Allow-Origin"] = req.headers.origin;
      headers["Access-Control-Allow-Origin"] = "*";
      headers["Access-Control-Allow-Methods"] = "POST, GET, PUT, DELETE, OPTIONS";
      headers["Access-Control-Allow-Credentials"] = false;
      headers["Access-Control-Max-Age"] = '86400'; // 24 hours
      //headers["Access-Control-Allow-Headers"] = "X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept";
      headers["Access-Control-Allow-Headers"] = "X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept, Access-Control-Allow-Headers, Origin, Authorization";
    //   headers["Access-Control-Allow-Headers"] = "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers";
      //headers["Access-Control-Allow-Headers"] = "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type";
      response.writeHead(200, headers);
      response.end();
   }

    var body = '', post;
   if (request.method == 'POST') {

        request.on('data', function (data) {
            Log(`Receiving data for request ${request.method} ${request.url}`);
            body += data;

            // Too much POST data, kill the connection!
            // 1e6 === 1 * Math.pow(10, 6) === 1 * 1000000 ~~~ 1MB
            // 1e7 === 1 * Math.pow(10, 7) === 1 * 10000000 ~ 10MB
            if (body.length > 1e7)
                request.connection.destroy();
        });

        request.on('end', function () {
            //post = qs.parse(body);
            post = JSON.parse(body);
            if (post.tsk_id){
                Log(`Processing request ${request.method} for ${request.url} for task id: ${post.tsk_id} / ${post.tsk_name}`);
            }
            let requestCommon = {request,response,mysql,ConnectionService,post};

            switch(route){
                case '/task/create': {
                    taskAPI.create(requestCommon);
                    break;
                }

                case '/task/update': {
                    taskAPI.update(requestCommon);
                    break;
                }

                case '/task/batch': {
                    taskAPI.batch(requestCommon);
                    break;
                }

                case '/task/sync': {
                    taskAPI.sync(requestCommon);
                    break;
                }

                case '/movement/batch': {
                    MovementAPI.batch(requestCommon);
                    break;
                }
            }
        });

        /*if (response._headers["content-type"] === "application/json"){
            var headers = {};
            // IE8 does not allow domains to be specified, just the *
            // headers["Access-Control-Allow-Origin"] = req.headers.origin;
            headers["Access-Control-Allow-Origin"] = "*";
            headers["Access-Control-Allow-Methods"] = "POST, GET, PUT, DELETE, OPTIONS";
            headers["Access-Control-Allow-Credentials"] = false;
            headers["Access-Control-Max-Age"] = '86400'; // 24 hours
            //headers["Access-Control-Allow-Headers"] = "X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept";
            headers["Access-Control-Allow-Headers"] = "X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept, Access-Control-Allow-Headers, Origin";
            //   headers["Access-Control-Allow-Headers"] = "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers";
            //headers["Access-Control-Allow-Headers"] = "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type";
            response.writeHead(200, headers);
            response.end(JSON.stringify({processing: true}));
            //response.end();
        }*/
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
      if (response._headers["content-type"] !== "application/json"){
        response.end('excecuting generation\n');
      }
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

       //console.log("end");
       LogRequest(request,'end');
//    }

}).listen(8081);

// Console will print the message
console.log('Server running at http://127.0.0.1:8081/');
