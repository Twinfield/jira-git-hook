#!/usr/bin/node
var fs = require('fs');
var path = require('path');
var exec = require('child_process').exec;

var scriptname = path.basename(process.argv[1]);

if (scriptname === 'gitjira.js') {
    scriptname = path.dirname(process.argv[1]).split("/").slice(-1)+"";
}

if (process.argv[2] == 'test') {
    scriptname = 'test';
}

switch (scriptname) {
   case 'commit-msg':
      commit_msg();
   break;
   case 'pre-receive':
      pre_receive();
   break;
   case 'update':
      update();
   break;
   case 'test': 
      dotest();
   break;
   default:	
      log("Script was called in incorrect way - should be or commit-msg or pre-receive, but was called as '" + scriptname + "'\n");
      process.exit(1);
   break;
}

function log(msg) {
   process.stderr.write(msg + "\n");
}

function trim(string)
{
   return string.replace(/(^\s+)|(\s+$)/g, "");
}

function get_jira_config(callback) {
   var config;
   try {
      config = require('./jira.config.js');
      return callback(config.username, config.password, config.url);
   } catch (e) { };    
   var git = exec('git config jira.login', function(err, stdin, stderr) {
      var login = trim(stdin);
      git = exec('git config jira.password', function(err, stdin, stderr) {
         var password = trim(stdin);
         git = exec('git config jira.url', function(err,stdin,stderr) {
            var url = trim(stdin);
            callback(login,password,url);
         });
      });
   }); 
}

function check_issue(issue, callback) {
   var https = require('https');
   get_jira_config(function(username, password, jiraUrl) {
	jiraUrl += '/rest/api/latest/issue/' + issue;	
	var options = require('url').parse(jiraUrl);
      var request = https.request(options,
       function(res){ 
         var data = '';
         res.setEncoding('utf8');
         res.on('data', function (chunk) {
           data += chunk;
         }); 
	 res.on('error', function(e) {
		log("Problem with request: "+e.message);
	 });
         res.on('end', function() {			
            var obj;
            try {
               obj = JSON.parse(data);
            } 
            catch(err) {
               if (data.indexOf('HTTP Status 401') > -1){
                  log("Jira error: Authantication failed\n");
                  if (username == "") {
                     log("To configure your Jira login and password please execute\n");
                     log("\t git config jira.login <login> \n");
                     log("and \n\t git config jira.password <password>\n");
                  }
                  process.exit(1);
               }
	       var inspect = require('util').inspect;
		log(inspect(err));
		log(inspect(data));
               return callback(null);
            }
            if (obj.errorMessages && obj.errorMessages.length > 0) {
               for (var i = 0; i < obj.errorMessages.length; ++i){
                  log("Jira error: "+obj.errorMessages[i]+"\n");
               }
               callback(null);
            }
            else {
               callback({
                  status:obj.fields.status?obj.fields.status.name:"", 
                  assignee: obj.fields.assignee?obj.fields.assignee.name:"",
                  type: obj.fields.issuetype?obj.fields.issuetype.name:""
               });
            }
         });
      });
      request.end();
   });
}

function check_comment(comment, callback) {
   var pattern = /\[\w+\-\d+\]/gi;
   var issues = comment.match(pattern);
   var good_issues = 0;
   var processed = 0;
   if (!issues || issues.length == 0) {
      log("Comment \n\t" + comment + " does not contain any issues");
      return callback(false);
   }
   issues.forEach(function(issue) {
      issue = issue.substr(1, issue.length-2);
      check_issue(issue, function(i) { 
         return function(data) {
            if (data && data.status == "In Progress") good_issues ++;
            else {
               if (!data) log("Commit error: issue " + i + " does not exists\n");
               else log("Commit error: issue "+i+" has invalid status:"+data.status+"\n");
            }
            if (++processed == issues.length) {
               if  (good_issues == processed) callback(true);
               else {
                  log("\nIn comment message there are "+processed+" issues, but suitable only "+good_issues);
                  callback(false);
               }
            }	
         }
      }(issue));
   });
}

function commit_msg() {
    var comment = fs.readFileSync(process.argv[2]) + "";
    check_comment(comment, function(result) {
       process.exit(result?0:1);
    });
}

function pre_receive() {
    process.exit(0);    
}

function update() {
   var refname = process.argv[2];
   var oldrev = process.argv[3];
   var newrev = process.argv[4];

   var param = oldrev != '0000000000000000000000000000000000000000' 
      ? (oldrev + '..' + newrev)
      : newrev;

   var git = exec('git rev-list --no-merges ' + param, function(error, stdout, stderr) {
      if (error) {
         log("Can't run git:"+error);
         process.exit(1);    
      } else {
         var refs = [];
         stdout.split("\n").forEach(function(ref) { if (ref != "") refs.push(ref); });
         var done = 0;
         var good = 0;
         refs.forEach(function(ref) {
            get_comment(ref, function(err, ref, comment) {
               if (err) log("Error: "+err);
               else {    			
                  check_comment(comment, function(result) { 
                     if (result) good++;
                     else log("Failed commit with comment '" + comment + "'");
                     if (++done == refs.length) {
                        if (good != done) log("Failed " + (done-good) + " commits from " + done);
                        process.exit(good == done ? 0 : 1);
                     }
                  });
               }
            });
         });
      }	
   });       
}

function get_comment(ref, callback) {
   var git = exec('git cat-file commit '+ ref, function(error, stdout, stderr) {
      if (error) return callback(error);
      var lines = stdout.split('\n\n');
      callback(null, ref, stdout.substr(stdout.indexOf('\n\n') + 2));
   });
}

function dotest() {
  var issue = process.argv[3];
  if (!issue) {
	log("To test jira hook please provide JIRA issue number");
	process.exit(1);
  } 
  check_issue(issue, function (data) {
	log("Result: ");	
	log(require('util').inspect(data));
  });
}