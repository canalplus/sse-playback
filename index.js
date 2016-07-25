#!/usr/bin/env node
(function() {
  var express    = require('express');
  var program    = require('commander');
  var chalk      = require('chalk');
  var path       = require('path');
  var morgan     = require('morgan');
  var bodyParser = require('body-parser');
  var package    = require('./package.json');
  var app        = express();

  program
      .version(package.version)
      .option('-p, --port <port>', 'port to listen events (3000 by default')
      .parse(process.argv);

  process.on('SIGINT', function() {
  	console.log(chalk.red('Received SIGINT.'));
  	server.close();
  	console.log('Exit.');
  	process.exit(0);
  });

  app.use(bodyParser.json()); // for parsing application/json
  app.use(morgan('combined'));

  var port = program.port || 3000;

  var sseClients = [];

  app.get("/stream", function(req, res) {
    req.socket.setTimeout(Number.MAX_VALUE);
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });
    // todo, do not add same client multiple times
    sseClients.push(res);
    console.log("[SSE] new client registered");
    res.write('\n');
  });

  app.post('/playback', function(req, res) {
  	if(!req.query.url) {
  	  return res.sendStatus(400);
  	}

  	var playback = require(path.normalize(req.query.url));

  	playback.forEach(function(data) {
  	  setTimeout(function(){
        console.log('[SEND] ' + chalk.green('event: ') + chalk.grey(JSON.stringify(data)));
	    var id   = (new Date()).toLocaleTimeString();
	    sseClients.forEach(function(element, index, array) {
	      element.write('id: ' + id + '\n');
	      element.write("event: " + data.event + '\n');
	      // extra newline is not an error
	      try {
	      	element.write("data: " + JSON.stringify(data.data) + '\n\n');
	      } catch (e) {
	      	element.write("data: " + data.data + '\n\n');
	      }
	    });
	  }, data.ts);
	});
    res.sendStatus(200);
  });

  var server = app.listen(port);
})();
