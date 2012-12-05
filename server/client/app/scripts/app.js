'use strict';

var clientApp = angular.module('clientApp', []);

clientApp.config(['$routeProvider', '$locationProvider', '$httpProvider', function($routeProvider, $locationProvider,$httpProvider) {
	$routeProvider
		.when('/', {
			templateUrl: 'views/main.html',
			controller: 'MainCtrl'
		})
		.when('/settings', {
			templateUrl: 'views/settings.html',
			controller: 'SettingsCtrl'
		})
		.when('/404', {
			templateUrl : 'views/404.html'
		})
		.otherwise({
			redirectTo: '/'
		});
  }]);


clientApp.factory('socket', function ($rootScope) {
	var socket = io.connect('https://www.snakebyte.net:8585');
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