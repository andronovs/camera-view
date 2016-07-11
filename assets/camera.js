var cameraDialog = (function() {

	var constraints = { video: true, audio: false }; 
	var callback; 

	var $video, $canvas; 
	var $btnCapture, $btnRetake, $btnSave; 

	function configureForIOS(cameraLinkIOS, cameraSelector, $photoContainer, saveSnapshotCallback) {

		cameraLinkIOS.change((function(cameraSelector, $photoContainer, callback) {

			return function(evt) {
				var f = evt.target.files[0]; 
				var reader = new FileReader();

				reader.onload = function(theFile) {

			    	if (callback) {
			    		var imgData = theFile.target.result; 
			    		callback(cameraSelector, $photoContainer, imgData); 
			    	}
			    	else {
			    		console.warn("Callback is not defined!"); 
			    	}
				}; 

				$photoContainer.removeClass("hidden"); 

				// Read in the image file as a data URL.
				reader.readAsDataURL(f);
			}; 

		})(cameraSelector, $photoContainer, saveSnapshotCallback)); 
	}

	function getCameraTemplateHtml() {

		return ['<div id="camera-dialog">', 
			        '<form name="cameraForm">',
			            '<img src="img/spinner.gif" class="spinner" />',  
			            '<div class="row">',
			                '<div class="col-sm-12">',
			                	'<video id="dataVideoId" autoplay style="width:100%" width="100%"></video>',
			                '</div>',
			            '</div>', 
			            '<div class="row">',
			                '<div class="col-sm-12">',
			                	'<canvas id="canvasId" class="hidden" style="width:100%;" width="100%"></canvas>',
			                '</div>',
			            '</div>', 
			        '</form>',
			    '</div>'].join('\n'); 
	}

	function displayCameraDialog(cameraSelector, $photoContainer, saveSnapshotCallback) { 

        BootstrapDialog.show({
            title: 'Take a photo',
            message: $(getCameraTemplateHtml()), 
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
			    		callback(cameraSelector, $photoContainer, imgData); 
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
			if (video.src) {
				video.src = null; 
			} 

			stream = null; 
		}
	}

    return {        
    	displayCameraDialog: displayCameraDialog, 
    	configureForIOS: configureForIOS 
    };

}()); 

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
var cameraUtils = (function() {

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


var photoStatuses = { New: 0, Existing: 1, Deleted: 2 }; 

var photoDB = (function() {

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

        var id = cameraUtils.newGuid() + ".png"; 

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

    // Here cameraId is a valid JQuery camera selector. 
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNhbWVyYS1kaWFsb2cuanMiLCJjYW1lcmEtdWkuanMiLCJjYW1lcmEtdXRpbHMuanMiLCJjYW1lcmEuanMiLCJwaG90b0RCLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLElBQUEsZ0JBQUEsV0FBQTs7Q0FFQSxJQUFBLGNBQUEsRUFBQSxPQUFBLE1BQUEsT0FBQTtDQUNBLElBQUE7O0NBRUEsSUFBQSxRQUFBO0NBQ0EsSUFBQSxhQUFBLFlBQUE7O0NBRUEsU0FBQSxnQkFBQSxlQUFBLGdCQUFBLGlCQUFBLHNCQUFBOztFQUVBLGNBQUEsT0FBQSxDQUFBLFNBQUEsZ0JBQUEsaUJBQUEsVUFBQTs7R0FFQSxPQUFBLFNBQUEsS0FBQTtJQUNBLElBQUEsSUFBQSxJQUFBLE9BQUEsTUFBQTtJQUNBLElBQUEsU0FBQSxJQUFBOztJQUVBLE9BQUEsU0FBQSxTQUFBLFNBQUE7O1FBRUEsSUFBQSxVQUFBO1NBQ0EsSUFBQSxVQUFBLFFBQUEsT0FBQTtTQUNBLFNBQUEsZ0JBQUEsaUJBQUE7O2FBRUE7U0FDQSxRQUFBLEtBQUE7Ozs7SUFJQSxnQkFBQSxZQUFBOzs7SUFHQSxPQUFBLGNBQUE7OztLQUdBLGdCQUFBLGlCQUFBOzs7Q0FHQSxTQUFBLHdCQUFBOztFQUVBLE9BQUEsQ0FBQTtXQUNBO2VBQ0E7ZUFDQTttQkFDQTtvQkFDQTttQkFDQTtlQUNBO2VBQ0E7bUJBQ0E7b0JBQ0E7bUJBQ0E7ZUFDQTtXQUNBO09BQ0EsVUFBQSxLQUFBOzs7Q0FHQSxTQUFBLG9CQUFBLGdCQUFBLGlCQUFBLHNCQUFBOztRQUVBLGdCQUFBLEtBQUE7WUFDQSxPQUFBO1lBQ0EsU0FBQSxFQUFBO1lBQ0EsVUFBQTtZQUNBLFNBQUEsU0FBQSxXQUFBOzthQUVBLFdBQUE7OztJQUdBLElBQUEsU0FBQSxVQUFBOztJQUVBLGNBQUEsT0FBQSxLQUFBO0lBQ0EsYUFBQSxPQUFBLEtBQUE7SUFDQSxXQUFBLE9BQUEsS0FBQTs7YUFFQSxJQUFBLE9BQUEsVUFBQTs7YUFFQSxJQUFBLFlBQUEsS0FBQSxLQUFBO2FBQ0EsVUFBQSxNQUFBOzs7SUFHQSxTQUFBLEtBQUEsS0FBQTtJQUNBLFVBQUEsS0FBQSxLQUFBOzthQUVBLElBQUEsUUFBQSxPQUFBO0lBQ0EsSUFBQSxTQUFBLE9BQUEsU0FBQSxRQUFBOztJQUVBLE1BQUEsZUFBQSxXQUFBO0tBQ0EsSUFBQSxZQUFBLFNBQUEsYUFBQTtNQUNBLFlBQUEsWUFBQTs7OztJQUlBLFVBQUEsYUFBQSxhQUFBO0tBQ0EsS0FBQSxVQUFBLFFBQUE7S0FDQSxPQUFBLFNBQUE7S0FDQSxNQUFBLFlBQUE7S0FDQSxNQUFBLE1BQUEsT0FBQSxJQUFBLGdCQUFBOztLQUVBLE1BQUEsVUFBQSxPQUFBO01BQ0EsUUFBQSxLQUFBLGtDQUFBOzs7O0lBSUEsZ0JBQUEsWUFBQTs7WUFFQSxVQUFBLFNBQUEsV0FBQTthQUNBOztZQUVBLFVBQUE7WUFDQSxTQUFBLENBQUE7Z0JBQ0EsT0FBQTtnQkFDQSxNQUFBO2dCQUNBLFVBQUE7Z0JBQ0EsUUFBQSxVQUFBLGNBQUE7UUFDQTs7ZUFFQTtnQkFDQSxPQUFBO2dCQUNBLE1BQUE7Z0JBQ0EsVUFBQTtnQkFDQSxRQUFBLFVBQUEsY0FBQTtRQUNBOztlQUVBO2dCQUNBLE9BQUE7Z0JBQ0EsTUFBQTtnQkFDQSxVQUFBO2dCQUNBLFFBQUEsVUFBQSxjQUFBOztRQUVBLElBQUEsVUFBQTtTQUNBLElBQUEsVUFBQSxPQUFBLFVBQUE7U0FDQSxTQUFBLGdCQUFBLGlCQUFBOzthQUVBO1NBQ0EsUUFBQSxLQUFBOzs7b0JBR0EsYUFBQTs7ZUFFQTtnQkFDQSxPQUFBO2dCQUNBLE1BQUE7Z0JBQ0EsVUFBQTtnQkFDQSxRQUFBLFVBQUEsY0FBQTtvQkFDQSxhQUFBOzs7Ozs7Q0FNQSxTQUFBLHNCQUFBO0VBQ0EsT0FBQSxZQUFBO0VBQ0EsUUFBQSxZQUFBOztFQUVBLFlBQUEsWUFBQTtFQUNBLFdBQUEsWUFBQTs7O0lBR0EsU0FBQSxrQkFBQTs7RUFFQSxJQUFBLFVBQUEsU0FBQTtHQUNBLElBQUEsUUFBQSxPQUFBO0dBQ0EsSUFBQSxTQUFBLFFBQUE7O0dBRUEsT0FBQSxRQUFBLE1BQUE7S0FDQSxPQUFBLFNBQUEsTUFBQTtHQUNBLE9BQUEsV0FBQSxNQUFBLFVBQUEsT0FBQSxHQUFBLEdBQUEsT0FBQSxPQUFBLE9BQUE7O0dBRUEsSUFBQSxTQUFBLFNBQUEsV0FBQTtJQUNBLFNBQUEsWUFBQTs7O0dBR0E7Ozs7SUFJQSxTQUFBLGFBQUE7RUFDQSxJQUFBLFFBQUEsT0FBQTtFQUNBLElBQUEsU0FBQSxNQUFBOztFQUVBLElBQUEsUUFBQTtHQUNBLE9BQUEsWUFBQSxHQUFBO0dBQ0EsSUFBQSxNQUFBLEtBQUE7SUFDQSxNQUFBLE1BQUE7OztHQUdBLFNBQUE7Ozs7SUFJQSxPQUFBO0tBQ0EscUJBQUE7S0FDQSxpQkFBQTs7Ozs7QUM5TEEsSUFBQSxZQUFBLFdBQUE7O0NBRUEsSUFBQSxZQUFBLEVBQUEsT0FBQSxLQUFBLFFBQUE7O0NBRUEsU0FBQSxpQkFBQSxlQUFBOztFQUVBLGNBQUEsUUFBQSxTQUFBLGNBQUE7O0dBRUEsSUFBQSxpQkFBQSxhQUFBO0dBQ0EsSUFBQSxpQkFBQSxhQUFBOztNQUVBLGdCQUFBLGdCQUFBOzs7O0lBSUEsU0FBQSxnQkFBQSxnQkFBQSxnQkFBQTs7RUFFQSxJQUFBLG1CQUFBLEdBQUE7O0VBRUEsSUFBQSxpQkFBQSxVQUFBLEdBQUE7R0FDQSxRQUFBLEtBQUEsd0VBQUE7R0FDQTs7O0VBR0EsSUFBQSxpQkFBQSxTQUFBLEdBQUE7R0FDQSxRQUFBLEtBQUEsaUdBQUEsZ0JBQUEsaUJBQUE7R0FDQSxtQkFBQSxFQUFBLGlCQUFBOzs7RUFHQSxJQUFBLGNBQUEsaUJBQUEsS0FBQTtFQUNBLElBQUEsa0JBQUEsaUJBQUEsS0FBQTs7RUFFQSxJQUFBLGlCQUFBLGlCQUFBLEtBQUE7O0VBRUEsSUFBQSxNQUFBLFlBQUE7RUFDQSxJQUFBLGtCQUFBLFNBQUEsV0FBQTtHQUNBLE9BQUEsV0FBQSxLQUFBOztFQUVBLGVBQUEsSUFBQSxXQUFBLGdCQUFBO0VBQ0EsWUFBQSxJQUFBLFdBQUEsZ0JBQUEsQ0FBQTs7RUFFQSxJQUFBLGlCQUFBO0dBQ0EsYUFBQSxnQkFBQSxnQkFBQSxnQkFBQSxpQkFBQTs7R0FFQSxZQUFBLE1BQUEsV0FBQTtJQUNBLGFBQUEsb0JBQUEsZ0JBQUEsaUJBQUE7Ozs7RUFJQSxJQUFBLGtCQUFBLGVBQUEsU0FBQSxHQUFBO0dBQ0EsZUFBQSxRQUFBLFNBQUEsZUFBQTtJQUNBLFFBQUEsaUJBQUEsZ0JBQUE7Ozs7RUFJQSxrQkFBQSxpQkFBQTs7O0NBR0EsU0FBQSxrQkFBQSxpQkFBQSxnQkFBQTs7RUFFQSxRQUFBLHFCQUFBLGdCQUFBLEtBQUEsU0FBQSxRQUFBOztNQUVBLEVBQUEsS0FBQSxRQUFBLFdBQUE7SUFDQSxlQUFBLGlCQUFBOzs7OztDQUtBLFNBQUEsYUFBQSxVQUFBLGlCQUFBLFNBQUE7O0VBRUEsSUFBQSxXQUFBLFlBQUEsWUFBQTtFQUNBLElBQUEsWUFBQSxFQUFBLFVBQUEsVUFBQSxTQUFBLFNBQUEsVUFBQTs7RUFFQSxRQUFBLFlBQUEsVUFBQSxVQUFBOztFQUVBLGVBQUEsaUJBQUE7OztDQUdBLFNBQUEsZUFBQSxZQUFBLGFBQUE7O0VBRUEsSUFBQSxVQUFBLEVBQUEsV0FBQSxTQUFBLE9BQUEsSUFBQSxVQUFBLFVBQUEsU0FBQTtFQUNBLElBQUEsVUFBQSxFQUFBLFdBQUEsU0FBQSxPQUFBLEtBQUEsV0FBQSxZQUFBO0VBQ0EsSUFBQSxRQUFBLEVBQUEsNEJBQUEsU0FBQTs7RUFFQSxRQUFBLE9BQUE7O0VBRUEsUUFBQSxNQUFBLFNBQUEsS0FBQTtHQUNBLElBQUE7O0dBRUEsSUFBQSxPQUFBLEVBQUEsNENBQUEsS0FBQSxPQUFBLFlBQUE7O1NBRUEsZ0JBQUEsS0FBQTthQUNBLE9BQUE7YUFDQSxTQUFBO2FBQ0EsVUFBQTthQUNBLFNBQUEsQ0FBQTtpQkFDQSxPQUFBO2lCQUNBLFVBQUE7aUJBQ0EsUUFBQSxTQUFBLFVBQUE7cUJBQ0EsVUFBQTs7Ozs7O0VBTUEsUUFBQSxNQUFBLFNBQUEsS0FBQTtNQUNBLElBQUE7O01BRUEsSUFBQSxVQUFBLFlBQUE7U0FDQSxJQUFBLFFBQUEsb0JBQUEsTUFBQTs7YUFFQSxJQUFBLFVBQUEsRUFBQSxrQkFBQSxTQUFBO2FBQ0EsSUFBQSxTQUFBLFFBQUE7O0lBRUEsSUFBQSxrQkFBQSxPQUFBLFFBQUE7SUFDQSxJQUFBLHdCQUFBLGdCQUFBLEtBQUE7SUFDQSxJQUFBLHVCQUFBLHNCQUFBLFNBQUE7O2FBRUEsT0FBQTs7YUFFQSxRQUFBLFlBQUE7Y0FDQSxLQUFBLFNBQUEsT0FBQTs7O2NBR0EsSUFBQSx3QkFBQSxHQUFBO01BQ0EsZ0JBQUEsU0FBQTs7Ozs7O0VBTUEsUUFBQSxPQUFBO0VBQ0EsUUFBQSxPQUFBLEVBQUEsV0FBQSxLQUFBLE9BQUEsWUFBQSxTQUFBLEtBQUEsU0FBQSxVQUFBLE9BQUEsS0FBQSxVQUFBLFVBQUE7O0VBRUEsV0FBQSxPQUFBOzs7Q0FHQSxPQUFBO0tBQ0Esa0JBQUE7S0FDQSxpQkFBQTs7OztBQzNJQSxJQUFBLGVBQUEsV0FBQTs7RUFFQSxTQUFBLEtBQUE7UUFDQSxPQUFBLENBQUEsQ0FBQSxDQUFBLEVBQUEsS0FBQSxVQUFBLFNBQUEsR0FBQSxTQUFBLElBQUEsVUFBQTs7O0lBR0EsU0FBQSxVQUFBOzs7RUFHQSxJQUFBLE9BQUEsQ0FBQSxPQUFBLE9BQUEsTUFBQSxPQUFBLE9BQUEsS0FBQSxPQUFBLEVBQUEsS0FBQSxNQUFBLE9BQUEsTUFBQSxPQUFBLE9BQUEsTUFBQTtFQUNBLE9BQUE7OztJQUdBLFNBQUEsUUFBQTtFQUNBLElBQUEsTUFBQSxDQUFBLFFBQUEsVUFBQSxRQUFBLFFBQUEsVUFBQSxhQUFBO0VBQ0EsT0FBQTs7O0lBR0EsT0FBQTtLQUNBLFNBQUE7S0FDQSxPQUFBOzs7OztBQ3BCQSxJQUFBLFNBQUEsQ0FBQSxXQUFBOztDQUVBLFNBQUEsT0FBQSxnQkFBQSxnQkFBQTtFQUNBLEtBQUEsaUJBQUE7RUFDQSxLQUFBLGlCQUFBOztFQUVBLFNBQUEsZ0JBQUEsZ0JBQUE7OztDQUdBLE9BQUEsVUFBQSxZQUFBLFdBQUE7O0VBRUEsT0FBQSxRQUFBLHFCQUFBLEtBQUE7OztDQUdBLE9BQUE7Ozs7QUNkQSxJQUFBLGdCQUFBLEVBQUEsS0FBQSxHQUFBLFVBQUEsR0FBQSxTQUFBOztBQUVBLElBQUEsV0FBQSxXQUFBOztDQUVBLElBQUE7O0lBRUE7O0lBRUEsU0FBQSxPQUFBOztFQUVBLElBQUEsU0FBQTtJQUNBLFFBQUEsQ0FBQTtNQUNBLE1BQUE7TUFDQSxTQUFBLENBQUEsRUFBQSxNQUFBLGNBQUEsRUFBQSxNQUFBOzs7O1FBSUEsS0FBQSxJQUFBLElBQUEsR0FBQSxRQUFBLGNBQUE7OztJQUdBLFNBQUEsWUFBQSxJQUFBLFVBQUEsU0FBQTs7O1FBR0EsR0FBQSxJQUFBLGNBQUEsRUFBQSxVQUFBLElBQUEsVUFBQSxVQUFBLFdBQUEsT0FBQSxJQUFBO2dDQUNBLGFBQUEsY0FBQSxLQUFBLFNBQUEsV0FBQTs7O0lBR0EsU0FBQSxpQkFBQSxVQUFBLFNBQUE7O1FBRUEsSUFBQSxLQUFBLFlBQUEsWUFBQTs7O1FBR0EsR0FBQSxJQUFBLGNBQUEsRUFBQSxVQUFBLElBQUEsVUFBQSxVQUFBLFdBQUE7Z0NBQ0EsYUFBQSxjQUFBLFVBQUEsU0FBQSxXQUFBOzs7SUFHQSxTQUFBLFlBQUE7O1FBRUEsSUFBQSxJQUFBLElBQUEsUUFBQSxTQUFBLFNBQUEsUUFBQTs7WUFFQSxJQUFBLFFBQUEsR0FBQSxLQUFBO1lBQ0EsUUFBQSxNQUFBLE1BQUEsZUFBQSxLQUFBLGNBQUE7WUFDQSxNQUFBLE9BQUEsS0FBQSxTQUFBLFFBQUE7ZUFDQSxRQUFBOzs7O1FBSUEsT0FBQTs7OztJQUlBLFNBQUEsWUFBQSxJQUFBOztRQUVBLElBQUEsSUFBQSxJQUFBLFFBQUEsU0FBQSxTQUFBLFFBQUE7O1lBRUEscUJBQUEsSUFBQSxLQUFBLFNBQUEsUUFBQTtnQkFDQSxJQUFBLE9BQUEsU0FBQSxHQUFBO29CQUNBLElBQUEsUUFBQSxPQUFBO29CQUNBLE1BQUEsY0FBQSxjQUFBO29CQUNBLEdBQUEsSUFBQSxjQUFBLE9BQUE7O29CQUVBLFFBQUE7Ozs7O1FBS0EsT0FBQTs7O0lBR0EsU0FBQSxxQkFBQSxVQUFBOztRQUVBLElBQUEsSUFBQSxJQUFBLFFBQUEsU0FBQSxTQUFBLFFBQUE7O1lBRUEsSUFBQSxJQUFBLEdBQUEsS0FBQTtZQUNBLElBQUEsRUFBQSxNQUFBLFlBQUEsS0FBQTtZQUNBLEVBQUEsT0FBQSxLQUFBLFNBQUEsUUFBQTtnQkFDQSxRQUFBOzs7O1FBSUEsT0FBQTs7OztJQUlBLFNBQUEscUJBQUEsVUFBQTs7UUFFQSxJQUFBLElBQUEsSUFBQSxRQUFBLFNBQUEsU0FBQSxRQUFBOztZQUVBLElBQUEsSUFBQSxHQUFBLEtBQUE7WUFDQSxJQUFBLEVBQUEsTUFBQSxZQUFBLEtBQUE7O1lBRUEsRUFBQSxPQUFBLEtBQUEsU0FBQSxRQUFBOztnQkFFQSxJQUFBLGlCQUFBO2dCQUNBLE9BQUEsUUFBQSxTQUFBLE9BQUE7b0JBQ0EsSUFBQSxNQUFBLGVBQUEsY0FBQSxTQUFBO3dCQUNBLGVBQUEsS0FBQTs7OztnQkFJQSxRQUFBOzs7O1FBSUEsT0FBQTs7O0lBR0EsT0FBQTtLQUNBLGFBQUE7UUFDQSxrQkFBQTtRQUNBLFdBQUE7S0FDQSxhQUFBO1FBQ0Esc0JBQUE7UUFDQSxzQkFBQTs7OztBQUlBIiwiZmlsZSI6ImNhbWVyYS5qcyIsInNvdXJjZXNDb250ZW50IjpbInZhciBjYW1lcmFEaWFsb2cgPSAoZnVuY3Rpb24oKSB7XHJcblxyXG5cdHZhciBjb25zdHJhaW50cyA9IHsgdmlkZW86IHRydWUsIGF1ZGlvOiBmYWxzZSB9OyBcclxuXHR2YXIgY2FsbGJhY2s7IFxyXG5cclxuXHR2YXIgJHZpZGVvLCAkY2FudmFzOyBcclxuXHR2YXIgJGJ0bkNhcHR1cmUsICRidG5SZXRha2UsICRidG5TYXZlOyBcclxuXHJcblx0ZnVuY3Rpb24gY29uZmlndXJlRm9ySU9TKGNhbWVyYUxpbmtJT1MsIGNhbWVyYVNlbGVjdG9yLCAkcGhvdG9Db250YWluZXIsIHNhdmVTbmFwc2hvdENhbGxiYWNrKSB7XHJcblxyXG5cdFx0Y2FtZXJhTGlua0lPUy5jaGFuZ2UoKGZ1bmN0aW9uKGNhbWVyYVNlbGVjdG9yLCAkcGhvdG9Db250YWluZXIsIGNhbGxiYWNrKSB7XHJcblxyXG5cdFx0XHRyZXR1cm4gZnVuY3Rpb24oZXZ0KSB7XHJcblx0XHRcdFx0dmFyIGYgPSBldnQudGFyZ2V0LmZpbGVzWzBdOyBcclxuXHRcdFx0XHR2YXIgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKTtcclxuXHJcblx0XHRcdFx0cmVhZGVyLm9ubG9hZCA9IGZ1bmN0aW9uKHRoZUZpbGUpIHtcclxuXHJcblx0XHRcdCAgICBcdGlmIChjYWxsYmFjaykge1xyXG5cdFx0XHQgICAgXHRcdHZhciBpbWdEYXRhID0gdGhlRmlsZS50YXJnZXQucmVzdWx0OyBcclxuXHRcdFx0ICAgIFx0XHRjYWxsYmFjayhjYW1lcmFTZWxlY3RvciwgJHBob3RvQ29udGFpbmVyLCBpbWdEYXRhKTsgXHJcblx0XHRcdCAgICBcdH1cclxuXHRcdFx0ICAgIFx0ZWxzZSB7XHJcblx0XHRcdCAgICBcdFx0Y29uc29sZS53YXJuKFwiQ2FsbGJhY2sgaXMgbm90IGRlZmluZWQhXCIpOyBcclxuXHRcdFx0ICAgIFx0fVxyXG5cdFx0XHRcdH07IFxyXG5cclxuXHRcdFx0XHQkcGhvdG9Db250YWluZXIucmVtb3ZlQ2xhc3MoXCJoaWRkZW5cIik7IFxyXG5cclxuXHRcdFx0XHQvLyBSZWFkIGluIHRoZSBpbWFnZSBmaWxlIGFzIGEgZGF0YSBVUkwuXHJcblx0XHRcdFx0cmVhZGVyLnJlYWRBc0RhdGFVUkwoZik7XHJcblx0XHRcdH07IFxyXG5cclxuXHRcdH0pKGNhbWVyYVNlbGVjdG9yLCAkcGhvdG9Db250YWluZXIsIHNhdmVTbmFwc2hvdENhbGxiYWNrKSk7IFxyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gZ2V0Q2FtZXJhVGVtcGxhdGVIdG1sKCkge1xyXG5cclxuXHRcdHJldHVybiBbJzxkaXYgaWQ9XCJjYW1lcmEtZGlhbG9nXCI+JywgXHJcblx0XHRcdCAgICAgICAgJzxmb3JtIG5hbWU9XCJjYW1lcmFGb3JtXCI+JyxcclxuXHRcdFx0ICAgICAgICAgICAgJzxpbWcgc3JjPVwiaW1nL3NwaW5uZXIuZ2lmXCIgY2xhc3M9XCJzcGlubmVyXCIgLz4nLCAgXHJcblx0XHRcdCAgICAgICAgICAgICc8ZGl2IGNsYXNzPVwicm93XCI+JyxcclxuXHRcdFx0ICAgICAgICAgICAgICAgICc8ZGl2IGNsYXNzPVwiY29sLXNtLTEyXCI+JyxcclxuXHRcdFx0ICAgICAgICAgICAgICAgIFx0Jzx2aWRlbyBpZD1cImRhdGFWaWRlb0lkXCIgYXV0b3BsYXkgc3R5bGU9XCJ3aWR0aDoxMDAlXCIgd2lkdGg9XCIxMDAlXCI+PC92aWRlbz4nLFxyXG5cdFx0XHQgICAgICAgICAgICAgICAgJzwvZGl2PicsXHJcblx0XHRcdCAgICAgICAgICAgICc8L2Rpdj4nLCBcclxuXHRcdFx0ICAgICAgICAgICAgJzxkaXYgY2xhc3M9XCJyb3dcIj4nLFxyXG5cdFx0XHQgICAgICAgICAgICAgICAgJzxkaXYgY2xhc3M9XCJjb2wtc20tMTJcIj4nLFxyXG5cdFx0XHQgICAgICAgICAgICAgICAgXHQnPGNhbnZhcyBpZD1cImNhbnZhc0lkXCIgY2xhc3M9XCJoaWRkZW5cIiBzdHlsZT1cIndpZHRoOjEwMCU7XCIgd2lkdGg9XCIxMDAlXCI+PC9jYW52YXM+JyxcclxuXHRcdFx0ICAgICAgICAgICAgICAgICc8L2Rpdj4nLFxyXG5cdFx0XHQgICAgICAgICAgICAnPC9kaXY+JywgXHJcblx0XHRcdCAgICAgICAgJzwvZm9ybT4nLFxyXG5cdFx0XHQgICAgJzwvZGl2PiddLmpvaW4oJ1xcbicpOyBcclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIGRpc3BsYXlDYW1lcmFEaWFsb2coY2FtZXJhU2VsZWN0b3IsICRwaG90b0NvbnRhaW5lciwgc2F2ZVNuYXBzaG90Q2FsbGJhY2spIHsgXHJcblxyXG4gICAgICAgIEJvb3RzdHJhcERpYWxvZy5zaG93KHtcclxuICAgICAgICAgICAgdGl0bGU6ICdUYWtlIGEgcGhvdG8nLFxyXG4gICAgICAgICAgICBtZXNzYWdlOiAkKGdldENhbWVyYVRlbXBsYXRlSHRtbCgpKSwgXHJcbiAgICAgICAgICAgIGNzc0NsYXNzOiAnbG9naW4tZGlhbG9nJywgXHJcbiAgICAgICAgICAgIG9uc2hvd246IGZ1bmN0aW9uKGRpYWxvZ1JlZikge1xyXG4gICAgICAgICAgICBcdFxyXG4gICAgICAgICAgICBcdGNhbGxiYWNrID0gc2F2ZVNuYXBzaG90Q2FsbGJhY2s7IFxyXG5cclxuICAgICAgICAgICAgXHQvLyBpbml0IHJlZmVyZW5jZXMgdG8gYnV0dG9ucyBmcm9tIG1vZGFsIGZvb3RlciBcclxuXHRcdFx0XHR2YXIgZm9vdGVyID0gZGlhbG9nUmVmLmdldE1vZGFsRm9vdGVyKCk7IFxyXG5cclxuXHRcdFx0XHQkYnRuQ2FwdHVyZSA9IGZvb3Rlci5maW5kKFwiLmJ0bi1jYXB0dXJlXCIpOyBcclxuXHRcdFx0XHQkYnRuUmV0YWtlID0gZm9vdGVyLmZpbmQoXCIuYnRuLXJldGFrZVwiKTsgXHJcblx0XHRcdFx0JGJ0blNhdmUgPSBmb290ZXIuZmluZChcIi5idG4tc2F2ZVwiKTtcclxuICAgICAgICAgICAgXHRcclxuICAgICAgICAgICAgXHR2YXIgYm9keSA9IGRpYWxvZ1JlZi5nZXRNb2RhbEJvZHkoKTtcclxuXHJcbiAgICAgICAgICAgIFx0dmFyIGNoYW5nZUJ0biA9IGJvZHkuZmluZChcIiNjaGFuZ2VJZFwiKTtcclxuICAgICAgICAgICAgXHRjaGFuZ2VCdG4uY2xpY2soc3dhcFZpZGVvV2l0aENhbnZhcyk7XHJcblxyXG4gICAgICAgICAgICBcdC8vIGluaXQgdmlkZW8gJiBjYW52YXMgaGVyZSBcclxuXHRcdFx0XHQkdmlkZW8gPSBib2R5LmZpbmQoXCIjZGF0YVZpZGVvSWRcIik7IFxyXG5cdFx0XHRcdCRjYW52YXMgPSBib2R5LmZpbmQoXCIjY2FudmFzSWRcIik7IFxyXG5cclxuICAgICAgICAgICAgXHR2YXIgdmlkZW8gPSAkdmlkZW9bMF07XHJcblx0XHRcdFx0dmFyIGNhbnZhcyA9IHdpbmRvdy5jYW52YXMgPSAkY2FudmFzWzBdOyBcclxuXHJcblx0XHRcdFx0dmlkZW8ub25sb2FkZWRkYXRhID0gZnVuY3Rpb24oKSB7XHJcblx0XHRcdFx0XHRpZiAoJGJ0bkNhcHR1cmUuaGFzQ2xhc3MoXCJkaXNhYmxlZFwiKSkge1xyXG5cdFx0XHRcdFx0XHQkYnRuQ2FwdHVyZS5yZW1vdmVDbGFzcyhcImRpc2FibGVkXCIpOyBcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdG5hdmlnYXRvci5tZWRpYURldmljZXMuZ2V0VXNlck1lZGlhKGNvbnN0cmFpbnRzKVxyXG5cdFx0XHRcdC50aGVuKGZ1bmN0aW9uIChzdHJlYW0pIHtcclxuXHRcdFx0XHRcdHdpbmRvdy5zdHJlYW0gPSBzdHJlYW07IFxyXG5cdFx0XHRcdFx0dmlkZW8uc3JjT2JqZWN0ID0gc3RyZWFtO1xyXG5cdFx0XHRcdFx0dmlkZW8uc3JjID0gd2luZG93LlVSTC5jcmVhdGVPYmplY3RVUkwoc3RyZWFtKTsgXHJcblx0XHRcdFx0fSlcclxuXHRcdFx0XHQuY2F0Y2goZnVuY3Rpb24gKGVycm9yKSB7XHJcblx0XHRcdFx0IFx0Y29uc29sZS53YXJuKCduYXZpZ2F0b3IuZ2V0VXNlck1lZGlhIGVycm9yOiAnLCBlcnJvcik7XHJcblx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdC8vIGRpc3BsYXkgdGhlIGNvbnRhaW5lcj8gXHJcblx0XHRcdFx0JHBob3RvQ29udGFpbmVyLnJlbW92ZUNsYXNzKFwiaGlkZGVuXCIpOyBcclxuICAgICAgICAgICAgfSwgXHJcbiAgICAgICAgICAgIG9uaGlkZGVuOiBmdW5jdGlvbihkaWFsb2dSZWYpIHtcclxuICAgICAgICAgICAgXHRzdG9wQ2FtZXJhKCk7IFxyXG4gICAgICAgICAgICB9LCBcclxuICAgICAgICAgICAgY3NzQ2xhc3M6ICdsb2dpbi1kaWFsb2cnLCBcclxuICAgICAgICAgICAgYnV0dG9uczogW3tcclxuICAgICAgICAgICAgICAgIGxhYmVsOiAnUmV0YWtlJyxcclxuICAgICAgICAgICAgICAgIGljb246ICdnbHlwaGljb24gZ2x5cGhpY29uLXNvcnQnLFxyXG4gICAgICAgICAgICAgICAgY3NzQ2xhc3M6ICdidG4gYnRuLXByaW1hcnkgcHVsbC1sZWZ0IGhpZGRlbiBidG4tcmV0YWtlJyxcclxuICAgICAgICAgICAgICAgIGFjdGlvbjogZnVuY3Rpb24gKGRpYWxvZ0l0c2VsZikge1xyXG5cdFx0XHQgICAgXHRzd2FwVmlkZW9XaXRoQ2FudmFzKCk7IFxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9LCB7XHJcbiAgICAgICAgICAgICAgICBsYWJlbDogJ0NhcHR1cmUgU25hcHNob3QnLFxyXG4gICAgICAgICAgICAgICAgaWNvbjogJ2dseXBoaWNvbiBnbHlwaGljb24tY2FtZXJhJyxcclxuICAgICAgICAgICAgICAgIGNzc0NsYXNzOiAnYnRuIGJ0bi1wcmltYXJ5IHB1bGwtbGVmdCBkaXNhYmxlZCBidG4tY2FwdHVyZScsXHJcbiAgICAgICAgICAgICAgICBhY3Rpb246IGZ1bmN0aW9uIChkaWFsb2dJdHNlbGYpIHtcclxuXHRcdFx0ICAgIFx0Y2FwdHVyZVNuYXBzaG90KCk7IFxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9LCB7XHJcbiAgICAgICAgICAgICAgICBsYWJlbDogJ1NhdmUnLFxyXG4gICAgICAgICAgICAgICAgaWNvbjogJ2dseXBoaWNvbiBnbHlwaGljb24tb2snLFxyXG4gICAgICAgICAgICAgICAgY3NzQ2xhc3M6ICdidG4tcHJpbWFyeSBoaWRkZW4gYnRuLXNhdmUnLFxyXG4gICAgICAgICAgICAgICAgYWN0aW9uOiBmdW5jdGlvbiAoZGlhbG9nSXRzZWxmKSB7XHJcblxyXG5cdFx0XHQgICAgXHRpZiAoY2FsbGJhY2spIHtcclxuXHRcdFx0ICAgIFx0XHR2YXIgaW1nRGF0YSA9IGNhbnZhcy50b0RhdGFVUkwoXCJpbWFnZS9wbmdcIik7IFxyXG5cdFx0XHQgICAgXHRcdGNhbGxiYWNrKGNhbWVyYVNlbGVjdG9yLCAkcGhvdG9Db250YWluZXIsIGltZ0RhdGEpOyBcclxuXHRcdFx0ICAgIFx0fVxyXG5cdFx0XHQgICAgXHRlbHNlIHtcclxuXHRcdFx0ICAgIFx0XHRjb25zb2xlLndhcm4oXCJDYWxsYmFjayBpcyBub3QgZGVmaW5lZCFcIik7IFxyXG5cdFx0XHQgICAgXHR9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGRpYWxvZ0l0c2VsZi5jbG9zZSgpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9LCB7XHJcbiAgICAgICAgICAgICAgICBsYWJlbDogJ0NhbmNlbCcsXHJcbiAgICAgICAgICAgICAgICBpY29uOiAnZ2x5cGhpY29uIGdseXBoaWNvbi1yZW1vdmUnLFxyXG4gICAgICAgICAgICAgICAgY3NzQ2xhc3M6ICdidG4tZGFuZ2VyJyxcclxuICAgICAgICAgICAgICAgIGFjdGlvbjogZnVuY3Rpb24gKGRpYWxvZ0l0c2VsZikge1xyXG4gICAgICAgICAgICAgICAgICAgIGRpYWxvZ0l0c2VsZi5jbG9zZSgpOyBcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfV1cclxuICAgICAgICB9KTtcclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIHN3YXBWaWRlb1dpdGhDYW52YXMoKSB7XHJcblx0XHQkdmlkZW8udG9nZ2xlQ2xhc3MoXCJoaWRkZW5cIik7XHJcblx0XHQkY2FudmFzLnRvZ2dsZUNsYXNzKFwiaGlkZGVuXCIpOyBcclxuXHJcblx0XHQkYnRuQ2FwdHVyZS50b2dnbGVDbGFzcyhcImhpZGRlblwiKTsgXHJcblx0XHQkYnRuUmV0YWtlLnRvZ2dsZUNsYXNzKFwiaGlkZGVuXCIpOyAgXHJcblx0fVxyXG5cclxuICAgIGZ1bmN0aW9uIGNhcHR1cmVTbmFwc2hvdCgpIHsgXHJcblxyXG5cdFx0aWYgKCR2aWRlbyAmJiAkY2FudmFzKSB7XHJcblx0XHRcdHZhciB2aWRlbyA9ICR2aWRlb1swXTsgXHJcblx0XHRcdHZhciBjYW52YXMgPSAkY2FudmFzWzBdOyBcclxuXHJcblx0XHRcdGNhbnZhcy53aWR0aCA9IHZpZGVvLnZpZGVvV2lkdGg7XHJcbiAgXHRcdFx0Y2FudmFzLmhlaWdodCA9IHZpZGVvLnZpZGVvSGVpZ2h0O1xyXG5cdFx0XHRjYW52YXMuZ2V0Q29udGV4dCgnMmQnKS5kcmF3SW1hZ2UodmlkZW8sIDAsIDAsIGNhbnZhcy53aWR0aCwgY2FudmFzLmhlaWdodCk7XHJcblxyXG5cdFx0XHRpZiAoJGJ0blNhdmUuaGFzQ2xhc3MoXCJoaWRkZW5cIikpIHtcclxuXHRcdFx0XHQkYnRuU2F2ZS5yZW1vdmVDbGFzcyhcImhpZGRlblwiKTsgXHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHN3YXBWaWRlb1dpdGhDYW52YXMoKTsgXHRcdFx0XHJcblx0XHR9IFxyXG4gICAgfSBcclxuXHJcbiAgICBmdW5jdGlvbiBzdG9wQ2FtZXJhKCkge1xyXG5cdFx0dmFyIHZpZGVvID0gJHZpZGVvWzBdO1xyXG5cdFx0dmFyIHN0cmVhbSA9IHZpZGVvLnNyY09iamVjdDsgXHJcblx0XHRcclxuXHRcdGlmIChzdHJlYW0pIHtcclxuXHRcdFx0c3RyZWFtLmdldFRyYWNrcygpWzBdLnN0b3AoKTsgXHJcblx0XHRcdGlmICh2aWRlby5zcmMpIHtcclxuXHRcdFx0XHR2aWRlby5zcmMgPSBudWxsOyBcclxuXHRcdFx0fSBcclxuXHJcblx0XHRcdHN0cmVhbSA9IG51bGw7IFxyXG5cdFx0fVxyXG5cdH1cclxuXHJcbiAgICByZXR1cm4geyAgICAgICAgXHJcbiAgICBcdGRpc3BsYXlDYW1lcmFEaWFsb2c6IGRpc3BsYXlDYW1lcmFEaWFsb2csIFxyXG4gICAgXHRjb25maWd1cmVGb3JJT1M6IGNvbmZpZ3VyZUZvcklPUyBcclxuICAgIH07XHJcblxyXG59KCkpOyBcclxuIiwidmFyIGNhbWVyYVVJID0gKGZ1bmN0aW9uKCkge1xyXG5cclxuXHR2YXIgcGhvdG9TaXplID0geyB3aWR0aDogMTUwLCBoZWlnaHQ6IDExMyB9O1xyXG5cclxuXHRmdW5jdGlvbiBjb25maWd1cmVDYW1lcmFzKGNhbWVyYURldGFpbHMpIHsgXHJcblxyXG5cdFx0Y2FtZXJhRGV0YWlscy5mb3JFYWNoKGZ1bmN0aW9uKGNhbWVyYURldGFpbCkgeyBcclxuXHJcblx0XHRcdHZhciBjYW1lcmFTZWxlY3RvciA9IGNhbWVyYURldGFpbC5jYW1lcmFTZWxlY3RvcjsgXHJcblx0XHRcdHZhciBleGlzdGluZ1Bob3RvcyA9IGNhbWVyYURldGFpbC5leGlzdGluZ1Bob3RvczsgXHJcblxyXG5cdFx0ICAgIGNvbmZpZ3VyZUNhbWVyYShjYW1lcmFTZWxlY3RvciwgZXhpc3RpbmdQaG90b3MpOyBcclxuXHRcdH0pOyBcclxuXHR9XHJcblxyXG4gICAgZnVuY3Rpb24gY29uZmlndXJlQ2FtZXJhKGNhbWVyYVNlbGVjdG9yLCBleGlzdGluZ1Bob3Rvcykge1xyXG5cclxuXHRcdHZhciAkY2FtZXJhQ29udGFpbmVyID0gJCggY2FtZXJhU2VsZWN0b3IgKTsgXHJcblxyXG5cdFx0aWYgKCRjYW1lcmFDb250YWluZXIubGVuZ3RoID09IDApIHtcclxuXHRcdFx0Y29uc29sZS53YXJuKFwiQ29uZmlndXJlZCBKUXVlcnkgc2VsZWN0b3IgJyVzJyBkb2VzIG5vdCBtYXRjaCBhbnkgZG9jdW1lbnQgZWxlbWVudC5cIiwgY2FtZXJhU2VsZWN0b3IpOyBcclxuXHRcdFx0cmV0dXJuOyBcclxuXHRcdH1cclxuXHJcblx0XHRpZiAoJGNhbWVyYUNvbnRhaW5lci5sZW5ndGggPiAxKSB7XHJcblx0XHRcdGNvbnNvbGUud2FybihcIkNvbmZpZ3VyZWQgSlF1ZXJ5IHNlbGVjdG9yICclcycgbWF0Y2hlcyAlcyBkb2N1bWVudCBlbGVtZW50cy4gVXNpbmcgdGhlIGZpcnN0IG9uZSBhdCBpbmRleCAwLlwiLCBjYW1lcmFTZWxlY3RvciwgJGNhbWVyYUNvbnRhaW5lci5sZW5ndGgpOyBcclxuXHRcdFx0JGNhbWVyYUNvbnRhaW5lciA9ICQoJGNhbWVyYUNvbnRhaW5lclswXSk7IFxyXG5cdFx0fVxyXG5cclxuXHRcdHZhciAkY2FtZXJhTGluayA9ICRjYW1lcmFDb250YWluZXIuZmluZChcIi5jYW1lcmEtbGlua1wiKTsgXHJcblx0XHR2YXIgJHBob3RvQ29udGFpbmVyID0gJGNhbWVyYUNvbnRhaW5lci5maW5kKFwiLnBob3RvLWltYWdlc2V0XCIpOyBcclxuXHJcblx0XHR2YXIgJGNhbWVyYUxpbmtJT1MgPSAkY2FtZXJhQ29udGFpbmVyLmZpbmQoXCIuY2FtZXJhLWxpbmstaW9zXCIpOyBcclxuXHJcblx0XHR2YXIgaU9TID0gY2FtZXJhVXRpbHMuaXNJT1MoKTsgXHJcblx0XHR2YXIgZ2V0RGlzcGxheVZhbHVlID0gZnVuY3Rpb24oaXNWaXNpYmxlKSB7XHJcblx0XHRcdHJldHVybiBpc1Zpc2libGU/IFwiXCIgOiBcIm5vbmVcIjsgXHJcblx0XHR9OyBcclxuXHRcdCRjYW1lcmFMaW5rSU9TLmNzcyhcImRpc3BsYXlcIiwgZ2V0RGlzcGxheVZhbHVlKGlPUykpOyBcclxuXHRcdCRjYW1lcmFMaW5rLmNzcyhcImRpc3BsYXlcIiwgZ2V0RGlzcGxheVZhbHVlKCFpT1MpKTsgXHJcblxyXG5cdFx0aWYgKCRwaG90b0NvbnRhaW5lcikge1xyXG5cdFx0XHRjYW1lcmFEaWFsb2cuY29uZmlndXJlRm9ySU9TKCRjYW1lcmFMaW5rSU9TLCBjYW1lcmFTZWxlY3RvciwgJHBob3RvQ29udGFpbmVyLCBzYXZlU25hcHNob3QpOyBcclxuXHJcblx0XHRcdCRjYW1lcmFMaW5rLmNsaWNrKGZ1bmN0aW9uKCkgeyBcclxuXHRcdFx0XHRjYW1lcmFEaWFsb2cuZGlzcGxheUNhbWVyYURpYWxvZyhjYW1lcmFTZWxlY3RvciwgJHBob3RvQ29udGFpbmVyLCBzYXZlU25hcHNob3QpOyBcclxuXHRcdFx0fSk7IFxyXG5cdFx0fVxyXG5cclxuXHRcdGlmIChleGlzdGluZ1Bob3RvcyAmJiBleGlzdGluZ1Bob3Rvcy5sZW5ndGggPiAwKSB7XHJcblx0XHRcdGV4aXN0aW5nUGhvdG9zLmZvckVhY2goZnVuY3Rpb24oZXhpc3RpbmdQaG90bykge1xyXG5cdFx0XHRcdHBob3RvREIuYWRkRXhpc3RpbmdQaG90byhjYW1lcmFTZWxlY3RvciwgZXhpc3RpbmdQaG90byk7IFxyXG5cdFx0XHR9KTsgXHRcclxuXHRcdH1cclxuXHJcblx0XHRwb3B1bGF0ZVBob3RvTGlzdCgkcGhvdG9Db250YWluZXIsIGNhbWVyYVNlbGVjdG9yKTsgXHJcblx0fVx0XHJcblxyXG5cdGZ1bmN0aW9uIHBvcHVsYXRlUGhvdG9MaXN0KCRwaG90b0NvbnRhaW5lciwgY2FtZXJhU2VsZWN0b3IpIHsgXHJcblx0XHQvLyBwb3B1bGF0ZSB0aGUgbGlzdCBvZiBhbGwgcGhvdG9zIGZvciBnaXZlbiBjYW1lcmEgIFxyXG5cdFx0cGhvdG9EQi5maW5kUGhvdG9zQnlDYW1lcmFJZChjYW1lcmFTZWxlY3RvcikudGhlbihmdW5jdGlvbihwaG90b3MpIHsgXHJcblxyXG5cdFx0ICAgICQuZWFjaChwaG90b3MsIGZ1bmN0aW9uKCkgeyBcclxuXHRcdFx0XHRhZGRQaG90b1RvTGlzdCgkcGhvdG9Db250YWluZXIsIHRoaXMpOyBcclxuXHRcdFx0fSk7IFxyXG5cdFx0fSk7IFxyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gc2F2ZVNuYXBzaG90KGNhbWVyYUlkLCAkcGhvdG9Db250YWluZXIsIGltZ0RhdGEpIHtcclxuXHJcblx0XHR2YXIgZmlsZU5hbWUgPSBjYW1lcmFVdGlscy5uZXdHdWlkKCkgKyBcIi5wbmdcIjsgXHJcblx0XHR2YXIgaW1nT2JqZWN0ID0geyBmaWxlTmFtZTogZmlsZU5hbWUsIGNvbnRlbnQ6IGltZ0RhdGEsIGNhbWVyYUlkOiBjYW1lcmFJZCB9O1xyXG5cclxuXHRcdHBob3RvREIuYWRkTmV3UGhvdG8oZmlsZU5hbWUsIGNhbWVyYUlkLCBpbWdEYXRhKTtcclxuXHJcblx0XHRhZGRQaG90b1RvTGlzdCgkcGhvdG9Db250YWluZXIsIGltZ09iamVjdCk7IFxyXG5cdH0gXHJcblxyXG5cdGZ1bmN0aW9uIGFkZFBob3RvVG9MaXN0KCRpbWFnZXNEaXYsIGltYWdlT2JqZWN0KSB7XHJcblxyXG5cdFx0dmFyICRpbWdEaXYgPSAkKCc8ZGl2IC8+JykuYWRkQ2xhc3MoXCJpbWdcIikuY3NzKFwiaGVpZ2h0XCIsIHBob3RvU2l6ZS5oZWlnaHQgKyBcInB4XCIpOyBcclxuXHRcdHZhciAkZGVsRGl2ID0gJCgnPGRpdiAvPicpLmFkZENsYXNzKFwiZGVsXCIpLmF0dHIoXCJkYXRhLWlkXCIsIGltYWdlT2JqZWN0LmZpbGVOYW1lKTsgXHJcblx0XHR2YXIgJGljb24gPSAkKCc8aSBhcmlhLWhpZGRlbj1cInRydWVcIiAvPicpLmFkZENsYXNzKFwiZmEgZmEtdHJhc2gtb1wiKTsgXHJcblxyXG5cdFx0JGRlbERpdi5hcHBlbmQoJGljb24pOyBcclxuXHJcblx0XHQkaW1nRGl2LmNsaWNrKGZ1bmN0aW9uKGV2dCkgeyBcclxuXHRcdFx0ZXZ0LnN0b3BQcm9wYWdhdGlvbigpOyBcclxuXHJcblx0XHRcdHZhciAkcGljID0gJCgnPGltZyBzdHlsZT1cIndpZHRoOiAxMDAlXCIgd2lkdGg9XCIxMDAlXCIgLz4nKS5hdHRyKCdzcmMnLCBpbWFnZU9iamVjdC5jb250ZW50KTtcclxuXHQgICAgICAgIFxyXG5cdCAgICAgICAgQm9vdHN0cmFwRGlhbG9nLnNob3coe1xyXG5cdCAgICAgICAgICAgIHRpdGxlOiAnUGhvdG8gUHJldmlldycsXHJcblx0ICAgICAgICAgICAgbWVzc2FnZTogJHBpYyxcclxuXHQgICAgICAgICAgICBjc3NDbGFzczogJ2xvZ2luLWRpYWxvZycsIFxyXG5cdCAgICAgICAgICAgIGJ1dHRvbnM6IFt7XHJcblx0ICAgICAgICAgICAgICAgIGxhYmVsOiAnT0snLFxyXG5cdCAgICAgICAgICAgICAgICBjc3NDbGFzczogJ2J0bi1wcmltYXJ5JyxcclxuXHQgICAgICAgICAgICAgICAgYWN0aW9uOiBmdW5jdGlvbihkaWFsb2dSZWYpe1xyXG5cdCAgICAgICAgICAgICAgICAgICAgZGlhbG9nUmVmLmNsb3NlKCk7XHJcblx0ICAgICAgICAgICAgICAgIH1cclxuXHQgICAgICAgICAgICB9XVxyXG5cdCAgICAgICAgfSk7IFxyXG5cdFx0fSk7IFxyXG5cclxuXHRcdCRkZWxEaXYuY2xpY2soZnVuY3Rpb24oZXZ0KSB7IFxyXG5cdFx0ICAgIGV2dC5zdG9wUHJvcGFnYXRpb24oKTsgXHJcblxyXG5cdFx0ICAgIHZhciBpbWFnZUlkID0gaW1hZ2VPYmplY3QuZmlsZU5hbWU7IFxyXG5cdCAgICAgICAgaWYgKGNvbmZpcm0oJ0FyZSB5b3Ugc3VyZT8nKSA9PSB0cnVlKSB7XHJcblxyXG5cdCAgICAgICAgICAgIHZhciAkZGVsSW1nID0gJCgnZGl2W2RhdGEtaWQ9XCInICsgaW1hZ2VJZCArJ1wiXScpO1xyXG5cdCAgICAgICAgICAgIHZhciAkcGhvdG8gPSAkZGVsSW1nLnBhcmVudCgpOyBcclxuXHJcblx0XHRcdFx0dmFyICRwaG90b0NvbnRhaW5lciA9ICRwaG90by5jbG9zZXN0KCcucGhvdG8taW1hZ2VzZXQnKTsgXHJcblx0XHRcdFx0dmFyICRwaG90b0NvbnRhaW5lckltYWdlcyA9ICRwaG90b0NvbnRhaW5lci5maW5kKCdpbWcnKTsgXHJcblx0XHRcdFx0dmFyIHJlbWFpbmluZ0ltYWdlc0NvdW50ID0gJHBob3RvQ29udGFpbmVySW1hZ2VzLmxlbmd0aCAtIDE7IFx0Ly8gZXhjbHVkZSB0aGUgY3VycmVudCBvbmUgd2hpY2ggaXMgYmVpbmcgZGVsZXRlZCBcclxuXHJcblx0ICAgICAgICAgICAgJHBob3RvLnJlbW92ZSgpOyBcclxuXHJcblx0ICAgICAgICAgICAgcGhvdG9EQi5kZWxldGVQaG90byhpbWFnZUlkKVxyXG5cdCAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uKHBob3RvKSB7XHJcblxyXG5cdFx0XHRcdFx0Ly8gbm8gaW1hZ2VzIC0+IGhpZGUgdGhlIGNvbnRhaW5lciAobm90aGluZyB0byBzaG93KSBcclxuXHQgICAgICAgICAgICBcdGlmIChyZW1haW5pbmdJbWFnZXNDb3VudCA9PSAwKSB7IFxyXG5cdFx0XHRcdFx0XHQkcGhvdG9Db250YWluZXIuYWRkQ2xhc3MoXCJoaWRkZW5cIik7IFxyXG5cdCAgICAgICAgICAgIFx0fVxyXG5cdCAgICAgICAgICAgIH0pOyBcclxuXHQgICAgICAgIH1cclxuXHRcdH0pOyBcclxuXHJcblx0XHQkaW1nRGl2LmFwcGVuZCgkZGVsRGl2KTsgXHJcblx0XHQkaW1nRGl2LmFwcGVuZCgkKFwiPGltZyAvPlwiKS5hdHRyKFwic3JjXCIsIGltYWdlT2JqZWN0LmNvbnRlbnQpLmF0dHIoXCJ3aWR0aFwiLCBwaG90b1NpemUud2lkdGgpLmF0dHIoXCJoZWlnaHRcIiwgcGhvdG9TaXplLmhlaWdodCkpOyBcclxuXHJcblx0XHQkaW1hZ2VzRGl2LmFwcGVuZCgkaW1nRGl2KTsgXHJcblx0fVxyXG5cclxuXHRyZXR1cm4geyAgICAgICAgXHJcbiAgICBcdGNvbmZpZ3VyZUNhbWVyYXM6IGNvbmZpZ3VyZUNhbWVyYXMsIFxyXG4gICAgXHRjb25maWd1cmVDYW1lcmE6IGNvbmZpZ3VyZUNhbWVyYSBcclxuICAgIH07XHJcblxyXG59KCkpOyAiLCJ2YXIgY2FtZXJhVXRpbHMgPSAoZnVuY3Rpb24oKSB7XHJcblxyXG4gXHRmdW5jdGlvbiBTNCgpIHtcclxuICAgICAgICByZXR1cm4gKCgoMStNYXRoLnJhbmRvbSgpKSoweDEwMDAwKXwwKS50b1N0cmluZygxNikuc3Vic3RyaW5nKDEpOyBcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBuZXdHdWlkKCkge1xyXG5cclxuXHRcdC8vIHRoZW4gdG8gY2FsbCBpdCwgcGx1cyBzdGl0Y2ggaW4gJzQnIGluIHRoZSB0aGlyZCBncm91cFxyXG5cdFx0dmFyIGd1aWQgPSAoUzQoKSArIFM0KCkgKyBcIi1cIiArIFM0KCkgKyBcIi00XCIgKyBTNCgpLnN1YnN0cigwLDMpICsgXCItXCIgKyBTNCgpICsgXCItXCIgKyBTNCgpICsgUzQoKSArIFM0KCkpLnRvTG93ZXJDYXNlKCk7XHJcblx0XHRyZXR1cm4gZ3VpZDsgXHJcbiAgICB9IFxyXG5cclxuICAgIGZ1bmN0aW9uIGlzSU9TKCkgeyBcclxuXHRcdHZhciBpT1MgPSBbJ2lQYWQnLCAnaVBob25lJywgJ2lQb2QnXS5pbmRleE9mKG5hdmlnYXRvci5wbGF0Zm9ybSkgPj0gMDsgXHJcblx0XHRyZXR1cm4gaU9TOyBcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4geyBcclxuICAgIFx0bmV3R3VpZDogbmV3R3VpZCwgXHJcbiAgICBcdGlzSU9TOiBpc0lPUyBcclxuICAgIH07XHJcblxyXG59KCkpOyBcclxuIiwidmFyIENhbWVyYSA9IChmdW5jdGlvbigpIHsgXHJcblxyXG5cdGZ1bmN0aW9uIENhbWVyYShjYW1lcmFTZWxlY3RvciwgZXhpc3RpbmdQaG90b3MpIHtcclxuXHRcdHRoaXMuY2FtZXJhU2VsZWN0b3IgPSBjYW1lcmFTZWxlY3RvcjsgXHJcblx0XHR0aGlzLmV4aXN0aW5nUGhvdG9zID0gZXhpc3RpbmdQaG90b3M7IFxyXG5cclxuXHRcdGNhbWVyYVVJLmNvbmZpZ3VyZUNhbWVyYShjYW1lcmFTZWxlY3RvciwgZXhpc3RpbmdQaG90b3MpOyBcclxuXHR9XHJcblxyXG5cdENhbWVyYS5wcm90b3R5cGUuZ2V0UGhvdG9zID0gZnVuY3Rpb24oKSB7XHJcblx0XHRcclxuXHRcdHJldHVybiBwaG90b0RCLmZpbmRQaG90b3NCeUNhbWVyYUlkKHRoaXMuY2FtZXJhSWQpOyBcclxuXHR9OyBcclxuXHJcblx0cmV0dXJuIENhbWVyYTsgXHJcbn0pKCk7XHJcblxyXG4iLCJ2YXIgcGhvdG9TdGF0dXNlcyA9IHsgTmV3OiAwLCBFeGlzdGluZzogMSwgRGVsZXRlZDogMiB9OyBcclxuXHJcbnZhciBwaG90b0RCID0gKGZ1bmN0aW9uKCkge1xyXG5cclxuXHR2YXIgZGI7IFxyXG5cclxuICAgIGluaXQoKTsgXHJcblxyXG4gICAgZnVuY3Rpb24gaW5pdCgpIHsgXHJcblxyXG5cdFx0dmFyIHNjaGVtYSA9IHtcclxuXHRcdCAgc3RvcmVzOiBbe1xyXG5cdFx0ICAgIG5hbWU6ICdwaG90b1RhYmxlJyxcclxuXHRcdCAgICBpbmRleGVzOiBbeyBuYW1lOiAnZmlsZU5hbWUnIH0sIHsgbmFtZTogJ2NhbWVyYUlkJyB9XVxyXG5cdFx0ICB9XVxyXG5cdFx0fTsgXHJcblxyXG4gICAgICAgIGRiID0gbmV3IHlkbi5kYi5TdG9yYWdlKCdNTVNQaG90b0RCJywgc2NoZW1hKTsgXHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gYWRkTmV3UGhvdG8oaWQsIGNhbWVyYUlkLCBjb250ZW50KSB7IFxyXG5cclxuICAgICAgICAvLyB3ZSBhc3N1bWUgaGVyZSB0aGF0IGlkIChmaWxlTmFtZSkgaXMgdW5pcXVlIFxyXG4gICAgICAgIGRiLnB1dCgncGhvdG9UYWJsZScsIHsgZmlsZU5hbWU6IGlkLCBjYW1lcmFJZDogY2FtZXJhSWQsIGRhdGVUYWtlbjogU3RyaW5nKG5ldyBEYXRlKCkpLCBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwaG90b1N0YXR1czogcGhvdG9TdGF0dXNlcy5OZXcsIGNvbnRlbnQ6IGNvbnRlbnQgfSwgaWQpOyBcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBhZGRFeGlzdGluZ1Bob3RvKGNhbWVyYUlkLCBjb250ZW50KSB7ICBcclxuXHJcbiAgICAgICAgdmFyIGlkID0gY2FtZXJhVXRpbHMubmV3R3VpZCgpICsgXCIucG5nXCI7IFxyXG5cclxuICAgICAgICAvLyB3ZSBhc3N1bWUgaGVyZSB0aGF0IGlkIChmaWxlTmFtZSkgaXMgdW5pcXVlIFxyXG4gICAgICAgIGRiLnB1dCgncGhvdG9UYWJsZScsIHsgZmlsZU5hbWU6IGlkLCBjYW1lcmFJZDogY2FtZXJhSWQsIGRhdGVUYWtlbjogbnVsbCwgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGhvdG9TdGF0dXM6IHBob3RvU3RhdHVzZXMuRXhpc3RpbmcsIGNvbnRlbnQ6IGNvbnRlbnQgfSwgaWQpOyBcclxuICAgIH1cclxuICAgIFxyXG4gICAgZnVuY3Rpb24gZ2V0UGhvdG9zKCkge1xyXG5cclxuICAgICAgICB2YXIgcCA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xyXG5cclxuICAgICAgICAgICAgdmFyIHF1ZXJ5ID0gZGIuZnJvbSgncGhvdG9UYWJsZScpOyBcclxuICAgICAgICAgICAgcXVlcnkgPSBxdWVyeS53aGVyZSgncGhvdG9TdGF0dXMnLCAnPCcsIHBob3RvU3RhdHVzZXMuRGVsZXRlZCk7IFxyXG4gICAgICAgICAgICBxdWVyeS5saXN0KCkuZG9uZShmdW5jdGlvbihwaG90b3MpIHtcclxuICAgICAgICAgICAgICAgcmVzb2x2ZShwaG90b3MpOyBcclxuICAgICAgICAgICAgfSk7IFxyXG4gICAgICAgIH0pOyBcclxuXHJcbiAgICAgICAgcmV0dXJuIHA7IFxyXG4gICAgfVxyXG5cclxuICAgIC8vIHBlcmZvcm1zIGEgdmlydHVhbCBkZWxldGUgaGVyZSBcclxuICAgIGZ1bmN0aW9uIGRlbGV0ZVBob3RvKGlkKSB7IFxyXG5cclxuICAgICAgICB2YXIgcCA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xyXG5cclxuICAgICAgICAgICAgZmluZFBob3Rvc0J5RmlsZU5hbWUoaWQpLnRoZW4oZnVuY3Rpb24ocGhvdG9zKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAocGhvdG9zLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgcGhvdG8gPSBwaG90b3NbMF07IFxyXG4gICAgICAgICAgICAgICAgICAgIHBob3RvLnBob3RvU3RhdHVzID0gcGhvdG9TdGF0dXNlcy5EZWxldGVkOyBcclxuICAgICAgICAgICAgICAgICAgICBkYi5wdXQoJ3Bob3RvVGFibGUnLCBwaG90bywgaWQpOyBcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShwaG90byk7IFxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTsgXHJcbiAgICAgICAgfSk7IFxyXG5cclxuICAgICAgICByZXR1cm4gcDsgXHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gZmluZFBob3Rvc0J5RmlsZU5hbWUoZmlsZU5hbWUpIHtcclxuXHJcbiAgICAgICAgdmFyIHAgPSBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcclxuXHJcbiAgICAgICAgICAgIHZhciBxID0gZGIuZnJvbSgncGhvdG9UYWJsZScpO1xyXG4gICAgICAgICAgICBxID0gcS53aGVyZSgnZmlsZU5hbWUnLCAnPScsIGZpbGVOYW1lKTtcclxuICAgICAgICAgICAgcS5saXN0KCkuZG9uZShmdW5jdGlvbihwaG90b3MpIHtcclxuICAgICAgICAgICAgICAgIHJlc29sdmUocGhvdG9zKTsgXHJcbiAgICAgICAgICAgIH0pOyBcclxuICAgICAgICB9KTsgXHJcblxyXG4gICAgICAgIHJldHVybiBwOyBcclxuICAgIH1cclxuXHJcbiAgICAvLyBIZXJlIGNhbWVyYUlkIGlzIGEgdmFsaWQgSlF1ZXJ5IGNhbWVyYSBzZWxlY3Rvci4gXHJcbiAgICBmdW5jdGlvbiBmaW5kUGhvdG9zQnlDYW1lcmFJZChjYW1lcmFJZCkgeyAgXHJcblxyXG4gICAgICAgIHZhciBwID0gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XHJcblxyXG4gICAgICAgICAgICB2YXIgcSA9IGRiLmZyb20oJ3Bob3RvVGFibGUnKTtcclxuICAgICAgICAgICAgcSA9IHEud2hlcmUoJ2NhbWVyYUlkJywgJz0nLCBjYW1lcmFJZCk7XHJcbiAgICAgICAgICAgIC8vcSA9IHEud2hlcmUoJ3Bob3RvU3RhdHVzJywgJzwnLCBwaG90b1N0YXR1c2VzLkRlbGV0ZWQpOyBcclxuICAgICAgICAgICAgcS5saXN0KCkuZG9uZShmdW5jdGlvbihwaG90b3MpIHtcclxuXHJcbiAgICAgICAgICAgICAgICB2YXIgZmlsdGVyZWRQaG90b3MgPSBbXTsgXHJcbiAgICAgICAgICAgICAgICBwaG90b3MuZm9yRWFjaChmdW5jdGlvbihwaG90bykge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChwaG90by5waG90b1N0YXR1cyAhPSBwaG90b1N0YXR1c2VzLkRlbGV0ZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZmlsdGVyZWRQaG90b3MucHVzaChwaG90byk7IFxyXG4gICAgICAgICAgICAgICAgICAgIH0gICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgfSk7IFxyXG5cclxuICAgICAgICAgICAgICAgIHJlc29sdmUoZmlsdGVyZWRQaG90b3MpOyBcclxuICAgICAgICAgICAgfSk7IFxyXG4gICAgICAgIH0pOyBcclxuXHJcbiAgICAgICAgcmV0dXJuIHA7IFxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB7ICAgICAgICBcclxuICAgIFx0YWRkTmV3UGhvdG86IGFkZE5ld1Bob3RvLCBcclxuICAgICAgICBhZGRFeGlzdGluZ1Bob3RvOiBhZGRFeGlzdGluZ1Bob3RvLCBcclxuICAgICAgICBnZXRQaG90b3M6IGdldFBob3RvcywgXHJcbiAgICBcdGRlbGV0ZVBob3RvOiBkZWxldGVQaG90bywgXHJcbiAgICAgICAgZmluZFBob3Rvc0J5RmlsZU5hbWU6IGZpbmRQaG90b3NCeUZpbGVOYW1lLCBcclxuICAgICAgICBmaW5kUGhvdG9zQnlDYW1lcmFJZDogZmluZFBob3Rvc0J5Q2FtZXJhSWQgIFxyXG4gICAgfTtcclxuXHJcbn0oKSk7IFxyXG4iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
