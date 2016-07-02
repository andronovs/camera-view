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
				mmsIndexedDB.addExistingPhoto(cameraId, existingPhoto); 
			}); 	
		}

		populatePhotoList(photoContainerId, cameraId); 
	}

	function populatePhotoList(photoContainerId, cameraId) { 
		// populate the list of all photos for given camera  
		mmsIndexedDB.findPhotosByCameraId(cameraId).then(function(photos) { 

		    $.each(photos, function() { 
				addPhotoToList(photoContainerId, this); 
			}); 
		}); 
	}

	function saveSnapshot(cameraId, photoContainerId, imgData) {

		var fileName = utils.newGuid() + ".png"; 
		var imgObject = { fileName: fileName, content: imgData, cameraId: cameraId };

		mmsIndexedDB.addNewPhoto(fileName, cameraId, imgData);

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

	            mmsIndexedDB.deletePhoto(imageId)
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

var mmsIndexedDB = (function() {

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

        var id = utils.newGuid() + ".png"; 

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

var utils = (function() {

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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1tcy1jYW1lcmEtdWkuanMiLCJtbXMtY2FtZXJhLmpzIiwibW1zLWluZGV4ZWREQi5qcyIsIm1tcy11dGlscy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxJQUFBLFlBQUEsV0FBQTs7Q0FFQSxJQUFBLFlBQUEsRUFBQSxPQUFBLEtBQUEsUUFBQTs7Q0FFQSxTQUFBLGlCQUFBLGVBQUE7RUFDQSxjQUFBLFFBQUEsU0FBQSxjQUFBOztHQUVBLElBQUEsV0FBQSxhQUFBO0dBQ0EsSUFBQSxpQkFBQSxhQUFBOztNQUVBLGdCQUFBLFVBQUE7Ozs7SUFJQSxTQUFBLGdCQUFBLFVBQUEsZ0JBQUE7O0VBRUEsSUFBQSxtQkFBQSxHQUFBLE1BQUE7RUFDQSxJQUFBLGNBQUEsaUJBQUEsS0FBQTtFQUNBLElBQUEsa0JBQUEsaUJBQUEsS0FBQTtFQUNBLElBQUEsbUJBQUEsZ0JBQUEsS0FBQTs7RUFFQSxJQUFBLGlCQUFBLGlCQUFBLEtBQUE7O0VBRUEsSUFBQSxNQUFBLE1BQUE7RUFDQSxJQUFBLGtCQUFBLFNBQUEsV0FBQTtHQUNBLE9BQUEsV0FBQSxLQUFBOztFQUVBLGVBQUEsSUFBQSxXQUFBLGdCQUFBO0VBQ0EsWUFBQSxJQUFBLFdBQUEsZ0JBQUEsQ0FBQTs7RUFFQSxJQUFBLGtCQUFBO0dBQ0EsYUFBQSxnQkFBQSxnQkFBQSxVQUFBLGtCQUFBOztHQUVBLFlBQUEsTUFBQSxXQUFBO0lBQ0EsYUFBQSxvQkFBQSxVQUFBLGtCQUFBOzs7O0VBSUEsSUFBQSxrQkFBQSxlQUFBLFNBQUEsR0FBQTtHQUNBLGVBQUEsUUFBQSxTQUFBLGVBQUE7SUFDQSxhQUFBLGlCQUFBLFVBQUE7Ozs7RUFJQSxrQkFBQSxrQkFBQTs7O0NBR0EsU0FBQSxrQkFBQSxrQkFBQSxVQUFBOztFQUVBLGFBQUEscUJBQUEsVUFBQSxLQUFBLFNBQUEsUUFBQTs7TUFFQSxFQUFBLEtBQUEsUUFBQSxXQUFBO0lBQ0EsZUFBQSxrQkFBQTs7Ozs7Q0FLQSxTQUFBLGFBQUEsVUFBQSxrQkFBQSxTQUFBOztFQUVBLElBQUEsV0FBQSxNQUFBLFlBQUE7RUFDQSxJQUFBLFlBQUEsRUFBQSxVQUFBLFVBQUEsU0FBQSxTQUFBLFVBQUE7O0VBRUEsYUFBQSxZQUFBLFVBQUEsVUFBQTs7RUFFQSxlQUFBLGtCQUFBOzs7Q0FHQSxTQUFBLGVBQUEsa0JBQUEsYUFBQTs7RUFFQSxJQUFBLGFBQUEsRUFBQSxNQUFBO0VBQ0EsSUFBQSxVQUFBLEVBQUEsV0FBQSxTQUFBLE9BQUEsSUFBQSxVQUFBLFVBQUEsU0FBQTtFQUNBLElBQUEsVUFBQSxFQUFBLFdBQUEsU0FBQSxPQUFBLEtBQUEsV0FBQSxZQUFBO0VBQ0EsSUFBQSxRQUFBLEVBQUEsNEJBQUEsU0FBQTs7RUFFQSxRQUFBLE9BQUE7O0VBRUEsUUFBQSxNQUFBLFNBQUEsS0FBQTtHQUNBLElBQUE7O0dBRUEsSUFBQSxPQUFBLEVBQUEsNENBQUEsS0FBQSxPQUFBLFlBQUE7O1NBRUEsZ0JBQUEsS0FBQTthQUNBLE9BQUE7YUFDQSxTQUFBO2FBQ0EsVUFBQTthQUNBLFNBQUEsQ0FBQTtpQkFDQSxPQUFBO2lCQUNBLFVBQUE7aUJBQ0EsUUFBQSxTQUFBLFVBQUE7cUJBQ0EsVUFBQTs7Ozs7O0VBTUEsUUFBQSxNQUFBLFNBQUEsS0FBQTtNQUNBLElBQUE7O01BRUEsSUFBQSxVQUFBLFlBQUE7U0FDQSxJQUFBLFFBQUEsb0JBQUEsTUFBQTs7YUFFQSxJQUFBLFVBQUEsRUFBQSxrQkFBQSxTQUFBO2FBQ0EsSUFBQSxTQUFBLFFBQUE7YUFDQSxPQUFBOzthQUVBLGFBQUEsWUFBQTtjQUNBLEtBQUEsU0FBQSxPQUFBOzs7OztFQUtBLFFBQUEsT0FBQTtFQUNBLFFBQUEsT0FBQSxFQUFBLFdBQUEsS0FBQSxPQUFBLFlBQUEsU0FBQSxLQUFBLFNBQUEsVUFBQSxPQUFBLEtBQUEsVUFBQSxVQUFBOztFQUVBLFdBQUEsT0FBQTs7O0NBR0EsT0FBQTtLQUNBLGtCQUFBOzs7OztBQ3JIQSxJQUFBLGdCQUFBLFdBQUE7O0NBRUEsSUFBQSxjQUFBLEVBQUEsT0FBQSxNQUFBLE9BQUE7Q0FDQSxJQUFBOztDQUVBLElBQUEsUUFBQTtDQUNBLElBQUEsYUFBQSxZQUFBOztDQUVBLFNBQUEsZ0JBQUEsZUFBQSxVQUFBLGFBQUEsc0JBQUE7O0VBRUEsY0FBQSxPQUFBLENBQUEsU0FBQSxVQUFBLGFBQUEsVUFBQTs7R0FFQSxPQUFBLFNBQUEsS0FBQTtJQUNBLElBQUEsSUFBQSxJQUFBLE9BQUEsTUFBQTtJQUNBLElBQUEsU0FBQSxJQUFBOztJQUVBLE9BQUEsU0FBQSxTQUFBLFNBQUE7O1FBRUEsSUFBQSxVQUFBO1NBQ0EsSUFBQSxVQUFBLFFBQUEsT0FBQTtTQUNBLFNBQUEsVUFBQSxhQUFBOzthQUVBO1NBQ0EsUUFBQSxLQUFBOzs7O0lBSUEsSUFBQSxtQkFBQSxHQUFBLE1BQUE7SUFDQSxJQUFBLGtCQUFBLGlCQUFBLEtBQUE7SUFDQSxnQkFBQSxZQUFBOzs7SUFHQSxPQUFBLGNBQUE7OztLQUdBLFVBQUEsYUFBQTs7O0NBR0EsU0FBQSxvQkFBQSxVQUFBLGFBQUEsc0JBQUE7O1FBRUEsZ0JBQUEsS0FBQTtZQUNBLE9BQUE7WUFDQSxTQUFBLEVBQUEsZUFBQSxLQUFBO1lBQ0EsVUFBQTtZQUNBLFNBQUEsU0FBQSxXQUFBOzthQUVBLFdBQUE7OztJQUdBLElBQUEsU0FBQSxVQUFBOztJQUVBLGNBQUEsT0FBQSxLQUFBO0lBQ0EsYUFBQSxPQUFBLEtBQUE7SUFDQSxXQUFBLE9BQUEsS0FBQTs7YUFFQSxJQUFBLE9BQUEsVUFBQTs7YUFFQSxJQUFBLFlBQUEsS0FBQSxLQUFBO2FBQ0EsVUFBQSxNQUFBOzs7SUFHQSxTQUFBLEtBQUEsS0FBQTtJQUNBLFVBQUEsS0FBQSxLQUFBOzthQUVBLElBQUEsUUFBQSxPQUFBO0lBQ0EsSUFBQSxTQUFBLE9BQUEsU0FBQSxRQUFBOztJQUVBLE1BQUEsZUFBQSxXQUFBO0tBQ0EsSUFBQSxZQUFBLFNBQUEsYUFBQTtNQUNBLFlBQUEsWUFBQTs7OztJQUlBLFVBQUEsYUFBQSxhQUFBO0tBQ0EsS0FBQSxVQUFBLFFBQUE7S0FDQSxPQUFBLFNBQUE7S0FDQSxNQUFBLFlBQUE7S0FDQSxNQUFBLE1BQUEsT0FBQSxJQUFBLGdCQUFBOztLQUVBLE1BQUEsVUFBQSxPQUFBO01BQ0EsUUFBQSxLQUFBLGtDQUFBOzs7O0lBSUEsSUFBQSxtQkFBQSxHQUFBLE1BQUE7SUFDQSxJQUFBLGtCQUFBLGlCQUFBLEtBQUE7SUFDQSxnQkFBQSxZQUFBOztZQUVBLFVBQUEsU0FBQSxXQUFBO2FBQ0E7O1lBRUEsVUFBQTtZQUNBLFNBQUEsQ0FBQTtnQkFDQSxPQUFBO2dCQUNBLE1BQUE7Z0JBQ0EsVUFBQTtnQkFDQSxRQUFBLFVBQUEsY0FBQTtRQUNBOztlQUVBO2dCQUNBLE9BQUE7Z0JBQ0EsTUFBQTtnQkFDQSxVQUFBO2dCQUNBLFFBQUEsVUFBQSxjQUFBO1FBQ0E7O2VBRUE7Z0JBQ0EsT0FBQTtnQkFDQSxNQUFBO2dCQUNBLFVBQUE7Z0JBQ0EsUUFBQSxVQUFBLGNBQUE7O1FBRUEsSUFBQSxVQUFBO1NBQ0EsSUFBQSxVQUFBLE9BQUEsVUFBQTtTQUNBLFNBQUEsVUFBQSxhQUFBOzthQUVBO1NBQ0EsUUFBQSxLQUFBOzs7b0JBR0EsYUFBQTs7ZUFFQTtnQkFDQSxPQUFBO2dCQUNBLE1BQUE7Z0JBQ0EsVUFBQTtnQkFDQSxRQUFBLFVBQUEsY0FBQTtvQkFDQSxhQUFBOzs7Ozs7Q0FNQSxTQUFBLHNCQUFBO0VBQ0EsT0FBQSxZQUFBO0VBQ0EsUUFBQSxZQUFBOztFQUVBLFlBQUEsWUFBQTtFQUNBLFdBQUEsWUFBQTs7O0lBR0EsU0FBQSxrQkFBQTs7RUFFQSxJQUFBLFVBQUEsU0FBQTtHQUNBLElBQUEsUUFBQSxPQUFBO0dBQ0EsSUFBQSxTQUFBLFFBQUE7O0dBRUEsT0FBQSxRQUFBLE1BQUE7S0FDQSxPQUFBLFNBQUEsTUFBQTtHQUNBLE9BQUEsV0FBQSxNQUFBLFVBQUEsT0FBQSxHQUFBLEdBQUEsT0FBQSxPQUFBLE9BQUE7O0dBRUEsSUFBQSxTQUFBLFNBQUEsV0FBQTtJQUNBLFNBQUEsWUFBQTs7O0dBR0E7Ozs7SUFJQSxTQUFBLGFBQUE7RUFDQSxJQUFBLFFBQUEsT0FBQTtFQUNBLElBQUEsU0FBQSxNQUFBOztFQUVBLElBQUEsUUFBQTtHQUNBLE9BQUEsWUFBQSxHQUFBO0dBQ0EsTUFBQSxNQUFBLE1BQUEsWUFBQTs7OztJQUlBLE9BQUE7S0FDQSxxQkFBQTtLQUNBLGlCQUFBOzs7OztBQzVLQSxJQUFBLGdCQUFBLEVBQUEsS0FBQSxHQUFBLFVBQUEsR0FBQSxTQUFBOztBQUVBLElBQUEsZ0JBQUEsV0FBQTs7Q0FFQSxJQUFBOztJQUVBOztJQUVBLFNBQUEsT0FBQTs7RUFFQSxJQUFBLFNBQUE7SUFDQSxRQUFBLENBQUE7TUFDQSxNQUFBO01BQ0EsU0FBQSxDQUFBLEVBQUEsTUFBQSxjQUFBLEVBQUEsTUFBQTs7OztRQUlBLEtBQUEsSUFBQSxJQUFBLEdBQUEsUUFBQSxjQUFBOzs7SUFHQSxTQUFBLFlBQUEsSUFBQSxVQUFBLFNBQUE7OztRQUdBLEdBQUEsSUFBQSxjQUFBLEVBQUEsVUFBQSxJQUFBLFVBQUEsVUFBQSxXQUFBLE9BQUEsSUFBQTtnQ0FDQSxhQUFBLGNBQUEsS0FBQSxTQUFBLFdBQUE7OztJQUdBLFNBQUEsaUJBQUEsVUFBQSxTQUFBOztRQUVBLElBQUEsS0FBQSxNQUFBLFlBQUE7OztRQUdBLEdBQUEsSUFBQSxjQUFBLEVBQUEsVUFBQSxJQUFBLFVBQUEsVUFBQSxXQUFBO2dDQUNBLGFBQUEsY0FBQSxVQUFBLFNBQUEsV0FBQTs7O0lBR0EsU0FBQSxZQUFBOztRQUVBLElBQUEsSUFBQSxJQUFBLFFBQUEsU0FBQSxTQUFBLFFBQUE7O1lBRUEsSUFBQSxRQUFBLEdBQUEsS0FBQTtZQUNBLFFBQUEsTUFBQSxNQUFBLGVBQUEsS0FBQSxjQUFBO1lBQ0EsTUFBQSxPQUFBLEtBQUEsU0FBQSxRQUFBO2VBQ0EsUUFBQTs7OztRQUlBLE9BQUE7Ozs7SUFJQSxTQUFBLFlBQUEsSUFBQTs7UUFFQSxJQUFBLElBQUEsSUFBQSxRQUFBLFNBQUEsU0FBQSxRQUFBOztZQUVBLHFCQUFBLElBQUEsS0FBQSxTQUFBLFFBQUE7Z0JBQ0EsSUFBQSxPQUFBLFNBQUEsR0FBQTtvQkFDQSxJQUFBLFFBQUEsT0FBQTtvQkFDQSxNQUFBLGNBQUEsY0FBQTtvQkFDQSxHQUFBLElBQUEsY0FBQSxPQUFBOztvQkFFQSxRQUFBOzs7OztRQUtBLE9BQUE7OztJQUdBLFNBQUEscUJBQUEsVUFBQTs7UUFFQSxJQUFBLElBQUEsSUFBQSxRQUFBLFNBQUEsU0FBQSxRQUFBOztZQUVBLElBQUEsSUFBQSxHQUFBLEtBQUE7WUFDQSxJQUFBLEVBQUEsTUFBQSxZQUFBLEtBQUE7WUFDQSxFQUFBLE9BQUEsS0FBQSxTQUFBLFFBQUE7Z0JBQ0EsUUFBQTs7OztRQUlBLE9BQUE7OztJQUdBLFNBQUEscUJBQUEsVUFBQTs7UUFFQSxJQUFBLElBQUEsSUFBQSxRQUFBLFNBQUEsU0FBQSxRQUFBOztZQUVBLElBQUEsSUFBQSxHQUFBLEtBQUE7WUFDQSxJQUFBLEVBQUEsTUFBQSxZQUFBLEtBQUE7O1lBRUEsRUFBQSxPQUFBLEtBQUEsU0FBQSxRQUFBOztnQkFFQSxJQUFBLGlCQUFBO2dCQUNBLE9BQUEsUUFBQSxTQUFBLE9BQUE7b0JBQ0EsSUFBQSxNQUFBLGVBQUEsY0FBQSxTQUFBO3dCQUNBLGVBQUEsS0FBQTs7OztnQkFJQSxRQUFBOzs7O1FBSUEsT0FBQTs7O0lBR0EsT0FBQTtLQUNBLGFBQUE7UUFDQSxrQkFBQTtRQUNBLFdBQUE7S0FDQSxhQUFBO1FBQ0Esc0JBQUE7UUFDQSxzQkFBQTs7Ozs7QUNoSEEsSUFBQSxTQUFBLFdBQUE7O0VBRUEsU0FBQSxLQUFBO1FBQ0EsT0FBQSxDQUFBLENBQUEsQ0FBQSxFQUFBLEtBQUEsVUFBQSxTQUFBLEdBQUEsU0FBQSxJQUFBLFVBQUE7OztJQUdBLFNBQUEsVUFBQTs7O0VBR0EsSUFBQSxPQUFBLENBQUEsT0FBQSxPQUFBLE1BQUEsT0FBQSxPQUFBLEtBQUEsT0FBQSxFQUFBLEtBQUEsTUFBQSxPQUFBLE1BQUEsT0FBQSxPQUFBLE1BQUE7RUFDQSxPQUFBOzs7SUFHQSxTQUFBLFFBQUE7RUFDQSxJQUFBLE1BQUEsQ0FBQSxRQUFBLFVBQUEsUUFBQSxRQUFBLFVBQUEsYUFBQTtFQUNBLE9BQUE7OztJQUdBLE9BQUE7S0FDQSxTQUFBO0tBQ0EsT0FBQTs7OztBQUlBIiwiZmlsZSI6Im1tcy1jYW1lcmEuanMiLCJzb3VyY2VzQ29udGVudCI6WyJ2YXIgY2FtZXJhVUkgPSAoZnVuY3Rpb24oKSB7XHJcblxyXG5cdHZhciBwaG90b1NpemUgPSB7IHdpZHRoOiAxNTAsIGhlaWdodDogMTEzIH07XHJcblxyXG5cdGZ1bmN0aW9uIGNvbmZpZ3VyZUNhbWVyYXMoY2FtZXJhRGV0YWlscykgeyBcclxuXHRcdGNhbWVyYURldGFpbHMuZm9yRWFjaChmdW5jdGlvbihjYW1lcmFEZXRhaWwpIHsgXHJcblxyXG5cdFx0XHR2YXIgY2FtZXJhSWQgPSBjYW1lcmFEZXRhaWwuY2FtZXJhSWQ7IFxyXG5cdFx0XHR2YXIgZXhpc3RpbmdQaG90b3MgPSBjYW1lcmFEZXRhaWwuZXhpc3RpbmdQaG90b3M7IFxyXG5cclxuXHRcdCAgICBjb25maWd1cmVDYW1lcmEoY2FtZXJhSWQsIGV4aXN0aW5nUGhvdG9zKTsgXHJcblx0XHR9KTsgXHJcblx0fVxyXG5cclxuICAgIGZ1bmN0aW9uIGNvbmZpZ3VyZUNhbWVyYShjYW1lcmFJZCwgZXhpc3RpbmdQaG90b3MpIHtcclxuXHJcblx0XHR2YXIgJGNhbWVyYUNvbnRhaW5lciA9ICQoIFwiI1wiICsgY2FtZXJhSWQgKTsgXHJcblx0XHR2YXIgJGNhbWVyYUxpbmsgPSAkY2FtZXJhQ29udGFpbmVyLmZpbmQoXCIuY2FtZXJhLWxpbmtcIik7IFxyXG5cdFx0dmFyICRwaG90b0NvbnRhaW5lciA9ICRjYW1lcmFDb250YWluZXIuZmluZChcIi5waG90by1pbWFnZXNldFwiKTsgXHJcblx0XHR2YXIgcGhvdG9Db250YWluZXJJZCA9ICRwaG90b0NvbnRhaW5lci5hdHRyKFwiaWRcIik7XHJcblxyXG5cdFx0dmFyICRjYW1lcmFMaW5rSU9TID0gJGNhbWVyYUNvbnRhaW5lci5maW5kKFwiLmNhbWVyYS1saW5rLWlvc1wiKTsgXHJcblxyXG5cdFx0dmFyIGlPUyA9IHV0aWxzLmlzSU9TKCk7IFxyXG5cdFx0dmFyIGdldERpc3BsYXlWYWx1ZSA9IGZ1bmN0aW9uKGlzVmlzaWJsZSkge1xyXG5cdFx0XHRyZXR1cm4gaXNWaXNpYmxlPyBcIlwiIDogXCJub25lXCI7IFxyXG5cdFx0fTsgXHJcblx0XHQkY2FtZXJhTGlua0lPUy5jc3MoXCJkaXNwbGF5XCIsIGdldERpc3BsYXlWYWx1ZShpT1MpKTsgXHJcblx0XHQkY2FtZXJhTGluay5jc3MoXCJkaXNwbGF5XCIsIGdldERpc3BsYXlWYWx1ZSghaU9TKSk7IFxyXG5cclxuXHRcdGlmIChwaG90b0NvbnRhaW5lcklkKSB7XHJcblx0XHRcdGNhbWVyYURpYWxvZy5jb25maWd1cmVGb3JJT1MoJGNhbWVyYUxpbmtJT1MsIGNhbWVyYUlkLCBwaG90b0NvbnRhaW5lcklkLCBzYXZlU25hcHNob3QpOyBcclxuXHJcblx0XHRcdCRjYW1lcmFMaW5rLmNsaWNrKGZ1bmN0aW9uKCkgeyBcclxuXHRcdFx0XHRjYW1lcmFEaWFsb2cuZGlzcGxheUNhbWVyYURpYWxvZyhjYW1lcmFJZCwgcGhvdG9Db250YWluZXJJZCwgc2F2ZVNuYXBzaG90KTsgXHJcblx0XHRcdH0pOyBcclxuXHRcdH1cclxuXHJcblx0XHRpZiAoZXhpc3RpbmdQaG90b3MgJiYgZXhpc3RpbmdQaG90b3MubGVuZ3RoID4gMCkge1xyXG5cdFx0XHRleGlzdGluZ1Bob3Rvcy5mb3JFYWNoKGZ1bmN0aW9uKGV4aXN0aW5nUGhvdG8pIHtcclxuXHRcdFx0XHRtbXNJbmRleGVkREIuYWRkRXhpc3RpbmdQaG90byhjYW1lcmFJZCwgZXhpc3RpbmdQaG90byk7IFxyXG5cdFx0XHR9KTsgXHRcclxuXHRcdH1cclxuXHJcblx0XHRwb3B1bGF0ZVBob3RvTGlzdChwaG90b0NvbnRhaW5lcklkLCBjYW1lcmFJZCk7IFxyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gcG9wdWxhdGVQaG90b0xpc3QocGhvdG9Db250YWluZXJJZCwgY2FtZXJhSWQpIHsgXHJcblx0XHQvLyBwb3B1bGF0ZSB0aGUgbGlzdCBvZiBhbGwgcGhvdG9zIGZvciBnaXZlbiBjYW1lcmEgIFxyXG5cdFx0bW1zSW5kZXhlZERCLmZpbmRQaG90b3NCeUNhbWVyYUlkKGNhbWVyYUlkKS50aGVuKGZ1bmN0aW9uKHBob3RvcykgeyBcclxuXHJcblx0XHQgICAgJC5lYWNoKHBob3RvcywgZnVuY3Rpb24oKSB7IFxyXG5cdFx0XHRcdGFkZFBob3RvVG9MaXN0KHBob3RvQ29udGFpbmVySWQsIHRoaXMpOyBcclxuXHRcdFx0fSk7IFxyXG5cdFx0fSk7IFxyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gc2F2ZVNuYXBzaG90KGNhbWVyYUlkLCBwaG90b0NvbnRhaW5lcklkLCBpbWdEYXRhKSB7XHJcblxyXG5cdFx0dmFyIGZpbGVOYW1lID0gdXRpbHMubmV3R3VpZCgpICsgXCIucG5nXCI7IFxyXG5cdFx0dmFyIGltZ09iamVjdCA9IHsgZmlsZU5hbWU6IGZpbGVOYW1lLCBjb250ZW50OiBpbWdEYXRhLCBjYW1lcmFJZDogY2FtZXJhSWQgfTtcclxuXHJcblx0XHRtbXNJbmRleGVkREIuYWRkTmV3UGhvdG8oZmlsZU5hbWUsIGNhbWVyYUlkLCBpbWdEYXRhKTtcclxuXHJcblx0XHRhZGRQaG90b1RvTGlzdChwaG90b0NvbnRhaW5lcklkLCBpbWdPYmplY3QpOyBcclxuXHR9IFxyXG5cclxuXHRmdW5jdGlvbiBhZGRQaG90b1RvTGlzdChwaG90b0NvbnRhaW5lcklkLCBpbWFnZU9iamVjdCkge1xyXG5cclxuXHRcdHZhciAkaW1hZ2VzRGl2ID0gJChcIiNcIiArIHBob3RvQ29udGFpbmVySWQpO1xyXG5cdFx0dmFyICRpbWdEaXYgPSAkKCc8ZGl2IC8+JykuYWRkQ2xhc3MoXCJpbWdcIikuY3NzKFwiaGVpZ2h0XCIsIHBob3RvU2l6ZS5oZWlnaHQgKyBcInB4XCIpOyBcclxuXHRcdHZhciAkZGVsRGl2ID0gJCgnPGRpdiAvPicpLmFkZENsYXNzKFwiZGVsXCIpLmF0dHIoXCJkYXRhLWlkXCIsIGltYWdlT2JqZWN0LmZpbGVOYW1lKTsgXHJcblx0XHR2YXIgJGljb24gPSAkKCc8aSBhcmlhLWhpZGRlbj1cInRydWVcIiAvPicpLmFkZENsYXNzKFwiZmEgZmEtdHJhc2gtb1wiKTsgXHJcblxyXG5cdFx0JGRlbERpdi5hcHBlbmQoJGljb24pOyBcclxuXHJcblx0XHQkaW1nRGl2LmNsaWNrKGZ1bmN0aW9uKGV2dCkgeyBcclxuXHRcdFx0ZXZ0LnN0b3BQcm9wYWdhdGlvbigpOyBcclxuXHJcblx0XHRcdHZhciAkcGljID0gJCgnPGltZyBzdHlsZT1cIndpZHRoOiAxMDAlXCIgd2lkdGg9XCIxMDAlXCIgLz4nKS5hdHRyKCdzcmMnLCBpbWFnZU9iamVjdC5jb250ZW50KTtcclxuXHQgICAgICAgIFxyXG5cdCAgICAgICAgQm9vdHN0cmFwRGlhbG9nLnNob3coe1xyXG5cdCAgICAgICAgICAgIHRpdGxlOiAnUGhvdG8gUHJldmlldycsXHJcblx0ICAgICAgICAgICAgbWVzc2FnZTogJHBpYyxcclxuXHQgICAgICAgICAgICBjc3NDbGFzczogJ2xvZ2luLWRpYWxvZycsIFxyXG5cdCAgICAgICAgICAgIGJ1dHRvbnM6IFt7XHJcblx0ICAgICAgICAgICAgICAgIGxhYmVsOiAnT0snLFxyXG5cdCAgICAgICAgICAgICAgICBjc3NDbGFzczogJ2J0bi1wcmltYXJ5JyxcclxuXHQgICAgICAgICAgICAgICAgYWN0aW9uOiBmdW5jdGlvbihkaWFsb2dSZWYpe1xyXG5cdCAgICAgICAgICAgICAgICAgICAgZGlhbG9nUmVmLmNsb3NlKCk7XHJcblx0ICAgICAgICAgICAgICAgIH1cclxuXHQgICAgICAgICAgICB9XVxyXG5cdCAgICAgICAgfSk7IFxyXG5cdFx0fSk7IFxyXG5cclxuXHRcdCRkZWxEaXYuY2xpY2soZnVuY3Rpb24oZXZ0KSB7IFxyXG5cdFx0ICAgIGV2dC5zdG9wUHJvcGFnYXRpb24oKTsgXHJcblxyXG5cdFx0ICAgIHZhciBpbWFnZUlkID0gaW1hZ2VPYmplY3QuZmlsZU5hbWU7IFxyXG5cdCAgICAgICAgaWYgKGNvbmZpcm0oJ0FyZSB5b3Ugc3VyZT8nKSA9PSB0cnVlKSB7XHJcblxyXG5cdCAgICAgICAgICAgIHZhciAkZGVsSW1nID0gJCgnZGl2W2RhdGEtaWQ9XCInICsgaW1hZ2VJZCArJ1wiXScpO1xyXG5cdCAgICAgICAgICAgIHZhciAkcGhvdG8gPSAkZGVsSW1nLnBhcmVudCgpOyBcclxuXHQgICAgICAgICAgICAkcGhvdG8ucmVtb3ZlKCk7IFxyXG5cclxuXHQgICAgICAgICAgICBtbXNJbmRleGVkREIuZGVsZXRlUGhvdG8oaW1hZ2VJZClcclxuXHQgICAgICAgICAgICAudGhlbihmdW5jdGlvbihwaG90bykge1xyXG5cdCAgICAgICAgICAgIH0pOyBcclxuXHQgICAgICAgIH1cclxuXHRcdH0pOyBcclxuXHJcblx0XHQkaW1nRGl2LmFwcGVuZCgkZGVsRGl2KTsgXHJcblx0XHQkaW1nRGl2LmFwcGVuZCgkKFwiPGltZyAvPlwiKS5hdHRyKFwic3JjXCIsIGltYWdlT2JqZWN0LmNvbnRlbnQpLmF0dHIoXCJ3aWR0aFwiLCBwaG90b1NpemUud2lkdGgpLmF0dHIoXCJoZWlnaHRcIiwgcGhvdG9TaXplLmhlaWdodCkpOyBcclxuXHJcblx0XHQkaW1hZ2VzRGl2LmFwcGVuZCgkaW1nRGl2KTsgXHJcblx0fVxyXG5cclxuXHRyZXR1cm4geyAgICAgICAgXHJcbiAgICBcdGNvbmZpZ3VyZUNhbWVyYXM6IGNvbmZpZ3VyZUNhbWVyYXMgXHJcbiAgICB9O1xyXG5cclxufSgpKTsgIiwiXHJcbnZhciBjYW1lcmFEaWFsb2cgPSAoZnVuY3Rpb24oKSB7XHJcblxyXG5cdHZhciBjb25zdHJhaW50cyA9IHsgdmlkZW86IHRydWUsIGF1ZGlvOiBmYWxzZSB9OyBcclxuXHR2YXIgY2FsbGJhY2s7IFxyXG5cclxuXHR2YXIgJHZpZGVvLCAkY2FudmFzOyBcclxuXHR2YXIgJGJ0bkNhcHR1cmUsICRidG5SZXRha2UsICRidG5TYXZlOyBcclxuXHJcblx0ZnVuY3Rpb24gY29uZmlndXJlRm9ySU9TKGNhbWVyYUxpbmtJT1MsIGNhbWVyYUlkLCBjb250YWluZXJJZCwgc2F2ZVNuYXBzaG90Q2FsbGJhY2spIHtcclxuXHJcblx0XHRjYW1lcmFMaW5rSU9TLmNoYW5nZSgoZnVuY3Rpb24oY2FtZXJhSWQsIGNvbnRhaW5lcklkLCBjYWxsYmFjaykge1xyXG5cclxuXHRcdFx0cmV0dXJuIGZ1bmN0aW9uKGV2dCkge1xyXG5cdFx0XHRcdHZhciBmID0gZXZ0LnRhcmdldC5maWxlc1swXTsgXHJcblx0XHRcdFx0dmFyIHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKCk7XHJcblxyXG5cdFx0XHRcdHJlYWRlci5vbmxvYWQgPSBmdW5jdGlvbih0aGVGaWxlKSB7XHJcblxyXG5cdFx0XHQgICAgXHRpZiAoY2FsbGJhY2spIHtcclxuXHRcdFx0ICAgIFx0XHR2YXIgaW1nRGF0YSA9IHRoZUZpbGUudGFyZ2V0LnJlc3VsdDsgXHJcblx0XHRcdCAgICBcdFx0Y2FsbGJhY2soY2FtZXJhSWQsIGNvbnRhaW5lcklkLCBpbWdEYXRhKTsgXHJcblx0XHRcdCAgICBcdH1cclxuXHRcdFx0ICAgIFx0ZWxzZSB7XHJcblx0XHRcdCAgICBcdFx0Y29uc29sZS53YXJuKFwiQ2FsbGJhY2sgaXMgbm90IGRlZmluZWQhXCIpOyBcclxuXHRcdFx0ICAgIFx0fVxyXG5cdFx0XHRcdH07IFxyXG5cclxuXHRcdFx0XHR2YXIgJGNhbWVyYUNvbnRhaW5lciA9ICQoIFwiI1wiICsgY2FtZXJhSWQgKTtcclxuXHRcdFx0XHR2YXIgJHBob3RvQ29udGFpbmVyID0gJGNhbWVyYUNvbnRhaW5lci5maW5kKFwiLnBob3RvLWltYWdlc2V0XCIpO1xyXG5cdFx0XHRcdCRwaG90b0NvbnRhaW5lci5yZW1vdmVDbGFzcyhcImhpZGRlblwiKTtcdFx0XHRcclxuXHJcblx0XHRcdFx0Ly8gUmVhZCBpbiB0aGUgaW1hZ2UgZmlsZSBhcyBhIGRhdGEgVVJMLlxyXG5cdFx0XHRcdHJlYWRlci5yZWFkQXNEYXRhVVJMKGYpO1xyXG5cdFx0XHR9OyBcclxuXHJcblx0XHR9KShjYW1lcmFJZCwgY29udGFpbmVySWQsIHNhdmVTbmFwc2hvdENhbGxiYWNrKSk7IFxyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gZGlzcGxheUNhbWVyYURpYWxvZyhjYW1lcmFJZCwgY29udGFpbmVySWQsIHNhdmVTbmFwc2hvdENhbGxiYWNrKSB7IFxyXG5cclxuICAgICAgICBCb290c3RyYXBEaWFsb2cuc2hvdyh7XHJcbiAgICAgICAgICAgIHRpdGxlOiAnVGFrZSBhIHBob3RvJyxcclxuICAgICAgICAgICAgbWVzc2FnZTogJCgnPGRpdj48L2Rpdj4nKS5sb2FkKCdjYW1lcmEuaHRtbCcpLCBcclxuICAgICAgICAgICAgY3NzQ2xhc3M6ICdsb2dpbi1kaWFsb2cnLCBcclxuICAgICAgICAgICAgb25zaG93bjogZnVuY3Rpb24oZGlhbG9nUmVmKSB7XHJcbiAgICAgICAgICAgIFx0XHJcbiAgICAgICAgICAgIFx0Y2FsbGJhY2sgPSBzYXZlU25hcHNob3RDYWxsYmFjazsgXHJcblxyXG4gICAgICAgICAgICBcdC8vIGluaXQgcmVmZXJlbmNlcyB0byBidXR0b25zIGZyb20gbW9kYWwgZm9vdGVyIFxyXG5cdFx0XHRcdHZhciBmb290ZXIgPSBkaWFsb2dSZWYuZ2V0TW9kYWxGb290ZXIoKTsgXHJcblxyXG5cdFx0XHRcdCRidG5DYXB0dXJlID0gZm9vdGVyLmZpbmQoXCIuYnRuLWNhcHR1cmVcIik7IFxyXG5cdFx0XHRcdCRidG5SZXRha2UgPSBmb290ZXIuZmluZChcIi5idG4tcmV0YWtlXCIpOyBcclxuXHRcdFx0XHQkYnRuU2F2ZSA9IGZvb3Rlci5maW5kKFwiLmJ0bi1zYXZlXCIpO1xyXG4gICAgICAgICAgICBcdFxyXG4gICAgICAgICAgICBcdHZhciBib2R5ID0gZGlhbG9nUmVmLmdldE1vZGFsQm9keSgpO1xyXG5cclxuICAgICAgICAgICAgXHR2YXIgY2hhbmdlQnRuID0gYm9keS5maW5kKFwiI2NoYW5nZUlkXCIpO1xyXG4gICAgICAgICAgICBcdGNoYW5nZUJ0bi5jbGljayhzd2FwVmlkZW9XaXRoQ2FudmFzKTtcclxuXHJcbiAgICAgICAgICAgIFx0Ly8gaW5pdCB2aWRlbyAmIGNhbnZhcyBoZXJlIFxyXG5cdFx0XHRcdCR2aWRlbyA9IGJvZHkuZmluZChcIiNkYXRhVmlkZW9JZFwiKTsgXHJcblx0XHRcdFx0JGNhbnZhcyA9IGJvZHkuZmluZChcIiNjYW52YXNJZFwiKTsgXHJcblxyXG4gICAgICAgICAgICBcdHZhciB2aWRlbyA9ICR2aWRlb1swXTtcclxuXHRcdFx0XHR2YXIgY2FudmFzID0gd2luZG93LmNhbnZhcyA9ICRjYW52YXNbMF07IFxyXG5cclxuXHRcdFx0XHR2aWRlby5vbmxvYWRlZGRhdGEgPSBmdW5jdGlvbigpIHtcclxuXHRcdFx0XHRcdGlmICgkYnRuQ2FwdHVyZS5oYXNDbGFzcyhcImRpc2FibGVkXCIpKSB7XHJcblx0XHRcdFx0XHRcdCRidG5DYXB0dXJlLnJlbW92ZUNsYXNzKFwiZGlzYWJsZWRcIik7IFxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0bmF2aWdhdG9yLm1lZGlhRGV2aWNlcy5nZXRVc2VyTWVkaWEoY29uc3RyYWludHMpXHJcblx0XHRcdFx0LnRoZW4oZnVuY3Rpb24gKHN0cmVhbSkge1xyXG5cdFx0XHRcdFx0d2luZG93LnN0cmVhbSA9IHN0cmVhbTsgXHJcblx0XHRcdFx0XHR2aWRlby5zcmNPYmplY3QgPSBzdHJlYW07XHJcblx0XHRcdFx0XHR2aWRlby5zcmMgPSB3aW5kb3cuVVJMLmNyZWF0ZU9iamVjdFVSTChzdHJlYW0pOyBcclxuXHRcdFx0XHR9KVxyXG5cdFx0XHRcdC5jYXRjaChmdW5jdGlvbiAoZXJyb3IpIHtcclxuXHRcdFx0XHQgXHRjb25zb2xlLndhcm4oJ25hdmlnYXRvci5nZXRVc2VyTWVkaWEgZXJyb3I6ICcsIGVycm9yKTtcclxuXHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0Ly8gZGlzcGxheSB0aGUgY29udGFpbmVyPyBcclxuXHRcdFx0XHR2YXIgJGNhbWVyYUNvbnRhaW5lciA9ICQoIFwiI1wiICsgY2FtZXJhSWQgKTtcclxuXHRcdFx0XHR2YXIgJHBob3RvQ29udGFpbmVyID0gJGNhbWVyYUNvbnRhaW5lci5maW5kKFwiLnBob3RvLWltYWdlc2V0XCIpO1xyXG5cdFx0XHRcdCRwaG90b0NvbnRhaW5lci5yZW1vdmVDbGFzcyhcImhpZGRlblwiKTsgXHJcbiAgICAgICAgICAgIH0sIFxyXG4gICAgICAgICAgICBvbmhpZGRlbjogZnVuY3Rpb24oZGlhbG9nUmVmKSB7XHJcbiAgICAgICAgICAgIFx0c3RvcENhbWVyYSgpOyBcclxuICAgICAgICAgICAgfSwgXHJcbiAgICAgICAgICAgIGNzc0NsYXNzOiAnbG9naW4tZGlhbG9nJywgXHJcbiAgICAgICAgICAgIGJ1dHRvbnM6IFt7XHJcbiAgICAgICAgICAgICAgICBsYWJlbDogJ1JldGFrZScsXHJcbiAgICAgICAgICAgICAgICBpY29uOiAnZ2x5cGhpY29uIGdseXBoaWNvbi1zb3J0JyxcclxuICAgICAgICAgICAgICAgIGNzc0NsYXNzOiAnYnRuIGJ0bi1wcmltYXJ5IHB1bGwtbGVmdCBoaWRkZW4gYnRuLXJldGFrZScsXHJcbiAgICAgICAgICAgICAgICBhY3Rpb246IGZ1bmN0aW9uIChkaWFsb2dJdHNlbGYpIHtcclxuXHRcdFx0ICAgIFx0c3dhcFZpZGVvV2l0aENhbnZhcygpOyBcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSwge1xyXG4gICAgICAgICAgICAgICAgbGFiZWw6ICdDYXB0dXJlIFNuYXBzaG90JyxcclxuICAgICAgICAgICAgICAgIGljb246ICdnbHlwaGljb24gZ2x5cGhpY29uLWNhbWVyYScsXHJcbiAgICAgICAgICAgICAgICBjc3NDbGFzczogJ2J0biBidG4tcHJpbWFyeSBwdWxsLWxlZnQgZGlzYWJsZWQgYnRuLWNhcHR1cmUnLFxyXG4gICAgICAgICAgICAgICAgYWN0aW9uOiBmdW5jdGlvbiAoZGlhbG9nSXRzZWxmKSB7XHJcblx0XHRcdCAgICBcdGNhcHR1cmVTbmFwc2hvdCgpOyBcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSwge1xyXG4gICAgICAgICAgICAgICAgbGFiZWw6ICdTYXZlJyxcclxuICAgICAgICAgICAgICAgIGljb246ICdnbHlwaGljb24gZ2x5cGhpY29uLW9rJyxcclxuICAgICAgICAgICAgICAgIGNzc0NsYXNzOiAnYnRuLXByaW1hcnkgaGlkZGVuIGJ0bi1zYXZlJyxcclxuICAgICAgICAgICAgICAgIGFjdGlvbjogZnVuY3Rpb24gKGRpYWxvZ0l0c2VsZikge1xyXG5cclxuXHRcdFx0ICAgIFx0aWYgKGNhbGxiYWNrKSB7XHJcblx0XHRcdCAgICBcdFx0dmFyIGltZ0RhdGEgPSBjYW52YXMudG9EYXRhVVJMKFwiaW1hZ2UvcG5nXCIpOyBcclxuXHRcdFx0ICAgIFx0XHRjYWxsYmFjayhjYW1lcmFJZCwgY29udGFpbmVySWQsIGltZ0RhdGEpOyBcclxuXHRcdFx0ICAgIFx0fVxyXG5cdFx0XHQgICAgXHRlbHNlIHtcclxuXHRcdFx0ICAgIFx0XHRjb25zb2xlLndhcm4oXCJDYWxsYmFjayBpcyBub3QgZGVmaW5lZCFcIik7IFxyXG5cdFx0XHQgICAgXHR9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGRpYWxvZ0l0c2VsZi5jbG9zZSgpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9LCB7XHJcbiAgICAgICAgICAgICAgICBsYWJlbDogJ0NhbmNlbCcsXHJcbiAgICAgICAgICAgICAgICBpY29uOiAnZ2x5cGhpY29uIGdseXBoaWNvbi1yZW1vdmUnLFxyXG4gICAgICAgICAgICAgICAgY3NzQ2xhc3M6ICdidG4tZGFuZ2VyJyxcclxuICAgICAgICAgICAgICAgIGFjdGlvbjogZnVuY3Rpb24gKGRpYWxvZ0l0c2VsZikge1xyXG4gICAgICAgICAgICAgICAgICAgIGRpYWxvZ0l0c2VsZi5jbG9zZSgpOyBcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfV1cclxuICAgICAgICB9KTtcclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIHN3YXBWaWRlb1dpdGhDYW52YXMoKSB7XHJcblx0XHQkdmlkZW8udG9nZ2xlQ2xhc3MoXCJoaWRkZW5cIik7XHJcblx0XHQkY2FudmFzLnRvZ2dsZUNsYXNzKFwiaGlkZGVuXCIpOyBcclxuXHJcblx0XHQkYnRuQ2FwdHVyZS50b2dnbGVDbGFzcyhcImhpZGRlblwiKTsgXHJcblx0XHQkYnRuUmV0YWtlLnRvZ2dsZUNsYXNzKFwiaGlkZGVuXCIpOyAgXHJcblx0fVxyXG5cclxuICAgIGZ1bmN0aW9uIGNhcHR1cmVTbmFwc2hvdCgpIHsgXHJcblxyXG5cdFx0aWYgKCR2aWRlbyAmJiAkY2FudmFzKSB7XHJcblx0XHRcdHZhciB2aWRlbyA9ICR2aWRlb1swXTsgXHJcblx0XHRcdHZhciBjYW52YXMgPSAkY2FudmFzWzBdOyBcclxuXHJcblx0XHRcdGNhbnZhcy53aWR0aCA9IHZpZGVvLnZpZGVvV2lkdGg7XHJcbiAgXHRcdFx0Y2FudmFzLmhlaWdodCA9IHZpZGVvLnZpZGVvSGVpZ2h0O1xyXG5cdFx0XHRjYW52YXMuZ2V0Q29udGV4dCgnMmQnKS5kcmF3SW1hZ2UodmlkZW8sIDAsIDAsIGNhbnZhcy53aWR0aCwgY2FudmFzLmhlaWdodCk7XHJcblxyXG5cdFx0XHRpZiAoJGJ0blNhdmUuaGFzQ2xhc3MoXCJoaWRkZW5cIikpIHtcclxuXHRcdFx0XHQkYnRuU2F2ZS5yZW1vdmVDbGFzcyhcImhpZGRlblwiKTsgXHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHN3YXBWaWRlb1dpdGhDYW52YXMoKTsgXHRcdFx0XHJcblx0XHR9IFxyXG4gICAgfSBcclxuXHJcbiAgICBmdW5jdGlvbiBzdG9wQ2FtZXJhKCkge1xyXG5cdFx0dmFyIHZpZGVvID0gJHZpZGVvWzBdO1xyXG5cdFx0dmFyIHN0cmVhbSA9IHZpZGVvLnNyY09iamVjdDsgXHJcblx0XHRcclxuXHRcdGlmIChzdHJlYW0pIHtcclxuXHRcdFx0c3RyZWFtLmdldFRyYWNrcygpWzBdLnN0b3AoKTsgXHJcblx0XHRcdHZpZGVvLnNyYyA9IHZpZGVvLnNyY09iamVjdCA9IFwiXCI7ICBcclxuXHRcdH1cclxuXHR9XHJcbiBcclxuICAgIHJldHVybiB7ICAgICAgICBcclxuICAgIFx0ZGlzcGxheUNhbWVyYURpYWxvZzogZGlzcGxheUNhbWVyYURpYWxvZywgXHJcbiAgICBcdGNvbmZpZ3VyZUZvcklPUzogY29uZmlndXJlRm9ySU9TIFxyXG4gICAgfTtcclxuXHJcbn0oKSk7IFxyXG4iLCJ2YXIgcGhvdG9TdGF0dXNlcyA9IHsgTmV3OiAwLCBFeGlzdGluZzogMSwgRGVsZXRlZDogMiB9OyBcclxuXHJcbnZhciBtbXNJbmRleGVkREIgPSAoZnVuY3Rpb24oKSB7XHJcblxyXG5cdHZhciBkYjsgXHJcblxyXG4gICAgaW5pdCgpOyBcclxuXHJcbiAgICBmdW5jdGlvbiBpbml0KCkgeyBcclxuXHJcblx0XHR2YXIgc2NoZW1hID0ge1xyXG5cdFx0ICBzdG9yZXM6IFt7XHJcblx0XHQgICAgbmFtZTogJ3Bob3RvVGFibGUnLFxyXG5cdFx0ICAgIGluZGV4ZXM6IFt7IG5hbWU6ICdmaWxlTmFtZScgfSwgeyBuYW1lOiAnY2FtZXJhSWQnIH1dXHJcblx0XHQgIH1dXHJcblx0XHR9OyBcclxuXHJcbiAgICAgICAgZGIgPSBuZXcgeWRuLmRiLlN0b3JhZ2UoJ01NU1Bob3RvREInLCBzY2hlbWEpOyBcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBhZGROZXdQaG90byhpZCwgY2FtZXJhSWQsIGNvbnRlbnQpIHsgXHJcblxyXG4gICAgICAgIC8vIHdlIGFzc3VtZSBoZXJlIHRoYXQgaWQgKGZpbGVOYW1lKSBpcyB1bmlxdWUgXHJcbiAgICAgICAgZGIucHV0KCdwaG90b1RhYmxlJywgeyBmaWxlTmFtZTogaWQsIGNhbWVyYUlkOiBjYW1lcmFJZCwgZGF0ZVRha2VuOiBTdHJpbmcobmV3IERhdGUoKSksIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBob3RvU3RhdHVzOiBwaG90b1N0YXR1c2VzLk5ldywgY29udGVudDogY29udGVudCB9LCBpZCk7IFxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGFkZEV4aXN0aW5nUGhvdG8oY2FtZXJhSWQsIGNvbnRlbnQpIHsgIFxyXG5cclxuICAgICAgICB2YXIgaWQgPSB1dGlscy5uZXdHdWlkKCkgKyBcIi5wbmdcIjsgXHJcblxyXG4gICAgICAgIC8vIHdlIGFzc3VtZSBoZXJlIHRoYXQgaWQgKGZpbGVOYW1lKSBpcyB1bmlxdWUgXHJcbiAgICAgICAgZGIucHV0KCdwaG90b1RhYmxlJywgeyBmaWxlTmFtZTogaWQsIGNhbWVyYUlkOiBjYW1lcmFJZCwgZGF0ZVRha2VuOiBudWxsLCBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwaG90b1N0YXR1czogcGhvdG9TdGF0dXNlcy5FeGlzdGluZywgY29udGVudDogY29udGVudCB9LCBpZCk7IFxyXG4gICAgfVxyXG4gICAgXHJcbiAgICBmdW5jdGlvbiBnZXRQaG90b3MoKSB7XHJcblxyXG4gICAgICAgIHZhciBwID0gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XHJcblxyXG4gICAgICAgICAgICB2YXIgcXVlcnkgPSBkYi5mcm9tKCdwaG90b1RhYmxlJyk7IFxyXG4gICAgICAgICAgICBxdWVyeSA9IHF1ZXJ5LndoZXJlKCdwaG90b1N0YXR1cycsICc8JywgcGhvdG9TdGF0dXNlcy5EZWxldGVkKTsgXHJcbiAgICAgICAgICAgIHF1ZXJ5Lmxpc3QoKS5kb25lKGZ1bmN0aW9uKHBob3Rvcykge1xyXG4gICAgICAgICAgICAgICByZXNvbHZlKHBob3Rvcyk7IFxyXG4gICAgICAgICAgICB9KTsgXHJcbiAgICAgICAgfSk7IFxyXG5cclxuICAgICAgICByZXR1cm4gcDsgXHJcbiAgICB9XHJcblxyXG4gICAgLy8gcGVyZm9ybXMgYSB2aXJ0dWFsIGRlbGV0ZSBoZXJlIFxyXG4gICAgZnVuY3Rpb24gZGVsZXRlUGhvdG8oaWQpIHsgXHJcblxyXG4gICAgICAgIHZhciBwID0gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XHJcblxyXG4gICAgICAgICAgICBmaW5kUGhvdG9zQnlGaWxlTmFtZShpZCkudGhlbihmdW5jdGlvbihwaG90b3MpIHtcclxuICAgICAgICAgICAgICAgIGlmIChwaG90b3MubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBwaG90byA9IHBob3Rvc1swXTsgXHJcbiAgICAgICAgICAgICAgICAgICAgcGhvdG8ucGhvdG9TdGF0dXMgPSBwaG90b1N0YXR1c2VzLkRlbGV0ZWQ7IFxyXG4gICAgICAgICAgICAgICAgICAgIGRiLnB1dCgncGhvdG9UYWJsZScsIHBob3RvLCBpZCk7IFxyXG5cclxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHBob3RvKTsgXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pOyBcclxuICAgICAgICB9KTsgXHJcblxyXG4gICAgICAgIHJldHVybiBwOyBcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBmaW5kUGhvdG9zQnlGaWxlTmFtZShmaWxlTmFtZSkge1xyXG5cclxuICAgICAgICB2YXIgcCA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xyXG5cclxuICAgICAgICAgICAgdmFyIHEgPSBkYi5mcm9tKCdwaG90b1RhYmxlJyk7XHJcbiAgICAgICAgICAgIHEgPSBxLndoZXJlKCdmaWxlTmFtZScsICc9JywgZmlsZU5hbWUpO1xyXG4gICAgICAgICAgICBxLmxpc3QoKS5kb25lKGZ1bmN0aW9uKHBob3Rvcykge1xyXG4gICAgICAgICAgICAgICAgcmVzb2x2ZShwaG90b3MpOyBcclxuICAgICAgICAgICAgfSk7IFxyXG4gICAgICAgIH0pOyBcclxuXHJcbiAgICAgICAgcmV0dXJuIHA7IFxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGZpbmRQaG90b3NCeUNhbWVyYUlkKGNhbWVyYUlkKSB7ICBcclxuXHJcbiAgICAgICAgdmFyIHAgPSBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcclxuXHJcbiAgICAgICAgICAgIHZhciBxID0gZGIuZnJvbSgncGhvdG9UYWJsZScpO1xyXG4gICAgICAgICAgICBxID0gcS53aGVyZSgnY2FtZXJhSWQnLCAnPScsIGNhbWVyYUlkKTtcclxuICAgICAgICAgICAgLy9xID0gcS53aGVyZSgncGhvdG9TdGF0dXMnLCAnPCcsIHBob3RvU3RhdHVzZXMuRGVsZXRlZCk7IFxyXG4gICAgICAgICAgICBxLmxpc3QoKS5kb25lKGZ1bmN0aW9uKHBob3Rvcykge1xyXG5cclxuICAgICAgICAgICAgICAgIHZhciBmaWx0ZXJlZFBob3RvcyA9IFtdOyBcclxuICAgICAgICAgICAgICAgIHBob3Rvcy5mb3JFYWNoKGZ1bmN0aW9uKHBob3RvKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHBob3RvLnBob3RvU3RhdHVzICE9IHBob3RvU3RhdHVzZXMuRGVsZXRlZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBmaWx0ZXJlZFBob3Rvcy5wdXNoKHBob3RvKTsgXHJcbiAgICAgICAgICAgICAgICAgICAgfSAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICB9KTsgXHJcblxyXG4gICAgICAgICAgICAgICAgcmVzb2x2ZShmaWx0ZXJlZFBob3Rvcyk7IFxyXG4gICAgICAgICAgICB9KTsgXHJcbiAgICAgICAgfSk7IFxyXG5cclxuICAgICAgICByZXR1cm4gcDsgXHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHsgICAgICAgIFxyXG4gICAgXHRhZGROZXdQaG90bzogYWRkTmV3UGhvdG8sIFxyXG4gICAgICAgIGFkZEV4aXN0aW5nUGhvdG86IGFkZEV4aXN0aW5nUGhvdG8sIFxyXG4gICAgICAgIGdldFBob3RvczogZ2V0UGhvdG9zLCBcclxuICAgIFx0ZGVsZXRlUGhvdG86IGRlbGV0ZVBob3RvLCBcclxuICAgICAgICBmaW5kUGhvdG9zQnlGaWxlTmFtZTogZmluZFBob3Rvc0J5RmlsZU5hbWUsIFxyXG4gICAgICAgIGZpbmRQaG90b3NCeUNhbWVyYUlkOiBmaW5kUGhvdG9zQnlDYW1lcmFJZCAgXHJcbiAgICB9O1xyXG5cclxufSgpKTsgXHJcbiIsInZhciB1dGlscyA9IChmdW5jdGlvbigpIHtcclxuXHJcbiBcdGZ1bmN0aW9uIFM0KCkge1xyXG4gICAgICAgIHJldHVybiAoKCgxK01hdGgucmFuZG9tKCkpKjB4MTAwMDApfDApLnRvU3RyaW5nKDE2KS5zdWJzdHJpbmcoMSk7IFxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIG5ld0d1aWQoKSB7XHJcblxyXG5cdFx0Ly8gdGhlbiB0byBjYWxsIGl0LCBwbHVzIHN0aXRjaCBpbiAnNCcgaW4gdGhlIHRoaXJkIGdyb3VwXHJcblx0XHR2YXIgZ3VpZCA9IChTNCgpICsgUzQoKSArIFwiLVwiICsgUzQoKSArIFwiLTRcIiArIFM0KCkuc3Vic3RyKDAsMykgKyBcIi1cIiArIFM0KCkgKyBcIi1cIiArIFM0KCkgKyBTNCgpICsgUzQoKSkudG9Mb3dlckNhc2UoKTtcclxuXHRcdHJldHVybiBndWlkOyBcclxuICAgIH0gXHJcblxyXG4gICAgZnVuY3Rpb24gaXNJT1MoKSB7IFxyXG5cdFx0dmFyIGlPUyA9IFsnaVBhZCcsICdpUGhvbmUnLCAnaVBvZCddLmluZGV4T2YobmF2aWdhdG9yLnBsYXRmb3JtKSA+PSAwOyBcclxuXHRcdHJldHVybiBpT1M7IFxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB7IFxyXG4gICAgXHRuZXdHdWlkOiBuZXdHdWlkLCBcclxuICAgIFx0aXNJT1M6IGlzSU9TIFxyXG4gICAgfTtcclxuXHJcbn0oKSk7IFxyXG4iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
