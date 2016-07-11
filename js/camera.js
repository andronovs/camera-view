var Camera = (function() { 

	function Camera(cameraSelector, existingPhotos) {
		this.cameraSelector = cameraSelector; 
		this.existingPhotos = existingPhotos; 

		cameraUI.configureCamera(cameraSelector, existingPhotos); 
	}

	Camera.prototype.getPhotos = function() {
		
		return photoDB.findPhotosByCameraId(this.cameraId); 
	}; 

	return Camera; 
})();

