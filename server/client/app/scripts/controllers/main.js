'use strict';

clientApp.controller('MainCtrl', function($scope, socket) {
	socket.on('connect', function () {
		console.log('Connected!!!');
		$scope.awesomeThings = [
			'web',
			'sockets',
			'rock'
		];
	});
	socket.on('handshake', function (data) {
		console.log('Connected!!!');
		$scope.awesomeThings = [
			'usrename:',
			data.username
		];
	});
	socket.on('disconnect', function () {
		console.log('Disconnected');
		$scope.awesomeThings = [
			'disconnected'
		];
	});
	$scope.awesomeThings = [
		'HTML5 Boilerplate',
		'AngularJS',
		'Testacular'
	];
});
