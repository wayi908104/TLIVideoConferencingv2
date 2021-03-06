/*
 * (C) Copyright 2014 Kurento (http://kurento.org/)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

/* <video id="video2" autoplay width="640px" height="480px"
						poster="img/webrtc.png"></video>
*/

var ws = new WebSocket('wss://' + location.host + '/call');
var mainVideo;
var otherVideos;
var otherVideosList;
var mainWebRtcPeer;
var otherWebRtcPeers;
var newVideoId;

window.onload = function() {
	console = new Console();
	mainVideo = document.getElementById('mainVideo');
	otherVideos = document.getElementById('student-cams');
	otherVideosList = [];
	otherWebRtcPeers = [];
	newVideoId = 0;

	disableStopButton();
	disableRecordButton();
}

window.onbeforeunload = function() {
	ws.close();
}

ws.onmessage = function(message) {
	var parsedMessage = JSON.parse(message.data);
	console.info('Received message: ' + message.data);

	switch (parsedMessage.id) {
		case 'addTeacherResponse':
			addTeacherResponse(parsedMessage);
			break;
		case 'addStudentToTeacher':
			addStudentToTeacher(parsedMessage);
			break;
		case 'removeStudentToTeacher':
			removeStudentToTeacher(parsedMessage);
			break;
		case 'addStudentResponse':
			addStudentResponse(parsedMessage);
			break;
		case 'removeStudentResponse':
			removeStudentResponse(parsedMessage);
			break;
		case 'iceCandidate':
			mainWebRtcPeer.addIceCandidate(parsedMessage.candidate, function(error) {
				if (error)
					return console.error('Error adding candidate: ' + error);
			});
			break;
		case 'stopCommunication':
			dispose();
			break;
		default:
			console.error('Unrecognized message', parsedMessage);
	}
}

function addTeacher() {
	if (!mainWebRtcPeer) {
		showSpinner(mainVideo);

		var options = {
			localVideo : mainVideo,
			remoteVideo: otherVideos,
			onicecandidate : onIceCandidate
		}
		mainWebRtcPeer = new kurentoUtils.WebRtcPeer.WebRtcPeerSendrecv(options,
				function(error) {
					if (error) {
						return console.error(error);
					}
					mainWebRtcPeer.generateOffer(onOfferTeacher);
				});

		enableStopButton();
		//enableButton('#record', 'record()');
	}
}

function onOfferTeacher(error, offerSdp) {
	if (error)
		return console.error('Error generating the offer');
	console.info('Invoking SDP offer callback function ' + location.host);
	var message = {
		id : 'addTeacher',
		sdpOffer : offerSdp
	}
	sendMessage(message);
}

function addTeacherResponse(message) {
	if (message.response != 'accepted') {
		var errorMsg = message.message ? message.message : 'Unknow error';
		console.info('Call not accepted for the following reason: ' + errorMsg);
		dispose();
	} else {
		mainWebRtcPeer.processAnswer(message.sdpAnswer, function(error) {
			if (error)
				return console.error(error);
		});
	}
}

function addStudentToTeacher(parsedMessage) {
	console.log(parsedMessage);
	// add student id to list with corresponding video id
	// add video to videos list
}

function removeStudentToTeacher(parsedMessage) {
	// remove student id to list
	// remove video to videos list
}

function addStudent() {
	if (!mainWebRtcPeer) {
		showSpinner(mainVideo);
		addVideoPlayer(newVideoId);
		var tempPlayer = document.getElementById("cam-"+newVideoId);
		showSpinner(tempPlayer)
		var options = {
			remoteVideo : mainVideo,
			localVideo: tempPlayer,
			onicecandidate : onIceCandidate
		}
		mainWebRtcPeer = new kurentoUtils.WebRtcPeer.WebRtcPeerSendrecv(options,
				function(error) {
					if (error) {
						return console.error(error);
					}
					this.generateOffer(onOfferStudent);
				});
		enableStopButton();

		newVideoId = newVideoId + 1;
	}
}

function onOfferStudent(error, offerSdp) {
	if (error)
		return console.error('Error generating the offer');
	console.info('Invoking SDP offer callback function ' + location.host);
	var message = {
		id : 'addStudent',
		sdpOffer : offerSdp
	}
	sendMessage(message);
}

function addStudentResponse(message) {
	if (message.response != 'accepted') {
		var errorMsg = message.message ? message.message : 'Unknow error';
		console.info('Call not accepted for the following reason: ' + errorMsg);
		dispose();
	} else {
		mainWebRtcPeer.processAnswer(message.sdpAnswer, function(error) {
			if (error)
				return console.error(error);
		});
	}
}

function removeStudentResponse(parsedMessage) {
	// purge students list
	// remove own video and display "disconnected in teacher video"
}

function onIceCandidate(candidate) {
	console.log("Local candidate" + JSON.stringify(candidate));

	var message = {
		id : 'onIceCandidate',
		candidate : candidate
	};
	sendMessage(message);
}

function stop() {
	var message = {
		id : 'stop'
	}
	sendMessage(message);
	dispose();
}

function dispose() {
	if (mainWebRtcPeer) {
		mainWebRtcPeer.dispose();
		mainWwebRtcPeer = null;
	}
	hideSpinner(mainVideo);

	disableStopButton();
}

function disableStopButton() {
	enableButton('#teacher', 'addTeacher()');
	enableButton('#student', 'addStudent()');
	disableButton('#stop');
}

function disableRecordButton() {
	disableButton('#record');
}

function enableStopButton() {
	disableButton('#teacher');
	disableButton('#student');
	enableButton('#stop', 'stop()');
}

function disableButton(id) {
	$(id).attr('disabled', true);
	$(id).removeAttr('onclick');
}

function enableButton(id, functionName) {
	$(id).attr('disabled', false);
	$(id).attr('onclick', functionName);
}

function addVideoPlayer(playerID) {
	console.log(otherVideos);
	var li = document.createElement("LI");
	li.innerHTML = "<video id='cam-" + playerID + "' autoplay width='640px'" +
		"height='480px' poster='img/webrtc.png'></video>"
	
	otherVideos.appendChild(li);
	
}

function removeVideoPlayer(playerID) {
	// remove player from student players list by playerID
}

function sendMessage(message) {
	var jsonMessage = JSON.stringify(message);
	console.log('Senging message: ' + jsonMessage);
	ws.send(jsonMessage);
}

function showSpinner() {
	for (var i = 0; i < arguments.length; i++) {
		arguments[i].poster = './img/transparent-1px.png';
		arguments[i].style.background = 'center transparent url("./img/spinner.gif") no-repeat';
	}
}

function hideSpinner() {
	for (var i = 0; i < arguments.length; i++) {
		arguments[i].src = '';
		arguments[i].poster = './img/webrtc.png';
		arguments[i].style.background = '';
	}
}

/**
 * Lightbox utility (to display media pipeline image in a modal dialog)
 */
$(document).delegate('*[data-toggle="lightbox"]', 'click', function(event) {
	event.preventDefault();
	$(this).ekkoLightbox();
});
