var cameraUI = (function() {

	var photoSize = { width: 150, height: 100 };

	function configureCameras(cameraIds) { 
		cameraIds.forEach(function(cameraId) { 
		    configureCamera(cameraId); 
		}); 
	}

    function configureCamera(cameraId) {

		var $cameraContainer = $( "#" + cameraId ); 
		var $cameraLink = $cameraContainer.find(".camera-link"); 
		var $photoContainer = $cameraContainer.find(".photo-imageset"); 
		var photoContainerId = $photoContainer.attr("id");

		console.log("Now:", $photoContainer, photoContainerId); 

		console.log("cameraId=", cameraId, $cameraLink, photoContainerId); 

		var $cameraLinkIOS = $cameraContainer.find(".camera-link-ios"); 

		var iOS = utils.isIOS(); 
		console.log("iOS", iOS); 
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

		populateImagesList(photoContainerId, cameraId); 
	}

	function populateImagesList(listId, cameraId) { 
		// populate the list of all images for given camera  
		myIndexedDB.findByCameraId(cameraId).then(function(images) { 

		    $.each(images, function() { 
				addImageToList(listId, this); 
			}); 
		}); 
	}

	function saveSnapshot(cameraId, listId, imgData) {
		console.log("saveSnapshot()...", listId, imgData.length); 

		// display the container? 
		var $cameraContainer = $( "#" + cameraId );
		var $photoContainer = $cameraContainer.find(".photo-imageset");
		$photoContainer.removeClass("photo-imageset-hidden");

		var fileName = utils.newGuid() + ".png"; 
		var dateTaken = new Date(); 
		var imgObject = { fileName: fileName, dateTaken: dateTaken, content: imgData, cameraId: cameraId };

		myIndexedDB.addImage(fileName, cameraId, dateTaken, imgData);

		addImageToList(listId, imgObject); 
	} 

	function addImageToList(listId, imageObject) {

		var $imagesDiv = $("#" + listId);
		var $imgDiv = $('<div />').addClass("img").css("height", photoSize.height + "px"); 
		var $delDiv = $('<div />').addClass("del").attr("data-id", imageObject.fileName); 
		var $icon = $('<i aria-hidden="true" />').addClass("fa fa-trash-o"); 

		$delDiv.append($icon); 

		$imgDiv.click(function(evt) { 
			evt.stopPropagation(); 

			alert(imageObject.fileName);

			var $textAndPic = $('<img height="100%" />').attr('src', imageObject.content);
	        $textAndPic.append('Preview image <br />');
	        
	        BootstrapDialog.show({
	            title: 'Preview',
	            message: $textAndPic,
	            cssClass: 'login-dialog-preview', 
	            buttons: [{
	                label: 'OK',
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

	            myIndexedDB.removeImage(imageId); 
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