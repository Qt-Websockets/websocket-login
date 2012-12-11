'use strict';

clientApp.controller('SettingsCtrl', function($scope, $cookieStore) {

	if($cookieStore.get('show_joinpart') === undefined) {
		console.log('Settings not found, using defaults');
		//$cookieStore.put('show_joinpart', true);
		$.cookie('show_joinpart', true, { expires: 10000 });
		$scope.show_joinpart = {checked: true };
	} else {
		$scope.show_joinpart = {checked: $cookieStore.get('show_joinpart') };
	}
	
	$scope.$watch("userColor", function(newValue) {
		if(newValue !== undefined) {
			console.log('(Under Construction) user color changed: ' + newValue);
		}
	});
	
	$scope.$watch("show_joinpart.checked", function(newValue) {
		//$cookieStore.put('show_joinpart', newValue);
		$.cookie('show_joinpart', newValue, { expires: 10000 });
	});
});
