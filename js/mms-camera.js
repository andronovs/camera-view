var cameraDialog = (function() {

	var dialog; 

	var video, canvas; 
	var constraints = { video: true, audio: false }; 
	
	var camId, contId, callback; 

	function displayCameraDialog(cameraDialogId, cameraId, containerId, saveSnapshotCallback) {

		camId = cameraId; 
		contId = containerId; 
		callback = saveSnapshotCallback; 

		var cameraDialog = $( "#" + cameraDialogId ); 
		cameraDialog.css( "display", ""); 

		var captureSnapshotBtn = cameraDialog.find("#captureSnapshotId"); 
		var saveAndCloseBtn = cameraDialog.find("#saveAndCloseId"); 
		var cancelBtn = cameraDialog.find("#cancelId");  
 
		captureSnapshotBtn.click(captureSnapshot); 
		saveAndCloseBtn.click(saveAndClose); 
		cancelBtn.click(cancel); 

		video = cameraDialog.find("#dataVideoId")[0];
		canvas = cameraDialog.find("#canvasId")[0];

		console.log("displayCameraDialog():", cameraDialog, video, canvas); 
		
		// .data("saveSnapshotHandler", saveSnapshot)
		dialog = cameraDialog
		.dialog({
			maxWidth: 800,
			maxHeight: 420,
		    width: 800,
		    height: 420, 
		    modal: true 
		});

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
    	displayCameraDialog: displayCameraDialog 
    };

}()); 
