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
			            '<div class="errorMessage"></div>', 
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
					var $spinner = body.find(".spinner"); 
					$spinner.hide(); 

					var $errorMessage = body.find(".errorMessage"); 
					$errorMessage.text("Error detected: " + error.name); 

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
		if (iOS) {
			$cameraLink.addClass("hidden"); 
		}
		else {
			$cameraLinkIOS.addClass("hidden"); 
		}

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
		
		return photoDB.findPhotosByCameraId(this.cameraSelector); 
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNhbWVyYS1kaWFsb2cuanMiLCJjYW1lcmEtdWkuanMiLCJjYW1lcmEtdXRpbHMuanMiLCJjYW1lcmEuanMiLCJwaG90b0RCLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLElBQUEsZ0JBQUEsV0FBQTs7Q0FFQSxJQUFBLGNBQUEsRUFBQSxPQUFBLE1BQUEsT0FBQTtDQUNBLElBQUE7O0NBRUEsSUFBQSxRQUFBO0NBQ0EsSUFBQSxhQUFBLFlBQUE7O0NBRUEsU0FBQSxnQkFBQSxlQUFBLGdCQUFBLGlCQUFBLHNCQUFBOztFQUVBLGNBQUEsT0FBQSxDQUFBLFNBQUEsZ0JBQUEsaUJBQUEsVUFBQTs7R0FFQSxPQUFBLFNBQUEsS0FBQTtJQUNBLElBQUEsSUFBQSxJQUFBLE9BQUEsTUFBQTtJQUNBLElBQUEsU0FBQSxJQUFBOztJQUVBLE9BQUEsU0FBQSxTQUFBLFNBQUE7O1FBRUEsSUFBQSxVQUFBO1NBQ0EsSUFBQSxVQUFBLFFBQUEsT0FBQTtTQUNBLFNBQUEsZ0JBQUEsaUJBQUE7O2FBRUE7U0FDQSxRQUFBLEtBQUE7Ozs7SUFJQSxnQkFBQSxZQUFBOzs7SUFHQSxPQUFBLGNBQUE7OztLQUdBLGdCQUFBLGlCQUFBOzs7Q0FHQSxTQUFBLHdCQUFBOztFQUVBLE9BQUEsQ0FBQTtXQUNBO2VBQ0E7ZUFDQTtlQUNBO21CQUNBO29CQUNBO21CQUNBO2VBQ0E7ZUFDQTttQkFDQTtvQkFDQTttQkFDQTtlQUNBO1dBQ0E7T0FDQSxVQUFBLEtBQUE7OztDQUdBLFNBQUEsb0JBQUEsZ0JBQUEsaUJBQUEsc0JBQUE7O1FBRUEsZ0JBQUEsS0FBQTtZQUNBLE9BQUE7WUFDQSxTQUFBLEVBQUE7WUFDQSxVQUFBO1lBQ0EsU0FBQSxTQUFBLFdBQUE7O2FBRUEsV0FBQTs7O0lBR0EsSUFBQSxTQUFBLFVBQUE7O0lBRUEsY0FBQSxPQUFBLEtBQUE7SUFDQSxhQUFBLE9BQUEsS0FBQTtJQUNBLFdBQUEsT0FBQSxLQUFBOzthQUVBLElBQUEsT0FBQSxVQUFBOzthQUVBLElBQUEsWUFBQSxLQUFBLEtBQUE7YUFDQSxVQUFBLE1BQUE7OztJQUdBLFNBQUEsS0FBQSxLQUFBO0lBQ0EsVUFBQSxLQUFBLEtBQUE7O2FBRUEsSUFBQSxRQUFBLE9BQUE7SUFDQSxJQUFBLFNBQUEsT0FBQSxTQUFBLFFBQUE7O0lBRUEsTUFBQSxlQUFBLFdBQUE7S0FDQSxJQUFBLFlBQUEsU0FBQSxhQUFBO01BQ0EsWUFBQSxZQUFBOzs7O0lBSUEsVUFBQSxhQUFBLGFBQUE7S0FDQSxLQUFBLFVBQUEsUUFBQTtLQUNBLE9BQUEsU0FBQTtLQUNBLE1BQUEsWUFBQTtLQUNBLE1BQUEsTUFBQSxPQUFBLElBQUEsZ0JBQUE7O0tBRUEsTUFBQSxVQUFBLE9BQUE7S0FDQSxJQUFBLFdBQUEsS0FBQSxLQUFBO0tBQ0EsU0FBQTs7S0FFQSxJQUFBLGdCQUFBLEtBQUEsS0FBQTtLQUNBLGNBQUEsS0FBQSxxQkFBQSxNQUFBOztNQUVBLFFBQUEsS0FBQSxrQ0FBQTs7OztJQUlBLGdCQUFBLFlBQUE7O1lBRUEsVUFBQSxTQUFBLFdBQUE7YUFDQTs7WUFFQSxVQUFBO1lBQ0EsU0FBQSxDQUFBO2dCQUNBLE9BQUE7Z0JBQ0EsTUFBQTtnQkFDQSxVQUFBO2dCQUNBLFFBQUEsVUFBQSxjQUFBO1FBQ0E7O2VBRUE7Z0JBQ0EsT0FBQTtnQkFDQSxNQUFBO2dCQUNBLFVBQUE7Z0JBQ0EsUUFBQSxVQUFBLGNBQUE7UUFDQTs7ZUFFQTtnQkFDQSxPQUFBO2dCQUNBLE1BQUE7Z0JBQ0EsVUFBQTtnQkFDQSxRQUFBLFVBQUEsY0FBQTs7UUFFQSxJQUFBLFVBQUE7U0FDQSxJQUFBLFVBQUEsT0FBQSxVQUFBO1NBQ0EsU0FBQSxnQkFBQSxpQkFBQTs7YUFFQTtTQUNBLFFBQUEsS0FBQTs7O29CQUdBLGFBQUE7O2VBRUE7Z0JBQ0EsT0FBQTtnQkFDQSxNQUFBO2dCQUNBLFVBQUE7Z0JBQ0EsUUFBQSxVQUFBLGNBQUE7b0JBQ0EsYUFBQTs7Ozs7O0NBTUEsU0FBQSxzQkFBQTtFQUNBLE9BQUEsWUFBQTtFQUNBLFFBQUEsWUFBQTs7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QSxZQUFBLFdBQUE7O0VBRUEsT0FBQSxRQUFBLHFCQUFBLEtBQUE7OztDQUdBLE9BQUE7Ozs7QUNkQSxJQUFBLGdCQUFBLEVBQUEsS0FBQSxHQUFBLFVBQUEsR0FBQSxTQUFBOztBQUVBLElBQUEsV0FBQSxXQUFBOztDQUVBLElBQUE7O0lBRUE7O0lBRUEsU0FBQSxPQUFBOztFQUVBLElBQUEsU0FBQTtJQUNBLFFBQUEsQ0FBQTtNQUNBLE1BQUE7TUFDQSxTQUFBLENBQUEsRUFBQSxNQUFBLGNBQUEsRUFBQSxNQUFBOzs7O1FBSUEsS0FBQSxJQUFBLElBQUEsR0FBQSxRQUFBLGNBQUE7OztJQUdBLFNBQUEsWUFBQSxJQUFBLFVBQUEsU0FBQTs7O1FBR0EsR0FBQSxJQUFBLGNBQUEsRUFBQSxVQUFBLElBQUEsVUFBQSxVQUFBLFdBQUEsT0FBQSxJQUFBO2dDQUNBLGFBQUEsY0FBQSxLQUFBLFNBQUEsV0FBQTs7O0lBR0EsU0FBQSxpQkFBQSxVQUFBLFNBQUE7O1FBRUEsSUFBQSxLQUFBLFlBQUEsWUFBQTs7O1FBR0EsR0FBQSxJQUFBLGNBQUEsRUFBQSxVQUFBLElBQUEsVUFBQSxVQUFBLFdBQUE7Z0NBQ0EsYUFBQSxjQUFBLFVBQUEsU0FBQSxXQUFBOzs7SUFHQSxTQUFBLFlBQUE7O1FBRUEsSUFBQSxJQUFBLElBQUEsUUFBQSxTQUFBLFNBQUEsUUFBQTs7WUFFQSxJQUFBLFFBQUEsR0FBQSxLQUFBO1lBQ0EsUUFBQSxNQUFBLE1BQUEsZUFBQSxLQUFBLGNBQUE7WUFDQSxNQUFBLE9BQUEsS0FBQSxTQUFBLFFBQUE7ZUFDQSxRQUFBOzs7O1FBSUEsT0FBQTs7OztJQUlBLFNBQUEsWUFBQSxJQUFBOztRQUVBLElBQUEsSUFBQSxJQUFBLFFBQUEsU0FBQSxTQUFBLFFBQUE7O1lBRUEscUJBQUEsSUFBQSxLQUFBLFNBQUEsUUFBQTtnQkFDQSxJQUFBLE9BQUEsU0FBQSxHQUFBO29CQUNBLElBQUEsUUFBQSxPQUFBO29CQUNBLE1BQUEsY0FBQSxjQUFBO29CQUNBLEdBQUEsSUFBQSxjQUFBLE9BQUE7O29CQUVBLFFBQUE7Ozs7O1FBS0EsT0FBQTs7O0lBR0EsU0FBQSxxQkFBQSxVQUFBOztRQUVBLElBQUEsSUFBQSxJQUFBLFFBQUEsU0FBQSxTQUFBLFFBQUE7O1lBRUEsSUFBQSxJQUFBLEdBQUEsS0FBQTtZQUNBLElBQUEsRUFBQSxNQUFBLFlBQUEsS0FBQTtZQUNBLEVBQUEsT0FBQSxLQUFBLFNBQUEsUUFBQTtnQkFDQSxRQUFBOzs7O1FBSUEsT0FBQTs7OztJQUlBLFNBQUEscUJBQUEsVUFBQTs7UUFFQSxJQUFBLElBQUEsSUFBQSxRQUFBLFNBQUEsU0FBQSxRQUFBOztZQUVBLElBQUEsSUFBQSxHQUFBLEtBQUE7WUFDQSxJQUFBLEVBQUEsTUFBQSxZQUFBLEtBQUE7O1lBRUEsRUFBQSxPQUFBLEtBQUEsU0FBQSxRQUFBOztnQkFFQSxJQUFBLGlCQUFBO2dCQUNBLE9BQUEsUUFBQSxTQUFBLE9BQUE7b0JBQ0EsSUFBQSxNQUFBLGVBQUEsY0FBQSxTQUFBO3dCQUNBLGVBQUEsS0FBQTs7OztnQkFJQSxRQUFBOzs7O1FBSUEsT0FBQTs7O0lBR0EsT0FBQTtLQUNBLGFBQUE7UUFDQSxrQkFBQTtRQUNBLFdBQUE7S0FDQSxhQUFBO1FBQ0Esc0JBQUE7UUFDQSxzQkFBQTs7OztBQUlBIiwiZmlsZSI6ImNhbWVyYS5qcyIsInNvdXJjZXNDb250ZW50IjpbInZhciBjYW1lcmFEaWFsb2cgPSAoZnVuY3Rpb24oKSB7XHJcblxyXG5cdHZhciBjb25zdHJhaW50cyA9IHsgdmlkZW86IHRydWUsIGF1ZGlvOiBmYWxzZSB9OyBcclxuXHR2YXIgY2FsbGJhY2s7IFxyXG5cclxuXHR2YXIgJHZpZGVvLCAkY2FudmFzOyBcclxuXHR2YXIgJGJ0bkNhcHR1cmUsICRidG5SZXRha2UsICRidG5TYXZlOyBcclxuXHJcblx0ZnVuY3Rpb24gY29uZmlndXJlRm9ySU9TKGNhbWVyYUxpbmtJT1MsIGNhbWVyYVNlbGVjdG9yLCAkcGhvdG9Db250YWluZXIsIHNhdmVTbmFwc2hvdENhbGxiYWNrKSB7XHJcblxyXG5cdFx0Y2FtZXJhTGlua0lPUy5jaGFuZ2UoKGZ1bmN0aW9uKGNhbWVyYVNlbGVjdG9yLCAkcGhvdG9Db250YWluZXIsIGNhbGxiYWNrKSB7XHJcblxyXG5cdFx0XHRyZXR1cm4gZnVuY3Rpb24oZXZ0KSB7XHJcblx0XHRcdFx0dmFyIGYgPSBldnQudGFyZ2V0LmZpbGVzWzBdOyBcclxuXHRcdFx0XHR2YXIgcmVhZGVyID0gbmV3IEZpbGVSZWFkZXIoKTtcclxuXHJcblx0XHRcdFx0cmVhZGVyLm9ubG9hZCA9IGZ1bmN0aW9uKHRoZUZpbGUpIHtcclxuXHJcblx0XHRcdCAgICBcdGlmIChjYWxsYmFjaykge1xyXG5cdFx0XHQgICAgXHRcdHZhciBpbWdEYXRhID0gdGhlRmlsZS50YXJnZXQucmVzdWx0OyBcclxuXHRcdFx0ICAgIFx0XHRjYWxsYmFjayhjYW1lcmFTZWxlY3RvciwgJHBob3RvQ29udGFpbmVyLCBpbWdEYXRhKTsgXHJcblx0XHRcdCAgICBcdH1cclxuXHRcdFx0ICAgIFx0ZWxzZSB7XHJcblx0XHRcdCAgICBcdFx0Y29uc29sZS53YXJuKFwiQ2FsbGJhY2sgaXMgbm90IGRlZmluZWQhXCIpOyBcclxuXHRcdFx0ICAgIFx0fVxyXG5cdFx0XHRcdH07IFxyXG5cclxuXHRcdFx0XHQkcGhvdG9Db250YWluZXIucmVtb3ZlQ2xhc3MoXCJoaWRkZW5cIik7IFxyXG5cclxuXHRcdFx0XHQvLyBSZWFkIGluIHRoZSBpbWFnZSBmaWxlIGFzIGEgZGF0YSBVUkwuXHJcblx0XHRcdFx0cmVhZGVyLnJlYWRBc0RhdGFVUkwoZik7XHJcblx0XHRcdH07IFxyXG5cclxuXHRcdH0pKGNhbWVyYVNlbGVjdG9yLCAkcGhvdG9Db250YWluZXIsIHNhdmVTbmFwc2hvdENhbGxiYWNrKSk7IFxyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gZ2V0Q2FtZXJhVGVtcGxhdGVIdG1sKCkge1xyXG5cclxuXHRcdHJldHVybiBbJzxkaXYgaWQ9XCJjYW1lcmEtZGlhbG9nXCI+JywgXHJcblx0XHRcdCAgICAgICAgJzxmb3JtIG5hbWU9XCJjYW1lcmFGb3JtXCI+JyxcclxuXHRcdFx0ICAgICAgICAgICAgJzxpbWcgc3JjPVwiaW1nL3NwaW5uZXIuZ2lmXCIgY2xhc3M9XCJzcGlubmVyXCIgLz4nLCAgXHJcblx0XHRcdCAgICAgICAgICAgICc8ZGl2IGNsYXNzPVwiZXJyb3JNZXNzYWdlXCI+PC9kaXY+JywgXHJcblx0XHRcdCAgICAgICAgICAgICc8ZGl2IGNsYXNzPVwicm93XCI+JyxcclxuXHRcdFx0ICAgICAgICAgICAgICAgICc8ZGl2IGNsYXNzPVwiY29sLXNtLTEyXCI+JyxcclxuXHRcdFx0ICAgICAgICAgICAgICAgIFx0Jzx2aWRlbyBpZD1cImRhdGFWaWRlb0lkXCIgYXV0b3BsYXkgc3R5bGU9XCJ3aWR0aDoxMDAlXCIgd2lkdGg9XCIxMDAlXCI+PC92aWRlbz4nLFx0XHRcdCAgICAgICAgICAgICAgICBcdFxyXG5cdFx0XHQgICAgICAgICAgICAgICAgJzwvZGl2PicsXHJcblx0XHRcdCAgICAgICAgICAgICc8L2Rpdj4nLCBcclxuXHRcdFx0ICAgICAgICAgICAgJzxkaXYgY2xhc3M9XCJyb3dcIj4nLFxyXG5cdFx0XHQgICAgICAgICAgICAgICAgJzxkaXYgY2xhc3M9XCJjb2wtc20tMTJcIj4nLFxyXG5cdFx0XHQgICAgICAgICAgICAgICAgXHQnPGNhbnZhcyBpZD1cImNhbnZhc0lkXCIgY2xhc3M9XCJoaWRkZW5cIiBzdHlsZT1cIndpZHRoOjEwMCU7XCIgd2lkdGg9XCIxMDAlXCI+PC9jYW52YXM+JyxcclxuXHRcdFx0ICAgICAgICAgICAgICAgICc8L2Rpdj4nLFxyXG5cdFx0XHQgICAgICAgICAgICAnPC9kaXY+JywgXHJcblx0XHRcdCAgICAgICAgJzwvZm9ybT4nLFxyXG5cdFx0XHQgICAgJzwvZGl2PiddLmpvaW4oJ1xcbicpOyBcclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIGRpc3BsYXlDYW1lcmFEaWFsb2coY2FtZXJhU2VsZWN0b3IsICRwaG90b0NvbnRhaW5lciwgc2F2ZVNuYXBzaG90Q2FsbGJhY2spIHsgXHJcblxyXG4gICAgICAgIEJvb3RzdHJhcERpYWxvZy5zaG93KHtcclxuICAgICAgICAgICAgdGl0bGU6ICdUYWtlIGEgcGhvdG8nLFxyXG4gICAgICAgICAgICBtZXNzYWdlOiAkKGdldENhbWVyYVRlbXBsYXRlSHRtbCgpKSwgXHJcbiAgICAgICAgICAgIGNzc0NsYXNzOiAnbG9naW4tZGlhbG9nJywgXHJcbiAgICAgICAgICAgIG9uc2hvd246IGZ1bmN0aW9uKGRpYWxvZ1JlZikge1xyXG4gICAgICAgICAgICBcdFxyXG4gICAgICAgICAgICBcdGNhbGxiYWNrID0gc2F2ZVNuYXBzaG90Q2FsbGJhY2s7IFxyXG5cclxuICAgICAgICAgICAgXHQvLyBpbml0IHJlZmVyZW5jZXMgdG8gYnV0dG9ucyBmcm9tIG1vZGFsIGZvb3RlciBcclxuXHRcdFx0XHR2YXIgZm9vdGVyID0gZGlhbG9nUmVmLmdldE1vZGFsRm9vdGVyKCk7IFxyXG5cclxuXHRcdFx0XHQkYnRuQ2FwdHVyZSA9IGZvb3Rlci5maW5kKFwiLmJ0bi1jYXB0dXJlXCIpOyBcclxuXHRcdFx0XHQkYnRuUmV0YWtlID0gZm9vdGVyLmZpbmQoXCIuYnRuLXJldGFrZVwiKTsgXHJcblx0XHRcdFx0JGJ0blNhdmUgPSBmb290ZXIuZmluZChcIi5idG4tc2F2ZVwiKTtcclxuICAgICAgICAgICAgXHRcclxuICAgICAgICAgICAgXHR2YXIgYm9keSA9IGRpYWxvZ1JlZi5nZXRNb2RhbEJvZHkoKTtcclxuXHJcbiAgICAgICAgICAgIFx0dmFyIGNoYW5nZUJ0biA9IGJvZHkuZmluZChcIiNjaGFuZ2VJZFwiKTtcclxuICAgICAgICAgICAgXHRjaGFuZ2VCdG4uY2xpY2soc3dhcFZpZGVvV2l0aENhbnZhcyk7XHJcblxyXG4gICAgICAgICAgICBcdC8vIGluaXQgdmlkZW8gJiBjYW52YXMgaGVyZSBcclxuXHRcdFx0XHQkdmlkZW8gPSBib2R5LmZpbmQoXCIjZGF0YVZpZGVvSWRcIik7IFxyXG5cdFx0XHRcdCRjYW52YXMgPSBib2R5LmZpbmQoXCIjY2FudmFzSWRcIik7IFxyXG5cclxuICAgICAgICAgICAgXHR2YXIgdmlkZW8gPSAkdmlkZW9bMF07XHJcblx0XHRcdFx0dmFyIGNhbnZhcyA9IHdpbmRvdy5jYW52YXMgPSAkY2FudmFzWzBdOyBcclxuXHJcblx0XHRcdFx0dmlkZW8ub25sb2FkZWRkYXRhID0gZnVuY3Rpb24oKSB7XHJcblx0XHRcdFx0XHRpZiAoJGJ0bkNhcHR1cmUuaGFzQ2xhc3MoXCJkaXNhYmxlZFwiKSkge1xyXG5cdFx0XHRcdFx0XHQkYnRuQ2FwdHVyZS5yZW1vdmVDbGFzcyhcImRpc2FibGVkXCIpOyBcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdG5hdmlnYXRvci5tZWRpYURldmljZXMuZ2V0VXNlck1lZGlhKGNvbnN0cmFpbnRzKVxyXG5cdFx0XHRcdC50aGVuKGZ1bmN0aW9uIChzdHJlYW0pIHtcclxuXHRcdFx0XHRcdHdpbmRvdy5zdHJlYW0gPSBzdHJlYW07IFxyXG5cdFx0XHRcdFx0dmlkZW8uc3JjT2JqZWN0ID0gc3RyZWFtO1xyXG5cdFx0XHRcdFx0dmlkZW8uc3JjID0gd2luZG93LlVSTC5jcmVhdGVPYmplY3RVUkwoc3RyZWFtKTsgXHJcblx0XHRcdFx0fSlcclxuXHRcdFx0XHQuY2F0Y2goZnVuY3Rpb24gKGVycm9yKSB7XHJcblx0XHRcdFx0XHR2YXIgJHNwaW5uZXIgPSBib2R5LmZpbmQoXCIuc3Bpbm5lclwiKTsgXHJcblx0XHRcdFx0XHQkc3Bpbm5lci5oaWRlKCk7IFxyXG5cclxuXHRcdFx0XHRcdHZhciAkZXJyb3JNZXNzYWdlID0gYm9keS5maW5kKFwiLmVycm9yTWVzc2FnZVwiKTsgXHJcblx0XHRcdFx0XHQkZXJyb3JNZXNzYWdlLnRleHQoXCJFcnJvciBkZXRlY3RlZDogXCIgKyBlcnJvci5uYW1lKTsgXHJcblxyXG5cdFx0XHRcdCBcdGNvbnNvbGUud2FybignbmF2aWdhdG9yLmdldFVzZXJNZWRpYSBlcnJvcjogJywgZXJyb3IpOyBcclxuXHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0Ly8gZGlzcGxheSB0aGUgY29udGFpbmVyPyBcclxuXHRcdFx0XHQkcGhvdG9Db250YWluZXIucmVtb3ZlQ2xhc3MoXCJoaWRkZW5cIik7IFxyXG4gICAgICAgICAgICB9LCBcclxuICAgICAgICAgICAgb25oaWRkZW46IGZ1bmN0aW9uKGRpYWxvZ1JlZikge1xyXG4gICAgICAgICAgICBcdHN0b3BDYW1lcmEoKTsgXHJcbiAgICAgICAgICAgIH0sIFxyXG4gICAgICAgICAgICBjc3NDbGFzczogJ2xvZ2luLWRpYWxvZycsIFxyXG4gICAgICAgICAgICBidXR0b25zOiBbe1xyXG4gICAgICAgICAgICAgICAgbGFiZWw6ICdSZXRha2UnLFxyXG4gICAgICAgICAgICAgICAgaWNvbjogJ2dseXBoaWNvbiBnbHlwaGljb24tc29ydCcsXHJcbiAgICAgICAgICAgICAgICBjc3NDbGFzczogJ2J0biBidG4tcHJpbWFyeSBwdWxsLWxlZnQgaGlkZGVuIGJ0bi1yZXRha2UnLFxyXG4gICAgICAgICAgICAgICAgYWN0aW9uOiBmdW5jdGlvbiAoZGlhbG9nSXRzZWxmKSB7XHJcblx0XHRcdCAgICBcdHN3YXBWaWRlb1dpdGhDYW52YXMoKTsgXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0sIHtcclxuICAgICAgICAgICAgICAgIGxhYmVsOiAnQ2FwdHVyZSBTbmFwc2hvdCcsXHJcbiAgICAgICAgICAgICAgICBpY29uOiAnZ2x5cGhpY29uIGdseXBoaWNvbi1jYW1lcmEnLFxyXG4gICAgICAgICAgICAgICAgY3NzQ2xhc3M6ICdidG4gYnRuLXByaW1hcnkgcHVsbC1sZWZ0IGRpc2FibGVkIGJ0bi1jYXB0dXJlJyxcclxuICAgICAgICAgICAgICAgIGFjdGlvbjogZnVuY3Rpb24gKGRpYWxvZ0l0c2VsZikge1xyXG5cdFx0XHQgICAgXHRjYXB0dXJlU25hcHNob3QoKTsgXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0sIHtcclxuICAgICAgICAgICAgICAgIGxhYmVsOiAnU2F2ZScsXHJcbiAgICAgICAgICAgICAgICBpY29uOiAnZ2x5cGhpY29uIGdseXBoaWNvbi1vaycsXHJcbiAgICAgICAgICAgICAgICBjc3NDbGFzczogJ2J0bi1wcmltYXJ5IGhpZGRlbiBidG4tc2F2ZScsXHJcbiAgICAgICAgICAgICAgICBhY3Rpb246IGZ1bmN0aW9uIChkaWFsb2dJdHNlbGYpIHtcclxuXHJcblx0XHRcdCAgICBcdGlmIChjYWxsYmFjaykge1xyXG5cdFx0XHQgICAgXHRcdHZhciBpbWdEYXRhID0gY2FudmFzLnRvRGF0YVVSTChcImltYWdlL3BuZ1wiKTsgXHJcblx0XHRcdCAgICBcdFx0Y2FsbGJhY2soY2FtZXJhU2VsZWN0b3IsICRwaG90b0NvbnRhaW5lciwgaW1nRGF0YSk7IFxyXG5cdFx0XHQgICAgXHR9XHJcblx0XHRcdCAgICBcdGVsc2Uge1xyXG5cdFx0XHQgICAgXHRcdGNvbnNvbGUud2FybihcIkNhbGxiYWNrIGlzIG5vdCBkZWZpbmVkIVwiKTsgXHJcblx0XHRcdCAgICBcdH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgZGlhbG9nSXRzZWxmLmNsb3NlKCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0sIHtcclxuICAgICAgICAgICAgICAgIGxhYmVsOiAnQ2FuY2VsJyxcclxuICAgICAgICAgICAgICAgIGljb246ICdnbHlwaGljb24gZ2x5cGhpY29uLXJlbW92ZScsXHJcbiAgICAgICAgICAgICAgICBjc3NDbGFzczogJ2J0bi1kYW5nZXInLFxyXG4gICAgICAgICAgICAgICAgYWN0aW9uOiBmdW5jdGlvbiAoZGlhbG9nSXRzZWxmKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZGlhbG9nSXRzZWxmLmNsb3NlKCk7IFxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XVxyXG4gICAgICAgIH0pO1xyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gc3dhcFZpZGVvV2l0aENhbnZhcygpIHtcclxuXHRcdCR2aWRlby50b2dnbGVDbGFzcyhcImhpZGRlblwiKTtcclxuXHRcdCRjYW52YXMudG9nZ2xlQ2xhc3MoXCJoaWRkZW5cIik7IFxyXG5cclxuXHRcdCRidG5DYXB0dXJlLnRvZ2dsZUNsYXNzKFwiaGlkZGVuXCIpOyBcclxuXHRcdCRidG5SZXRha2UudG9nZ2xlQ2xhc3MoXCJoaWRkZW5cIik7ICBcclxuXHR9XHJcblxyXG4gICAgZnVuY3Rpb24gY2FwdHVyZVNuYXBzaG90KCkgeyBcclxuXHJcblx0XHRpZiAoJHZpZGVvICYmICRjYW52YXMpIHtcclxuXHRcdFx0dmFyIHZpZGVvID0gJHZpZGVvWzBdOyBcclxuXHRcdFx0dmFyIGNhbnZhcyA9ICRjYW52YXNbMF07IFxyXG5cclxuXHRcdFx0Y2FudmFzLndpZHRoID0gdmlkZW8udmlkZW9XaWR0aDtcclxuICBcdFx0XHRjYW52YXMuaGVpZ2h0ID0gdmlkZW8udmlkZW9IZWlnaHQ7XHJcblx0XHRcdGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpLmRyYXdJbWFnZSh2aWRlbywgMCwgMCwgY2FudmFzLndpZHRoLCBjYW52YXMuaGVpZ2h0KTtcclxuXHJcblx0XHRcdGlmICgkYnRuU2F2ZS5oYXNDbGFzcyhcImhpZGRlblwiKSkge1xyXG5cdFx0XHRcdCRidG5TYXZlLnJlbW92ZUNsYXNzKFwiaGlkZGVuXCIpOyBcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0c3dhcFZpZGVvV2l0aENhbnZhcygpOyBcdFx0XHRcclxuXHRcdH0gXHJcbiAgICB9IFxyXG5cclxuICAgIGZ1bmN0aW9uIHN0b3BDYW1lcmEoKSB7XHJcblx0XHR2YXIgdmlkZW8gPSAkdmlkZW9bMF07XHJcblx0XHR2YXIgc3RyZWFtID0gdmlkZW8uc3JjT2JqZWN0OyBcclxuXHRcdFxyXG5cdFx0aWYgKHN0cmVhbSkge1xyXG5cdFx0XHRzdHJlYW0uZ2V0VHJhY2tzKClbMF0uc3RvcCgpOyBcclxuXHRcdFx0aWYgKHZpZGVvLnNyYykge1xyXG5cdFx0XHRcdHZpZGVvLnNyYyA9IG51bGw7IFxyXG5cdFx0XHR9IFxyXG5cclxuXHRcdFx0c3RyZWFtID0gbnVsbDsgXHJcblx0XHR9XHJcblx0fVxyXG5cclxuICAgIHJldHVybiB7ICAgICAgICBcclxuICAgIFx0ZGlzcGxheUNhbWVyYURpYWxvZzogZGlzcGxheUNhbWVyYURpYWxvZywgXHJcbiAgICBcdGNvbmZpZ3VyZUZvcklPUzogY29uZmlndXJlRm9ySU9TIFxyXG4gICAgfTtcclxuXHJcbn0oKSk7IFxyXG4iLCJ2YXIgY2FtZXJhVUkgPSAoZnVuY3Rpb24oKSB7XHJcblxyXG5cdHZhciBwaG90b1NpemUgPSB7IHdpZHRoOiAxNTAsIGhlaWdodDogMTEzIH07XHJcblxyXG5cdGZ1bmN0aW9uIGNvbmZpZ3VyZUNhbWVyYXMoY2FtZXJhRGV0YWlscykgeyBcclxuXHJcblx0XHRjYW1lcmFEZXRhaWxzLmZvckVhY2goZnVuY3Rpb24oY2FtZXJhRGV0YWlsKSB7IFxyXG5cclxuXHRcdFx0dmFyIGNhbWVyYVNlbGVjdG9yID0gY2FtZXJhRGV0YWlsLmNhbWVyYVNlbGVjdG9yOyBcclxuXHRcdFx0dmFyIGV4aXN0aW5nUGhvdG9zID0gY2FtZXJhRGV0YWlsLmV4aXN0aW5nUGhvdG9zOyBcclxuXHJcblx0XHQgICAgY29uZmlndXJlQ2FtZXJhKGNhbWVyYVNlbGVjdG9yLCBleGlzdGluZ1Bob3Rvcyk7IFxyXG5cdFx0fSk7IFxyXG5cdH1cclxuXHJcbiAgICBmdW5jdGlvbiBjb25maWd1cmVDYW1lcmEoY2FtZXJhU2VsZWN0b3IsIGV4aXN0aW5nUGhvdG9zKSB7XHJcblxyXG5cdFx0dmFyICRjYW1lcmFDb250YWluZXIgPSAkKCBjYW1lcmFTZWxlY3RvciApOyBcclxuXHJcblx0XHRpZiAoJGNhbWVyYUNvbnRhaW5lci5sZW5ndGggPT0gMCkge1xyXG5cdFx0XHRjb25zb2xlLndhcm4oXCJDb25maWd1cmVkIEpRdWVyeSBzZWxlY3RvciAnJXMnIGRvZXMgbm90IG1hdGNoIGFueSBkb2N1bWVudCBlbGVtZW50LlwiLCBjYW1lcmFTZWxlY3Rvcik7IFxyXG5cdFx0XHRyZXR1cm47IFxyXG5cdFx0fVxyXG5cclxuXHRcdGlmICgkY2FtZXJhQ29udGFpbmVyLmxlbmd0aCA+IDEpIHtcclxuXHRcdFx0Y29uc29sZS53YXJuKFwiQ29uZmlndXJlZCBKUXVlcnkgc2VsZWN0b3IgJyVzJyBtYXRjaGVzICVzIGRvY3VtZW50IGVsZW1lbnRzLiBVc2luZyB0aGUgZmlyc3Qgb25lIGF0IGluZGV4IDAuXCIsIGNhbWVyYVNlbGVjdG9yLCAkY2FtZXJhQ29udGFpbmVyLmxlbmd0aCk7IFxyXG5cdFx0XHQkY2FtZXJhQ29udGFpbmVyID0gJCgkY2FtZXJhQ29udGFpbmVyWzBdKTsgXHJcblx0XHR9XHJcblxyXG5cdFx0dmFyICRjYW1lcmFMaW5rID0gJGNhbWVyYUNvbnRhaW5lci5maW5kKFwiLmNhbWVyYS1saW5rXCIpOyBcclxuXHRcdHZhciAkcGhvdG9Db250YWluZXIgPSAkY2FtZXJhQ29udGFpbmVyLmZpbmQoXCIucGhvdG8taW1hZ2VzZXRcIik7IFxyXG5cclxuXHRcdHZhciAkY2FtZXJhTGlua0lPUyA9ICRjYW1lcmFDb250YWluZXIuZmluZChcIi5jYW1lcmEtbGluay1pb3NcIik7IFxyXG5cclxuXHRcdHZhciBpT1MgPSBjYW1lcmFVdGlscy5pc0lPUygpOyBcclxuXHRcdGlmIChpT1MpIHtcclxuXHRcdFx0JGNhbWVyYUxpbmsuYWRkQ2xhc3MoXCJoaWRkZW5cIik7IFxyXG5cdFx0fVxyXG5cdFx0ZWxzZSB7XHJcblx0XHRcdCRjYW1lcmFMaW5rSU9TLmFkZENsYXNzKFwiaGlkZGVuXCIpOyBcclxuXHRcdH1cclxuXHJcblx0XHRpZiAoJHBob3RvQ29udGFpbmVyKSB7XHJcblx0XHRcdGNhbWVyYURpYWxvZy5jb25maWd1cmVGb3JJT1MoJGNhbWVyYUxpbmtJT1MsIGNhbWVyYVNlbGVjdG9yLCAkcGhvdG9Db250YWluZXIsIHNhdmVTbmFwc2hvdCk7IFxyXG5cclxuXHRcdFx0JGNhbWVyYUxpbmsuY2xpY2soZnVuY3Rpb24oKSB7IFxyXG5cdFx0XHRcdGNhbWVyYURpYWxvZy5kaXNwbGF5Q2FtZXJhRGlhbG9nKGNhbWVyYVNlbGVjdG9yLCAkcGhvdG9Db250YWluZXIsIHNhdmVTbmFwc2hvdCk7IFxyXG5cdFx0XHR9KTsgXHJcblx0XHR9XHJcblxyXG5cdFx0aWYgKGV4aXN0aW5nUGhvdG9zICYmIGV4aXN0aW5nUGhvdG9zLmxlbmd0aCA+IDApIHtcclxuXHRcdFx0ZXhpc3RpbmdQaG90b3MuZm9yRWFjaChmdW5jdGlvbihleGlzdGluZ1Bob3RvKSB7XHJcblx0XHRcdFx0cGhvdG9EQi5hZGRFeGlzdGluZ1Bob3RvKGNhbWVyYVNlbGVjdG9yLCBleGlzdGluZ1Bob3RvKTsgXHJcblx0XHRcdH0pOyBcdFxyXG5cdFx0fVxyXG5cclxuXHRcdHBvcHVsYXRlUGhvdG9MaXN0KCRwaG90b0NvbnRhaW5lciwgY2FtZXJhU2VsZWN0b3IpOyBcclxuXHR9XHRcclxuXHJcblx0ZnVuY3Rpb24gcG9wdWxhdGVQaG90b0xpc3QoJHBob3RvQ29udGFpbmVyLCBjYW1lcmFTZWxlY3RvcikgeyBcclxuXHRcdC8vIHBvcHVsYXRlIHRoZSBsaXN0IG9mIGFsbCBwaG90b3MgZm9yIGdpdmVuIGNhbWVyYSAgXHJcblx0XHRwaG90b0RCLmZpbmRQaG90b3NCeUNhbWVyYUlkKGNhbWVyYVNlbGVjdG9yKS50aGVuKGZ1bmN0aW9uKHBob3RvcykgeyBcclxuXHJcblx0XHQgICAgJC5lYWNoKHBob3RvcywgZnVuY3Rpb24oKSB7IFxyXG5cdFx0XHRcdGFkZFBob3RvVG9MaXN0KCRwaG90b0NvbnRhaW5lciwgdGhpcyk7IFxyXG5cdFx0XHR9KTsgXHJcblx0XHR9KTsgXHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiBzYXZlU25hcHNob3QoY2FtZXJhSWQsICRwaG90b0NvbnRhaW5lciwgaW1nRGF0YSkge1xyXG5cclxuXHRcdHZhciBmaWxlTmFtZSA9IGNhbWVyYVV0aWxzLm5ld0d1aWQoKSArIFwiLnBuZ1wiOyBcclxuXHRcdHZhciBpbWdPYmplY3QgPSB7IGZpbGVOYW1lOiBmaWxlTmFtZSwgY29udGVudDogaW1nRGF0YSwgY2FtZXJhSWQ6IGNhbWVyYUlkIH07XHJcblxyXG5cdFx0cGhvdG9EQi5hZGROZXdQaG90byhmaWxlTmFtZSwgY2FtZXJhSWQsIGltZ0RhdGEpO1xyXG5cclxuXHRcdGFkZFBob3RvVG9MaXN0KCRwaG90b0NvbnRhaW5lciwgaW1nT2JqZWN0KTsgXHJcblx0fSBcclxuXHJcblx0ZnVuY3Rpb24gYWRkUGhvdG9Ub0xpc3QoJGltYWdlc0RpdiwgaW1hZ2VPYmplY3QpIHtcclxuXHJcblx0XHR2YXIgJGltZ0RpdiA9ICQoJzxkaXYgLz4nKS5hZGRDbGFzcyhcImltZ1wiKS5jc3MoXCJoZWlnaHRcIiwgcGhvdG9TaXplLmhlaWdodCArIFwicHhcIik7IFxyXG5cdFx0dmFyICRkZWxEaXYgPSAkKCc8ZGl2IC8+JykuYWRkQ2xhc3MoXCJkZWxcIikuYXR0cihcImRhdGEtaWRcIiwgaW1hZ2VPYmplY3QuZmlsZU5hbWUpOyBcclxuXHRcdHZhciAkaWNvbiA9ICQoJzxpIGFyaWEtaGlkZGVuPVwidHJ1ZVwiIC8+JykuYWRkQ2xhc3MoXCJmYSBmYS10cmFzaC1vXCIpOyBcclxuXHJcblx0XHQkZGVsRGl2LmFwcGVuZCgkaWNvbik7IFxyXG5cclxuXHRcdCRpbWdEaXYuY2xpY2soZnVuY3Rpb24oZXZ0KSB7IFxyXG5cdFx0XHRldnQuc3RvcFByb3BhZ2F0aW9uKCk7IFxyXG5cclxuXHRcdFx0dmFyICRwaWMgPSAkKCc8aW1nIHN0eWxlPVwid2lkdGg6IDEwMCVcIiB3aWR0aD1cIjEwMCVcIiAvPicpLmF0dHIoJ3NyYycsIGltYWdlT2JqZWN0LmNvbnRlbnQpO1xyXG5cdCAgICAgICAgXHJcblx0ICAgICAgICBCb290c3RyYXBEaWFsb2cuc2hvdyh7XHJcblx0ICAgICAgICAgICAgdGl0bGU6ICdQaG90byBQcmV2aWV3JyxcclxuXHQgICAgICAgICAgICBtZXNzYWdlOiAkcGljLFxyXG5cdCAgICAgICAgICAgIGNzc0NsYXNzOiAnbG9naW4tZGlhbG9nJywgXHJcblx0ICAgICAgICAgICAgYnV0dG9uczogW3tcclxuXHQgICAgICAgICAgICAgICAgbGFiZWw6ICdPSycsXHJcblx0ICAgICAgICAgICAgICAgIGNzc0NsYXNzOiAnYnRuLXByaW1hcnknLFxyXG5cdCAgICAgICAgICAgICAgICBhY3Rpb246IGZ1bmN0aW9uKGRpYWxvZ1JlZil7XHJcblx0ICAgICAgICAgICAgICAgICAgICBkaWFsb2dSZWYuY2xvc2UoKTtcclxuXHQgICAgICAgICAgICAgICAgfVxyXG5cdCAgICAgICAgICAgIH1dXHJcblx0ICAgICAgICB9KTsgXHJcblx0XHR9KTsgXHJcblxyXG5cdFx0JGRlbERpdi5jbGljayhmdW5jdGlvbihldnQpIHsgXHJcblx0XHQgICAgZXZ0LnN0b3BQcm9wYWdhdGlvbigpOyBcclxuXHJcblx0XHQgICAgdmFyIGltYWdlSWQgPSBpbWFnZU9iamVjdC5maWxlTmFtZTsgXHJcblx0ICAgICAgICBpZiAoY29uZmlybSgnQXJlIHlvdSBzdXJlPycpID09IHRydWUpIHtcclxuXHJcblx0ICAgICAgICAgICAgdmFyICRkZWxJbWcgPSAkKCdkaXZbZGF0YS1pZD1cIicgKyBpbWFnZUlkICsnXCJdJyk7XHJcblx0ICAgICAgICAgICAgdmFyICRwaG90byA9ICRkZWxJbWcucGFyZW50KCk7IFxyXG5cclxuXHRcdFx0XHR2YXIgJHBob3RvQ29udGFpbmVyID0gJHBob3RvLmNsb3Nlc3QoJy5waG90by1pbWFnZXNldCcpOyBcclxuXHRcdFx0XHR2YXIgJHBob3RvQ29udGFpbmVySW1hZ2VzID0gJHBob3RvQ29udGFpbmVyLmZpbmQoJ2ltZycpOyBcclxuXHRcdFx0XHR2YXIgcmVtYWluaW5nSW1hZ2VzQ291bnQgPSAkcGhvdG9Db250YWluZXJJbWFnZXMubGVuZ3RoIC0gMTsgXHQvLyBleGNsdWRlIHRoZSBjdXJyZW50IG9uZSB3aGljaCBpcyBiZWluZyBkZWxldGVkIFxyXG5cclxuXHQgICAgICAgICAgICAkcGhvdG8ucmVtb3ZlKCk7IFxyXG5cclxuXHQgICAgICAgICAgICBwaG90b0RCLmRlbGV0ZVBob3RvKGltYWdlSWQpXHJcblx0ICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24ocGhvdG8pIHtcclxuXHJcblx0XHRcdFx0XHQvLyBubyBpbWFnZXMgLT4gaGlkZSB0aGUgY29udGFpbmVyIChub3RoaW5nIHRvIHNob3cpIFxyXG5cdCAgICAgICAgICAgIFx0aWYgKHJlbWFpbmluZ0ltYWdlc0NvdW50ID09IDApIHsgXHJcblx0XHRcdFx0XHRcdCRwaG90b0NvbnRhaW5lci5hZGRDbGFzcyhcImhpZGRlblwiKTsgXHJcblx0ICAgICAgICAgICAgXHR9XHJcblx0ICAgICAgICAgICAgfSk7IFxyXG5cdCAgICAgICAgfVxyXG5cdFx0fSk7IFxyXG5cclxuXHRcdCRpbWdEaXYuYXBwZW5kKCRkZWxEaXYpOyBcclxuXHRcdCRpbWdEaXYuYXBwZW5kKCQoXCI8aW1nIC8+XCIpLmF0dHIoXCJzcmNcIiwgaW1hZ2VPYmplY3QuY29udGVudCkuYXR0cihcIndpZHRoXCIsIHBob3RvU2l6ZS53aWR0aCkuYXR0cihcImhlaWdodFwiLCBwaG90b1NpemUuaGVpZ2h0KSk7IFxyXG5cclxuXHRcdCRpbWFnZXNEaXYuYXBwZW5kKCRpbWdEaXYpOyBcclxuXHR9XHJcblxyXG5cdHJldHVybiB7ICAgICAgICBcclxuICAgIFx0Y29uZmlndXJlQ2FtZXJhczogY29uZmlndXJlQ2FtZXJhcywgXHJcbiAgICBcdGNvbmZpZ3VyZUNhbWVyYTogY29uZmlndXJlQ2FtZXJhIFxyXG4gICAgfTtcclxuXHJcbn0oKSk7ICIsInZhciBjYW1lcmFVdGlscyA9IChmdW5jdGlvbigpIHtcclxuXHJcbiBcdGZ1bmN0aW9uIFM0KCkge1xyXG4gICAgICAgIHJldHVybiAoKCgxK01hdGgucmFuZG9tKCkpKjB4MTAwMDApfDApLnRvU3RyaW5nKDE2KS5zdWJzdHJpbmcoMSk7IFxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIG5ld0d1aWQoKSB7XHJcblxyXG5cdFx0Ly8gdGhlbiB0byBjYWxsIGl0LCBwbHVzIHN0aXRjaCBpbiAnNCcgaW4gdGhlIHRoaXJkIGdyb3VwXHJcblx0XHR2YXIgZ3VpZCA9IChTNCgpICsgUzQoKSArIFwiLVwiICsgUzQoKSArIFwiLTRcIiArIFM0KCkuc3Vic3RyKDAsMykgKyBcIi1cIiArIFM0KCkgKyBcIi1cIiArIFM0KCkgKyBTNCgpICsgUzQoKSkudG9Mb3dlckNhc2UoKTtcclxuXHRcdHJldHVybiBndWlkOyBcclxuICAgIH0gXHJcblxyXG4gICAgZnVuY3Rpb24gaXNJT1MoKSB7IFxyXG5cdFx0dmFyIGlPUyA9IFsnaVBhZCcsICdpUGhvbmUnLCAnaVBvZCddLmluZGV4T2YobmF2aWdhdG9yLnBsYXRmb3JtKSA+PSAwOyBcclxuXHRcdHJldHVybiBpT1M7IFxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB7IFxyXG4gICAgXHRuZXdHdWlkOiBuZXdHdWlkLCBcclxuICAgIFx0aXNJT1M6IGlzSU9TIFxyXG4gICAgfTtcclxuXHJcbn0oKSk7IFxyXG4iLCJ2YXIgQ2FtZXJhID0gKGZ1bmN0aW9uKCkgeyBcclxuXHJcblx0ZnVuY3Rpb24gQ2FtZXJhKGNhbWVyYVNlbGVjdG9yLCBleGlzdGluZ1Bob3Rvcykge1xyXG5cdFx0dGhpcy5jYW1lcmFTZWxlY3RvciA9IGNhbWVyYVNlbGVjdG9yOyBcclxuXHRcdHRoaXMuZXhpc3RpbmdQaG90b3MgPSBleGlzdGluZ1Bob3RvczsgXHJcblxyXG5cdFx0Y2FtZXJhVUkuY29uZmlndXJlQ2FtZXJhKGNhbWVyYVNlbGVjdG9yLCBleGlzdGluZ1Bob3Rvcyk7IFxyXG5cdH1cclxuXHJcblx0Q2FtZXJhLnByb3RvdHlwZS5nZXRQaG90b3MgPSBmdW5jdGlvbigpIHtcclxuXHRcdFxyXG5cdFx0cmV0dXJuIHBob3RvREIuZmluZFBob3Rvc0J5Q2FtZXJhSWQodGhpcy5jYW1lcmFTZWxlY3Rvcik7IFxyXG5cdH07IFxyXG5cclxuXHRyZXR1cm4gQ2FtZXJhOyBcclxufSkoKTtcclxuXHJcbiIsInZhciBwaG90b1N0YXR1c2VzID0geyBOZXc6IDAsIEV4aXN0aW5nOiAxLCBEZWxldGVkOiAyIH07IFxyXG5cclxudmFyIHBob3RvREIgPSAoZnVuY3Rpb24oKSB7XHJcblxyXG5cdHZhciBkYjsgXHJcblxyXG4gICAgaW5pdCgpOyBcclxuXHJcbiAgICBmdW5jdGlvbiBpbml0KCkgeyBcclxuXHJcblx0XHR2YXIgc2NoZW1hID0ge1xyXG5cdFx0ICBzdG9yZXM6IFt7XHJcblx0XHQgICAgbmFtZTogJ3Bob3RvVGFibGUnLFxyXG5cdFx0ICAgIGluZGV4ZXM6IFt7IG5hbWU6ICdmaWxlTmFtZScgfSwgeyBuYW1lOiAnY2FtZXJhSWQnIH1dXHJcblx0XHQgIH1dXHJcblx0XHR9OyBcclxuXHJcbiAgICAgICAgZGIgPSBuZXcgeWRuLmRiLlN0b3JhZ2UoJ01NU1Bob3RvREInLCBzY2hlbWEpOyBcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBhZGROZXdQaG90byhpZCwgY2FtZXJhSWQsIGNvbnRlbnQpIHsgXHJcblxyXG4gICAgICAgIC8vIHdlIGFzc3VtZSBoZXJlIHRoYXQgaWQgKGZpbGVOYW1lKSBpcyB1bmlxdWUgXHJcbiAgICAgICAgZGIucHV0KCdwaG90b1RhYmxlJywgeyBmaWxlTmFtZTogaWQsIGNhbWVyYUlkOiBjYW1lcmFJZCwgZGF0ZVRha2VuOiBTdHJpbmcobmV3IERhdGUoKSksIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBob3RvU3RhdHVzOiBwaG90b1N0YXR1c2VzLk5ldywgY29udGVudDogY29udGVudCB9LCBpZCk7IFxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGFkZEV4aXN0aW5nUGhvdG8oY2FtZXJhSWQsIGNvbnRlbnQpIHsgIFxyXG5cclxuICAgICAgICB2YXIgaWQgPSBjYW1lcmFVdGlscy5uZXdHdWlkKCkgKyBcIi5wbmdcIjsgXHJcblxyXG4gICAgICAgIC8vIHdlIGFzc3VtZSBoZXJlIHRoYXQgaWQgKGZpbGVOYW1lKSBpcyB1bmlxdWUgXHJcbiAgICAgICAgZGIucHV0KCdwaG90b1RhYmxlJywgeyBmaWxlTmFtZTogaWQsIGNhbWVyYUlkOiBjYW1lcmFJZCwgZGF0ZVRha2VuOiBudWxsLCBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwaG90b1N0YXR1czogcGhvdG9TdGF0dXNlcy5FeGlzdGluZywgY29udGVudDogY29udGVudCB9LCBpZCk7IFxyXG4gICAgfVxyXG4gICAgXHJcbiAgICBmdW5jdGlvbiBnZXRQaG90b3MoKSB7XHJcblxyXG4gICAgICAgIHZhciBwID0gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XHJcblxyXG4gICAgICAgICAgICB2YXIgcXVlcnkgPSBkYi5mcm9tKCdwaG90b1RhYmxlJyk7IFxyXG4gICAgICAgICAgICBxdWVyeSA9IHF1ZXJ5LndoZXJlKCdwaG90b1N0YXR1cycsICc8JywgcGhvdG9TdGF0dXNlcy5EZWxldGVkKTsgXHJcbiAgICAgICAgICAgIHF1ZXJ5Lmxpc3QoKS5kb25lKGZ1bmN0aW9uKHBob3Rvcykge1xyXG4gICAgICAgICAgICAgICByZXNvbHZlKHBob3Rvcyk7IFxyXG4gICAgICAgICAgICB9KTsgXHJcbiAgICAgICAgfSk7IFxyXG5cclxuICAgICAgICByZXR1cm4gcDsgXHJcbiAgICB9XHJcblxyXG4gICAgLy8gcGVyZm9ybXMgYSB2aXJ0dWFsIGRlbGV0ZSBoZXJlIFxyXG4gICAgZnVuY3Rpb24gZGVsZXRlUGhvdG8oaWQpIHsgXHJcblxyXG4gICAgICAgIHZhciBwID0gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XHJcblxyXG4gICAgICAgICAgICBmaW5kUGhvdG9zQnlGaWxlTmFtZShpZCkudGhlbihmdW5jdGlvbihwaG90b3MpIHtcclxuICAgICAgICAgICAgICAgIGlmIChwaG90b3MubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBwaG90byA9IHBob3Rvc1swXTsgXHJcbiAgICAgICAgICAgICAgICAgICAgcGhvdG8ucGhvdG9TdGF0dXMgPSBwaG90b1N0YXR1c2VzLkRlbGV0ZWQ7IFxyXG4gICAgICAgICAgICAgICAgICAgIGRiLnB1dCgncGhvdG9UYWJsZScsIHBob3RvLCBpZCk7IFxyXG5cclxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHBob3RvKTsgXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pOyBcclxuICAgICAgICB9KTsgXHJcblxyXG4gICAgICAgIHJldHVybiBwOyBcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBmaW5kUGhvdG9zQnlGaWxlTmFtZShmaWxlTmFtZSkge1xyXG5cclxuICAgICAgICB2YXIgcCA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xyXG5cclxuICAgICAgICAgICAgdmFyIHEgPSBkYi5mcm9tKCdwaG90b1RhYmxlJyk7XHJcbiAgICAgICAgICAgIHEgPSBxLndoZXJlKCdmaWxlTmFtZScsICc9JywgZmlsZU5hbWUpO1xyXG4gICAgICAgICAgICBxLmxpc3QoKS5kb25lKGZ1bmN0aW9uKHBob3Rvcykge1xyXG4gICAgICAgICAgICAgICAgcmVzb2x2ZShwaG90b3MpOyBcclxuICAgICAgICAgICAgfSk7IFxyXG4gICAgICAgIH0pOyBcclxuXHJcbiAgICAgICAgcmV0dXJuIHA7IFxyXG4gICAgfVxyXG5cclxuICAgIC8vIEhlcmUgY2FtZXJhSWQgaXMgYSB2YWxpZCBKUXVlcnkgY2FtZXJhIHNlbGVjdG9yLiBcclxuICAgIGZ1bmN0aW9uIGZpbmRQaG90b3NCeUNhbWVyYUlkKGNhbWVyYUlkKSB7ICBcclxuXHJcbiAgICAgICAgdmFyIHAgPSBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcclxuXHJcbiAgICAgICAgICAgIHZhciBxID0gZGIuZnJvbSgncGhvdG9UYWJsZScpO1xyXG4gICAgICAgICAgICBxID0gcS53aGVyZSgnY2FtZXJhSWQnLCAnPScsIGNhbWVyYUlkKTtcclxuICAgICAgICAgICAgLy9xID0gcS53aGVyZSgncGhvdG9TdGF0dXMnLCAnPCcsIHBob3RvU3RhdHVzZXMuRGVsZXRlZCk7IFxyXG4gICAgICAgICAgICBxLmxpc3QoKS5kb25lKGZ1bmN0aW9uKHBob3Rvcykge1xyXG5cclxuICAgICAgICAgICAgICAgIHZhciBmaWx0ZXJlZFBob3RvcyA9IFtdOyBcclxuICAgICAgICAgICAgICAgIHBob3Rvcy5mb3JFYWNoKGZ1bmN0aW9uKHBob3RvKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHBob3RvLnBob3RvU3RhdHVzICE9IHBob3RvU3RhdHVzZXMuRGVsZXRlZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBmaWx0ZXJlZFBob3Rvcy5wdXNoKHBob3RvKTsgXHJcbiAgICAgICAgICAgICAgICAgICAgfSAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICB9KTsgXHJcblxyXG4gICAgICAgICAgICAgICAgcmVzb2x2ZShmaWx0ZXJlZFBob3Rvcyk7IFxyXG4gICAgICAgICAgICB9KTsgXHJcbiAgICAgICAgfSk7IFxyXG5cclxuICAgICAgICByZXR1cm4gcDsgXHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHsgICAgICAgIFxyXG4gICAgXHRhZGROZXdQaG90bzogYWRkTmV3UGhvdG8sIFxyXG4gICAgICAgIGFkZEV4aXN0aW5nUGhvdG86IGFkZEV4aXN0aW5nUGhvdG8sIFxyXG4gICAgICAgIGdldFBob3RvczogZ2V0UGhvdG9zLCBcclxuICAgIFx0ZGVsZXRlUGhvdG86IGRlbGV0ZVBob3RvLCBcclxuICAgICAgICBmaW5kUGhvdG9zQnlGaWxlTmFtZTogZmluZFBob3Rvc0J5RmlsZU5hbWUsIFxyXG4gICAgICAgIGZpbmRQaG90b3NCeUNhbWVyYUlkOiBmaW5kUGhvdG9zQnlDYW1lcmFJZCAgXHJcbiAgICB9O1xyXG5cclxufSgpKTsgXHJcbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
