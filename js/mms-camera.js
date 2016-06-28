var cameraDialog = (function() {

	var dialog; 

	var video, canvas; 
	var constraints = { video: true, audio: false }; 

	var camId, contId, callback; 

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

				// Read in the image file as a data URL.
				reader.readAsDataURL(f);
			}; 

		})(cameraId, containerId, saveSnapshotCallback)); 
	}

	function displayCameraDialog(cameraDialogId, cameraId, containerId, saveSnapshotCallback) {

		console.log("displayCameraDialog():", dialog, camId, contId, callback); 

		var cameraDialog = $( "#" + cameraDialogId ); 
		cameraDialog.css( "display", ""); 

		if (!dialog) {
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
		}

		console.log("displayCameraDialog():", cameraDialog, video, canvas); 
		
		dialog = cameraDialog
		.dialog({
			maxWidth: 800,
			maxHeight: 420,
		    width: 800,
		    height: 420, 
		    modal: true 
		}); 

		/*dialog = true; 
        BootstrapDialog.show({
            title: 'Take a photo',
            message: $('<div></div>').load('camera.html'), 
            cssClass: 'login-dialog', 
            buttons: [{
                label: 'Save',
                icon: 'glyphicon glyphicon-ok',
                cssClass: 'btn-primary',
                action: function (dialogItself) {

			    	console.log("saveAndClose()", callback); 

			    	if (callback) {
			    		var imgData = canvas.toDataURL("image/png"); 
			    		callback(camId, contId, imgData); 
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
        });*/

        navigator.mediaDevices.getUserMedia(constraints)
		.then(function (stream) {
		    console.log("getUserMedia(): video=", video); 
		    video.src = window.URL.createObjectURL(stream); 
		})
		.catch(function (error) {
		 	console.log('navigator.getUserMedia error: ', error);
		});
	}

    function captureSnapshot() { 
        console.log("captureSnapshot()...", video, canvas); 

		if (video && canvas) {
			canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
		} 
    }

    function saveAndClose() {
    	//var callback = dialog.data("saveSnapshotHandler"); 
    	console.log("saveAndClose()", callback); 

    	if (callback) {
    		var imgData = canvas.toDataURL("image/png"); 
    		callback(camId, contId, imgData); 
    	}
		dialog.dialog( "close" );
    }

    function cancel() {
    	console.log("cancel()"); 
		dialog.dialog( "close" );
    }

    return {        
    	displayCameraDialog: displayCameraDialog, 
    	configureForIOS: configureForIOS 
    };

}()); 
