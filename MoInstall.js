"use strict";
var MoSQL = require("./MoSQL");
var MoInstall = (function(MoSQL){
    let install = (connection) => {
        let models = [
        'Catalog'
        ,'User'
        ,'Logger'
        ,'Task','TaskTimeTracking','TaskSchedule'
        , 'Account','Category','Place','Movement','Entry','Balance'
        , 'LastTime','LastTimeHistory'
        ];
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
        addCatalog('CATALOGS',4,'BOOLEAN','A YES/NO PARSE',4,new Date(),new Date(),1);
        addCatalog('CATALOGS',5,'USER_TYPES','USER TYPES FOR USER CLASSIFICATION',4,new Date(),new Date(),1);
        addCatalog('CATALOGS',6,'ACCOUNT_TYPES','ACCOUNT TYPES FOR ACCOUNT CLASIFICATION',4,new Date(),new Date(),1);
        addCatalog('CATALOGS',7,'MOVEMENT_TYPES','MOVEMENT TYPES FOR HANDLING MONEY',4,new Date(),new Date(),1);
        //#region CATALOG_PERMISSIONS
        addCatalog("CATALOG_PERMISSIONS",1,"ADD AND EDIT RECORDS","USERS CAN ADD RECORDS AND CAN EDIT RECORDS ON THIS CATALOG",8,new Date(),new Date(),1);
        addCatalog("CATALOG_PERMISSIONS",2,"ADD AND NOT EDIT RECORDS","USERS CAN ADD RECORDS AND CAN NOT EDIT RECORDS ON THIS CATALOG",8,new Date(),new Date(),1);
        addCatalog("CATALOG_PERMISSIONS",3,"NOT ADD AND EDIT RECORDS","USERS CAN NOT ADD RECORDS AND CAN EDIT RECORDS ON THIS CATALOG",8,new Date(),new Date(),1);
        addCatalog("CATALOG_PERMISSIONS",4,"NOT ADD AND NOT EDIT RECORDS","USERS CAN NOT ADD RECORDS AND CAN NOT EDIT RECORDS ON THIS CATALOG",8,new Date(),new Date(),1);
        addCatalog('CATALOG_PERMISSIONS',5,'EDIT AND DELETE THIS RECORD','USERS CAN EDIT AND CAN DELETE THIS RECORD',8,new Date(),new Date(),1);
        addCatalog('CATALOG_PERMISSIONS',6,'EDIT AND NOT DELETE THIS RECORD','USERS CAN EDIT AND CAN NOT DELETE THIS RECORD',8,new Date(),new Date(),1);
        addCatalog('CATALOG_PERMISSIONS',7,'NOT EDIT AND DELETE THIS RECORD','USERS CAN NOT EDIT AND CAN DELETE THIS RECORD',8,new Date(),new Date(),1);
        addCatalog('CATALOG_PERMISSIONS',8,'NOT EDIT AND NOT DELETE THIS RECORD','USERS CAN NOT EDIT AND CAN NOT DELETE THIS RECORD',8,new Date(),new Date(),1);
        //#endregion
        addCatalog('RECORD_STATUS',1,'ACTIVE','THE RECORD IS ACTIVE AND CAN BE USED IN THE APPLICATION',8,new Date(),new Date(),1);
        addCatalog('RECORD_STATUS',2,'CANCELLED','THE RECORD IS CANCELLED AND IT CAN NOT BE USED BY THE APPLICATION',8,new Date(),new Date(),1);

        addCatalog('BOOLEAN',1,'NO','NO, MEANING IT DOES NOT APPLY THE PROPERTY OR DESCRIPTION',8,new Date(),new Date(),1);
        addCatalog('BOOLEAN',2,'YES','YES, MEANING IT APPLIES THE DESCRIPTION RELATED',8,new Date(),new Date(),1);
        
        addCatalog('USER_TYPES',1,'END USER','THE END USER OF THE APPLICATION',8,new Date(),new Date(),1);
        addCatalog('USER_TYPES',2,'ADMINISTRATOR','AN ADMINISTRATOR OF THE APPLICATION',8,new Date(),new Date(),1);

        addCatalog('ACCOUNT_TYPES',1,'DEBIT','ACCOUNT WITH DEBIT BALANCE ONLY',8,new Date(),new Date(),1);
        addCatalog('ACCOUNT_TYPES',2,'CREDIT','ACCOUNT WITH CREDIT BALANCE',8,new Date(),new Date(),1);
        addCatalog('ACCOUNT_TYPES',3,'LOAN','ACCOUNT TO KEEP BALANCE OF A LOAN',8,new Date(),new Date(),1);
        addCatalog('ACCOUNT_TYPES',4,'OTHER','SPECIAL ACCOUNT',8,new Date(),new Date(),1);

        addCatalog('MOVEMENT_TYPES',1,'EXPENSE','INDICATES THIS IS AN EXPENSE MOVEMENT',8,new Date(),new Date(),1);
        addCatalog('MOVEMENT_TYPES',2,'INCOME','INDICATES THIS IS AN INCOME MOVEMENT',8,new Date(),new Date(),1);
        //#region TASK_REPETITION_TYPE
        addCatalog('TASK_REPETITION_TYPE',1,'DAILY','INDICATES THIS TASK REPEATS ON A DAILY BASIS',8,new Date(),new Date(),1);
        addCatalog('TASK_REPETITION_TYPE',2,'WEEKLY','INDICATES THIS TASK REPEATS ONCE A WEEK',8,new Date(),new Date(),1);
        addCatalog('TASK_REPETITION_TYPE',3,'BI-WEEKLY','INDICATES THIS TASK REPEATS ONCE EACH TWO WEEKS',8,new Date(),new Date(),1);
        addCatalog('TASK_REPETITION_TYPE',4,'MONTHLY','INDICATES THIS TASK REPEATS ONCE A MONTH',8,new Date(),new Date(),1);
        addCatalog('TASK_REPETITION_TYPE',5,'YEARLY','INDICATES THIS TASK REPEATS ONCE A YEAR',8,new Date(),new Date(),1);
        addCatalog('TASK_REPETITION_TYPE',6,'CUSTOM FREQUENCY','INDICATES THIS TASK REPEATS WITH A GIVEN CUSTOM FREQUENCY',8,new Date(),new Date(),1);
        addCatalog('TASK_REPETITION_TYPE',7,'SOME DAYS OF THE WEEK','INDICATES THIS TASK REPEATS SOME DAYS OF THE WEEK',8,new Date(),new Date(),1);
        addCatalog('TASK_REPETITION_TYPE',8,'A DAY OF EACH MONTH','INDICATES THIS TASK REPEATS ONCE EACH MONTH WITH A SPECIAL RULE',8,new Date(),new Date(),1);
        //#endregion
        addCatalog('TASK_REPETITION_END_AT',1,'FOREVER','INDICATES THIS TASK REPEATS ON A DAILY BASIS',8,new Date(),new Date(),1);
        addCatalog('TASK_REPETITION_END_AT',2,'END ON DATE','INDICATES THIS TASK REPEATS ON A DAILY BASIS',8,new Date(),new Date(),1);
        addCatalog('TASK_REPETITION_END_AT',3,'END AFTER N REPETITIONS','INDICATES THIS TASK REPEATS ON A DAILY BASIS',8,new Date(),new Date(),1);

        addCatalog('TASK_REPETITION_FREQUENCY',1,'DAYS','INDICATES THIS TASK REPEATS ON A DAILY BASIS',8,new Date(),new Date(),1);
        addCatalog('TASK_REPETITION_FREQUENCY',2,'WEEKS','INDICATES THIS TASK REPEATS ON A DAILY BASIS',8,new Date(),new Date(),1);
        addCatalog('TASK_REPETITION_FREQUENCY',3,'MONTHS','INDICATES THIS TASK REPEATS ON A DAILY BASIS',8,new Date(),new Date(),1);
        addCatalog('TASK_REPETITION_FREQUENCY',4,'YEARS','INDICATES THIS TASK REPEATS ON A DAILY BASIS',8,new Date(),new Date(),1);
        
        addCatalog('CURRENCIES',1,'MXN','MEXICAN PESO',8,new Date(),new Date(),1);

        inserts.forEach(i => {
            connection.executeSql(i,(err) => {
                if (err){
                    console.log(err);
                }
            });
        });
        console.log('Catalog: inserted ' + inserts.length);

        /* User */
        inserts = [];
        t = MoSQL.createModel("User");
        let addUser = (UserId,Password,FirstName,MiddleName,LastName,UserType,Email,IsConnected,LoginAttempts,DateLastLoginAttempt,DatePwdChange,IsPasswordTemporal,IsBlocked,Configuration,CreationDate,ModDate,Status) => {
            inserts.push(t.setAll({UserId,Password,FirstName,MiddleName,LastName,UserType,Email,IsConnected,LoginAttempts,DateLastLoginAttempt,DatePwdChange,IsPasswordTemporal,IsBlocked,Configuration,CreationDate,ModDate,Status}).toInsertSQL());
        };

        addUser('dummy','dummypwd','Dummy','D.','Doe',1,'dummy@dummy.com',1,0,null,null,1,1,null,new Date(),new Date(),1);
        addUser('admin','admin','Admin','-','-',2,'admin@domain.com',1,0,null,null,1,1,null,new Date(),new Date(),1);
        addUser('mycomplexsoul','*','Daniel','-','-',2,'mycomplexsoul@gmail.com',1,0,null,null,1,1,null,new Date(),new Date(),1);
        
        inserts.forEach(i => {
            connection.executeSql(i,(err) => {
                if (err){
                    console.log(err);
                }
            });
        });
        console.log('User: inserted ' + inserts.length);

        /* Account */
        inserts = [];
        t = MoSQL.createModel("Account");
        let addAccount = (AccountId,Name,AccountType,Comment,CheckDay,AverageMinBalance,PaymentDay,User,CreationDate,ModDate,Status) => {
            inserts.push(t.setAll({AccountId,Name,AccountType,Comment,CheckDay,AverageMinBalance,PaymentDay,User,CreationDate,ModDate,Status}).toInsertSQL());
        };

        addAccount('0000000000000001','CAPITAL',4,'Capital Account',1,0,0,'all',new Date(),new Date(),1);
        
        inserts.forEach(i => {
            connection.executeSql(i,(err) => {
                if (err){
                    console.log(err);
                }
            });
        });
        console.log('User: inserted ' + inserts.length);

        /* end data */

        console.log('populate initial data end');
    };

    return {
        install
    };
})(MoSQL);
module.exports = MoInstall;