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

	function displayCameraDialog(cameraId, containerId, saveSnapshotCallback) { 

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

		var iOS = cameraUtils.isIOS(); 
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
				photoDB.addExistingPhoto(cameraId, existingPhoto); 
			}); 	
		}

		populatePhotoList(photoContainerId, cameraId); 
	}

	function populatePhotoList(photoContainerId, cameraId) { 
		// populate the list of all photos for given camera  
		photoDB.findPhotosByCameraId(cameraId).then(function(photos) { 

		    $.each(photos, function() { 
				addPhotoToList(photoContainerId, this); 
			}); 
		}); 
	}

	function saveSnapshot(cameraId, photoContainerId, imgData) {

		var fileName = cameraUtils.newGuid() + ".png"; 
		var imgObject = { fileName: fileName, content: imgData, cameraId: cameraId };

		photoDB.addNewPhoto(fileName, cameraId, imgData);

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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNhbWVyYS1kaWFsb2cuanMiLCJjYW1lcmEtdWkuanMiLCJjYW1lcmEtdXRpbHMuanMiLCJjYW1lcmEuanMiLCJwaG90b0RCLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLElBQUEsZ0JBQUEsV0FBQTs7Q0FFQSxJQUFBLGNBQUEsRUFBQSxPQUFBLE1BQUEsT0FBQTtDQUNBLElBQUE7O0NBRUEsSUFBQSxRQUFBO0NBQ0EsSUFBQSxhQUFBLFlBQUE7O0NBRUEsU0FBQSxnQkFBQSxlQUFBLFVBQUEsYUFBQSxzQkFBQTs7RUFFQSxjQUFBLE9BQUEsQ0FBQSxTQUFBLFVBQUEsYUFBQSxVQUFBOztHQUVBLE9BQUEsU0FBQSxLQUFBO0lBQ0EsSUFBQSxJQUFBLElBQUEsT0FBQSxNQUFBO0lBQ0EsSUFBQSxTQUFBLElBQUE7O0lBRUEsT0FBQSxTQUFBLFNBQUEsU0FBQTs7UUFFQSxJQUFBLFVBQUE7U0FDQSxJQUFBLFVBQUEsUUFBQSxPQUFBO1NBQ0EsU0FBQSxVQUFBLGFBQUE7O2FBRUE7U0FDQSxRQUFBLEtBQUE7Ozs7SUFJQSxJQUFBLG1CQUFBLEdBQUEsTUFBQTtJQUNBLElBQUEsa0JBQUEsaUJBQUEsS0FBQTtJQUNBLGdCQUFBLFlBQUE7OztJQUdBLE9BQUEsY0FBQTs7O0tBR0EsVUFBQSxhQUFBOzs7Q0FHQSxTQUFBLHdCQUFBOztFQUVBLE9BQUEsQ0FBQTtXQUNBO2VBQ0E7ZUFDQTttQkFDQTtvQkFDQTttQkFDQTtlQUNBO2VBQ0E7bUJBQ0E7b0JBQ0E7bUJBQ0E7ZUFDQTtXQUNBO09BQ0EsVUFBQSxLQUFBOzs7Q0FHQSxTQUFBLG9CQUFBLFVBQUEsYUFBQSxzQkFBQTs7UUFFQSxnQkFBQSxLQUFBO1lBQ0EsT0FBQTtZQUNBLFNBQUEsRUFBQTtZQUNBLFVBQUE7WUFDQSxTQUFBLFNBQUEsV0FBQTs7YUFFQSxXQUFBOzs7SUFHQSxJQUFBLFNBQUEsVUFBQTs7SUFFQSxjQUFBLE9BQUEsS0FBQTtJQUNBLGFBQUEsT0FBQSxLQUFBO0lBQ0EsV0FBQSxPQUFBLEtBQUE7O2FBRUEsSUFBQSxPQUFBLFVBQUE7O2FBRUEsSUFBQSxZQUFBLEtBQUEsS0FBQTthQUNBLFVBQUEsTUFBQTs7O0lBR0EsU0FBQSxLQUFBLEtBQUE7SUFDQSxVQUFBLEtBQUEsS0FBQTs7YUFFQSxJQUFBLFFBQUEsT0FBQTtJQUNBLElBQUEsU0FBQSxPQUFBLFNBQUEsUUFBQTs7SUFFQSxNQUFBLGVBQUEsV0FBQTtLQUNBLElBQUEsWUFBQSxTQUFBLGFBQUE7TUFDQSxZQUFBLFlBQUE7Ozs7SUFJQSxVQUFBLGFBQUEsYUFBQTtLQUNBLEtBQUEsVUFBQSxRQUFBO0tBQ0EsT0FBQSxTQUFBO0tBQ0EsTUFBQSxZQUFBO0tBQ0EsTUFBQSxNQUFBLE9BQUEsSUFBQSxnQkFBQTs7S0FFQSxNQUFBLFVBQUEsT0FBQTtNQUNBLFFBQUEsS0FBQSxrQ0FBQTs7OztJQUlBLElBQUEsbUJBQUEsR0FBQSxNQUFBO0lBQ0EsSUFBQSxrQkFBQSxpQkFBQSxLQUFBO0lBQ0EsZ0JBQUEsWUFBQTs7WUFFQSxVQUFBLFNBQUEsV0FBQTthQUNBOztZQUVBLFVBQUE7WUFDQSxTQUFBLENBQUE7Z0JBQ0EsT0FBQTtnQkFDQSxNQUFBO2dCQUNBLFVBQUE7Z0JBQ0EsUUFBQSxVQUFBLGNBQUE7UUFDQTs7ZUFFQTtnQkFDQSxPQUFBO2dCQUNBLE1BQUE7Z0JBQ0EsVUFBQTtnQkFDQSxRQUFBLFVBQUEsY0FBQTtRQUNBOztlQUVBO2dCQUNBLE9BQUE7Z0JBQ0EsTUFBQTtnQkFDQSxVQUFBO2dCQUNBLFFBQUEsVUFBQSxjQUFBOztRQUVBLElBQUEsVUFBQTtTQUNBLElBQUEsVUFBQSxPQUFBLFVBQUE7U0FDQSxTQUFBLFVBQUEsYUFBQTs7YUFFQTtTQUNBLFFBQUEsS0FBQTs7O29CQUdBLGFBQUE7O2VBRUE7Z0JBQ0EsT0FBQTtnQkFDQSxNQUFBO2dCQUNBLFVBQUE7Z0JBQ0EsUUFBQSxVQUFBLGNBQUE7b0JBQ0EsYUFBQTs7Ozs7O0NBTUEsU0FBQSxzQkFBQTtFQUNBLE9BQUEsWUFBQTtFQUNBLFFBQUEsWUFBQTs7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QSxnQkFBQSxFQUFBLEtBQUEsR0FBQSxVQUFBLEdBQUEsU0FBQTs7QUFFQSxJQUFBLFdBQUEsV0FBQTs7Q0FFQSxJQUFBOztJQUVBOztJQUVBLFNBQUEsT0FBQTs7RUFFQSxJQUFBLFNBQUE7SUFDQSxRQUFBLENBQUE7TUFDQSxNQUFBO01BQ0EsU0FBQSxDQUFBLEVBQUEsTUFBQSxjQUFBLEVBQUEsTUFBQTs7OztRQUlBLEtBQUEsSUFBQSxJQUFBLEdBQUEsUUFBQSxjQUFBOzs7SUFHQSxTQUFBLFlBQUEsSUFBQSxVQUFBLFNBQUE7OztRQUdBLEdBQUEsSUFBQSxjQUFBLEVBQUEsVUFBQSxJQUFBLFVBQUEsVUFBQSxXQUFBLE9BQUEsSUFBQTtnQ0FDQSxhQUFBLGNBQUEsS0FBQSxTQUFBLFdBQUE7OztJQUdBLFNBQUEsaUJBQUEsVUFBQSxTQUFBOztRQUVBLElBQUEsS0FBQSxZQUFBLFlBQUE7OztRQUdBLEdBQUEsSUFBQSxjQUFBLEVBQUEsVUFBQSxJQUFBLFVBQUEsVUFBQSxXQUFBO2dDQUNBLGFBQUEsY0FBQSxVQUFBLFNBQUEsV0FBQTs7O0lBR0EsU0FBQSxZQUFBOztRQUVBLElBQUEsSUFBQSxJQUFBLFFBQUEsU0FBQSxTQUFBLFFBQUE7O1lBRUEsSUFBQSxRQUFBLEdBQUEsS0FBQTtZQUNBLFFBQUEsTUFBQSxNQUFBLGVBQUEsS0FBQSxjQUFBO1lBQ0EsTUFBQSxPQUFBLEtBQUEsU0FBQSxRQUFBO2VBQ0EsUUFBQTs7OztRQUlBLE9BQUE7Ozs7SUFJQSxTQUFBLFlBQUEsSUFBQTs7UUFFQSxJQUFBLElBQUEsSUFBQSxRQUFBLFNBQUEsU0FBQSxRQUFBOztZQUVBLHFCQUFBLElBQUEsS0FBQSxTQUFBLFFBQUE7Z0JBQ0EsSUFBQSxPQUFBLFNBQUEsR0FBQTtvQkFDQSxJQUFBLFFBQUEsT0FBQTtvQkFDQSxNQUFBLGNBQUEsY0FBQTtvQkFDQSxHQUFBLElBQUEsY0FBQSxPQUFBOztvQkFFQSxRQUFBOzs7OztRQUtBLE9BQUE7OztJQUdBLFNBQUEscUJBQUEsVUFBQTs7UUFFQSxJQUFBLElBQUEsSUFBQSxRQUFBLFNBQUEsU0FBQSxRQUFBOztZQUVBLElBQUEsSUFBQSxHQUFBLEtBQUE7WUFDQSxJQUFBLEVBQUEsTUFBQSxZQUFBLEtBQUE7WUFDQSxFQUFBLE9BQUEsS0FBQSxTQUFBLFFBQUE7Z0JBQ0EsUUFBQTs7OztRQUlBLE9BQUE7OztJQUdBLFNBQUEscUJBQUEsVUFBQTs7UUFFQSxJQUFBLElBQUEsSUFBQSxRQUFBLFNBQUEsU0FBQSxRQUFBOztZQUVBLElBQUEsSUFBQSxHQUFBLEtBQUE7WUFDQSxJQUFBLEVBQUEsTUFBQSxZQUFBLEtBQUE7O1lBRUEsRUFBQSxPQUFBLEtBQUEsU0FBQSxRQUFBOztnQkFFQSxJQUFBLGlCQUFBO2dCQUNBLE9BQUEsUUFBQSxTQUFBLE9BQUE7b0JBQ0EsSUFBQSxNQUFBLGVBQUEsY0FBQSxTQUFBO3dCQUNBLGVBQUEsS0FBQTs7OztnQkFJQSxRQUFBOzs7O1FBSUEsT0FBQTs7O0lBR0EsT0FBQTtLQUNBLGFBQUE7UUFDQSxrQkFBQTtRQUNBLFdBQUE7S0FDQSxhQUFBO1FBQ0Esc0JBQUE7UUFDQSxzQkFBQTs7OztBQUlBIiwiZmlsZSI6ImNhbWVyYS5qcyIsInNvdXJjZXNDb250ZW50IjpbInZhciBjYW1lcmFEaWFsb2cgPSAoZnVuY3Rpb24oKSB7XHJcblxyXG5cdHZhciBjb25zdHJhaW50cyA9IHsgdmlkZW86IHRydWUsIGF1ZGlvOiBmYWxzZSB9OyBcclxuXHR2YXIgY2FsbGJhY2s7IFxyXG5cclxuXHR2YXIgJHZpZGVvLCAkY2FudmFzOyBcclxuXHR2YXIgJGJ0bkNhcHR1cmUsICRidG5SZXRha2UsICRidG5TYXZlOyBcclxuXHJcblx0ZnVuY3Rpb24gY29uZmlndXJlRm9ySU9TKGNhbWVyYUxpbmtJT1MsIGNhbWVyYUlkLCBjb250YWluZXJJZCwgc2F2ZVNuYXBzaG90Q2FsbGJhY2spIHtcclxuXHJcblx0XHRjYW1lcmFMaW5rSU9TLmNoYW5nZSgoZnVuY3Rpb24oY2FtZXJhSWQsIGNvbnRhaW5lcklkLCBjYWxsYmFjaykge1xyXG5cclxuXHRcdFx0cmV0dXJuIGZ1bmN0aW9uKGV2dCkge1xyXG5cdFx0XHRcdHZhciBmID0gZXZ0LnRhcmdldC5maWxlc1swXTsgXHJcblx0XHRcdFx0dmFyIHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKCk7XHJcblxyXG5cdFx0XHRcdHJlYWRlci5vbmxvYWQgPSBmdW5jdGlvbih0aGVGaWxlKSB7XHJcblxyXG5cdFx0XHQgICAgXHRpZiAoY2FsbGJhY2spIHtcclxuXHRcdFx0ICAgIFx0XHR2YXIgaW1nRGF0YSA9IHRoZUZpbGUudGFyZ2V0LnJlc3VsdDsgXHJcblx0XHRcdCAgICBcdFx0Y2FsbGJhY2soY2FtZXJhSWQsIGNvbnRhaW5lcklkLCBpbWdEYXRhKTsgXHJcblx0XHRcdCAgICBcdH1cclxuXHRcdFx0ICAgIFx0ZWxzZSB7XHJcblx0XHRcdCAgICBcdFx0Y29uc29sZS53YXJuKFwiQ2FsbGJhY2sgaXMgbm90IGRlZmluZWQhXCIpOyBcclxuXHRcdFx0ICAgIFx0fVxyXG5cdFx0XHRcdH07IFxyXG5cclxuXHRcdFx0XHR2YXIgJGNhbWVyYUNvbnRhaW5lciA9ICQoIFwiI1wiICsgY2FtZXJhSWQgKTtcclxuXHRcdFx0XHR2YXIgJHBob3RvQ29udGFpbmVyID0gJGNhbWVyYUNvbnRhaW5lci5maW5kKFwiLnBob3RvLWltYWdlc2V0XCIpO1xyXG5cdFx0XHRcdCRwaG90b0NvbnRhaW5lci5yZW1vdmVDbGFzcyhcImhpZGRlblwiKTtcdFx0XHRcclxuXHJcblx0XHRcdFx0Ly8gUmVhZCBpbiB0aGUgaW1hZ2UgZmlsZSBhcyBhIGRhdGEgVVJMLlxyXG5cdFx0XHRcdHJlYWRlci5yZWFkQXNEYXRhVVJMKGYpO1xyXG5cdFx0XHR9OyBcclxuXHJcblx0XHR9KShjYW1lcmFJZCwgY29udGFpbmVySWQsIHNhdmVTbmFwc2hvdENhbGxiYWNrKSk7IFxyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gZ2V0Q2FtZXJhVGVtcGxhdGVIdG1sKCkge1xyXG5cclxuXHRcdHJldHVybiBbJzxkaXYgaWQ9XCJjYW1lcmEtZGlhbG9nXCI+JywgXHJcblx0XHRcdCAgICAgICAgJzxmb3JtIG5hbWU9XCJjYW1lcmFGb3JtXCI+JyxcclxuXHRcdFx0ICAgICAgICAgICAgJzxpbWcgc3JjPVwiaW1nL3NwaW5uZXIuZ2lmXCIgY2xhc3M9XCJzcGlubmVyXCIgLz4nLCAgXHJcblx0XHRcdCAgICAgICAgICAgICc8ZGl2IGNsYXNzPVwicm93XCI+JyxcclxuXHRcdFx0ICAgICAgICAgICAgICAgICc8ZGl2IGNsYXNzPVwiY29sLXNtLTEyXCI+JyxcclxuXHRcdFx0ICAgICAgICAgICAgICAgIFx0Jzx2aWRlbyBpZD1cImRhdGFWaWRlb0lkXCIgYXV0b3BsYXkgc3R5bGU9XCJ3aWR0aDoxMDAlXCIgd2lkdGg9XCIxMDAlXCI+PC92aWRlbz4nLFxyXG5cdFx0XHQgICAgICAgICAgICAgICAgJzwvZGl2PicsXHJcblx0XHRcdCAgICAgICAgICAgICc8L2Rpdj4nLCBcclxuXHRcdFx0ICAgICAgICAgICAgJzxkaXYgY2xhc3M9XCJyb3dcIj4nLFxyXG5cdFx0XHQgICAgICAgICAgICAgICAgJzxkaXYgY2xhc3M9XCJjb2wtc20tMTJcIj4nLFxyXG5cdFx0XHQgICAgICAgICAgICAgICAgXHQnPGNhbnZhcyBpZD1cImNhbnZhc0lkXCIgY2xhc3M9XCJoaWRkZW5cIiBzdHlsZT1cIndpZHRoOjEwMCU7XCIgd2lkdGg9XCIxMDAlXCI+PC9jYW52YXM+JyxcclxuXHRcdFx0ICAgICAgICAgICAgICAgICc8L2Rpdj4nLFxyXG5cdFx0XHQgICAgICAgICAgICAnPC9kaXY+JywgXHJcblx0XHRcdCAgICAgICAgJzwvZm9ybT4nLFxyXG5cdFx0XHQgICAgJzwvZGl2PiddLmpvaW4oJ1xcbicpOyBcclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIGRpc3BsYXlDYW1lcmFEaWFsb2coY2FtZXJhSWQsIGNvbnRhaW5lcklkLCBzYXZlU25hcHNob3RDYWxsYmFjaykgeyBcclxuXHJcbiAgICAgICAgQm9vdHN0cmFwRGlhbG9nLnNob3coe1xyXG4gICAgICAgICAgICB0aXRsZTogJ1Rha2UgYSBwaG90bycsXHJcbiAgICAgICAgICAgIG1lc3NhZ2U6ICQoZ2V0Q2FtZXJhVGVtcGxhdGVIdG1sKCkpLCBcclxuICAgICAgICAgICAgY3NzQ2xhc3M6ICdsb2dpbi1kaWFsb2cnLCBcclxuICAgICAgICAgICAgb25zaG93bjogZnVuY3Rpb24oZGlhbG9nUmVmKSB7XHJcbiAgICAgICAgICAgIFx0XHJcbiAgICAgICAgICAgIFx0Y2FsbGJhY2sgPSBzYXZlU25hcHNob3RDYWxsYmFjazsgXHJcblxyXG4gICAgICAgICAgICBcdC8vIGluaXQgcmVmZXJlbmNlcyB0byBidXR0b25zIGZyb20gbW9kYWwgZm9vdGVyIFxyXG5cdFx0XHRcdHZhciBmb290ZXIgPSBkaWFsb2dSZWYuZ2V0TW9kYWxGb290ZXIoKTsgXHJcblxyXG5cdFx0XHRcdCRidG5DYXB0dXJlID0gZm9vdGVyLmZpbmQoXCIuYnRuLWNhcHR1cmVcIik7IFxyXG5cdFx0XHRcdCRidG5SZXRha2UgPSBmb290ZXIuZmluZChcIi5idG4tcmV0YWtlXCIpOyBcclxuXHRcdFx0XHQkYnRuU2F2ZSA9IGZvb3Rlci5maW5kKFwiLmJ0bi1zYXZlXCIpO1xyXG4gICAgICAgICAgICBcdFxyXG4gICAgICAgICAgICBcdHZhciBib2R5ID0gZGlhbG9nUmVmLmdldE1vZGFsQm9keSgpO1xyXG5cclxuICAgICAgICAgICAgXHR2YXIgY2hhbmdlQnRuID0gYm9keS5maW5kKFwiI2NoYW5nZUlkXCIpO1xyXG4gICAgICAgICAgICBcdGNoYW5nZUJ0bi5jbGljayhzd2FwVmlkZW9XaXRoQ2FudmFzKTtcclxuXHJcbiAgICAgICAgICAgIFx0Ly8gaW5pdCB2aWRlbyAmIGNhbnZhcyBoZXJlIFxyXG5cdFx0XHRcdCR2aWRlbyA9IGJvZHkuZmluZChcIiNkYXRhVmlkZW9JZFwiKTsgXHJcblx0XHRcdFx0JGNhbnZhcyA9IGJvZHkuZmluZChcIiNjYW52YXNJZFwiKTsgXHJcblxyXG4gICAgICAgICAgICBcdHZhciB2aWRlbyA9ICR2aWRlb1swXTtcclxuXHRcdFx0XHR2YXIgY2FudmFzID0gd2luZG93LmNhbnZhcyA9ICRjYW52YXNbMF07IFxyXG5cclxuXHRcdFx0XHR2aWRlby5vbmxvYWRlZGRhdGEgPSBmdW5jdGlvbigpIHtcclxuXHRcdFx0XHRcdGlmICgkYnRuQ2FwdHVyZS5oYXNDbGFzcyhcImRpc2FibGVkXCIpKSB7XHJcblx0XHRcdFx0XHRcdCRidG5DYXB0dXJlLnJlbW92ZUNsYXNzKFwiZGlzYWJsZWRcIik7IFxyXG5cdFx0XHRcdFx0fVxyXG5cdFx0XHRcdH1cclxuXHJcblx0XHRcdFx0bmF2aWdhdG9yLm1lZGlhRGV2aWNlcy5nZXRVc2VyTWVkaWEoY29uc3RyYWludHMpXHJcblx0XHRcdFx0LnRoZW4oZnVuY3Rpb24gKHN0cmVhbSkge1xyXG5cdFx0XHRcdFx0d2luZG93LnN0cmVhbSA9IHN0cmVhbTsgXHJcblx0XHRcdFx0XHR2aWRlby5zcmNPYmplY3QgPSBzdHJlYW07XHJcblx0XHRcdFx0XHR2aWRlby5zcmMgPSB3aW5kb3cuVVJMLmNyZWF0ZU9iamVjdFVSTChzdHJlYW0pOyBcclxuXHRcdFx0XHR9KVxyXG5cdFx0XHRcdC5jYXRjaChmdW5jdGlvbiAoZXJyb3IpIHtcclxuXHRcdFx0XHQgXHRjb25zb2xlLndhcm4oJ25hdmlnYXRvci5nZXRVc2VyTWVkaWEgZXJyb3I6ICcsIGVycm9yKTtcclxuXHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0Ly8gZGlzcGxheSB0aGUgY29udGFpbmVyPyBcclxuXHRcdFx0XHR2YXIgJGNhbWVyYUNvbnRhaW5lciA9ICQoIFwiI1wiICsgY2FtZXJhSWQgKTtcclxuXHRcdFx0XHR2YXIgJHBob3RvQ29udGFpbmVyID0gJGNhbWVyYUNvbnRhaW5lci5maW5kKFwiLnBob3RvLWltYWdlc2V0XCIpO1xyXG5cdFx0XHRcdCRwaG90b0NvbnRhaW5lci5yZW1vdmVDbGFzcyhcImhpZGRlblwiKTsgXHJcbiAgICAgICAgICAgIH0sIFxyXG4gICAgICAgICAgICBvbmhpZGRlbjogZnVuY3Rpb24oZGlhbG9nUmVmKSB7XHJcbiAgICAgICAgICAgIFx0c3RvcENhbWVyYSgpOyBcclxuICAgICAgICAgICAgfSwgXHJcbiAgICAgICAgICAgIGNzc0NsYXNzOiAnbG9naW4tZGlhbG9nJywgXHJcbiAgICAgICAgICAgIGJ1dHRvbnM6IFt7XHJcbiAgICAgICAgICAgICAgICBsYWJlbDogJ1JldGFrZScsXHJcbiAgICAgICAgICAgICAgICBpY29uOiAnZ2x5cGhpY29uIGdseXBoaWNvbi1zb3J0JyxcclxuICAgICAgICAgICAgICAgIGNzc0NsYXNzOiAnYnRuIGJ0bi1wcmltYXJ5IHB1bGwtbGVmdCBoaWRkZW4gYnRuLXJldGFrZScsXHJcbiAgICAgICAgICAgICAgICBhY3Rpb246IGZ1bmN0aW9uIChkaWFsb2dJdHNlbGYpIHtcclxuXHRcdFx0ICAgIFx0c3dhcFZpZGVvV2l0aENhbnZhcygpOyBcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSwge1xyXG4gICAgICAgICAgICAgICAgbGFiZWw6ICdDYXB0dXJlIFNuYXBzaG90JyxcclxuICAgICAgICAgICAgICAgIGljb246ICdnbHlwaGljb24gZ2x5cGhpY29uLWNhbWVyYScsXHJcbiAgICAgICAgICAgICAgICBjc3NDbGFzczogJ2J0biBidG4tcHJpbWFyeSBwdWxsLWxlZnQgZGlzYWJsZWQgYnRuLWNhcHR1cmUnLFxyXG4gICAgICAgICAgICAgICAgYWN0aW9uOiBmdW5jdGlvbiAoZGlhbG9nSXRzZWxmKSB7XHJcblx0XHRcdCAgICBcdGNhcHR1cmVTbmFwc2hvdCgpOyBcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSwge1xyXG4gICAgICAgICAgICAgICAgbGFiZWw6ICdTYXZlJyxcclxuICAgICAgICAgICAgICAgIGljb246ICdnbHlwaGljb24gZ2x5cGhpY29uLW9rJyxcclxuICAgICAgICAgICAgICAgIGNzc0NsYXNzOiAnYnRuLXByaW1hcnkgaGlkZGVuIGJ0bi1zYXZlJyxcclxuICAgICAgICAgICAgICAgIGFjdGlvbjogZnVuY3Rpb24gKGRpYWxvZ0l0c2VsZikge1xyXG5cclxuXHRcdFx0ICAgIFx0aWYgKGNhbGxiYWNrKSB7XHJcblx0XHRcdCAgICBcdFx0dmFyIGltZ0RhdGEgPSBjYW52YXMudG9EYXRhVVJMKFwiaW1hZ2UvcG5nXCIpOyBcclxuXHRcdFx0ICAgIFx0XHRjYWxsYmFjayhjYW1lcmFJZCwgY29udGFpbmVySWQsIGltZ0RhdGEpOyBcclxuXHRcdFx0ICAgIFx0fVxyXG5cdFx0XHQgICAgXHRlbHNlIHtcclxuXHRcdFx0ICAgIFx0XHRjb25zb2xlLndhcm4oXCJDYWxsYmFjayBpcyBub3QgZGVmaW5lZCFcIik7IFxyXG5cdFx0XHQgICAgXHR9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGRpYWxvZ0l0c2VsZi5jbG9zZSgpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9LCB7XHJcbiAgICAgICAgICAgICAgICBsYWJlbDogJ0NhbmNlbCcsXHJcbiAgICAgICAgICAgICAgICBpY29uOiAnZ2x5cGhpY29uIGdseXBoaWNvbi1yZW1vdmUnLFxyXG4gICAgICAgICAgICAgICAgY3NzQ2xhc3M6ICdidG4tZGFuZ2VyJyxcclxuICAgICAgICAgICAgICAgIGFjdGlvbjogZnVuY3Rpb24gKGRpYWxvZ0l0c2VsZikge1xyXG4gICAgICAgICAgICAgICAgICAgIGRpYWxvZ0l0c2VsZi5jbG9zZSgpOyBcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfV1cclxuICAgICAgICB9KTtcclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIHN3YXBWaWRlb1dpdGhDYW52YXMoKSB7XHJcblx0XHQkdmlkZW8udG9nZ2xlQ2xhc3MoXCJoaWRkZW5cIik7XHJcblx0XHQkY2FudmFzLnRvZ2dsZUNsYXNzKFwiaGlkZGVuXCIpOyBcclxuXHJcblx0XHQkYnRuQ2FwdHVyZS50b2dnbGVDbGFzcyhcImhpZGRlblwiKTsgXHJcblx0XHQkYnRuUmV0YWtlLnRvZ2dsZUNsYXNzKFwiaGlkZGVuXCIpOyAgXHJcblx0fVxyXG5cclxuICAgIGZ1bmN0aW9uIGNhcHR1cmVTbmFwc2hvdCgpIHsgXHJcblxyXG5cdFx0aWYgKCR2aWRlbyAmJiAkY2FudmFzKSB7XHJcblx0XHRcdHZhciB2aWRlbyA9ICR2aWRlb1swXTsgXHJcblx0XHRcdHZhciBjYW52YXMgPSAkY2FudmFzWzBdOyBcclxuXHJcblx0XHRcdGNhbnZhcy53aWR0aCA9IHZpZGVvLnZpZGVvV2lkdGg7XHJcbiAgXHRcdFx0Y2FudmFzLmhlaWdodCA9IHZpZGVvLnZpZGVvSGVpZ2h0O1xyXG5cdFx0XHRjYW52YXMuZ2V0Q29udGV4dCgnMmQnKS5kcmF3SW1hZ2UodmlkZW8sIDAsIDAsIGNhbnZhcy53aWR0aCwgY2FudmFzLmhlaWdodCk7XHJcblxyXG5cdFx0XHRpZiAoJGJ0blNhdmUuaGFzQ2xhc3MoXCJoaWRkZW5cIikpIHtcclxuXHRcdFx0XHQkYnRuU2F2ZS5yZW1vdmVDbGFzcyhcImhpZGRlblwiKTsgXHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHN3YXBWaWRlb1dpdGhDYW52YXMoKTsgXHRcdFx0XHJcblx0XHR9IFxyXG4gICAgfSBcclxuXHJcbiAgICBmdW5jdGlvbiBzdG9wQ2FtZXJhKCkge1xyXG5cdFx0dmFyIHZpZGVvID0gJHZpZGVvWzBdO1xyXG5cdFx0dmFyIHN0cmVhbSA9IHZpZGVvLnNyY09iamVjdDsgXHJcblx0XHRcclxuXHRcdGlmIChzdHJlYW0pIHtcclxuXHRcdFx0c3RyZWFtLmdldFRyYWNrcygpWzBdLnN0b3AoKTsgXHJcblx0XHRcdHZpZGVvLnNyYyA9IHZpZGVvLnNyY09iamVjdCA9IFwiXCI7ICBcclxuXHRcdH1cclxuXHR9XHJcblxyXG4gICAgcmV0dXJuIHsgICAgICAgIFxyXG4gICAgXHRkaXNwbGF5Q2FtZXJhRGlhbG9nOiBkaXNwbGF5Q2FtZXJhRGlhbG9nLCBcclxuICAgIFx0Y29uZmlndXJlRm9ySU9TOiBjb25maWd1cmVGb3JJT1MgXHJcbiAgICB9O1xyXG5cclxufSgpKTsgXHJcbiIsInZhciBjYW1lcmFVSSA9IChmdW5jdGlvbigpIHtcclxuXHJcblx0dmFyIHBob3RvU2l6ZSA9IHsgd2lkdGg6IDE1MCwgaGVpZ2h0OiAxMTMgfTtcclxuXHJcblx0ZnVuY3Rpb24gY29uZmlndXJlQ2FtZXJhcyhjYW1lcmFEZXRhaWxzKSB7IFxyXG5cdFx0Y2FtZXJhRGV0YWlscy5mb3JFYWNoKGZ1bmN0aW9uKGNhbWVyYURldGFpbCkgeyBcclxuXHJcblx0XHRcdHZhciBjYW1lcmFJZCA9IGNhbWVyYURldGFpbC5jYW1lcmFJZDsgXHJcblx0XHRcdHZhciBleGlzdGluZ1Bob3RvcyA9IGNhbWVyYURldGFpbC5leGlzdGluZ1Bob3RvczsgXHJcblxyXG5cdFx0ICAgIGNvbmZpZ3VyZUNhbWVyYShjYW1lcmFJZCwgZXhpc3RpbmdQaG90b3MpOyBcclxuXHRcdH0pOyBcclxuXHR9XHJcblxyXG4gICAgZnVuY3Rpb24gY29uZmlndXJlQ2FtZXJhKGNhbWVyYUlkLCBleGlzdGluZ1Bob3Rvcykge1xyXG5cclxuXHRcdHZhciAkY2FtZXJhQ29udGFpbmVyID0gJCggXCIjXCIgKyBjYW1lcmFJZCApOyBcclxuXHRcdHZhciAkY2FtZXJhTGluayA9ICRjYW1lcmFDb250YWluZXIuZmluZChcIi5jYW1lcmEtbGlua1wiKTsgXHJcblx0XHR2YXIgJHBob3RvQ29udGFpbmVyID0gJGNhbWVyYUNvbnRhaW5lci5maW5kKFwiLnBob3RvLWltYWdlc2V0XCIpOyBcclxuXHRcdHZhciBwaG90b0NvbnRhaW5lcklkID0gJHBob3RvQ29udGFpbmVyLmF0dHIoXCJpZFwiKTtcclxuXHJcblx0XHR2YXIgJGNhbWVyYUxpbmtJT1MgPSAkY2FtZXJhQ29udGFpbmVyLmZpbmQoXCIuY2FtZXJhLWxpbmstaW9zXCIpOyBcclxuXHJcblx0XHR2YXIgaU9TID0gY2FtZXJhVXRpbHMuaXNJT1MoKTsgXHJcblx0XHR2YXIgZ2V0RGlzcGxheVZhbHVlID0gZnVuY3Rpb24oaXNWaXNpYmxlKSB7XHJcblx0XHRcdHJldHVybiBpc1Zpc2libGU/IFwiXCIgOiBcIm5vbmVcIjsgXHJcblx0XHR9OyBcclxuXHRcdCRjYW1lcmFMaW5rSU9TLmNzcyhcImRpc3BsYXlcIiwgZ2V0RGlzcGxheVZhbHVlKGlPUykpOyBcclxuXHRcdCRjYW1lcmFMaW5rLmNzcyhcImRpc3BsYXlcIiwgZ2V0RGlzcGxheVZhbHVlKCFpT1MpKTsgXHJcblxyXG5cdFx0aWYgKHBob3RvQ29udGFpbmVySWQpIHtcclxuXHRcdFx0Y2FtZXJhRGlhbG9nLmNvbmZpZ3VyZUZvcklPUygkY2FtZXJhTGlua0lPUywgY2FtZXJhSWQsIHBob3RvQ29udGFpbmVySWQsIHNhdmVTbmFwc2hvdCk7IFxyXG5cclxuXHRcdFx0JGNhbWVyYUxpbmsuY2xpY2soZnVuY3Rpb24oKSB7IFxyXG5cdFx0XHRcdGNhbWVyYURpYWxvZy5kaXNwbGF5Q2FtZXJhRGlhbG9nKGNhbWVyYUlkLCBwaG90b0NvbnRhaW5lcklkLCBzYXZlU25hcHNob3QpOyBcclxuXHRcdFx0fSk7IFxyXG5cdFx0fVxyXG5cclxuXHRcdGlmIChleGlzdGluZ1Bob3RvcyAmJiBleGlzdGluZ1Bob3Rvcy5sZW5ndGggPiAwKSB7XHJcblx0XHRcdGV4aXN0aW5nUGhvdG9zLmZvckVhY2goZnVuY3Rpb24oZXhpc3RpbmdQaG90bykge1xyXG5cdFx0XHRcdHBob3RvREIuYWRkRXhpc3RpbmdQaG90byhjYW1lcmFJZCwgZXhpc3RpbmdQaG90byk7IFxyXG5cdFx0XHR9KTsgXHRcclxuXHRcdH1cclxuXHJcblx0XHRwb3B1bGF0ZVBob3RvTGlzdChwaG90b0NvbnRhaW5lcklkLCBjYW1lcmFJZCk7IFxyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gcG9wdWxhdGVQaG90b0xpc3QocGhvdG9Db250YWluZXJJZCwgY2FtZXJhSWQpIHsgXHJcblx0XHQvLyBwb3B1bGF0ZSB0aGUgbGlzdCBvZiBhbGwgcGhvdG9zIGZvciBnaXZlbiBjYW1lcmEgIFxyXG5cdFx0cGhvdG9EQi5maW5kUGhvdG9zQnlDYW1lcmFJZChjYW1lcmFJZCkudGhlbihmdW5jdGlvbihwaG90b3MpIHsgXHJcblxyXG5cdFx0ICAgICQuZWFjaChwaG90b3MsIGZ1bmN0aW9uKCkgeyBcclxuXHRcdFx0XHRhZGRQaG90b1RvTGlzdChwaG90b0NvbnRhaW5lcklkLCB0aGlzKTsgXHJcblx0XHRcdH0pOyBcclxuXHRcdH0pOyBcclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIHNhdmVTbmFwc2hvdChjYW1lcmFJZCwgcGhvdG9Db250YWluZXJJZCwgaW1nRGF0YSkge1xyXG5cclxuXHRcdHZhciBmaWxlTmFtZSA9IGNhbWVyYVV0aWxzLm5ld0d1aWQoKSArIFwiLnBuZ1wiOyBcclxuXHRcdHZhciBpbWdPYmplY3QgPSB7IGZpbGVOYW1lOiBmaWxlTmFtZSwgY29udGVudDogaW1nRGF0YSwgY2FtZXJhSWQ6IGNhbWVyYUlkIH07XHJcblxyXG5cdFx0cGhvdG9EQi5hZGROZXdQaG90byhmaWxlTmFtZSwgY2FtZXJhSWQsIGltZ0RhdGEpO1xyXG5cclxuXHRcdGFkZFBob3RvVG9MaXN0KHBob3RvQ29udGFpbmVySWQsIGltZ09iamVjdCk7IFxyXG5cdH0gXHJcblxyXG5cdGZ1bmN0aW9uIGFkZFBob3RvVG9MaXN0KHBob3RvQ29udGFpbmVySWQsIGltYWdlT2JqZWN0KSB7XHJcblxyXG5cdFx0dmFyICRpbWFnZXNEaXYgPSAkKFwiI1wiICsgcGhvdG9Db250YWluZXJJZCk7XHJcblx0XHR2YXIgJGltZ0RpdiA9ICQoJzxkaXYgLz4nKS5hZGRDbGFzcyhcImltZ1wiKS5jc3MoXCJoZWlnaHRcIiwgcGhvdG9TaXplLmhlaWdodCArIFwicHhcIik7IFxyXG5cdFx0dmFyICRkZWxEaXYgPSAkKCc8ZGl2IC8+JykuYWRkQ2xhc3MoXCJkZWxcIikuYXR0cihcImRhdGEtaWRcIiwgaW1hZ2VPYmplY3QuZmlsZU5hbWUpOyBcclxuXHRcdHZhciAkaWNvbiA9ICQoJzxpIGFyaWEtaGlkZGVuPVwidHJ1ZVwiIC8+JykuYWRkQ2xhc3MoXCJmYSBmYS10cmFzaC1vXCIpOyBcclxuXHJcblx0XHQkZGVsRGl2LmFwcGVuZCgkaWNvbik7IFxyXG5cclxuXHRcdCRpbWdEaXYuY2xpY2soZnVuY3Rpb24oZXZ0KSB7IFxyXG5cdFx0XHRldnQuc3RvcFByb3BhZ2F0aW9uKCk7IFxyXG5cclxuXHRcdFx0dmFyICRwaWMgPSAkKCc8aW1nIHN0eWxlPVwid2lkdGg6IDEwMCVcIiB3aWR0aD1cIjEwMCVcIiAvPicpLmF0dHIoJ3NyYycsIGltYWdlT2JqZWN0LmNvbnRlbnQpO1xyXG5cdCAgICAgICAgXHJcblx0ICAgICAgICBCb290c3RyYXBEaWFsb2cuc2hvdyh7XHJcblx0ICAgICAgICAgICAgdGl0bGU6ICdQaG90byBQcmV2aWV3JyxcclxuXHQgICAgICAgICAgICBtZXNzYWdlOiAkcGljLFxyXG5cdCAgICAgICAgICAgIGNzc0NsYXNzOiAnbG9naW4tZGlhbG9nJywgXHJcblx0ICAgICAgICAgICAgYnV0dG9uczogW3tcclxuXHQgICAgICAgICAgICAgICAgbGFiZWw6ICdPSycsXHJcblx0ICAgICAgICAgICAgICAgIGNzc0NsYXNzOiAnYnRuLXByaW1hcnknLFxyXG5cdCAgICAgICAgICAgICAgICBhY3Rpb246IGZ1bmN0aW9uKGRpYWxvZ1JlZil7XHJcblx0ICAgICAgICAgICAgICAgICAgICBkaWFsb2dSZWYuY2xvc2UoKTtcclxuXHQgICAgICAgICAgICAgICAgfVxyXG5cdCAgICAgICAgICAgIH1dXHJcblx0ICAgICAgICB9KTsgXHJcblx0XHR9KTsgXHJcblxyXG5cdFx0JGRlbERpdi5jbGljayhmdW5jdGlvbihldnQpIHsgXHJcblx0XHQgICAgZXZ0LnN0b3BQcm9wYWdhdGlvbigpOyBcclxuXHJcblx0XHQgICAgdmFyIGltYWdlSWQgPSBpbWFnZU9iamVjdC5maWxlTmFtZTsgXHJcblx0ICAgICAgICBpZiAoY29uZmlybSgnQXJlIHlvdSBzdXJlPycpID09IHRydWUpIHtcclxuXHJcblx0ICAgICAgICAgICAgdmFyICRkZWxJbWcgPSAkKCdkaXZbZGF0YS1pZD1cIicgKyBpbWFnZUlkICsnXCJdJyk7XHJcblx0ICAgICAgICAgICAgdmFyICRwaG90byA9ICRkZWxJbWcucGFyZW50KCk7IFxyXG5cclxuXHRcdFx0XHR2YXIgJHBob3RvQ29udGFpbmVyID0gJHBob3RvLmNsb3Nlc3QoJy5waG90by1pbWFnZXNldCcpOyBcclxuXHRcdFx0XHR2YXIgJHBob3RvQ29udGFpbmVySW1hZ2VzID0gJHBob3RvQ29udGFpbmVyLmZpbmQoJ2ltZycpOyBcclxuXHRcdFx0XHR2YXIgcmVtYWluaW5nSW1hZ2VzQ291bnQgPSAkcGhvdG9Db250YWluZXJJbWFnZXMubGVuZ3RoIC0gMTsgXHQvLyBleGNsdWRlIHRoZSBjdXJyZW50IG9uZSB3aGljaCBpcyBiZWluZyBkZWxldGVkIFxyXG5cclxuXHQgICAgICAgICAgICAkcGhvdG8ucmVtb3ZlKCk7IFxyXG5cclxuXHQgICAgICAgICAgICBwaG90b0RCLmRlbGV0ZVBob3RvKGltYWdlSWQpXHJcblx0ICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24ocGhvdG8pIHtcclxuXHJcblx0XHRcdFx0XHQvLyBubyBpbWFnZXMgLT4gaGlkZSB0aGUgY29udGFpbmVyIChub3RoaW5nIHRvIHNob3cpIFxyXG5cdCAgICAgICAgICAgIFx0aWYgKHJlbWFpbmluZ0ltYWdlc0NvdW50ID09IDApIHsgXHJcblx0XHRcdFx0XHRcdCRwaG90b0NvbnRhaW5lci5hZGRDbGFzcyhcImhpZGRlblwiKTsgXHJcblx0ICAgICAgICAgICAgXHR9XHJcblx0ICAgICAgICAgICAgfSk7IFxyXG5cdCAgICAgICAgfVxyXG5cdFx0fSk7IFxyXG5cclxuXHRcdCRpbWdEaXYuYXBwZW5kKCRkZWxEaXYpOyBcclxuXHRcdCRpbWdEaXYuYXBwZW5kKCQoXCI8aW1nIC8+XCIpLmF0dHIoXCJzcmNcIiwgaW1hZ2VPYmplY3QuY29udGVudCkuYXR0cihcIndpZHRoXCIsIHBob3RvU2l6ZS53aWR0aCkuYXR0cihcImhlaWdodFwiLCBwaG90b1NpemUuaGVpZ2h0KSk7IFxyXG5cclxuXHRcdCRpbWFnZXNEaXYuYXBwZW5kKCRpbWdEaXYpOyBcclxuXHR9XHJcblxyXG5cdHJldHVybiB7ICAgICAgICBcclxuICAgIFx0Y29uZmlndXJlQ2FtZXJhczogY29uZmlndXJlQ2FtZXJhcywgXHJcbiAgICBcdGNvbmZpZ3VyZUNhbWVyYTogY29uZmlndXJlQ2FtZXJhIFxyXG4gICAgfTtcclxuXHJcbn0oKSk7ICIsInZhciBjYW1lcmFVdGlscyA9IChmdW5jdGlvbigpIHtcclxuXHJcbiBcdGZ1bmN0aW9uIFM0KCkge1xyXG4gICAgICAgIHJldHVybiAoKCgxK01hdGgucmFuZG9tKCkpKjB4MTAwMDApfDApLnRvU3RyaW5nKDE2KS5zdWJzdHJpbmcoMSk7IFxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIG5ld0d1aWQoKSB7XHJcblxyXG5cdFx0Ly8gdGhlbiB0byBjYWxsIGl0LCBwbHVzIHN0aXRjaCBpbiAnNCcgaW4gdGhlIHRoaXJkIGdyb3VwXHJcblx0XHR2YXIgZ3VpZCA9IChTNCgpICsgUzQoKSArIFwiLVwiICsgUzQoKSArIFwiLTRcIiArIFM0KCkuc3Vic3RyKDAsMykgKyBcIi1cIiArIFM0KCkgKyBcIi1cIiArIFM0KCkgKyBTNCgpICsgUzQoKSkudG9Mb3dlckNhc2UoKTtcclxuXHRcdHJldHVybiBndWlkOyBcclxuICAgIH0gXHJcblxyXG4gICAgZnVuY3Rpb24gaXNJT1MoKSB7IFxyXG5cdFx0dmFyIGlPUyA9IFsnaVBhZCcsICdpUGhvbmUnLCAnaVBvZCddLmluZGV4T2YobmF2aWdhdG9yLnBsYXRmb3JtKSA+PSAwOyBcclxuXHRcdHJldHVybiBpT1M7IFxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB7IFxyXG4gICAgXHRuZXdHdWlkOiBuZXdHdWlkLCBcclxuICAgIFx0aXNJT1M6IGlzSU9TIFxyXG4gICAgfTtcclxuXHJcbn0oKSk7IFxyXG4iLCJ2YXIgQ2FtZXJhID0gKGZ1bmN0aW9uKCkgeyBcclxuXHJcblx0ZnVuY3Rpb24gQ2FtZXJhKGNhbWVyYUlkLCBleGlzdGluZ1Bob3Rvcykge1xyXG5cdFx0dGhpcy5jYW1lcmFJZCA9IGNhbWVyYUlkOyBcclxuXHRcdHRoaXMuZXhpc3RpbmdQaG90b3MgPSBleGlzdGluZ1Bob3RvczsgXHJcblxyXG5cdFx0Y2FtZXJhVUkuY29uZmlndXJlQ2FtZXJhKGNhbWVyYUlkLCBleGlzdGluZ1Bob3Rvcyk7IFxyXG5cdH1cclxuXHJcblx0Q2FtZXJhLnByb3RvdHlwZS5nZXRQaG90b3MgPSBmdW5jdGlvbigpIHtcclxuXHRcdFxyXG5cdFx0cmV0dXJuIHBob3RvREIuZmluZFBob3Rvc0J5Q2FtZXJhSWQodGhpcy5jYW1lcmFJZCk7IFxyXG5cdH07IFxyXG5cclxuXHRyZXR1cm4gQ2FtZXJhOyBcclxufSkoKTtcclxuXHJcbiIsInZhciBwaG90b1N0YXR1c2VzID0geyBOZXc6IDAsIEV4aXN0aW5nOiAxLCBEZWxldGVkOiAyIH07IFxyXG5cclxudmFyIHBob3RvREIgPSAoZnVuY3Rpb24oKSB7XHJcblxyXG5cdHZhciBkYjsgXHJcblxyXG4gICAgaW5pdCgpOyBcclxuXHJcbiAgICBmdW5jdGlvbiBpbml0KCkgeyBcclxuXHJcblx0XHR2YXIgc2NoZW1hID0ge1xyXG5cdFx0ICBzdG9yZXM6IFt7XHJcblx0XHQgICAgbmFtZTogJ3Bob3RvVGFibGUnLFxyXG5cdFx0ICAgIGluZGV4ZXM6IFt7IG5hbWU6ICdmaWxlTmFtZScgfSwgeyBuYW1lOiAnY2FtZXJhSWQnIH1dXHJcblx0XHQgIH1dXHJcblx0XHR9OyBcclxuXHJcbiAgICAgICAgZGIgPSBuZXcgeWRuLmRiLlN0b3JhZ2UoJ01NU1Bob3RvREInLCBzY2hlbWEpOyBcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBhZGROZXdQaG90byhpZCwgY2FtZXJhSWQsIGNvbnRlbnQpIHsgXHJcblxyXG4gICAgICAgIC8vIHdlIGFzc3VtZSBoZXJlIHRoYXQgaWQgKGZpbGVOYW1lKSBpcyB1bmlxdWUgXHJcbiAgICAgICAgZGIucHV0KCdwaG90b1RhYmxlJywgeyBmaWxlTmFtZTogaWQsIGNhbWVyYUlkOiBjYW1lcmFJZCwgZGF0ZVRha2VuOiBTdHJpbmcobmV3IERhdGUoKSksIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBob3RvU3RhdHVzOiBwaG90b1N0YXR1c2VzLk5ldywgY29udGVudDogY29udGVudCB9LCBpZCk7IFxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGFkZEV4aXN0aW5nUGhvdG8oY2FtZXJhSWQsIGNvbnRlbnQpIHsgIFxyXG5cclxuICAgICAgICB2YXIgaWQgPSBjYW1lcmFVdGlscy5uZXdHdWlkKCkgKyBcIi5wbmdcIjsgXHJcblxyXG4gICAgICAgIC8vIHdlIGFzc3VtZSBoZXJlIHRoYXQgaWQgKGZpbGVOYW1lKSBpcyB1bmlxdWUgXHJcbiAgICAgICAgZGIucHV0KCdwaG90b1RhYmxlJywgeyBmaWxlTmFtZTogaWQsIGNhbWVyYUlkOiBjYW1lcmFJZCwgZGF0ZVRha2VuOiBudWxsLCBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwaG90b1N0YXR1czogcGhvdG9TdGF0dXNlcy5FeGlzdGluZywgY29udGVudDogY29udGVudCB9LCBpZCk7IFxyXG4gICAgfVxyXG4gICAgXHJcbiAgICBmdW5jdGlvbiBnZXRQaG90b3MoKSB7XHJcblxyXG4gICAgICAgIHZhciBwID0gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XHJcblxyXG4gICAgICAgICAgICB2YXIgcXVlcnkgPSBkYi5mcm9tKCdwaG90b1RhYmxlJyk7IFxyXG4gICAgICAgICAgICBxdWVyeSA9IHF1ZXJ5LndoZXJlKCdwaG90b1N0YXR1cycsICc8JywgcGhvdG9TdGF0dXNlcy5EZWxldGVkKTsgXHJcbiAgICAgICAgICAgIHF1ZXJ5Lmxpc3QoKS5kb25lKGZ1bmN0aW9uKHBob3Rvcykge1xyXG4gICAgICAgICAgICAgICByZXNvbHZlKHBob3Rvcyk7IFxyXG4gICAgICAgICAgICB9KTsgXHJcbiAgICAgICAgfSk7IFxyXG5cclxuICAgICAgICByZXR1cm4gcDsgXHJcbiAgICB9XHJcblxyXG4gICAgLy8gcGVyZm9ybXMgYSB2aXJ0dWFsIGRlbGV0ZSBoZXJlIFxyXG4gICAgZnVuY3Rpb24gZGVsZXRlUGhvdG8oaWQpIHsgXHJcblxyXG4gICAgICAgIHZhciBwID0gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XHJcblxyXG4gICAgICAgICAgICBmaW5kUGhvdG9zQnlGaWxlTmFtZShpZCkudGhlbihmdW5jdGlvbihwaG90b3MpIHtcclxuICAgICAgICAgICAgICAgIGlmIChwaG90b3MubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBwaG90byA9IHBob3Rvc1swXTsgXHJcbiAgICAgICAgICAgICAgICAgICAgcGhvdG8ucGhvdG9TdGF0dXMgPSBwaG90b1N0YXR1c2VzLkRlbGV0ZWQ7IFxyXG4gICAgICAgICAgICAgICAgICAgIGRiLnB1dCgncGhvdG9UYWJsZScsIHBob3RvLCBpZCk7IFxyXG5cclxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHBob3RvKTsgXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pOyBcclxuICAgICAgICB9KTsgXHJcblxyXG4gICAgICAgIHJldHVybiBwOyBcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBmaW5kUGhvdG9zQnlGaWxlTmFtZShmaWxlTmFtZSkge1xyXG5cclxuICAgICAgICB2YXIgcCA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xyXG5cclxuICAgICAgICAgICAgdmFyIHEgPSBkYi5mcm9tKCdwaG90b1RhYmxlJyk7XHJcbiAgICAgICAgICAgIHEgPSBxLndoZXJlKCdmaWxlTmFtZScsICc9JywgZmlsZU5hbWUpO1xyXG4gICAgICAgICAgICBxLmxpc3QoKS5kb25lKGZ1bmN0aW9uKHBob3Rvcykge1xyXG4gICAgICAgICAgICAgICAgcmVzb2x2ZShwaG90b3MpOyBcclxuICAgICAgICAgICAgfSk7IFxyXG4gICAgICAgIH0pOyBcclxuXHJcbiAgICAgICAgcmV0dXJuIHA7IFxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGZpbmRQaG90b3NCeUNhbWVyYUlkKGNhbWVyYUlkKSB7ICBcclxuXHJcbiAgICAgICAgdmFyIHAgPSBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcclxuXHJcbiAgICAgICAgICAgIHZhciBxID0gZGIuZnJvbSgncGhvdG9UYWJsZScpO1xyXG4gICAgICAgICAgICBxID0gcS53aGVyZSgnY2FtZXJhSWQnLCAnPScsIGNhbWVyYUlkKTtcclxuICAgICAgICAgICAgLy9xID0gcS53aGVyZSgncGhvdG9TdGF0dXMnLCAnPCcsIHBob3RvU3RhdHVzZXMuRGVsZXRlZCk7IFxyXG4gICAgICAgICAgICBxLmxpc3QoKS5kb25lKGZ1bmN0aW9uKHBob3Rvcykge1xyXG5cclxuICAgICAgICAgICAgICAgIHZhciBmaWx0ZXJlZFBob3RvcyA9IFtdOyBcclxuICAgICAgICAgICAgICAgIHBob3Rvcy5mb3JFYWNoKGZ1bmN0aW9uKHBob3RvKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHBob3RvLnBob3RvU3RhdHVzICE9IHBob3RvU3RhdHVzZXMuRGVsZXRlZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBmaWx0ZXJlZFBob3Rvcy5wdXNoKHBob3RvKTsgXHJcbiAgICAgICAgICAgICAgICAgICAgfSAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICB9KTsgXHJcblxyXG4gICAgICAgICAgICAgICAgcmVzb2x2ZShmaWx0ZXJlZFBob3Rvcyk7IFxyXG4gICAgICAgICAgICB9KTsgXHJcbiAgICAgICAgfSk7IFxyXG5cclxuICAgICAgICByZXR1cm4gcDsgXHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHsgICAgICAgIFxyXG4gICAgXHRhZGROZXdQaG90bzogYWRkTmV3UGhvdG8sIFxyXG4gICAgICAgIGFkZEV4aXN0aW5nUGhvdG86IGFkZEV4aXN0aW5nUGhvdG8sIFxyXG4gICAgICAgIGdldFBob3RvczogZ2V0UGhvdG9zLCBcclxuICAgIFx0ZGVsZXRlUGhvdG86IGRlbGV0ZVBob3RvLCBcclxuICAgICAgICBmaW5kUGhvdG9zQnlGaWxlTmFtZTogZmluZFBob3Rvc0J5RmlsZU5hbWUsIFxyXG4gICAgICAgIGZpbmRQaG90b3NCeUNhbWVyYUlkOiBmaW5kUGhvdG9zQnlDYW1lcmFJZCAgXHJcbiAgICB9O1xyXG5cclxufSgpKTsgXHJcbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
