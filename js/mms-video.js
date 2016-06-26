function getDeviceCameras() {
    console.log("getDeviceCameras():..."); 

	var p = new Promise(function(resolve, reject) {

		navigator.mediaDevices.enumerateDevices()
		.then(function(devices) {
            //console.log("devices=", devices); 

			devices.forEach(function(device) {
				//console.log(device.kind + ": " + device.label + " id = " + device.deviceId);
			});

            var cameras = _.filter(devices, function(d) {
              return d.kind.indexOf("video") >= 0; 
            }); 

            console.log("devices():", devices.length, cameras.length); 

            resolve(cameras); 
		})
		.catch(function(err) {
			console.warn("Error:", err); 
		}); 
	}); 

	return p; 
}

function getUserMedia() {

	var cameraResolution = { width: 320, height: 240 }; 

	var p = new Promise(function(resolve, reject) {

		var constraints = { video: { width: cameraResolution.width, height: cameraResolution.height } }; 
		navigator.mediaDevices.getUserMedia(constraints) 
		.then(function(stream) {

			var videoSrc = window.URL.createObjectURL(stream);

			var userMedia = { "videoSrc": videoSrc, "localMediaStream": stream }; 
			console.log("getUserMedia(): userMedia=", userMedia); 
			resolve(userMedia); 
		})
		.catch(function(err) {
			console.warn("Error:", err); 
		});  
	}); 

	return p; 
}

function getImageDataURL(imgData, success, error) {
    var data, canvas, ctx;
    var img = new Image();
    img.onload = function() {
        // Create the canvas element.
        canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        // Get '2d' context and draw the image.
        ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        // Get canvas data URL
        try{
            data = canvas.toDataURL();
            success({image: img, data: data});
        }catch(e){
            error(e);
        }
    }
    // Load image URL.
    try{
        img.src = imgData;
    }catch(e){
        error(e);
    }
}

function getBase64Image(img) {
    // Create an empty canvas element
    var canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;

    // Copy the image contents to the canvas
    var ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);

    // Get the data-URL formatted image
    // Firefox supports PNG and JPEG. You could check img.src to guess the
    // original format, but be aware the using "image/jpg" will re-encode the image.
    var dataURL = canvas.toDataURL("image/png");

    //return dataURL.replace(/^data:image\/(png|jpg);base64,/, "");
    return dataURL; 
}
