'use strict';

clientApp.controller('MainCtrl', function($scope, socket) {
	$scope.userName = '';
	socket.emit('nav', {loc: 'main'});

	$scope.$on('main:info', function(event, data) {
		$scope.$apply(function() {
			$scope.userName = data.username;
		});
	});
});
