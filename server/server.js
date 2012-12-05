/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
//  Game pairing service and social platform for html 5 web games by Alexander Herlan
//
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
"use strict";

// Process name that shows up in Linux. You will see this name in eg. 'ps' or 'top' command
process.title = 'gamedeck'; 

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Required Modules
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

var http = require('http'), 
	fs = require('fs'),
	redis = require('redis'),
	express = require('express'),
	socketio = require('socket.io'),
	connect = require('connect'),
	session_store = require('connect-redis')(connect),
	bcrypt = require('bcrypt');

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Global variables
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
var SECOND = 1000;
var MINUTE = 60000;
var HOUR = 3600000;
var DAY = 86400000
var MONTH = 2628000000;


// Port where we'll run the express and socket.io server
var PORT = 8585;
// list of sockets belonging to ALL currently connected clients (users) 
var socket_clients = [ ];
// default session lengths
var SESS_LENGTH = HOUR;
// minimum username length
var MIN_USER_LENGTH = 4;
// maximum username length
var MAX_USER_LENGTH = 26;
// minimum password length
var MIN_PASS_LENGTH = 4;
// Password Salting Factor
var SALT_WORK_FACTOR = 10;
// Login attempts allowed
var MAX_LOGIN_ATTEMPTS = 5;
// list of all usernames currently in use
var user_names = [ ];
// latest 100 chat messages
var chat_history = [ ];
// list of available player colors
var colors = [ 'green', 'blue', 'darkred', 'purple', 'yellowgreen', 'darkblue', 'firebrick' ];
// SSL Certs
var SSL_OPTIONS = { 
	key:  fs.readFileSync('/etc/ssl/private/snakebyte.net.key'), 
	cert: fs.readFileSync('/etc/ssl/certs/www.snakebyte.net.crt'), 
	ca:   fs.readFileSync('/etc/ssl/certs/www.snakebyte.net.ca-bundle')
};


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Helper functions
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function log(msg) {
	console.log(fromat_time(new Date()) + ' - ' + msg);
}

// Helper function for escaping input strings
function html_escape(str) {
	return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;')
					  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Helper function for shuffling an array
function shuffle(arr) {
	for(var j, x, i = arr.length; i; j = parseInt(Math.random() * i), x = arr[--i], arr[i] = arr[j], arr[j] = x);
	return arr;
}

// format time for server console
function fromat_time(dt) {
	var ap = "AM";
	var hour = dt.getHours();
	if (hour   > 11) { ap = "PM";        }
	if (hour   > 12) { hour = hour - 12; }
	if (hour   == 0) { hour = 12;        }
	return (dt.getHours() < 10 ? '0' + hour : hour) + ':' + (dt.getMinutes() < 10 ? '0' + dt.getMinutes() + " " + ap : dt.getMinutes() + " " + ap);
}

 Array.prototype.removeByValue = function (val) {
	for (var i = 0; i < this.length; i++) {
	   var c = this[i];
	   if (c == val || (val.equals && val.equals(c))) {
		  this.splice(i, 1);
		  break;
	   }
	}
 };

function validateEmail(email) { 
	var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
	return re.test(email);
} 

function validateUsername(username) {
	var re = /[-!@#$%^&*()_+|~=`{}\[\]\\:";'<>?,.\/]/
	if(re.test(username)) {
		return false;
	} else {
		return true;
	}
	
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Redis initialization and configuration
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
var redis_client = redis.createClient();

redis_client.on("error", function (err) {
	console.log("Error " + err);
});


// add a default admin user

redis_client.sadd("users", "user:admin");
redis_client.hmset("user:admin", "username", "admin", "password", "$2a$10$bAwttHlPSF0n7eEPqiTqZeC702u9izHeFkBrtJF1tR1VrUjqMXWLG", "email", "admin@admin.com", "active_session", "");

redis_client.hgetall("user:admin", function (err, obj) {
	log('Configuring ' + obj.username + ' account...')
});

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Express Web Framework initialization and configuration 
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// setup a secure express webserver
var web_server = express.createServer(SSL_OPTIONS);


web_server.configure(function(){
	web_server.use(express.cookieParser());
	web_server.use(express.bodyParser());
	web_server.use(express.session({ store: new session_store({host:'127.0.0.1', port:6379, prefix:'user-sess_'}), secret: 'loldongs' , key: 'sid', cookie: { path: '/', httpOnly: true, maxAge: SESS_LENGTH }}));
	web_server.use(web_server.router);
	web_server.use(express.static('client/app/'));  // keep this at bottom, causes problems above other things, specifically sessions
});

web_server.get('/', function(req, res) {
	var sid = req.sessionID;
	var stored_session;

	redis_client.get('user-sess_' + sid, function(err, reply) {
		// reply is null when the key is missing
		stored_session = JSON.parse(reply);
		
		if(stored_session != null) {
			if(stored_session.username != null) {
				redis_client.hget('user:' + req.session.username, "active_session", function(err, obj) {
					if(obj == sid) {
						fs.readFile('client/app/index.html', 'utf8', function(err, text) {
							res.send(text);
						});
					} else {
						res.redirect('/login');
					}
				});

			} else {
				res.redirect('/login');
			}
		} else {
			res.redirect('/login');
		}
	});
});

web_server.get('/login', function(req, res) {
	var ip_address = req.connection.remoteAddress;
	var sid = req.sessionID;
	if(req.session.username == null) {
		redis_client.get('loginfail:' + ip_address, function(error, obj) {
			if(obj == null) { obj = 0; }

			if(obj < MAX_LOGIN_ATTEMPTS) {
				res.render(__dirname + '/client/app/login.ejs', {
					layout:false,
					locals: { errorMessage: "", userName: ""  }
				});
			} else {
				res.redirect('/fail');
			}
		});
	} else {
		redis_client.hget('user:' + req.session.username, "active_session", function(err, obj) {
			if(obj == sid) {
				res.redirect('/');
			} else {
				 req.session.username = null;
				 res.redirect('/login');
			}
		});
	}
});
web_server.post('/login', function(req, res) {
	var ip_address = req.connection.remoteAddress;
	var sid = req.sessionID;
	var username = req.body.username.toLowerCase().trim();
	var password = req.body.password;
	var remember = req.body.remember;


	var template_vars = null;


	redis_client.get('loginfail:' + ip_address, function(error, obj) {
		if(obj == null) { obj = 0; }

		if(obj < MAX_LOGIN_ATTEMPTS) {
			redis_client.hget("user:" + username, "password", function (err, actual_password) {
					if(actual_password == null) { actual_password = ''; }
					if((username.length >= MIN_USER_LENGTH) && (username.length <= MAX_USER_LENGTH)) {
						if(password.length >= MIN_PASS_LENGTH) {
							bcrypt.compare(password, actual_password, function(err, isMatch) {
						        if (err) return cb(err);
								if(isMatch) {
									if(remember == "true") {
										SESS_LENGTH = MONTH;
									}
									req.session.username = username;
									req.session.cookie.expires = new Date(Date.now() + SESS_LENGTH);
									req.session.cookie.maxAge = SESS_LENGTH;
									redis_client.hget('user:' + req.session.username, "active_session", function(err, obj) {
										if(obj != '') {
											var sid_prefix = 'user-sess_' + sid;
											redis_client.del(sid_prefix, function (err, obj) { 
												redis_client.hset("user:" + req.session.username, "active_session", sid, function(err, obj) {
													res.redirect('/');
												});
											});
										} else {
											redis_client.hset("user:" + req.session.username, "active_session", sid, function(err, obj) {
												res.redirect('/');
											});
										}
									});
								} else {
									
									redis_client.get('loginfail:' + ip_address, function(error, obj) {
										if(obj == null) {
											redis_client.setex('loginfail:' + ip_address, 30, '1', function(error, obj) {
												log("Failed login attempt by: " + ip_address + " - " + req.headers['user-agent']);
												res.render(__dirname + '/client/app/login.ejs', {
													layout:false,
													locals: { errorMessage: "Username or Password incorrect", userName: username }
												});
											});
										} else {
											redis_client.incr('loginfail:' + ip_address, function(error, obj){
												redis_client.pexpire('loginfail:' + ip_address, parseInt(obj) * (20*SECOND), function (error, obj) {
													res.render(__dirname + '/client/app/login.ejs', {
														layout:false,
														locals: { errorMessage: "Username or Password incorrect", userName: username }
													});
												});
											});
										}

									});
								}
						    });
						} else {
							template_vars = { errorMessage: "Please enter a valid password", userName: username }
						}
					} else {
						template_vars = { errorMessage: "Please enter a valid username", userName: username }
					}
					if(template_vars != null) {
						res.render(__dirname + '/client/app/login.ejs', {
							layout:false,
							locals: template_vars
						});
					}
			});
		} else {
			res.redirect('/fail');
		}
	});
});

web_server.get('/logout', function(req, res) {
	var username = req.session.username;
	var sid = req.sessionID;

	if(username != null) {
		sid = 'user-sess_' + sid;
		redis_client.del(sid, function (err, obj) {
			redis_client.hset("user:" + username, "active_session", "", function(err, obj) {
				res.redirect('/login');
			});
		});
		req.session = null;
	} else {
		res.redirect('/login');
	}
});

web_server.get('/register', function(req, res) {
	var ip_address = req.connection.remoteAddress;
	var sid = req.sessionID;
	if(req.session.username == null) {
		redis_client.get('loginfail:' + ip_address, function(error, obj) {
			if(obj == null) { obj = 0; }

			if(obj < MAX_LOGIN_ATTEMPTS) {
				res.render(__dirname + '/client/app/register.ejs', {
					layout:false,
					locals: { errorMessage: '', emailAddress: '', userName: '' }
				});
			} else {
				res.redirect('/fail');
			}
		});
	} else {
		res.redirect('/');
	}
});
web_server.post('/register', function(req, res) {
	var sid = req.sessionID;
	var username = req.body.username.toLowerCase().trim();
	var password = req.body.password;
	var password2 = req.body.password2;
	var email = req.body.email;

	var template_vars = null;

	if((username.length >= MIN_USER_LENGTH) && (username.length <= MAX_USER_LENGTH)) {
		if(validateUsername(username)) {
			if((username.split(" ").length - 1) <= 3) {
				if(validateEmail(email)) {
					if(password.length >= MIN_PASS_LENGTH) {
						if(password == password2) {
							redis_client.hgetall("user:" + username, function (err, obj) {
								if(obj == null) {
									bcrypt.genSalt(SALT_WORK_FACTOR, function(err, salt) {
										if (err) return next(err);
										// hash the password along with our new salt
										bcrypt.hash(password, salt, function(err, hash) {
											if (err) return next(err);
											redis_client.sadd("users", "user:"+username);
											redis_client.hmset("user:"+username, "username", username, "password", hash, "email", email, "active_session", sid);
											req.session.username = username;
											res.redirect('/');
										});
									});
								} else {
									res.render(__dirname + '/client/app/register.ejs', {
										layout:false,
										locals: { errorMessage: 'Username \'' + username + '\' is unavailable', emailAddress: email, userName: ''  }
									});
								}
							});
						} else {
							template_vars = { errorMessage: 'Passwords do not match', emailAddress: email, userName: username }
						}
					} else {
						template_vars = { errorMessage: 'Password must be at least ' + MIN_PASS_LENGTH + ' characters long', emailAddress: email, userName: username }
					}
				} else {
					template_vars = { errorMessage: 'Please enter a valid email address', emailAddress: email, userName: username }
				}
			} else {
				template_vars = { errorMessage: 'Username must contain less than 3 spaces', emailAddress: email, userName: username }
			}
		} else {
			template_vars = { errorMessage: 'Username must not contain any symbols', emailAddress: email, userName: username }
		}
	} else {
		template_vars = { errorMessage: 'Username must be between ' + MIN_USER_LENGTH + '-' + MAX_USER_LENGTH + ' characters long', emailAddress: email, userName: username }

	}
	if(template_vars != null) {
		res.render(__dirname + '/client/app/register.ejs', {
			layout:false,
			locals: template_vars
		});
	}
});

web_server.get('/fail', function(req, res) {
	if(req.session.username == null) {
		res.render(__dirname + '/client/app/fail.ejs', {
			layout:false,
			locals: { errorMessage: 'You have failed to log in, please try again in a short while' }
		});
	} else {
		res.redirect('/');
	}
});

web_server.listen(PORT, function () {
	log('Server is listening on port ' + PORT);
});


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Socket.io initialization and configuration
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
var socket_server = socketio.listen(web_server);

socket_server.configure(function() {
	socket_server.set('log level', 0);
	socket_server.set('transports', [
		'websocket'
	]);
});

socket_server.set('authorization', function (data, accept) {
   // check if there's a cookie header
	if (data.headers.cookie) {
		var parseCookie = require('cookie').parse;
		var cookie = parseCookie(data.headers.cookie);
		redis_client.get('user-sess_' + cookie['sid'], function(err, session) {
			if (err || !session) {
				accept('Error', false);
			} else {
				data.session = JSON.parse(session);
				accept(null, true);
			}
		});
	} else {
		accept('No cookie', false);
	}
});

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// App Entry Point:
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// when a user connects
socket_server.sockets.on('connection', function (socket) {
	var username = socket.handshake.session.username;
	// log the event to the server console
	log('User \'' + username + '\' has connected');

	// we need to know the connecting user's index in the 'clients' array
	// to remove them later when they disconnect
	var index = socket_clients.push(socket) - 1;


	socket.emit('handshake', {username: username});

	// when recieving a chat message from a user
	socket.on('chatmessage', function(message) {
		// log the message to the server console
		log(userName + ' says: ' + message.text);

		// keep a history of all sent messages
		var msg = {
			time: (new Date()).getTime(),
			text: html_escape(message.text),
			author: userName,
			color: userColor
		};
		chat_history.push(msg);
		chat_history = chat_history.slice(-100);  

		// broadcast message to all connected clients
		socket.emit('chatmessage', {msg: msg});
		socket.broadcast.emit('chatmessage', {msg: msg});
	});

	// when a user disconnects
	socket.on('disconnect', function () {
		log('User \'' + username + '\' has disconnected');
	});
});