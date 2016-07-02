var cameraUI = (function() {

	var photoSize = { width: 150, height: 113 };

	function configureCameras(cameraDetails) { 
		cameraDetails.forEach(function(cameraDetail) { 

			var cameraId = cameraDetail.cameraId; 
			var existingPhotos = cameraDetail.existingPhotos; 

		    configureCamera(cameraId, existingPhotos); 
		}); 
	}

    function configureCamera(cameraId, existingPhotos) {

		var $cameraContainer = $( "#" + cameraId ); 
		var $cameraLink = $cameraContainer.find(".camera-link"); 
		var $photoContainer = $cameraContainer.find(".photo-imageset"); 
		var photoContainerId = $photoContainer.attr("id");

		var $cameraLinkIOS = $cameraContainer.find(".camera-link-ios"); 

		var iOS = utils.isIOS(); 
		var getDisplayValue = function(isVisible) {
			return isVisible? "" : "none"; 
		}; 
		$cameraLinkIOS.css("display", getDisplayValue(iOS)); 
		$cameraLink.css("display", getDisplayValue(!iOS)); 

		if (photoContainerId) {
			cameraDialog.configureForIOS($cameraLinkIOS, cameraId, photoContainerId, saveSnapshot); 

			$cameraLink.click(function() { 
				cameraDialog.displayCameraDialog(cameraId, photoContainerId, saveSnapshot); 
			}); 
		}

		if (existingPhotos && existingPhotos.length > 0) {
			existingPhotos.forEach(function(existingPhoto) {
				// TODO: test this method call 
				myIndexedDB.addExistingImage(cameraId, existingPhoto); 
			}); 	
		}

		populateImagesList(photoContainerId, cameraId); 
	}

	function populateImagesList(photoContainerId, cameraId) { 
		// populate the list of all images for given camera  
		myIndexedDB.findByCameraId(cameraId).then(function(images) { 

		    $.each(images, function() { 
				addImageToList(photoContainerId, this); 
			}); 
		}); 
	}

	function saveSnapshot(cameraId, photoContainerId, imgData) {
		console.log("saveSnapshot()...", photoContainerId, imgData.length); 

		var fileName = utils.newGuid() + ".png"; 
		var imgObject = { fileName: fileName, content: imgData, cameraId: cameraId };

		myIndexedDB.addNewImage(fileName, cameraId, imgData);

		addImageToList(photoContainerId, imgObject); 
	} 

	function addImageToList(photoContainerId, imageObject) {

		var $imagesDiv = $("#" + photoContainerId);
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
	            console.log("Deleting():", imageId); 

	            var $delImg = $('div[data-id="' + imageId +'"]');
	            var $photo = $delImg.parent(); 
	            $photo.remove(); 

	            myIndexedDB.deleteImage(imageId)
	            .then(function(photo) {
	            	console.log("Photo deleted:", photo); 
	            }); 
	        }
		}); 

		$imgDiv.append($delDiv); 
		$imgDiv.append($("<img />").attr("src", imageObject.content).attr("width", photoSize.width).attr("height", photoSize.height)); 

		$imagesDiv.append($imgDiv); 
	}

	return {        
    	configureCameras: configureCameras 
    };

}()); 