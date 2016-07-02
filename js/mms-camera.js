
var cameraDialog = (function() {

	var constraints = { video: true, audio: false }; 
	var blankCanvasURL; 
	var callback; 

	var $video, $canvas; 
	var $btnCapture, $btnSwap, $btnSave; 

	function configureForIOS(cameraLinkIOS, cameraId, containerId, saveSnapshotCallback) {

		cameraLinkIOS.change((function(cameraId, containerId, callback) {

			return function(evt) {
				var f = evt.target.files[0]; 
				var reader = new FileReader();

				reader.onload = function(theFile) {

			    	if (callback) {
			    		var imgData = theFile.target.result; 
			    		callback(cameraId, containerId, imgData); 
			    	}
				}; 

				var $cameraContainer = $( "#" + cameraId );
				var $photoContainer = $cameraContainer.find(".photo-imageset");
				$photoContainer.removeClass("hidden");			

				// Read in the image file as a data URL.
				reader.readAsDataURL(f);
			}; 

		})(cameraId, containerId, saveSnapshotCallback)); 
	}

	function displayCameraDialog(cameraId, containerId, saveSnapshotCallback) { 

        BootstrapDialog.show({
            title: 'Take a photo',
            message: $('<div></div>').load('camera.html'), 
            cssClass: 'login-dialog', 
            onshown: function(dialogRef) {
            	
            	var body = dialogRef.getModalBody();

            	callback = saveSnapshotCallback; 

            	var changeBtn = body.find("#changeId");
            	changeBtn.click(swapVideoWithCanvas);

            	// init video & canvas here 
				$video = body.find("#dataVideoId"); 
				$canvas = body.find("#canvasId"); 

            	var video = $video[0];
				var canvas = window.canvas = $canvas[0]; 

				if (blankCanvasURL) {
					blankCanvasURL = canvas.toDataURL(); 
				} 

				navigator.mediaDevices.getUserMedia(constraints)
				.then(function (stream) {
					window.stream = stream; 
					video.srcObject = stream;
					video.src = window.URL.createObjectURL(stream); 
				})
				.catch(function (error) {
				 	console.warn('navigator.getUserMedia error: ', error);
				});

				// display the container? 
				var $cameraContainer = $( "#" + cameraId );
				var $photoContainer = $cameraContainer.find(".photo-imageset");
				$photoContainer.removeClass("hidden");

				// init references to buttons from modal footer 
				var footer = dialogRef.getModalFooter(); 

				$btnCapture = footer.find(".btn-capture"); 
				$btnSwap = footer.find(".btn-swap"); 
				$btnSave = footer.find(".btn-save"); 
            }, 
            onhidden: function(dialogRef) {
            	stopCamera(); 
            }, 
            cssClass: 'login-dialog', 
            buttons: [{
                label: 'Swap',
                icon: 'glyphicon glyphicon-sort',
                cssClass: 'btn btn-primary pull-left hidden btn-swap',
                action: function (dialogItself) {
			    	swapVideoWithCanvas(); 
                }
            }, {
                label: 'Capture Snapshot',
                icon: 'glyphicon glyphicon-camera',
                cssClass: 'btn btn-primary pull-left btn-capture',
                action: function (dialogItself) {
			    	captureSnapshot(); 
                }
            }, {
                label: 'Save',
                icon: 'glyphicon glyphicon-ok',
                cssClass: 'btn-primary hidden btn-save',
                action: function (dialogItself) {

			    	if (callback) {
			    		var imgData = canvas.toDataURL("image/png"); 
			    		callback(cameraId, containerId, imgData); 
			    	}

                    dialogItself.close();
                }
            }, {
                label: 'Cancel',
                icon: 'glyphicon glyphicon-remove',
                cssClass: 'btn-danger',
                action: function (dialogItself) {
                    dialogItself.close(); 
                }
            }]
        });
	}

	function swapVideoWithCanvas() {
		$video.toggleClass("hidden");
		$canvas.toggleClass("hidden"); 
 
		var isShowingVideo = !$video.hasClass("hidden"); 
		if (isShowingVideo) {
			// make sure we let to switch to canvas only if there is something drawn on the canvas 
			var currentCanvasURL = $canvas[0].toDataURL(); 
			if (currentCanvasURL != blankCanvasURL) {
				// canvas has some content -> enable video-to-canvas swapping 
				if ($btnSwap.hasClass("hidden")) {
					$btnSwap.removeClass("hidden"); 
				}
			}

			if ($btnCapture.hasClass("hidden")) {
				$btnCapture.removeClass("hidden"); 
			}
		}
		else {
			// when showing canvas, hide the 'capture video' button 
			if (!$btnCapture.hasClass("hidden")) {
				$btnCapture.addClass("hidden"); 
			}
		}
	}

    function captureSnapshot() { 
        console.log("captureSnapshot()...", $video, $canvas); 

		if ($video && $canvas) {
			var video = $video[0]; 
			var canvas = $canvas[0]; 

			canvas.width = video.videoWidth;
  			canvas.height = video.videoHeight;
			canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);

			if ($btnSwap.hasClass("hidden")) {
				$btnSwap.removeClass("hidden"); 
			}
			if ($btnSave.hasClass("hidden")) {
				$btnSave.removeClass("hidden"); 
			}

			swapVideoWithCanvas(); 			
		} 
    } 

    function stopCamera() {
		var video = $video[0];
		var stream = video.srcObject; 
		
		if (stream) {
			stream.getTracks()[0].stop(); 
			video.src = video.srcObject = "";  
		}
	}
 
    return {        
    	displayCameraDialog: displayCameraDialog, 
    	configureForIOS: configureForIOS 
    };

}()); 
