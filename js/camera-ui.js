var cameraUI = (function() {

	var photoSize = { width: 150, height: 113 };

	function configureCameras(cameraDetails) { 

		cameraDetails.forEach(function(cameraDetail) { 

			var cameraSelector = cameraDetail.cameraSelector; 
			var existingPhotos = cameraDetail.existingPhotos; 

		    configureCamera(cameraSelector, existingPhotos); 
		}); 
	}

    function configureCamera(cameraSelector, existingPhotos) {

		var $cameraContainer = $( cameraSelector ); 

		if ($cameraContainer.length == 0) {
			console.warn("Configured JQuery selector '%s' does not match any document element.", cameraSelector); 
			return; 
		}

		if ($cameraContainer.length > 1) {
			console.warn("Configured JQuery selector '%s' matches %s document elements. Using the first one at index 0.", cameraSelector, $cameraContainer.length); 
			$cameraContainer = $($cameraContainer[0]); 
		}

		var $cameraLink = $cameraContainer.find(".camera-link"); 
		var $photoContainer = $cameraContainer.find(".photo-imageset"); 

		var $cameraLinkIOS = $cameraContainer.find(".camera-link-ios"); 

		var iOS = cameraUtils.isIOS(); 
		var getDisplayValue = function(isVisible) {
			return isVisible? "" : "none"; 
		}; 
		$cameraLinkIOS.css("display", getDisplayValue(iOS)); 
		$cameraLink.css("display", getDisplayValue(!iOS)); 

		if ($photoContainer) {
			cameraDialog.configureForIOS($cameraLinkIOS, cameraSelector, $photoContainer, saveSnapshot); 

			$cameraLink.click(function() { 
				cameraDialog.displayCameraDialog(cameraSelector, $photoContainer, saveSnapshot); 
			}); 
		}

		if (existingPhotos && existingPhotos.length > 0) {
			existingPhotos.forEach(function(existingPhoto) {
				photoDB.addExistingPhoto(cameraSelector, existingPhoto); 
			}); 	
		}

		populatePhotoList($photoContainer, cameraSelector); 
	}	

	function populatePhotoList($photoContainer, cameraSelector) { 
		// populate the list of all photos for given camera  
		photoDB.findPhotosByCameraId(cameraSelector).then(function(photos) { 

		    $.each(photos, function() { 
				addPhotoToList($photoContainer, this); 
			}); 
		}); 
	}

	function saveSnapshot(cameraId, $photoContainer, imgData) {

		var fileName = cameraUtils.newGuid() + ".png"; 
		var imgObject = { fileName: fileName, content: imgData, cameraId: cameraId };

		photoDB.addNewPhoto(fileName, cameraId, imgData);

		addPhotoToList($photoContainer, imgObject); 
	} 

	function addPhotoToList($imagesDiv, imageObject) {

		var $imgDiv = $('<div />').addClass("img").css("height", photoSize.height + "px"); 
		var $delDiv = $('<div />').addClass("del").attr("data-id", imageObject.fileName); 
		var $icon = $('<i aria-hidden="true" />').addClass("fa fa-trash-o"); 

		$delDiv.append($icon); 

		$imgDiv.click(function(evt) { 
			evt.stopPropagation(); 

			var $pic = $('<img style="width: 100%" width="100%" />').attr('src', imageObject.content);
	        
	        BootstrapDialog.show({
	            title: 'Photo Preview',
	            message: $pic,
	            cssClass: 'login-dialog', 
	            buttons: [{
	                label: 'OK',
	                cssClass: 'btn-primary',
	                action: function(dialogRef){
	                    dialogRef.close();
	                }
	            }]
	        }); 
		}); 

		$delDiv.click(function(evt) { 
		    evt.stopPropagation(); 

		    var imageId = imageObject.fileName; 
	        if (confirm('Are you sure?') == true) {

	            var $delImg = $('div[data-id="' + imageId +'"]');
	            var $photo = $delImg.parent(); 

				var $photoContainer = $photo.closest('.photo-imageset'); 
				var $photoContainerImages = $photoContainer.find('img'); 
				var remainingImagesCount = $photoContainerImages.length - 1; 	// exclude the current one which is being deleted 

	            $photo.remove(); 

	            photoDB.deletePhoto(imageId)
	            .then(function(photo) {

					// no images -> hide the container (nothing to show) 
	            	if (remainingImagesCount == 0) { 
						$photoContainer.addClass("hidden"); 
	            	}
	            }); 
	        }
		}); 

		$imgDiv.append($delDiv); 
		$imgDiv.append($("<img />").attr("src", imageObject.content).attr("width", photoSize.width).attr("height", photoSize.height)); 

		$imagesDiv.append($imgDiv); 
	}

	return {        
    	configureCameras: configureCameras, 
    	configureCamera: configureCamera 
    };

}()); 