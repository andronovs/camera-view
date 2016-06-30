
var cameraDialog = (function() {

	var video, canvas; 
	var constraints = { video: true, audio: false };
	var $v, $c;  

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
				$photoContainer.removeClass("photo-imageset-hidden");			

				// Read in the image file as a data URL.
				reader.readAsDataURL(f);
			}; 

		})(cameraId, containerId, saveSnapshotCallback)); 
	}

	function displayCameraDialog(cameraId, containerId, saveSnapshotCallback) {

		//console.log("displayCameraDialog():", dialog, camId, contId, callback); 

		// display the container? 
		//var $cameraContainer = $( "#" + cameraId );
		//var $photoContainer = $cameraContainer.find(".photo-imageset");
		//$photoContainer.removeClass("photo-imageset-hidden");

		//var cameraDialog = $( "#" + cameraDialogId ); 
		//cameraDialog.css( "display", ""); 

		/*if (!dialog) {
			camId = cameraId; 
			contId = containerId; 
			callback = saveSnapshotCallback; 

			var captureSnapshotBtn = cameraDialog.find("#captureSnapshotId"); 
			var saveAndCloseBtn = cameraDialog.find("#saveAndCloseId"); 
			var cancelBtn = cameraDialog.find("#cancelId");  
	 
			captureSnapshotBtn.click(captureSnapshot); 
			saveAndCloseBtn.click(saveAndClose); 
			cancelBtn.click(cancel); 

			video = cameraDialog.find("#dataVideoId")[0];
			canvas = cameraDialog.find("#canvasId")[0];
		}*/

		console.log("displayCameraDialog():", cameraDialog, video, canvas); 

        BootstrapDialog.show({
            title: 'Take a photo',
            message: $('<div></div>').load('test.html'), 
            onshown: function(dialogRef) {
            	
            	var body = dialogRef.getModalBody();

            	callback = saveSnapshotCallback; 

            	var captureSnapshotBtn = body.find("#captureSnapshotId");
            	captureSnapshotBtn.click(captureSnapshot);

            	var changeBtn = body.find("#changeId");
            	changeBtn.click(swapVideoWithCanvas);

            	// init video & canvas here 
				var $video = body.find("#dataVideoId"); 
				var $canvas = body.find("#canvasId"); 

				$v = $video; 
				$c = $canvas; 

				var w = $video.css("width"); 
				var h = $video.css("height"); 
				console.log("w, h=", w, h); 

				$canvas.css("width", w); 
				$canvas.css("height", h); 

            	video = $video[0];
				canvas = window.canvas = $canvas[0]; 

				navigator.mediaDevices.getUserMedia(constraints)
				.then(function (stream) {
					window.stream = stream; 
					video.srcObject = stream;
					video.src = window.URL.createObjectURL(stream);
				    console.log("!!!getUserMedia(): video=", video, stream); 
				})
				.catch(function (error) {
				 	console.log('navigator.getUserMedia error: ', error);
				});

            	console.log("!!!BootstrapDialog onshown()", video, canvas); 

				// display the container? 
				var $cameraContainer = $( "#" + cameraId );
				var $photoContainer = $cameraContainer.find(".photo-imageset");
				$photoContainer.removeClass("photo-imageset-hidden");
            }, 
            cssClass: 'login-dialog', 
            buttons: [{
                label: 'Save',
                icon: 'glyphicon glyphicon-ok',
                cssClass: 'btn-primary',
                action: function (dialogItself) {

			    	console.log("saveAndClose()", callback); 

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
			    	
			    	console.log("cancel()"); 
                    
                    dialogItself.close();
                }
            }]
        });

        /*navigator.mediaDevices.getUserMedia(constraints)
		.then(function (stream) {
			video.src = window.URL.createObjectURL(stream);
		    console.log("!!!getUserMedia(): video=", video, stream); 
		})
		.catch(function (error) {
		 	console.log('navigator.getUserMedia error: ', error);
		});*/
	}

	function swapVideoWithCanvas() {
		$v.toggleClass("photo-imageset-hidden");
		$c.toggleClass("photo-imageset-hidden");  
	}

    function captureSnapshot() { 
        console.log("captureSnapshot()...", video, canvas); 

		if (video && canvas) {
			canvas.width = video.videoWidth;
  			canvas.height = video.videoHeight;
			canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
		} 
    }
 
    return {        
    	displayCameraDialog: displayCameraDialog, 
    	configureForIOS: configureForIOS 
    };

}()); 
