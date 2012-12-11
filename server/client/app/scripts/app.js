'use strict';

function set_overlay(state) {
   var docHeight = $(document).height();

   if(state == true) {
   		if($("#overlay").length == 0) {
			$("body").append("<div id='overlay'></div>");

			$("#overlay")
				.height(docHeight)
				.css({
					'opacity' : 0,
					'position': 'absolute',
					'top': 0,
					'left': 0,
					'background-color': 'black',
					'width': '100%',
					'z-index': 5000
				})
				.animate({ opacity: 0.66 }, 300
			);


		}	
	} else {
		if($("#overlay").length > 0) {
			$("#overlay").animate({ opacity: 0 }, 300, function() {
				$("#overlay").remove();
			});
		}
	}
}


// AngularJS init
var clientApp = angular.module('clientApp', ['ngCookies']);

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
		set_overlay(false);
		console.log('Connected');
	});
	
	socket.on('disconnect', function () {
		set_overlay(true);
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


