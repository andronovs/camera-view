var Camera = (function() { 

	function Camera(cameraId, existingPhotos) {
		this.cameraId = cameraId; 
		this.existingPhotos = existingPhotos; 

		cameraUI.configureCamera(cameraId, existingPhotos); 
	}

	Camera.prototype.getPhotos = function() {
		
		return photoDB.findPhotosByCameraId(this.cameraId); 
	}; 

	return Camera; 
})();

