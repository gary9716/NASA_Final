shell = require('shelljs');
if (!shell.which('ps')) {
  shell.echo('no ps command on this computer');
  shell.exit(1);
}

var numFields = 7;

//'ps -eo state,pid,user,etime,%cpu,%mem,args --sort user' //output all processes information in standard format
//'ps -eo state,pid,user,etime,%cpu,%mem,args --sort user | sed -n "/^Z.*/p"' //filter out zombie processes

shell.exec('ps -eo state,pid,user,etime,%cpu,%mem,args --sort user', { silent: true }, function(code, output) {
  if(code == 0) { //successfully executed
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
    var strToTransmit = JSON.stringify(allData);
    //console.log(strToTransmit);
    var objParsed = JSON.parse(strToTransmit);
    console.log(objParsed);
  }
});