var mysql = require('mysql');
var fs = require('fs');
var https = require('https');

var express = require('express');
var app = express();

var options = {
  key: fs.readFileSync('./key.pem'),
  cert: fs.readFileSync('./cert.pem')
};

var server = https.createServer(options, app);
var io = require('socket.io')(server, {
    cors: {
	origin: '*'
    },
     handlePreflightRequest: function (req, res) {
        var headers = {
    	    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    	    'Access-Control-Allow-Origin': 'http://localhost:3001',
    	    'Access-Control-Allow-Credentials': true
	};
        res.writeHead(200, headers);
	res.end();
    }
});

var con = mysql.createConnection({
    host: "localhost",
    user: "live",
    password: "live_password",
    database: "live"
});

var socketIdGuid = []
var socketIdStreamId = []

con.connect(function(err) {
  if (err) throw err;
  console.log("Connected!");
});

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html')
});

server.listen(4000, () => {
    console.log('Listening on port *: 4000');
});

io.on('connection', (socket) => {
    console.log('connected + 1')
    socket.emit('connections', Object.keys(io.sockets.connected).length);

    socket.on('disconnect', () => {
	con.query(
	    "INSERT INTO event (uid,type, datetime, stream_id, socket_id) values(?, ?, ?, ?, ?)",
	    [socketIdGuid[socket.id], 1, Date.now() / 1000 | 0, socketIdStreamId[socket.id], socket.id],
	    function (err, result) {
		if (err) throw err;
		console.log("Result: " + result);
	    }
	)

        console.log("A user disconnected");
    });

    socket.on('chat-message', (data) => {
	console.log('chat-msg')
        socket.broadcast.emit('chat-message', (data));
    });

    socket.on('typing', (data) => {
	console.log('typing')
        socket.broadcast.emit('typing', (data));
    });

    socket.on('stopTyping', () => {
	console.log('stopTyping')
        socket.broadcast.emit('stopTyping');
    });

    socket.on('joined', (data) => {
	console.log('joined')
        socket.broadcast.emit('joined', (data));
    });

    socket.on('leave', (data) => {
	console.log('leave')
        socket.broadcast.emit('leave', (data));
    });

    socket.on('setUid', (uid, streamId) => {
	socketIdGuid[socket.id] = uid
	socketIdStreamId[socket.id] = streamId

	con.query(
	    "INSERT INTO event (uid, type, datetime, stream_id, socket_id) values(?, ?, ?, ?, ?)",
	    [uid, 0, Date.now() / 1000 | 0, streamId, socket.id],
	    function (err, result) {
		if (err) throw err;
		console.log("Result: " + result);
	    });

	console.log('set uid')
    })
});