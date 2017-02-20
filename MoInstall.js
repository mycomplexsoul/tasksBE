"use strict";
var MoSQL = require("./MoSQL");
var MoInstall = (function(MoSQL){
    let install = (connection) => {
        let models = ['Catalog','Task'];
        let e;
        let method = function(msgOk){
            return function(err){
                if (err){
                    console.log(err);
                } else {
                    if (msgOk){
                        console.log(msgOk);
                    }
                }
            };
        };

        models.forEach((model) => {
            e = MoSQL.createModel(model);

            connection.executeSql(`drop view if exists ${e.viewName}`,method(`view ${e.viewName} droped`));
            connection.executeSql(`drop table if exists ${e.tableName}`,method(`table ${e.tableName} droped`));
            connection.executeSql(e.createSQL(),method(`table ${e.tableName} created`));
            connection.executeSql(e.createPK(),method(`PK created`));
            connection.executeSql(e.createViewSQL(),method(`view ${e.viewName} created`));
        });

        populateInitialData(connection);
        connection.close();
        console.log('installation finished');
    };

    let populateInitialData = (connection) => {
        let inserts = [];
        let t;

        console.log('populate initial data start...');
        
        /* Catalog */
        t = MoSQL.createModel("Catalog");
        let addCatalog = (CatalogId,Sequential,Name,Description,Permission,CreationDate,ModDate,Status) => {
            inserts.push(t.setAll({CatalogId,Sequential,Name,Description,Permission,CreationDate,ModDate,Status}).toInsertSQL());
        };

        addCatalog("CATALOGS",1,"LIST OF ALL CATALOGS","A LIST OF ALL CATALOGS, EACH CATALOG SHOULD BE LISTED HERE FOR PERMISSION CONFIGURATION",1,new Date(),new Date(),1);
        addCatalog("CATALOGS",2,"CATALOG_PERMISSIONS","PERMISSIONS ON CATALOG AND PERMISSIONS ON RECORD",4,new Date(),new Date(),1);
        addCatalog('CATALOGS',3,'RECORD_STATUS','STATUS FOR RECORD ITEM',4,new Date(),new Date(),1);
        
        addCatalog("CATALOG_PERMISSIONS",1,"ADD AND EDIT RECORDS","USERS CAN ADD RECORDS AND CAN EDIT RECORDS ON THIS CATALOG",8,new Date(),new Date(),1);
        addCatalog("CATALOG_PERMISSIONS",2,"ADD AND NOT EDIT RECORDS","USERS CAN ADD RECORDS AND CAN NOT EDIT RECORDS ON THIS CATALOG",8,new Date(),new Date(),1);
        addCatalog("CATALOG_PERMISSIONS",3,"NOT ADD AND EDIT RECORDS","USERS CAN NOT ADD RECORDS AND CAN EDIT RECORDS ON THIS CATALOG",8,new Date(),new Date(),1);
        addCatalog("CATALOG_PERMISSIONS",4,"NOT ADD AND NOT EDIT RECORDS","USERS CAN NOT ADD RECORDS AND CAN NOT EDIT RECORDS ON THIS CATALOG",8,new Date(),new Date(),1);
        addCatalog('CATALOG_PERMISSIONS',5,'EDIT AND DELETE THIS RECORD','USERS CAN EDIT AND CAN DELETE THIS RECORD',8,new Date(),new Date(),1);
        addCatalog('CATALOG_PERMISSIONS',6,'EDIT AND NOT DELETE THIS RECORD','USERS CAN EDIT AND CAN NOT DELETE THIS RECORD',8,new Date(),new Date(),1);
        addCatalog('CATALOG_PERMISSIONS',7,'NOT EDIT AND DELETE THIS RECORD','USERS CAN NOT EDIT AND CAN DELETE THIS RECORD',8,new Date(),new Date(),1);
        addCatalog('CATALOG_PERMISSIONS',8,'NOT EDIT AND NOT DELETE THIS RECORD','USERS CAN NOT EDIT AND CAN NOT DELETE THIS RECORD',8,new Date(),new Date(),1);
        
        addCatalog('RECORD_STATUS',1,'ACTIVE','THE RECORD IS ACTIVE AND CAN BE USED IN THE APPLICATION',8,new Date(),new Date(),1);
        addCatalog('RECORD_STATUS',2,'CANCELLED','THE RECORD IS CANCELLED AND IT CAN NOT BE USED BY THE APPLICATION',8,new Date(),new Date(),1);

        inserts.forEach(i => {
            connection.executeSql(i,(err) => {
                if (err){
                    console.log(err);
                }
            });
        });
        console.log('Catalog: inserted ' + inserts.length);

        console.log('populate initial data end');
    };

    return {
        install
    };
})(MoSQL);
module.exports = MoInstall;