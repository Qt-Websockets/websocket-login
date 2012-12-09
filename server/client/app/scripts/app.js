'use strict';

var clientApp = angular.module('clientApp', []);

clientApp.config(['$routeProvider', '$locationProvider', '$httpProvider', function($routeProvider, $locationProvider,$httpProvider) {
	$routeProvider
		.when('/', {
			templateUrl: 'views/main.html',
			controller: 'MainCtrl'
		})
		.when('/chat', {
			templateUrl: 'views/chat.html',
			controller: 'ChatCtrl'
		})
		.when('/settings', {
			templateUrl: 'views/settings.html',
			controller: 'SettingsCtrl'
		})
		.when('/404', {
			templateUrl : 'views/404.html'
		})
		.otherwise({
			redirectTo: '/404'
		});
  }]);


clientApp.factory('socket', function ($rootScope) {
	var socket = io.connect('https://www.snakebyte.net:8585');


	// Basic connect / disconnect socket bindings
	socket.on('connect', function () {
		console.log('Connected');
	});
	
	socket.on('disconnect', function () {
		console.log('Disconnected');
	});


	// Navigation binding 
	socket.on('main:info', function (data) {
		$rootScope.$broadcast("main:info", data);
		console.log('Home page loaded');
	});




	socket.on('chat:message', function (data) {
		var msg = data.msg;
		$rootScope.$broadcast("chat:message", msg);
		console.log('Chat message recieved');
	});

	socket.on('chat:users', function (data) {
		$rootScope.$broadcast("chat:users", data);
		console.log('User list recieved');
	});

	socket.on('chat:rooms', function (rooms) {
		$rootScope.$broadcast("chat:rooms", rooms);
		console.log('Room list recieved');
	});

	socket.on('chat:history', function (history) {
		$rootScope.$broadcast("chat:history", history);
        // insert every single message to the chat window
        console.log('Chat history recieved');
    });



	return {
		on: function (eventName, callback) {
			socket.on(eventName, function () {  
				var args = arguments;
				$rootScope.$apply(function () {
					callback.apply(socket, args);
				});
			});
		},
		emit: function (eventName, data, callback) {
			socket.emit(eventName, data, function () {
				var args = arguments;
				$rootScope.$apply(function () {
					if (callback) {
						callback.apply(socket, args);
					}
				});
			})
		}
	};
});


