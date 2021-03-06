'use strict';

clientApp.controller('ChatCtrl', function($scope, $cookieStore, socket) {
	var CHAT_BUFFER_SIZE = 40;
	var input = $('#chat_input');
	var body = $('#chat_body');
	$scope.chatBuffer = [];
	$scope.userMsgBuffer = [];
	$scope.roomList = [];

	function format_time(dt) {
		dt = new Date(dt);
		var ap = "AM";
		var hour = dt.getHours();
		if (hour   > 11) { ap = "PM";        }
		if (hour   > 12) { hour = hour - 12; }
		if (hour   == 0) { hour = 12;        }
		return (dt.getHours() < 10 ? '0' + hour : hour) + ':' + (dt.getMinutes() < 10 ? '0' + dt.getMinutes() + " " + ap : dt.getMinutes() + " " + ap);
	}

    function formatURLs(message) {
        var regex=new RegExp(/[-a-zA-Z0-9@:%_\+.~#?&//=]{2,256}\.[a-z]{2,4}\b(\/[-a-zA-Z0-9@:%_\+.~#?&//=]*)?/gi);
        var result=null;
        console.log('formatting urls...');
        var urls = [];
        while(result=regex.exec(message)){
            urls.push(result[0]);
            
        }
        if(urls != null) {
            for(var i = 0;i < urls.length;i++) {
                var url = urls[i];
                if(url.substring(0,7) != 'http://') {
                    url = 'http://' + url;
                }
                var html = '<a href="' + url + '" target="_blank">' + urls[i] + '</a>';
                message = message.replace(urls[i], html);
            }
        }
        return message;
    }

	function formatSmilies(message) {
		//Smile
    	message = message.replace(/\:\)/g, '<span class="emoticon emoticon-smile">:)</span>');
    	message = message.replace(/\:-\)/g, '<span class="emoticon emoticon-smile">:-)</span>');
    	//Grin
    	message = message.replace(/\:D/g,  '<span class="emoticon emoticon-grin">:D</span>');
        message = message.replace(/\:-D/g,  '<span class="emoticon emoticon-grin">:-D</span>');
    	message = message.replace(/\=D/g,  '<span class="emoticon emoticon-grin">=D</span>');
    	//Frown
    	message = message.replace(/\:\(/g, '<span class="emoticon emoticon-frown">:(</span>');
    	//Wink
    	message = message.replace(/\;\)/g, '<span class="emoticon emoticon-wink">;)</span>');
    	//Cheeky
    	message = message.replace(/\:P/g,  '<span class="emoticon emoticon-cheeky">:P</span>');
    	message = message.replace(/\:p/g,  '<span class="emoticon emoticon-cheeky">:p</span>');
    	//Surprised
    	message = message.replace(/\:o/g,  '<span class="emoticon emoticon-surprised">:o</span>');
    	message = message.replace(/\:O/g,  '<span class="emoticon emoticon-surprised">:O</span>');
    	message = message.replace(/\:-O/g,  '<span class="emoticon emoticon-surprised">:-O</span>');
    	message = message.replace(/\=-O/g,  '<span class="emoticon emoticon-surprised">=-O</span>');
    	message = message.replace(/\=-o/g,  '<span class="emoticon emoticon-surprised">=-O</span>');
    	//Kiss
    	message = message.replace(/\:\*/g,  '<span class="emoticon emoticon-kiss">:*</span>');
    	message = message.replace(/\:-\*/g,  '<span class="emoticon emoticon-kiss">:-*</span>');
    	//Cool
    	message = message.replace(/8\)/g,  '<span class="emoticon emoticon-cool">8)</span>');
    	message = message.replace(/8-\)/g,  '<span class="emoticon emoticon-cool">8-)</span>');
    	message = message.replace(/B\)/g,  '<span class="emoticon emoticon-cool">B)</span>');
    	message = message.replace(/B-\)/g,  '<span class="emoticon emoticon-cool">B-)</span>');
    	//Embarassed
    	message = message.replace(/\:\[/g,  '<span class="emoticon emoticon-embarassed">:[</span>');
    	message = message.replace(/\:-\[/g,  '<span class="emoticon emoticon-embarassed">:-[</span>');
    	//Cry
    	message = message.replace(/\:\'\(/g,  '<span class="emoticon emoticon-cry">:\'(</span>');
    	message = message.replace(/\=\'\(/g,  '<span class="emoticon emoticon-cry">=\'(</span>');
    	//Skeptical
    	message = message.replace(/\:-\\/g,  '<span class="emoticon emoticon-skeptical">:-\\</span>');
    	message = message.replace(/\:\\/g,  '<span class="emoticon emoticon-skeptical">:\\</span>');
    	message = message.replace(/\:-\//g,  '<span class="emoticon emoticon-skeptical">:-\/</span>');
    	message = message.replace(/\=\\/g,  '<span class="emoticon emoticon-skeptical">=\\</span>');
    	message = message.replace(/\=\//g,  '<span class="emoticon emoticon-skeptical">=\/</span>');
 	
    	return message;
	}

    function addChatMessage(id, author, message, dt) {
        message = formatURLs(message);
    	message = formatSmilies(message);


        if(message.substring(0,4) == "/me ") {
        	body.append('<div class="message" id="msg'+id+'"><span class="time">(' + format_time(dt) + ')</span> <span class="username">' + author + ' ' + message.substring(4) + '</span></div>');
        } else {
        	if(author == 'system') {
                if(($cookieStore.get('show_joinpart') === undefined) || ($cookieStore.get('show_joinpart') == true)) {
                    body.append('<div class="message" id="msg'+id+'"><span class="time">(' + format_time(dt) + ')</span> <span class="username">' + message + '</span></div>');
                }
        	} else {
        		body.append('<div class="message" id="msg'+id+'"><span class="time">(' + format_time(dt) + ')</span> <span class="username">' + author + '</span>: ' + message) + '</div>';
        	}
        }
        $('.message').last().animate({ opacity: 1 }, 400); 
    }

    socket.emit('nav', {loc: 'chat'});

    input.unbind('keydown');

    var userMsgBufferPosition = $scope.userMsgBuffer.length;

    input.keydown(function(e) {
        if (e.keyCode === 13) {
            var msg = $(this).val();
            if (!msg) {
                return; 
            }

            $scope.userMsgBuffer.push(msg);
            $scope.userMsgBuffer = $scope.userMsgBuffer.slice(-CHAT_BUFFER_SIZE);
            userMsgBufferPosition = $scope.userMsgBuffer.length;
            socket.emit('chat:message', {text: msg});
            $(this).val('');

            // disable the input field to make the user wait until server
            // sends back response
            input.attr('disabled', 'disabled');
        }

        // up arrow
        if (e.keyCode === 38) {
        	if(userMsgBufferPosition > 0) {
        		userMsgBufferPosition--;
        	}
        	$(this).val($scope.userMsgBuffer[userMsgBufferPosition]);
        }

        // down arrow
        if (e.keyCode === 40) {
       		if(userMsgBufferPosition < $scope.userMsgBuffer.length) {
        		userMsgBufferPosition++;
        	}
        	
        	$(this).val($scope.userMsgBuffer[userMsgBufferPosition]);
        }
    });

    input.keydown(function(e) {

    });

    $scope.$on('chat:message', function(event, msg) {
    	var id = msg.hash;
    	var dt = msg.time;
    	var author = msg.author;
    	var message = msg.text;

    	input.removeAttr('disabled');  
		addChatMessage(id, author, message, dt);
		$('#chat_body > div').slice(0, -CHAT_BUFFER_SIZE).remove()
		$("#chat_body").stop().animate({ scrollTop: $("#chat_body")[0].scrollHeight }, 800); 
    	/*
        if(msg.text.substring(0,4) == "/me ") {
        	$scope.$apply(function() {
			    $scope.chatBuffer.push(msg);
			});
        } else {
        	$scope.$apply(function() {
			    $scope.chatBuffer.push(msg);
			});
        }
        */
    });

    $scope.$on('chat:history', function(event, history) {
    	for (var i=0;i<history.data.length;i++) {
    		addChatMessage(history.data[i].hash, history.data[i].author, history.data[i].text, history.data[i].time);
    	}

    	/*
    	$scope.$apply(function() {
    		$scope.chatBuffer = history.data;
    	});
		*/
    });

    $scope.$on('chat:users', function(event, users) {
    	$scope.$apply(function() {
    		$scope.userList = users.userlist;
    	});
    });

    $scope.$on('chat:rooms', function(event, rooms) {
    	$scope.$apply(function() {
    		$scope.roomList = rooms;
    	});
    });

	$scope.$watch("chatBuffer", function(newValue){
		setTimeout(function() {
			$("#chat_body").stop().animate({ scrollTop: $("#chat_body")[0].scrollHeight }, 800);
		},800);
    }, true);
});
