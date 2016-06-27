var cameraDialog = (function() {

	var dialog; 

	var video, canvas; 
	var constraints = { video: true, audio: false }; 

	function displayCameraDialog(cameraDialogId) {

		var cameraDialog = $( "#" + cameraDialogId ); 
		cameraDialog.css( "display", ""); 

		var captureSnapshotBtn = cameraDialog.find("#captureSnapshotId"); 
		var saveAndCloseBtn = cameraDialog.find("#saveAndCloseId"); 
		var cancelBtn = cameraDialog.find("#cancelId"); 

		//console.log("displayCameraDialog():", captureSnapshotBtn, saveAndCloseBtn, cancelBtn); 

		//captureSnapshotBtn.click(captureSnapshot); 
		captureSnapshotBtn.click(captureSnapshot); 
		saveAndCloseBtn.click(saveAndClose); 
		cancelBtn.click(cancel); 

		video = cameraDialog.find("#dataVideoId");
		canvas = cameraDialog.find("#canvasId");

		console.log("displayCameraDialog():", cameraDialog, video, canvas); 

		//video = document.getElementById("dataVideoId"); 
		//canvas = document.getElementById("canvasId");
		
		//.data("saveSnapshotHandler", saveSnapshot)
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
    	var callback = dialog.data("saveSnapshotHandler"); 
    	console.log("saveAndClose()", callback); 

    	if (callback) {
    		callback(); 
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
