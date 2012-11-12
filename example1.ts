 /// <reference path="media.d.ts" />
var startBtn = document.getElementById('startBtn');
function gotStream(stream) {
	stream.onended = function () {
		startBtn.disabled = false;
	};
}
function start() {
	(<NavigatorUserMedia><any>navigator).webkitGetUserMedia({audio:true, video:false}, gotStream);
	startBtn.disabled = true;
}
