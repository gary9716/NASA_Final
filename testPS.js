//default values
var updatingInterval = 30;
var checkingInterval = 60; //in seconds 
var zombieThreshold = 10;

if( process.argv.length > 4 ) {
    checkingInterval = parseInt(process.argv[2]);
    zombieThreshold = parseInt(process.argv[3]);
}
else if(process.argv.length > 3) {
    checkingInterval = parseInt(process.argv[2]);
}

var pubnubChannel = 'PSInfo';
var pubnub = require("pubnub")({
    ssl           : false,
    publish_key   : "pub-c-071abdd4-bbd4-4387-98e1-aab8abf4744a",
    subscribe_key : "sub-c-0caf38e0-1403-11e5-af43-0619f8945a4f"
});

var express = require('express');
var app = express();
var shell = require('shelljs');
if (!shell.which('ps')) {
  shell.echo('no ps command on this computer');
  shell.exit(1);
}

var numFields = 7;
//'ps -eo state,pid,user,etime,%cpu,%mem,args --sort user' //output all processes information in standard format
//'ps -eo state,pid,user,etime,%cpu,%mem,args --sort user | sed -n "/^Z.*/p"' //filter out zombie processes

var parsePSResult = function(output) {
  
    var linesOfData = output.split('\n');
    var allFieldNames = linesOfData[0].split(/[\s]+/);
    var allData = [];
    for(var i = 1;i < linesOfData.length;i++) {
      var singleData = {};
      var allFields = linesOfData[i].split(/[\s]+/);
      if(allFields.length >= numFields) {
        for(var j = 0;j < numFields - 1;j++) {
          singleData[allFieldNames[j]] = allFields[j];
        }
        
        var argsField = allFields[numFields - 1];
        for(var j = numFields;j < allFields.length;j++) {
          argsField = argsField.concat(' ', allFields[j]);
        }
        singleData[allFieldNames[numFields - 1]] = argsField;
        allData.push(singleData);
      }
    }

    //var strToTransmit = JSON.stringify(allData);
    //console.log(strToTransmit);
    //var objParsed = JSON.parse(strToTransmit);

    return allData;
  
};

var cachedPSInfo = null;

var updatePSInfo = function() {
    
    shell.exec('ps -eo state,pid,user,etime,%cpu,%mem,args --sort user', { silent: true }, function(code, output) {
    
    if(code == 0) { //successfully executed
        cachedPSInfo = parsePSResult(output);
    }

});
    
};

updatePSInfo(); //init fetch

setInterval(updatePSInfo, updatingInterval * 1000);

setInterval(function(){
    shell.exec('ps -eo state,pid,user,etime,%cpu,%mem,args --sort user | sed -n "/^Z.*/p"', { silent: true }, function(code, output) {
        if(code == 0) { //successful executed
            var zProcData = output.split('\n');
            var numZProcess = zProcData.length;
            if(zProcData[numZProcess - 1].length === 0) {
                numZProcess--;
            }
            console.log('current # zombie:' + numZProcess);
            if(numZProcess >= zombieThreshold) {
                console.log('reach zombie threshold');
                var message = { 
                    "EventCode" : 1, //number of zombie process reaches threshold
                    "#ZPS" : numZProcess
                };
                pubnub.publish({ 
                    channel   : pubnubChannel,
                    message   : message,
                    callback  : function(e) { console.log( "SUCCESS!", e ); },
                    error     : function(e) { console.log( "FAILED! RETRY PUBLISH!", e ); }
                });
            }
        }
    });
}, checkingInterval * 1000);

//pubnub.subscribe({
//    channel  : pubnubChannel,
//    callback : function(message) {
//        console.log( " > ", message );
//    }
//});


//http server logic

app.get('/parsedPS', function(req,res) {
    res.json(cachedPSInfo);
});

app.get('/parsedPSUncached', function(req,res) {
    updatePSInfo();
    res.json(cachedPSInfo);
});

var httpServer = app.listen(8000, function() {
    var serverPort = httpServer.address().port;
    
    console.log('listening at %s', serverPort);
});
