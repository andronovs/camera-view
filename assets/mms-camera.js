var mmsCameraUI = (function() {

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

		var iOS = mmsCameraUtils.isIOS(); 
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
				mmsPhotoDB.addExistingPhoto(cameraId, existingPhoto); 
			}); 	
		}

		populatePhotoList(photoContainerId, cameraId); 
	}

	function populatePhotoList(photoContainerId, cameraId) { 
		// populate the list of all photos for given camera  
		mmsPhotoDB.findPhotosByCameraId(cameraId).then(function(photos) { 

		    $.each(photos, function() { 
				addPhotoToList(photoContainerId, this); 
			}); 
		}); 
	}

	function saveSnapshot(cameraId, photoContainerId, imgData) {

		var fileName = mmsCameraUtils.newGuid() + ".png"; 
		var imgObject = { fileName: fileName, content: imgData, cameraId: cameraId };

		mmsPhotoDB.addNewPhoto(fileName, cameraId, imgData);

		addPhotoToList(photoContainerId, imgObject); 
	} 

	function addPhotoToList(photoContainerId, imageObject) {

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

	            var $delImg = $('div[data-id="' + imageId +'"]');
	            var $photo = $delImg.parent(); 
	            $photo.remove(); 

	            mmsPhotoDB.deletePhoto(imageId)
	            .then(function(photo) {
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
var mmsCameraUtils = (function() {

 	function S4() {
        return (((1+Math.random())*0x10000)|0).toString(16).substring(1); 
    }

    function newGuid() {

		// then to call it, plus stitch in '4' in the third group
		var guid = (S4() + S4() + "-" + S4() + "-4" + S4().substr(0,3) + "-" + S4() + "-" + S4() + S4() + S4()).toLowerCase();
		return guid; 
    } 

    function isIOS() { 
		var iOS = ['iPad', 'iPhone', 'iPod'].indexOf(navigator.platform) >= 0; 
		return iOS; 
    }

    return { 
    	newGuid: newGuid, 
    	isIOS: isIOS 
    };

}()); 


var cameraDialog = (function() {

	var constraints = { video: true, audio: false }; 
	var callback; 

	var $video, $canvas; 
	var $btnCapture, $btnRetake, $btnSave; 

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
			    	else {
			    		console.warn("Callback is not defined!"); 
			    	}
				}; 

				var $cameraContainer = $( "#" + cameraId );
				var $photoContainer = $cameraContainer.find(".photo-imageset");
				$photoContainer.removeClass("hidden");			

				// Read in the image file as a data URL.
				reader.readAsDataURL(f);
			}; 

		})(cameraId, containerId, saveSnapshotCallback)); 
	}

	function displayCameraDialog(cameraId, containerId, saveSnapshotCallback) { 

        BootstrapDialog.show({
            title: 'Take a photo',
            message: $('<div></div>').load('camera.html'), 
            cssClass: 'login-dialog', 
            onshown: function(dialogRef) {
            	
            	callback = saveSnapshotCallback; 

            	// init references to buttons from modal footer 
				var footer = dialogRef.getModalFooter(); 

				$btnCapture = footer.find(".btn-capture"); 
				$btnRetake = footer.find(".btn-retake"); 
				$btnSave = footer.find(".btn-save");
            	
            	var body = dialogRef.getModalBody();

            	var changeBtn = body.find("#changeId");
            	changeBtn.click(swapVideoWithCanvas);

            	// init video & canvas here 
				$video = body.find("#dataVideoId"); 
				$canvas = body.find("#canvasId"); 

            	var video = $video[0];
				var canvas = window.canvas = $canvas[0]; 

				video.onloadeddata = function() {
					if ($btnCapture.hasClass("disabled")) {
						$btnCapture.removeClass("disabled"); 
					}
				}

				navigator.mediaDevices.getUserMedia(constraints)
				.then(function (stream) {
					window.stream = stream; 
					video.srcObject = stream;
					video.src = window.URL.createObjectURL(stream); 
				})
				.catch(function (error) {
				 	console.warn('navigator.getUserMedia error: ', error);
				});

				// display the container? 
				var $cameraContainer = $( "#" + cameraId );
				var $photoContainer = $cameraContainer.find(".photo-imageset");
				$photoContainer.removeClass("hidden"); 
            }, 
            onhidden: function(dialogRef) {
            	stopCamera(); 
            }, 
            cssClass: 'login-dialog', 
            buttons: [{
                label: 'Retake',
                icon: 'glyphicon glyphicon-sort',
                cssClass: 'btn btn-primary pull-left hidden btn-retake',
                action: function (dialogItself) {
			    	swapVideoWithCanvas(); 
                }
            }, {
                label: 'Capture Snapshot',
                icon: 'glyphicon glyphicon-camera',
                cssClass: 'btn btn-primary pull-left disabled btn-capture',
                action: function (dialogItself) {
			    	captureSnapshot(); 
                }
            }, {
                label: 'Save',
                icon: 'glyphicon glyphicon-ok',
                cssClass: 'btn-primary hidden btn-save',
                action: function (dialogItself) {

			    	if (callback) {
			    		var imgData = canvas.toDataURL("image/png"); 
			    		callback(cameraId, containerId, imgData); 
			    	}
			    	else {
			    		console.warn("Callback is not defined!"); 
			    	}

                    dialogItself.close();
                }
            }, {
                label: 'Cancel',
                icon: 'glyphicon glyphicon-remove',
                cssClass: 'btn-danger',
                action: function (dialogItself) {
                    dialogItself.close(); 
                }
            }]
        });
	}

	function swapVideoWithCanvas() {
		$video.toggleClass("hidden");
		$canvas.toggleClass("hidden"); 

		$btnCapture.toggleClass("hidden"); 
		$btnRetake.toggleClass("hidden");  
	}

    function captureSnapshot() { 

		if ($video && $canvas) {
			var video = $video[0]; 
			var canvas = $canvas[0]; 

			canvas.width = video.videoWidth;
  			canvas.height = video.videoHeight;
			canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);

			if ($btnSave.hasClass("hidden")) {
				$btnSave.removeClass("hidden"); 
			}

			swapVideoWithCanvas(); 			
		} 
    } 

    function stopCamera() {
		var video = $video[0];
		var stream = video.srcObject; 
		
		if (stream) {
			stream.getTracks()[0].stop(); 
			video.src = video.srcObject = "";  
		}
	}
 
    return {        
    	displayCameraDialog: displayCameraDialog, 
    	configureForIOS: configureForIOS 
    };

}()); 

var photoStatuses = { New: 0, Existing: 1, Deleted: 2 }; 

var mmsPhotoDB = (function() {

	var db; 

    init(); 

    function init() { 

		var schema = {
		  stores: [{
		    name: 'photoTable',
		    indexes: [{ name: 'fileName' }, { name: 'cameraId' }]
		  }]
		}; 

        db = new ydn.db.Storage('MMSPhotoDB', schema); 
    }

    function addNewPhoto(id, cameraId, content) { 

        // we assume here that id (fileName) is unique 
        db.put('photoTable', { fileName: id, cameraId: cameraId, dateTaken: String(new Date()), 
                                photoStatus: photoStatuses.New, content: content }, id); 
    }

    function addExistingPhoto(cameraId, content) {  

        var id = mmsCameraUtils.newGuid() + ".png"; 

        // we assume here that id (fileName) is unique 
        db.put('photoTable', { fileName: id, cameraId: cameraId, dateTaken: null, 
                                photoStatus: photoStatuses.Existing, content: content }, id); 
    }
    
    function getPhotos() {

        var p = new Promise(function(resolve, reject) {

            var query = db.from('photoTable'); 
            query = query.where('photoStatus', '<', photoStatuses.Deleted); 
            query.list().done(function(photos) {
               resolve(photos); 
            }); 
        }); 

        return p; 
    }

    // performs a virtual delete here 
    function deletePhoto(id) { 

        var p = new Promise(function(resolve, reject) {

            findPhotosByFileName(id).then(function(photos) {
                if (photos.length > 0) {
                    var photo = photos[0]; 
                    photo.photoStatus = photoStatuses.Deleted; 
                    db.put('photoTable', photo, id); 

                    resolve(photo); 
                }
            }); 
        }); 

        return p; 
    }

    function findPhotosByFileName(fileName) {

        var p = new Promise(function(resolve, reject) {

            var q = db.from('photoTable');
            q = q.where('fileName', '=', fileName);
            q.list().done(function(photos) {
                resolve(photos); 
            }); 
        }); 

        return p; 
    }

    function findPhotosByCameraId(cameraId) {  

        var p = new Promise(function(resolve, reject) {

            var q = db.from('photoTable');
            q = q.where('cameraId', '=', cameraId);
            //q = q.where('photoStatus', '<', photoStatuses.Deleted); 
            q.list().done(function(photos) {

                var filteredPhotos = []; 
                photos.forEach(function(photo) {
                    if (photo.photoStatus != photoStatuses.Deleted) {
                        filteredPhotos.push(photo); 
                    }                    
                }); 

                resolve(filteredPhotos); 
            }); 
        }); 

        return p; 
    }

    return {        
    	addNewPhoto: addNewPhoto, 
        addExistingPhoto: addExistingPhoto, 
        getPhotos: getPhotos, 
    	deletePhoto: deletePhoto, 
        findPhotosByFileName: findPhotosByFileName, 
        findPhotosByCameraId: findPhotosByCameraId  
    };

}()); 

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1tcy1jYW1lcmEtdWkuanMiLCJtbXMtY2FtZXJhLXV0aWxzLmpzIiwibW1zLWNhbWVyYS5qcyIsIm1tcy1waG90b0RCLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLElBQUEsZUFBQSxXQUFBOztDQUVBLElBQUEsWUFBQSxFQUFBLE9BQUEsS0FBQSxRQUFBOztDQUVBLFNBQUEsaUJBQUEsZUFBQTtFQUNBLGNBQUEsUUFBQSxTQUFBLGNBQUE7O0dBRUEsSUFBQSxXQUFBLGFBQUE7R0FDQSxJQUFBLGlCQUFBLGFBQUE7O01BRUEsZ0JBQUEsVUFBQTs7OztJQUlBLFNBQUEsZ0JBQUEsVUFBQSxnQkFBQTs7RUFFQSxJQUFBLG1CQUFBLEdBQUEsTUFBQTtFQUNBLElBQUEsY0FBQSxpQkFBQSxLQUFBO0VBQ0EsSUFBQSxrQkFBQSxpQkFBQSxLQUFBO0VBQ0EsSUFBQSxtQkFBQSxnQkFBQSxLQUFBOztFQUVBLElBQUEsaUJBQUEsaUJBQUEsS0FBQTs7RUFFQSxJQUFBLE1BQUEsZUFBQTtFQUNBLElBQUEsa0JBQUEsU0FBQSxXQUFBO0dBQ0EsT0FBQSxXQUFBLEtBQUE7O0VBRUEsZUFBQSxJQUFBLFdBQUEsZ0JBQUE7RUFDQSxZQUFBLElBQUEsV0FBQSxnQkFBQSxDQUFBOztFQUVBLElBQUEsa0JBQUE7R0FDQSxhQUFBLGdCQUFBLGdCQUFBLFVBQUEsa0JBQUE7O0dBRUEsWUFBQSxNQUFBLFdBQUE7SUFDQSxhQUFBLG9CQUFBLFVBQUEsa0JBQUE7Ozs7RUFJQSxJQUFBLGtCQUFBLGVBQUEsU0FBQSxHQUFBO0dBQ0EsZUFBQSxRQUFBLFNBQUEsZUFBQTtJQUNBLFdBQUEsaUJBQUEsVUFBQTs7OztFQUlBLGtCQUFBLGtCQUFBOzs7Q0FHQSxTQUFBLGtCQUFBLGtCQUFBLFVBQUE7O0VBRUEsV0FBQSxxQkFBQSxVQUFBLEtBQUEsU0FBQSxRQUFBOztNQUVBLEVBQUEsS0FBQSxRQUFBLFdBQUE7SUFDQSxlQUFBLGtCQUFBOzs7OztDQUtBLFNBQUEsYUFBQSxV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QUEsU0FBQSxVQUFBOztJQUVBLGNBQUEsT0FBQSxLQUFBO0lBQ0EsYUFBQSxPQUFBLEtBQUE7SUFDQSxXQUFBLE9BQUEsS0FBQTs7YUFFQSxJQUFBLE9BQUEsVUFBQTs7YUFFQSxJQUFBLFlBQUEsS0FBQSxLQUFBO2FBQ0EsVUFBQSxNQUFBOzs7SUFHQSxTQUFBLEtBQUEsS0FBQTtJQUNBLFVBQUEsS0FBQSxLQUFBOzthQUVBLElBQUEsUUFBQSxPQUFBO0lBQ0EsSUFBQSxTQUFBLE9BQUEsU0FBQSxRQUFBOztJQUVBLE1BQUEsZUFBQSxXQUFBO0tBQ0EsSUFBQSxZQUFBLFNBQUEsYUFBQTtNQUNBLFlBQUEsWUFBQTs7OztJQUlBLFVBQUEsYUFBQSxhQUFBO0tBQ0EsS0FBQSxVQUFBLFFBQUE7S0FDQSxPQUFBLFNBQUE7S0FDQSxNQUFBLFlBQUE7S0FDQSxNQUFBLE1BQUEsT0FBQSxJQUFBLGdCQUFBOztLQUVBLE1BQUEsVUFBQSxPQUFBO01BQ0EsUUFBQSxLQUFBLGtDQUFBOzs7O0lBSUEsSUFBQSxtQkFBQSxHQUFBLE1BQUE7SUFDQSxJQUFBLGtCQUFBLGlCQUFBLEtBQUE7SUFDQSxnQkFBQSxZQUFBOztZQUVBLFVBQUEsU0FBQSxXQUFBO2FBQ0E7O1lBRUEsVUFBQTtZQUNBLFNBQUEsQ0FBQTtnQkFDQSxPQUFBO2dCQUNBLE1BQUE7Z0JBQ0EsVUFBQTtnQkFDQSxRQUFBLFVBQUEsY0FBQTtRQUNBOztlQUVBO2dCQUNBLE9BQUE7Z0JBQ0EsTUFBQTtnQkFDQSxVQUFBO2dCQUNBLFFBQUEsVUFBQSxjQUFBO1FBQ0E7O2VBRUE7Z0JBQ0EsT0FBQTtnQkFDQSxNQUFBO2dCQUNBLFVBQUE7Z0JBQ0EsUUFBQSxVQUFBLGNBQUE7O1FBRUEsSUFBQSxVQUFBO1NBQ0EsSUFBQSxVQUFBLE9BQUEsVUFBQTtTQUNBLFNBQUEsVUFBQSxhQUFBOzthQUVBO1NBQ0EsUUFBQSxLQUFBOzs7b0JBR0EsYUFBQTs7ZUFFQTtnQkFDQSxPQUFBO2dCQUNBLE1BQUE7Z0JBQ0EsVUFBQTtnQkFDQSxRQUFBLFVBQUEsY0FBQTtvQkFDQSxhQUFBOzs7Ozs7Q0FNQSxTQUFBLHNCQUFBO0VBQ0EsT0FBQSxZQUFBO0VBQ0EsUUFBQSxZQUFBOztFQUVBLFlBQUEsWUFBQTtFQUNBLFdBQUEsWUFBQTs7O0lBR0EsU0FBQSxrQkFBQTs7RUFFQSxJQUFBLFVBQUEsU0FBQTtHQUNBLElBQUEsUUFBQSxPQUFBO0dBQ0EsSUFBQSxTQUFBLFFBQUE7O0dBRUEsT0FBQSxRQUFBLE1BQUE7S0FDQSxPQUFBLFNBQUEsTUFBQTtHQUNBLE9BQUEsV0FBQSxNQUFBLFVBQUEsT0FBQSxHQUFBLEdBQUEsT0FBQSxPQUFBLE9BQUE7O0dBRUEsSUFBQSxTQUFBLFNBQUEsV0FBQTtJQUNBLFNBQUEsWUFBQTs7O0dBR0E7Ozs7SUFJQSxTQUFBLGFBQUE7RUFDQSxJQUFBLFFBQUEsT0FBQTtFQUNBLElBQUEsU0FBQSxNQUFBOztFQUVBLElBQUEsUUFBQTtHQUNBLE9BQUEsWUFBQSxHQUFBO0dBQ0EsTUFBQSxNQUFBLE1BQUEsWUFBQTs7OztJQUlBLE9BQUE7S0FDQSxxQkFBQTtLQUNBLGlCQUFBOzs7OztBQzVLQSxJQUFBLGdCQUFBLEVBQUEsS0FBQSxHQUFBLFVBQUEsR0FBQSxTQUFBOztBQUVBLElBQUEsY0FBQSxXQUFBOztDQUVBLElBQUE7O0lBRUE7O0lBRUEsU0FBQSxPQUFBOztFQUVBLElBQUEsU0FBQTtJQUNBLFFBQUEsQ0FBQTtNQUNBLE1BQUE7TUFDQSxTQUFBLENBQUEsRUFBQSxNQUFBLGNBQUEsRUFBQSxNQUFBOzs7O1FBSUEsS0FBQSxJQUFBLElBQUEsR0FBQSxRQUFBLGNBQUE7OztJQUdBLFNBQUEsWUFBQSxJQUFBLFVBQUEsU0FBQTs7O1FBR0EsR0FBQSxJQUFBLGNBQUEsRUFBQSxVQUFBLElBQUEsVUFBQSxVQUFBLFdBQUEsT0FBQSxJQUFBO2dDQUNBLGFBQUEsY0FBQSxLQUFBLFNBQUEsV0FBQTs7O0lBR0EsU0FBQSxpQkFBQSxVQUFBLFNBQUE7O1FBRUEsSUFBQSxLQUFBLGVBQUEsWUFBQTs7O1FBR0EsR0FBQSxJQUFBLGNBQUEsRUFBQSxVQUFBLElBQUEsVUFBQSxVQUFBLFdBQUE7Z0NBQ0EsYUFBQSxjQUFBLFVBQUEsU0FBQSxXQUFBOzs7SUFHQSxTQUFBLFlBQUE7O1FBRUEsSUFBQSxJQUFBLElBQUEsUUFBQSxTQUFBLFNBQUEsUUFBQTs7WUFFQSxJQUFBLFFBQUEsR0FBQSxLQUFBO1lBQ0EsUUFBQSxNQUFBLE1BQUEsZUFBQSxLQUFBLGNBQUE7WUFDQSxNQUFBLE9BQUEsS0FBQSxTQUFBLFFBQUE7ZUFDQSxRQUFBOzs7O1FBSUEsT0FBQTs7OztJQUlBLFNBQUEsWUFBQSxJQUFBOztRQUVBLElBQUEsSUFBQSxJQUFBLFFBQUEsU0FBQSxTQUFBLFFBQUE7O1lBRUEscUJBQUEsSUFBQSxLQUFBLFNBQUEsUUFBQTtnQkFDQSxJQUFBLE9BQUEsU0FBQSxHQUFBO29CQUNBLElBQUEsUUFBQSxPQUFBO29CQUNBLE1BQUEsY0FBQSxjQUFBO29CQUNBLEdBQUEsSUFBQSxjQUFBLE9BQUE7O29CQUVBLFFBQUE7Ozs7O1FBS0EsT0FBQTs7O0lBR0EsU0FBQSxxQkFBQSxVQUFBOztRQUVBLElBQUEsSUFBQSxJQUFBLFFBQUEsU0FBQSxTQUFBLFFBQUE7O1lBRUEsSUFBQSxJQUFBLEdBQUEsS0FBQTtZQUNBLElBQUEsRUFBQSxNQUFBLFlBQUEsS0FBQTtZQUNBLEVBQUEsT0FBQSxLQUFBLFNBQUEsUUFBQTtnQkFDQSxRQUFBOzs7O1FBSUEsT0FBQTs7O0lBR0EsU0FBQSxxQkFBQSxVQUFBOztRQUVBLElBQUEsSUFBQSxJQUFBLFFBQUEsU0FBQSxTQUFBLFFBQUE7O1lBRUEsSUFBQSxJQUFBLEdBQUEsS0FBQTtZQUNBLElBQUEsRUFBQSxNQUFBLFlBQUEsS0FBQTs7WUFFQSxFQUFBLE9BQUEsS0FBQSxTQUFBLFFBQUE7O2dCQUVBLElBQUEsaUJBQUE7Z0JBQ0EsT0FBQSxRQUFBLFNBQUEsT0FBQTtvQkFDQSxJQUFBLE1BQUEsZUFBQSxjQUFBLFNBQUE7d0JBQ0EsZUFBQSxLQUFBOzs7O2dCQUlBLFFBQUE7Ozs7UUFJQSxPQUFBOzs7SUFHQSxPQUFBO0tBQ0EsYUFBQTtRQUNBLGtCQUFBO1FBQ0EsV0FBQTtLQUNBLGFBQUE7UUFDQSxzQkFBQTtRQUNBLHNCQUFBOzs7O0FBSUEiLCJmaWxlIjoibW1zLWNhbWVyYS5qcyIsInNvdXJjZXNDb250ZW50IjpbInZhciBtbXNDYW1lcmFVSSA9IChmdW5jdGlvbigpIHtcclxuXHJcblx0dmFyIHBob3RvU2l6ZSA9IHsgd2lkdGg6IDE1MCwgaGVpZ2h0OiAxMTMgfTtcclxuXHJcblx0ZnVuY3Rpb24gY29uZmlndXJlQ2FtZXJhcyhjYW1lcmFEZXRhaWxzKSB7IFxyXG5cdFx0Y2FtZXJhRGV0YWlscy5mb3JFYWNoKGZ1bmN0aW9uKGNhbWVyYURldGFpbCkgeyBcclxuXHJcblx0XHRcdHZhciBjYW1lcmFJZCA9IGNhbWVyYURldGFpbC5jYW1lcmFJZDsgXHJcblx0XHRcdHZhciBleGlzdGluZ1Bob3RvcyA9IGNhbWVyYURldGFpbC5leGlzdGluZ1Bob3RvczsgXHJcblxyXG5cdFx0ICAgIGNvbmZpZ3VyZUNhbWVyYShjYW1lcmFJZCwgZXhpc3RpbmdQaG90b3MpOyBcclxuXHRcdH0pOyBcclxuXHR9XHJcblxyXG4gICAgZnVuY3Rpb24gY29uZmlndXJlQ2FtZXJhKGNhbWVyYUlkLCBleGlzdGluZ1Bob3Rvcykge1xyXG5cclxuXHRcdHZhciAkY2FtZXJhQ29udGFpbmVyID0gJCggXCIjXCIgKyBjYW1lcmFJZCApOyBcclxuXHRcdHZhciAkY2FtZXJhTGluayA9ICRjYW1lcmFDb250YWluZXIuZmluZChcIi5jYW1lcmEtbGlua1wiKTsgXHJcblx0XHR2YXIgJHBob3RvQ29udGFpbmVyID0gJGNhbWVyYUNvbnRhaW5lci5maW5kKFwiLnBob3RvLWltYWdlc2V0XCIpOyBcclxuXHRcdHZhciBwaG90b0NvbnRhaW5lcklkID0gJHBob3RvQ29udGFpbmVyLmF0dHIoXCJpZFwiKTtcclxuXHJcblx0XHR2YXIgJGNhbWVyYUxpbmtJT1MgPSAkY2FtZXJhQ29udGFpbmVyLmZpbmQoXCIuY2FtZXJhLWxpbmstaW9zXCIpOyBcclxuXHJcblx0XHR2YXIgaU9TID0gbW1zQ2FtZXJhVXRpbHMuaXNJT1MoKTsgXHJcblx0XHR2YXIgZ2V0RGlzcGxheVZhbHVlID0gZnVuY3Rpb24oaXNWaXNpYmxlKSB7XHJcblx0XHRcdHJldHVybiBpc1Zpc2libGU/IFwiXCIgOiBcIm5vbmVcIjsgXHJcblx0XHR9OyBcclxuXHRcdCRjYW1lcmFMaW5rSU9TLmNzcyhcImRpc3BsYXlcIiwgZ2V0RGlzcGxheVZhbHVlKGlPUykpOyBcclxuXHRcdCRjYW1lcmFMaW5rLmNzcyhcImRpc3BsYXlcIiwgZ2V0RGlzcGxheVZhbHVlKCFpT1MpKTsgXHJcblxyXG5cdFx0aWYgKHBob3RvQ29udGFpbmVySWQpIHtcclxuXHRcdFx0Y2FtZXJhRGlhbG9nLmNvbmZpZ3VyZUZvcklPUygkY2FtZXJhTGlua0lPUywgY2FtZXJhSWQsIHBob3RvQ29udGFpbmVySWQsIHNhdmVTbmFwc2hvdCk7IFxyXG5cclxuXHRcdFx0JGNhbWVyYUxpbmsuY2xpY2soZnVuY3Rpb24oKSB7IFxyXG5cdFx0XHRcdGNhbWVyYURpYWxvZy5kaXNwbGF5Q2FtZXJhRGlhbG9nKGNhbWVyYUlkLCBwaG90b0NvbnRhaW5lcklkLCBzYXZlU25hcHNob3QpOyBcclxuXHRcdFx0fSk7IFxyXG5cdFx0fVxyXG5cclxuXHRcdGlmIChleGlzdGluZ1Bob3RvcyAmJiBleGlzdGluZ1Bob3Rvcy5sZW5ndGggPiAwKSB7XHJcblx0XHRcdGV4aXN0aW5nUGhvdG9zLmZvckVhY2goZnVuY3Rpb24oZXhpc3RpbmdQaG90bykge1xyXG5cdFx0XHRcdG1tc1Bob3RvREIuYWRkRXhpc3RpbmdQaG90byhjYW1lcmFJZCwgZXhpc3RpbmdQaG90byk7IFxyXG5cdFx0XHR9KTsgXHRcclxuXHRcdH1cclxuXHJcblx0XHRwb3B1bGF0ZVBob3RvTGlzdChwaG90b0NvbnRhaW5lcklkLCBjYW1lcmFJZCk7IFxyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gcG9wdWxhdGVQaG90b0xpc3QocGhvdG9Db250YWluZXJJZCwgY2FtZXJhSWQpIHsgXHJcblx0XHQvLyBwb3B1bGF0ZSB0aGUgbGlzdCBvZiBhbGwgcGhvdG9zIGZvciBnaXZlbiBjYW1lcmEgIFxyXG5cdFx0bW1zUGhvdG9EQi5maW5kUGhvdG9zQnlDYW1lcmFJZChjYW1lcmFJZCkudGhlbihmdW5jdGlvbihwaG90b3MpIHsgXHJcblxyXG5cdFx0ICAgICQuZWFjaChwaG90b3MsIGZ1bmN0aW9uKCkgeyBcclxuXHRcdFx0XHRhZGRQaG90b1RvTGlzdChwaG90b0NvbnRhaW5lcklkLCB0aGlzKTsgXHJcblx0XHRcdH0pOyBcclxuXHRcdH0pOyBcclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIHNhdmVTbmFwc2hvdChjYW1lcmFJZCwgcGhvdG9Db250YWluZXJJZCwgaW1nRGF0YSkge1xyXG5cclxuXHRcdHZhciBmaWxlTmFtZSA9IG1tc0NhbWVyYVV0aWxzLm5ld0d1aWQoKSArIFwiLnBuZ1wiOyBcclxuXHRcdHZhciBpbWdPYmplY3QgPSB7IGZpbGVOYW1lOiBmaWxlTmFtZSwgY29udGVudDogaW1nRGF0YSwgY2FtZXJhSWQ6IGNhbWVyYUlkIH07XHJcblxyXG5cdFx0bW1zUGhvdG9EQi5hZGROZXdQaG90byhmaWxlTmFtZSwgY2FtZXJhSWQsIGltZ0RhdGEpO1xyXG5cclxuXHRcdGFkZFBob3RvVG9MaXN0KHBob3RvQ29udGFpbmVySWQsIGltZ09iamVjdCk7IFxyXG5cdH0gXHJcblxyXG5cdGZ1bmN0aW9uIGFkZFBob3RvVG9MaXN0KHBob3RvQ29udGFpbmVySWQsIGltYWdlT2JqZWN0KSB7XHJcblxyXG5cdFx0dmFyICRpbWFnZXNEaXYgPSAkKFwiI1wiICsgcGhvdG9Db250YWluZXJJZCk7XHJcblx0XHR2YXIgJGltZ0RpdiA9ICQoJzxkaXYgLz4nKS5hZGRDbGFzcyhcImltZ1wiKS5jc3MoXCJoZWlnaHRcIiwgcGhvdG9TaXplLmhlaWdodCArIFwicHhcIik7IFxyXG5cdFx0dmFyICRkZWxEaXYgPSAkKCc8ZGl2IC8+JykuYWRkQ2xhc3MoXCJkZWxcIikuYXR0cihcImRhdGEtaWRcIiwgaW1hZ2VPYmplY3QuZmlsZU5hbWUpOyBcclxuXHRcdHZhciAkaWNvbiA9ICQoJzxpIGFyaWEtaGlkZGVuPVwidHJ1ZVwiIC8+JykuYWRkQ2xhc3MoXCJmYSBmYS10cmFzaC1vXCIpOyBcclxuXHJcblx0XHQkZGVsRGl2LmFwcGVuZCgkaWNvbik7IFxyXG5cclxuXHRcdCRpbWdEaXYuY2xpY2soZnVuY3Rpb24oZXZ0KSB7IFxyXG5cdFx0XHRldnQuc3RvcFByb3BhZ2F0aW9uKCk7IFxyXG5cclxuXHRcdFx0dmFyICRwaWMgPSAkKCc8aW1nIHN0eWxlPVwid2lkdGg6IDEwMCVcIiB3aWR0aD1cIjEwMCVcIiAvPicpLmF0dHIoJ3NyYycsIGltYWdlT2JqZWN0LmNvbnRlbnQpO1xyXG5cdCAgICAgICAgXHJcblx0ICAgICAgICBCb290c3RyYXBEaWFsb2cuc2hvdyh7XHJcblx0ICAgICAgICAgICAgdGl0bGU6ICdQaG90byBQcmV2aWV3JyxcclxuXHQgICAgICAgICAgICBtZXNzYWdlOiAkcGljLFxyXG5cdCAgICAgICAgICAgIGNzc0NsYXNzOiAnbG9naW4tZGlhbG9nJywgXHJcblx0ICAgICAgICAgICAgYnV0dG9uczogW3tcclxuXHQgICAgICAgICAgICAgICAgbGFiZWw6ICdPSycsXHJcblx0ICAgICAgICAgICAgICAgIGNzc0NsYXNzOiAnYnRuLXByaW1hcnknLFxyXG5cdCAgICAgICAgICAgICAgICBhY3Rpb246IGZ1bmN0aW9uKGRpYWxvZ1JlZil7XHJcblx0ICAgICAgICAgICAgICAgICAgICBkaWFsb2dSZWYuY2xvc2UoKTtcclxuXHQgICAgICAgICAgICAgICAgfVxyXG5cdCAgICAgICAgICAgIH1dXHJcblx0ICAgICAgICB9KTsgXHJcblx0XHR9KTsgXHJcblxyXG5cdFx0JGRlbERpdi5jbGljayhmdW5jdGlvbihldnQpIHsgXHJcblx0XHQgICAgZXZ0LnN0b3BQcm9wYWdhdGlvbigpOyBcclxuXHJcblx0XHQgICAgdmFyIGltYWdlSWQgPSBpbWFnZU9iamVjdC5maWxlTmFtZTsgXHJcblx0ICAgICAgICBpZiAoY29uZmlybSgnQXJlIHlvdSBzdXJlPycpID09IHRydWUpIHtcclxuXHJcblx0ICAgICAgICAgICAgdmFyICRkZWxJbWcgPSAkKCdkaXZbZGF0YS1pZD1cIicgKyBpbWFnZUlkICsnXCJdJyk7XHJcblx0ICAgICAgICAgICAgdmFyICRwaG90byA9ICRkZWxJbWcucGFyZW50KCk7IFxyXG5cdCAgICAgICAgICAgICRwaG90by5yZW1vdmUoKTsgXHJcblxyXG5cdCAgICAgICAgICAgIG1tc1Bob3RvREIuZGVsZXRlUGhvdG8oaW1hZ2VJZClcclxuXHQgICAgICAgICAgICAudGhlbihmdW5jdGlvbihwaG90bykge1xyXG5cdCAgICAgICAgICAgIH0pOyBcclxuXHQgICAgICAgIH1cclxuXHRcdH0pOyBcclxuXHJcblx0XHQkaW1nRGl2LmFwcGVuZCgkZGVsRGl2KTsgXHJcblx0XHQkaW1nRGl2LmFwcGVuZCgkKFwiPGltZyAvPlwiKS5hdHRyKFwic3JjXCIsIGltYWdlT2JqZWN0LmNvbnRlbnQpLmF0dHIoXCJ3aWR0aFwiLCBwaG90b1NpemUud2lkdGgpLmF0dHIoXCJoZWlnaHRcIiwgcGhvdG9TaXplLmhlaWdodCkpOyBcclxuXHJcblx0XHQkaW1hZ2VzRGl2LmFwcGVuZCgkaW1nRGl2KTsgXHJcblx0fVxyXG5cclxuXHRyZXR1cm4geyAgICAgICAgXHJcbiAgICBcdGNvbmZpZ3VyZUNhbWVyYXM6IGNvbmZpZ3VyZUNhbWVyYXMgXHJcbiAgICB9O1xyXG5cclxufSgpKTsgIiwidmFyIG1tc0NhbWVyYVV0aWxzID0gKGZ1bmN0aW9uKCkge1xyXG5cclxuIFx0ZnVuY3Rpb24gUzQoKSB7XHJcbiAgICAgICAgcmV0dXJuICgoKDErTWF0aC5yYW5kb20oKSkqMHgxMDAwMCl8MCkudG9TdHJpbmcoMTYpLnN1YnN0cmluZygxKTsgXHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gbmV3R3VpZCgpIHtcclxuXHJcblx0XHQvLyB0aGVuIHRvIGNhbGwgaXQsIHBsdXMgc3RpdGNoIGluICc0JyBpbiB0aGUgdGhpcmQgZ3JvdXBcclxuXHRcdHZhciBndWlkID0gKFM0KCkgKyBTNCgpICsgXCItXCIgKyBTNCgpICsgXCItNFwiICsgUzQoKS5zdWJzdHIoMCwzKSArIFwiLVwiICsgUzQoKSArIFwiLVwiICsgUzQoKSArIFM0KCkgKyBTNCgpKS50b0xvd2VyQ2FzZSgpO1xyXG5cdFx0cmV0dXJuIGd1aWQ7IFxyXG4gICAgfSBcclxuXHJcbiAgICBmdW5jdGlvbiBpc0lPUygpIHsgXHJcblx0XHR2YXIgaU9TID0gWydpUGFkJywgJ2lQaG9uZScsICdpUG9kJ10uaW5kZXhPZihuYXZpZ2F0b3IucGxhdGZvcm0pID49IDA7IFxyXG5cdFx0cmV0dXJuIGlPUzsgXHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHsgXHJcbiAgICBcdG5ld0d1aWQ6IG5ld0d1aWQsIFxyXG4gICAgXHRpc0lPUzogaXNJT1MgXHJcbiAgICB9O1xyXG5cclxufSgpKTsgXHJcbiIsIlxyXG52YXIgY2FtZXJhRGlhbG9nID0gKGZ1bmN0aW9uKCkge1xyXG5cclxuXHR2YXIgY29uc3RyYWludHMgPSB7IHZpZGVvOiB0cnVlLCBhdWRpbzogZmFsc2UgfTsgXHJcblx0dmFyIGNhbGxiYWNrOyBcclxuXHJcblx0dmFyICR2aWRlbywgJGNhbnZhczsgXHJcblx0dmFyICRidG5DYXB0dXJlLCAkYnRuUmV0YWtlLCAkYnRuU2F2ZTsgXHJcblxyXG5cdGZ1bmN0aW9uIGNvbmZpZ3VyZUZvcklPUyhjYW1lcmFMaW5rSU9TLCBjYW1lcmFJZCwgY29udGFpbmVySWQsIHNhdmVTbmFwc2hvdENhbGxiYWNrKSB7XHJcblxyXG5cdFx0Y2FtZXJhTGlua0lPUy5jaGFuZ2UoKGZ1bmN0aW9uKGNhbWVyYUlkLCBjb250YWluZXJJZCwgY2FsbGJhY2spIHtcclxuXHJcblx0XHRcdHJldHVybiBmdW5jdGlvbihldnQpIHtcclxuXHRcdFx0XHR2YXIgZiA9IGV2dC50YXJnZXQuZmlsZXNbMF07IFxyXG5cdFx0XHRcdHZhciByZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpO1xyXG5cclxuXHRcdFx0XHRyZWFkZXIub25sb2FkID0gZnVuY3Rpb24odGhlRmlsZSkge1xyXG5cclxuXHRcdFx0ICAgIFx0aWYgKGNhbGxiYWNrKSB7XHJcblx0XHRcdCAgICBcdFx0dmFyIGltZ0RhdGEgPSB0aGVGaWxlLnRhcmdldC5yZXN1bHQ7IFxyXG5cdFx0XHQgICAgXHRcdGNhbGxiYWNrKGNhbWVyYUlkLCBjb250YWluZXJJZCwgaW1nRGF0YSk7IFxyXG5cdFx0XHQgICAgXHR9XHJcblx0XHRcdCAgICBcdGVsc2Uge1xyXG5cdFx0XHQgICAgXHRcdGNvbnNvbGUud2FybihcIkNhbGxiYWNrIGlzIG5vdCBkZWZpbmVkIVwiKTsgXHJcblx0XHRcdCAgICBcdH1cclxuXHRcdFx0XHR9OyBcclxuXHJcblx0XHRcdFx0dmFyICRjYW1lcmFDb250YWluZXIgPSAkKCBcIiNcIiArIGNhbWVyYUlkICk7XHJcblx0XHRcdFx0dmFyICRwaG90b0NvbnRhaW5lciA9ICRjYW1lcmFDb250YWluZXIuZmluZChcIi5waG90by1pbWFnZXNldFwiKTtcclxuXHRcdFx0XHQkcGhvdG9Db250YWluZXIucmVtb3ZlQ2xhc3MoXCJoaWRkZW5cIik7XHRcdFx0XHJcblxyXG5cdFx0XHRcdC8vIFJlYWQgaW4gdGhlIGltYWdlIGZpbGUgYXMgYSBkYXRhIFVSTC5cclxuXHRcdFx0XHRyZWFkZXIucmVhZEFzRGF0YVVSTChmKTtcclxuXHRcdFx0fTsgXHJcblxyXG5cdFx0fSkoY2FtZXJhSWQsIGNvbnRhaW5lcklkLCBzYXZlU25hcHNob3RDYWxsYmFjaykpOyBcclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIGRpc3BsYXlDYW1lcmFEaWFsb2coY2FtZXJhSWQsIGNvbnRhaW5lcklkLCBzYXZlU25hcHNob3RDYWxsYmFjaykgeyBcclxuXHJcbiAgICAgICAgQm9vdHN0cmFwRGlhbG9nLnNob3coe1xyXG4gICAgICAgICAgICB0aXRsZTogJ1Rha2UgYSBwaG90bycsXHJcbiAgICAgICAgICAgIG1lc3NhZ2U6ICQoJzxkaXY+PC9kaXY+JykubG9hZCgnY2FtZXJhLmh0bWwnKSwgXHJcbiAgICAgICAgICAgIGNzc0NsYXNzOiAnbG9naW4tZGlhbG9nJywgXHJcbiAgICAgICAgICAgIG9uc2hvd246IGZ1bmN0aW9uKGRpYWxvZ1JlZikge1xyXG4gICAgICAgICAgICBcdFxyXG4gICAgICAgICAgICBcdGNhbGxiYWNrID0gc2F2ZVNuYXBzaG90Q2FsbGJhY2s7IFxyXG5cclxuICAgICAgICAgICAgXHQvLyBpbml0IHJlZmVyZW5jZXMgdG8gYnV0dG9ucyBmcm9tIG1vZGFsIGZvb3RlciBcclxuXHRcdFx0XHR2YXIgZm9vdGVyID0gZGlhbG9nUmVmLmdldE1vZGFsRm9vdGVyKCk7IFxyXG5cclxuXHRcdFx0XHQkYnRuQ2FwdHVyZSA9IGZvb3Rlci5maW5kKFwiLmJ0bi1jYXB0dXJlXCIpOyBcclxuXHRcdFx0XHQkYnRuUmV0YWtlID0gZm9vdGVyLmZpbmQoXCIuYnRuLXJldGFrZVwiKTsgXHJcblx0XHRcdFx0JGJ0blNhdmUgPSBmb290ZXIuZmluZChcIi5idG4tc2F2ZVwiKTtcclxuICAgICAgICAgICAgXHRcclxuICAgICAgICAgICAgXHR2YXIgYm9keSA9IGRpYWxvZ1JlZi5nZXRNb2RhbEJvZHkoKTtcclxuXHJcbiAgICAgICAgICAgIFx0dmFyIGNoYW5nZUJ0biA9IGJvZHkuZmluZChcIiNjaGFuZ2VJZFwiKTtcclxuICAgICAgICAgICAgXHRjaGFuZ2VCdG4uY2xpY2soc3dhcFZpZGVvV2l0aENhbnZhcyk7XHJcblxyXG4gICAgICAgICAgICBcdC8vIGluaXQgdmlkZW8gJiBjYW52YXMgaGVyZSBcclxuXHRcdFx0XHQkdmlkZW8gPSBib2R5LmZpbmQoXCIjZGF0YVZpZGVvSWRcIik7IFxyXG5cdFx0XHRcdCRjYW52YXMgPSBib2R5LmZpbmQoXCIjY2FudmFzSWRcIik7IFxyXG5cclxuICAgICAgICAgICAgXHR2YXIgdmlkZW8gPSAkdmlkZW9bMF07XHJcblx0XHRcdFx0dmFyIGNhbnZhcyA9IHdpbmRvdy5jYW52YXMgPSAkY2FudmFzWzBdOyBcclxuXHJcblx0XHRcdFx0dmlkZW8ub25sb2FkZWRkYXRhID0gZnVuY3Rpb24oKSB7XHJcblx0XHRcdFx0XHRpZiAoJGJ0bkNhcHR1cmUuaGFzQ2xhc3MoXCJkaXNhYmxlZFwiKSkge1xyXG5cdFx0XHRcdFx0XHQkYnRuQ2FwdHVyZS5yZW1vdmVDbGFzcyhcImRpc2FibGVkXCIpOyBcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdG5hdmlnYXRvci5tZWRpYURldmljZXMuZ2V0VXNlck1lZGlhKGNvbnN0cmFpbnRzKVxyXG5cdFx0XHRcdC50aGVuKGZ1bmN0aW9uIChzdHJlYW0pIHtcclxuXHRcdFx0XHRcdHdpbmRvdy5zdHJlYW0gPSBzdHJlYW07IFxyXG5cdFx0XHRcdFx0dmlkZW8uc3JjT2JqZWN0ID0gc3RyZWFtO1xyXG5cdFx0XHRcdFx0dmlkZW8uc3JjID0gd2luZG93LlVSTC5jcmVhdGVPYmplY3RVUkwoc3RyZWFtKTsgXHJcblx0XHRcdFx0fSlcclxuXHRcdFx0XHQuY2F0Y2goZnVuY3Rpb24gKGVycm9yKSB7XHJcblx0XHRcdFx0IFx0Y29uc29sZS53YXJuKCduYXZpZ2F0b3IuZ2V0VXNlck1lZGlhIGVycm9yOiAnLCBlcnJvcik7XHJcblx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdC8vIGRpc3BsYXkgdGhlIGNvbnRhaW5lcj8gXHJcblx0XHRcdFx0dmFyICRjYW1lcmFDb250YWluZXIgPSAkKCBcIiNcIiArIGNhbWVyYUlkICk7XHJcblx0XHRcdFx0dmFyICRwaG90b0NvbnRhaW5lciA9ICRjYW1lcmFDb250YWluZXIuZmluZChcIi5waG90by1pbWFnZXNldFwiKTtcclxuXHRcdFx0XHQkcGhvdG9Db250YWluZXIucmVtb3ZlQ2xhc3MoXCJoaWRkZW5cIik7IFxyXG4gICAgICAgICAgICB9LCBcclxuICAgICAgICAgICAgb25oaWRkZW46IGZ1bmN0aW9uKGRpYWxvZ1JlZikge1xyXG4gICAgICAgICAgICBcdHN0b3BDYW1lcmEoKTsgXHJcbiAgICAgICAgICAgIH0sIFxyXG4gICAgICAgICAgICBjc3NDbGFzczogJ2xvZ2luLWRpYWxvZycsIFxyXG4gICAgICAgICAgICBidXR0b25zOiBbe1xyXG4gICAgICAgICAgICAgICAgbGFiZWw6ICdSZXRha2UnLFxyXG4gICAgICAgICAgICAgICAgaWNvbjogJ2dseXBoaWNvbiBnbHlwaGljb24tc29ydCcsXHJcbiAgICAgICAgICAgICAgICBjc3NDbGFzczogJ2J0biBidG4tcHJpbWFyeSBwdWxsLWxlZnQgaGlkZGVuIGJ0bi1yZXRha2UnLFxyXG4gICAgICAgICAgICAgICAgYWN0aW9uOiBmdW5jdGlvbiAoZGlhbG9nSXRzZWxmKSB7XHJcblx0XHRcdCAgICBcdHN3YXBWaWRlb1dpdGhDYW52YXMoKTsgXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0sIHtcclxuICAgICAgICAgICAgICAgIGxhYmVsOiAnQ2FwdHVyZSBTbmFwc2hvdCcsXHJcbiAgICAgICAgICAgICAgICBpY29uOiAnZ2x5cGhpY29uIGdseXBoaWNvbi1jYW1lcmEnLFxyXG4gICAgICAgICAgICAgICAgY3NzQ2xhc3M6ICdidG4gYnRuLXByaW1hcnkgcHVsbC1sZWZ0IGRpc2FibGVkIGJ0bi1jYXB0dXJlJyxcclxuICAgICAgICAgICAgICAgIGFjdGlvbjogZnVuY3Rpb24gKGRpYWxvZ0l0c2VsZikge1xyXG5cdFx0XHQgICAgXHRjYXB0dXJlU25hcHNob3QoKTsgXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0sIHtcclxuICAgICAgICAgICAgICAgIGxhYmVsOiAnU2F2ZScsXHJcbiAgICAgICAgICAgICAgICBpY29uOiAnZ2x5cGhpY29uIGdseXBoaWNvbi1vaycsXHJcbiAgICAgICAgICAgICAgICBjc3NDbGFzczogJ2J0bi1wcmltYXJ5IGhpZGRlbiBidG4tc2F2ZScsXHJcbiAgICAgICAgICAgICAgICBhY3Rpb246IGZ1bmN0aW9uIChkaWFsb2dJdHNlbGYpIHtcclxuXHJcblx0XHRcdCAgICBcdGlmIChjYWxsYmFjaykge1xyXG5cdFx0XHQgICAgXHRcdHZhciBpbWdEYXRhID0gY2FudmFzLnRvRGF0YVVSTChcImltYWdlL3BuZ1wiKTsgXHJcblx0XHRcdCAgICBcdFx0Y2FsbGJhY2soY2FtZXJhSWQsIGNvbnRhaW5lcklkLCBpbWdEYXRhKTsgXHJcblx0XHRcdCAgICBcdH1cclxuXHRcdFx0ICAgIFx0ZWxzZSB7XHJcblx0XHRcdCAgICBcdFx0Y29uc29sZS53YXJuKFwiQ2FsbGJhY2sgaXMgbm90IGRlZmluZWQhXCIpOyBcclxuXHRcdFx0ICAgIFx0fVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBkaWFsb2dJdHNlbGYuY2xvc2UoKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSwge1xyXG4gICAgICAgICAgICAgICAgbGFiZWw6ICdDYW5jZWwnLFxyXG4gICAgICAgICAgICAgICAgaWNvbjogJ2dseXBoaWNvbiBnbHlwaGljb24tcmVtb3ZlJyxcclxuICAgICAgICAgICAgICAgIGNzc0NsYXNzOiAnYnRuLWRhbmdlcicsXHJcbiAgICAgICAgICAgICAgICBhY3Rpb246IGZ1bmN0aW9uIChkaWFsb2dJdHNlbGYpIHtcclxuICAgICAgICAgICAgICAgICAgICBkaWFsb2dJdHNlbGYuY2xvc2UoKTsgXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1dXHJcbiAgICAgICAgfSk7XHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiBzd2FwVmlkZW9XaXRoQ2FudmFzKCkge1xyXG5cdFx0JHZpZGVvLnRvZ2dsZUNsYXNzKFwiaGlkZGVuXCIpO1xyXG5cdFx0JGNhbnZhcy50b2dnbGVDbGFzcyhcImhpZGRlblwiKTsgXHJcblxyXG5cdFx0JGJ0bkNhcHR1cmUudG9nZ2xlQ2xhc3MoXCJoaWRkZW5cIik7IFxyXG5cdFx0JGJ0blJldGFrZS50b2dnbGVDbGFzcyhcImhpZGRlblwiKTsgIFxyXG5cdH1cclxuXHJcbiAgICBmdW5jdGlvbiBjYXB0dXJlU25hcHNob3QoKSB7IFxyXG5cclxuXHRcdGlmICgkdmlkZW8gJiYgJGNhbnZhcykge1xyXG5cdFx0XHR2YXIgdmlkZW8gPSAkdmlkZW9bMF07IFxyXG5cdFx0XHR2YXIgY2FudmFzID0gJGNhbnZhc1swXTsgXHJcblxyXG5cdFx0XHRjYW52YXMud2lkdGggPSB2aWRlby52aWRlb1dpZHRoO1xyXG4gIFx0XHRcdGNhbnZhcy5oZWlnaHQgPSB2aWRlby52aWRlb0hlaWdodDtcclxuXHRcdFx0Y2FudmFzLmdldENvbnRleHQoJzJkJykuZHJhd0ltYWdlKHZpZGVvLCAwLCAwLCBjYW52YXMud2lkdGgsIGNhbnZhcy5oZWlnaHQpO1xyXG5cclxuXHRcdFx0aWYgKCRidG5TYXZlLmhhc0NsYXNzKFwiaGlkZGVuXCIpKSB7XHJcblx0XHRcdFx0JGJ0blNhdmUucmVtb3ZlQ2xhc3MoXCJoaWRkZW5cIik7IFxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRzd2FwVmlkZW9XaXRoQ2FudmFzKCk7IFx0XHRcdFxyXG5cdFx0fSBcclxuICAgIH0gXHJcblxyXG4gICAgZnVuY3Rpb24gc3RvcENhbWVyYSgpIHtcclxuXHRcdHZhciB2aWRlbyA9ICR2aWRlb1swXTtcclxuXHRcdHZhciBzdHJlYW0gPSB2aWRlby5zcmNPYmplY3Q7IFxyXG5cdFx0XHJcblx0XHRpZiAoc3RyZWFtKSB7XHJcblx0XHRcdHN0cmVhbS5nZXRUcmFja3MoKVswXS5zdG9wKCk7IFxyXG5cdFx0XHR2aWRlby5zcmMgPSB2aWRlby5zcmNPYmplY3QgPSBcIlwiOyAgXHJcblx0XHR9XHJcblx0fVxyXG4gXHJcbiAgICByZXR1cm4geyAgICAgICAgXHJcbiAgICBcdGRpc3BsYXlDYW1lcmFEaWFsb2c6IGRpc3BsYXlDYW1lcmFEaWFsb2csIFxyXG4gICAgXHRjb25maWd1cmVGb3JJT1M6IGNvbmZpZ3VyZUZvcklPUyBcclxuICAgIH07XHJcblxyXG59KCkpOyBcclxuIiwidmFyIHBob3RvU3RhdHVzZXMgPSB7IE5ldzogMCwgRXhpc3Rpbmc6IDEsIERlbGV0ZWQ6IDIgfTsgXHJcblxyXG52YXIgbW1zUGhvdG9EQiA9IChmdW5jdGlvbigpIHtcclxuXHJcblx0dmFyIGRiOyBcclxuXHJcbiAgICBpbml0KCk7IFxyXG5cclxuICAgIGZ1bmN0aW9uIGluaXQoKSB7IFxyXG5cclxuXHRcdHZhciBzY2hlbWEgPSB7XHJcblx0XHQgIHN0b3JlczogW3tcclxuXHRcdCAgICBuYW1lOiAncGhvdG9UYWJsZScsXHJcblx0XHQgICAgaW5kZXhlczogW3sgbmFtZTogJ2ZpbGVOYW1lJyB9LCB7IG5hbWU6ICdjYW1lcmFJZCcgfV1cclxuXHRcdCAgfV1cclxuXHRcdH07IFxyXG5cclxuICAgICAgICBkYiA9IG5ldyB5ZG4uZGIuU3RvcmFnZSgnTU1TUGhvdG9EQicsIHNjaGVtYSk7IFxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGFkZE5ld1Bob3RvKGlkLCBjYW1lcmFJZCwgY29udGVudCkgeyBcclxuXHJcbiAgICAgICAgLy8gd2UgYXNzdW1lIGhlcmUgdGhhdCBpZCAoZmlsZU5hbWUpIGlzIHVuaXF1ZSBcclxuICAgICAgICBkYi5wdXQoJ3Bob3RvVGFibGUnLCB7IGZpbGVOYW1lOiBpZCwgY2FtZXJhSWQ6IGNhbWVyYUlkLCBkYXRlVGFrZW46IFN0cmluZyhuZXcgRGF0ZSgpKSwgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGhvdG9TdGF0dXM6IHBob3RvU3RhdHVzZXMuTmV3LCBjb250ZW50OiBjb250ZW50IH0sIGlkKTsgXHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gYWRkRXhpc3RpbmdQaG90byhjYW1lcmFJZCwgY29udGVudCkgeyAgXHJcblxyXG4gICAgICAgIHZhciBpZCA9IG1tc0NhbWVyYVV0aWxzLm5ld0d1aWQoKSArIFwiLnBuZ1wiOyBcclxuXHJcbiAgICAgICAgLy8gd2UgYXNzdW1lIGhlcmUgdGhhdCBpZCAoZmlsZU5hbWUpIGlzIHVuaXF1ZSBcclxuICAgICAgICBkYi5wdXQoJ3Bob3RvVGFibGUnLCB7IGZpbGVOYW1lOiBpZCwgY2FtZXJhSWQ6IGNhbWVyYUlkLCBkYXRlVGFrZW46IG51bGwsIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBob3RvU3RhdHVzOiBwaG90b1N0YXR1c2VzLkV4aXN0aW5nLCBjb250ZW50OiBjb250ZW50IH0sIGlkKTsgXHJcbiAgICB9XHJcbiAgICBcclxuICAgIGZ1bmN0aW9uIGdldFBob3RvcygpIHtcclxuXHJcbiAgICAgICAgdmFyIHAgPSBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcclxuXHJcbiAgICAgICAgICAgIHZhciBxdWVyeSA9IGRiLmZyb20oJ3Bob3RvVGFibGUnKTsgXHJcbiAgICAgICAgICAgIHF1ZXJ5ID0gcXVlcnkud2hlcmUoJ3Bob3RvU3RhdHVzJywgJzwnLCBwaG90b1N0YXR1c2VzLkRlbGV0ZWQpOyBcclxuICAgICAgICAgICAgcXVlcnkubGlzdCgpLmRvbmUoZnVuY3Rpb24ocGhvdG9zKSB7XHJcbiAgICAgICAgICAgICAgIHJlc29sdmUocGhvdG9zKTsgXHJcbiAgICAgICAgICAgIH0pOyBcclxuICAgICAgICB9KTsgXHJcblxyXG4gICAgICAgIHJldHVybiBwOyBcclxuICAgIH1cclxuXHJcbiAgICAvLyBwZXJmb3JtcyBhIHZpcnR1YWwgZGVsZXRlIGhlcmUgXHJcbiAgICBmdW5jdGlvbiBkZWxldGVQaG90byhpZCkgeyBcclxuXHJcbiAgICAgICAgdmFyIHAgPSBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcclxuXHJcbiAgICAgICAgICAgIGZpbmRQaG90b3NCeUZpbGVOYW1lKGlkKS50aGVuKGZ1bmN0aW9uKHBob3Rvcykge1xyXG4gICAgICAgICAgICAgICAgaWYgKHBob3Rvcy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIHBob3RvID0gcGhvdG9zWzBdOyBcclxuICAgICAgICAgICAgICAgICAgICBwaG90by5waG90b1N0YXR1cyA9IHBob3RvU3RhdHVzZXMuRGVsZXRlZDsgXHJcbiAgICAgICAgICAgICAgICAgICAgZGIucHV0KCdwaG90b1RhYmxlJywgcGhvdG8sIGlkKTsgXHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUocGhvdG8pOyBcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7IFxyXG4gICAgICAgIH0pOyBcclxuXHJcbiAgICAgICAgcmV0dXJuIHA7IFxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGZpbmRQaG90b3NCeUZpbGVOYW1lKGZpbGVOYW1lKSB7XHJcblxyXG4gICAgICAgIHZhciBwID0gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XHJcblxyXG4gICAgICAgICAgICB2YXIgcSA9IGRiLmZyb20oJ3Bob3RvVGFibGUnKTtcclxuICAgICAgICAgICAgcSA9IHEud2hlcmUoJ2ZpbGVOYW1lJywgJz0nLCBmaWxlTmFtZSk7XHJcbiAgICAgICAgICAgIHEubGlzdCgpLmRvbmUoZnVuY3Rpb24ocGhvdG9zKSB7XHJcbiAgICAgICAgICAgICAgICByZXNvbHZlKHBob3Rvcyk7IFxyXG4gICAgICAgICAgICB9KTsgXHJcbiAgICAgICAgfSk7IFxyXG5cclxuICAgICAgICByZXR1cm4gcDsgXHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gZmluZFBob3Rvc0J5Q2FtZXJhSWQoY2FtZXJhSWQpIHsgIFxyXG5cclxuICAgICAgICB2YXIgcCA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xyXG5cclxuICAgICAgICAgICAgdmFyIHEgPSBkYi5mcm9tKCdwaG90b1RhYmxlJyk7XHJcbiAgICAgICAgICAgIHEgPSBxLndoZXJlKCdjYW1lcmFJZCcsICc9JywgY2FtZXJhSWQpO1xyXG4gICAgICAgICAgICAvL3EgPSBxLndoZXJlKCdwaG90b1N0YXR1cycsICc8JywgcGhvdG9TdGF0dXNlcy5EZWxldGVkKTsgXHJcbiAgICAgICAgICAgIHEubGlzdCgpLmRvbmUoZnVuY3Rpb24ocGhvdG9zKSB7XHJcblxyXG4gICAgICAgICAgICAgICAgdmFyIGZpbHRlcmVkUGhvdG9zID0gW107IFxyXG4gICAgICAgICAgICAgICAgcGhvdG9zLmZvckVhY2goZnVuY3Rpb24ocGhvdG8pIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAocGhvdG8ucGhvdG9TdGF0dXMgIT0gcGhvdG9TdGF0dXNlcy5EZWxldGVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZpbHRlcmVkUGhvdG9zLnB1c2gocGhvdG8pOyBcclxuICAgICAgICAgICAgICAgICAgICB9ICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIH0pOyBcclxuXHJcbiAgICAgICAgICAgICAgICByZXNvbHZlKGZpbHRlcmVkUGhvdG9zKTsgXHJcbiAgICAgICAgICAgIH0pOyBcclxuICAgICAgICB9KTsgXHJcblxyXG4gICAgICAgIHJldHVybiBwOyBcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4geyAgICAgICAgXHJcbiAgICBcdGFkZE5ld1Bob3RvOiBhZGROZXdQaG90bywgXHJcbiAgICAgICAgYWRkRXhpc3RpbmdQaG90bzogYWRkRXhpc3RpbmdQaG90bywgXHJcbiAgICAgICAgZ2V0UGhvdG9zOiBnZXRQaG90b3MsIFxyXG4gICAgXHRkZWxldGVQaG90bzogZGVsZXRlUGhvdG8sIFxyXG4gICAgICAgIGZpbmRQaG90b3NCeUZpbGVOYW1lOiBmaW5kUGhvdG9zQnlGaWxlTmFtZSwgXHJcbiAgICAgICAgZmluZFBob3Rvc0J5Q2FtZXJhSWQ6IGZpbmRQaG90b3NCeUNhbWVyYUlkICBcclxuICAgIH07XHJcblxyXG59KCkpOyBcclxuIl0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
