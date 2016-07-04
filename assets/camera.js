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
	            $photo.remove(); 

	            photoDB.deletePhoto(imageId)
	            .then(function(photo) {
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNhbWVyYS1kaWFsb2cuanMiLCJjYW1lcmEtdWkuanMiLCJjYW1lcmEtdXRpbHMuanMiLCJjYW1lcmEuanMiLCJwaG90b0RCLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLElBQUEsZ0JBQUEsV0FBQTs7Q0FFQSxJQUFBLGNBQUEsRUFBQSxPQUFBLE1BQUEsT0FBQTtDQUNBLElBQUE7O0NBRUEsSUFBQSxRQUFBO0NBQ0EsSUFBQSxhQUFBLFlBQUE7O0NBRUEsU0FBQSxnQkFBQSxlQUFBLFVBQUEsYUFBQSxzQkFBQTs7RUFFQSxjQUFBLE9BQUEsQ0FBQSxTQUFBLFVBQUEsYUFBQSxVQUFBOztHQUVBLE9BQUEsU0FBQSxLQUFBO0lBQ0EsSUFBQSxJQUFBLElBQUEsT0FBQSxNQUFBO0lBQ0EsSUFBQSxTQUFBLElBQUE7O0lBRUEsT0FBQSxTQUFBLFNBQUEsU0FBQTs7UUFFQSxJQUFBLFVBQUE7U0FDQSxJQUFBLFVBQUEsUUFBQSxPQUFBO1NBQ0EsU0FBQSxVQUFBLGFBQUE7O2FBRUE7U0FDQSxRQUFBLEtBQUE7Ozs7SUFJQSxJQUFBLG1CQUFBLEdBQUEsTUFBQTtJQUNBLElBQUEsa0JBQUEsaUJBQUEsS0FBQTtJQUNBLGdCQUFBLFlBQUE7OztJQUdBLE9BQUEsY0FBQTs7O0tBR0EsVUFBQSxhQUFBOzs7Q0FHQSxTQUFBLHdCQUFBOztFQUVBLE9BQUEsQ0FBQTtXQUNBO2VBQ0E7ZUFDQTttQkFDQTtvQkFDQTttQkFDQTtlQUNBO2VBQ0E7bUJBQ0E7b0JBQ0E7bUJBQ0E7ZUFDQTtXQUNBO09BQ0EsVUFBQSxLQUFBOzs7Q0FHQSxTQUFBLG9CQUFBLFVBQUEsYUFBQSxzQkFBQTs7UUFFQSxnQkFBQSxLQUFBO1lBQ0EsT0FBQTtZQUNBLFNBQUEsRUFBQTtZQUNBLFVBQUE7WUFDQSxTQUFBLFNBQUEsV0FBQTs7YUFFQSxXQUFBOzs7SUFHQSxJQUFBLFNBQUEsVUFBQTs7SUFFQSxjQUFBLE9BQUEsS0FBQTtJQUNBLGFBQUEsT0FBQSxLQUFBO0lBQ0EsV0FBQSxPQUFBLEtBQUE7O2FBRUEsSUFBQSxPQUFBLFVBQUE7O2FBRUEsSUFBQSxZQUFBLEtBQUEsS0FBQTthQUNBLFVBQUEsTUFBQTs7O0lBR0EsU0FBQSxLQUFBLEtBQUE7SUFDQSxVQUFBLEtBQUEsS0FBQTs7YUFFQSxJQUFBLFFBQUEsT0FBQTtJQUNBLElBQUEsU0FBQSxPQUFBLFNBQUEsUUFBQTs7SUFFQSxNQUFBLGVBQUEsV0FBQTtLQUNBLElBQUEsWUFBQSxTQUFBLGFBQUE7TUFDQSxZQUFBLFlBQUE7Ozs7SUFJQSxVQUFBLGFBQUEsYUFBQTtLQUNBLEtBQUEsVUFBQSxRQUFBO0tBQ0EsT0FBQSxTQUFBO0tBQ0EsTUFBQSxZQUFBO0tBQ0EsTUFBQSxNQUFBLE9BQUEsSUFBQSxnQkFBQTs7S0FFQSxNQUFBLFVBQUEsT0FBQTtNQUNBLFFBQUEsS0FBQSxrQ0FBQTs7OztJQUlBLElBQUEsbUJBQUEsR0FBQSxNQUFBO0lBQ0EsSUFBQSxrQkFBQSxpQkFBQSxLQUFBO0lBQ0EsZ0JBQUEsWUFBQTs7WUFFQSxVQUFBLFNBQUEsV0FBQTthQUNBOztZQUVBLFVBQUE7WUFDQSxTQUFBLENBQUE7Z0JBQ0EsT0FBQTtnQkFDQSxNQUFBO2dCQUNBLFVBQUE7Z0JBQ0EsUUFBQSxVQUFBLGNBQUE7UUFDQTs7ZUFFQTtnQkFDQSxPQUFBO2dCQUNBLE1BQUE7Z0JBQ0EsVUFBQTtnQkFDQSxRQUFBLFVBQUEsY0FBQTtRQUNBOztlQUVBO2dCQUNBLE9BQUE7Z0JBQ0EsTUFBQTtnQkFDQSxVQUFBO2dCQUNBLFFBQUEsVUFBQSxjQUFBOztRQUVBLElBQUEsVUFBQTtTQUNBLElBQUEsVUFBQSxPQUFBLFVBQUE7U0FDQSxTQUFBLFVBQUEsYUFBQTs7YUFFQTtTQUNBLFFBQUEsS0FBQTs7O29CQUdBLGFBQUE7O2VBRUE7Z0JBQ0EsT0FBQTtnQkFDQSxNQUFBO2dCQUNBLFVBQUE7Z0JBQ0EsUUFBQSxVQUFBLGNBQUE7b0JBQ0EsYUFBQTs7Ozs7O0NBTUEsU0FBQSxzQkFBQTtFQUNBLE9BQUEsWUFBQTtFQUNBLFFBQUEsWUFBQTs7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LE1BQUE7O2FBRUEsSUFBQSxVQUFBLEVBQUEsa0JBQUEsU0FBQTthQUNBLElBQUEsU0FBQSxRQUFBO2FBQ0EsT0FBQTs7YUFFQSxRQUFBLFlBQUE7Y0FDQSxLQUFBLFNBQUEsT0FBQTs7Ozs7RUFLQSxRQUFBLE9BQUE7RUFDQSxRQUFBLE9BQUEsRUFBQSxXQUFBLEtBQUEsT0FBQSxZQUFBLFNBQUEsS0FBQSxTQUFBLFVBQUEsT0FBQSxLQUFBLFVBQUEsVUFBQTs7RUFFQSxXQUFBLE9BQUE7OztDQUdBLE9BQUE7S0FDQSxrQkFBQTtLQUNBLGlCQUFBOzs7O0FDdkhBLElBQUEsZUFBQSxXQUFBOztFQUVBLFNBQUEsS0FBQTtRQUNBLE9BQUEsQ0FBQSxDQUFBLENBQUEsRUFBQSxLQUFBLFVBQUEsU0FBQSxHQUFBLFNBQUEsSUFBQSxVQUFBOzs7SUFHQSxTQUFBLFVBQUE7OztFQUdBLElBQUEsT0FBQSxDQUFBLE9BQUEsT0FBQSxNQUFBLE9BQUEsT0FBQSxLQUFBLE9BQUEsRUFBQSxLQUFBLE1BQUEsT0FBQSxNQUFBLE9BQUEsT0FBQSxNQUFBO0VBQ0EsT0FBQTs7O0lBR0EsU0FBQSxRQUFBO0VBQ0EsSUFBQSxNQUFBLENBQUEsUUFBQSxVQUFBLFFBQUEsUUFBQSxVQUFBLGFBQUE7RUFDQSxPQUFBOzs7SUFHQSxPQUFBO0tBQ0EsU0FBQTtLQUNBLE9BQUE7Ozs7O0FDcEJBLElBQUEsU0FBQSxDQUFBLFdBQUE7O0NBRUEsU0FBQSxPQUFBLFVBQUEsZ0JBQUE7RUFDQSxLQUFBLFdBQUE7RUFDQSxLQUFBLGlCQUFBOztFQUVBLFNBQUEsZ0JBQUEsVUFBQTs7O0NBR0EsT0FBQSxVQUFBLFlBQUEsV0FBQTs7RUFFQSxPQUFBLFFBQUEscUJBQUEsS0FBQTs7O0NBR0EsT0FBQTs7OztBQ2RBLElBQUEsZ0JBQUEsRUFBQSxLQUFBLEdBQUEsVUFBQSxHQUFBLFNBQUE7O0FBRUEsSUFBQSxXQUFBLFdBQUE7O0NBRUEsSUFBQTs7SUFFQTs7SUFFQSxTQUFBLE9BQUE7O0VBRUEsSUFBQSxTQUFBO0lBQ0EsUUFBQSxDQUFBO01BQ0EsTUFBQTtNQUNBLFNBQUEsQ0FBQSxFQUFBLE1BQUEsY0FBQSxFQUFBLE1BQUE7Ozs7UUFJQSxLQUFBLElBQUEsSUFBQSxHQUFBLFFBQUEsY0FBQTs7O0lBR0EsU0FBQSxZQUFBLElBQUEsVUFBQSxTQUFBOzs7UUFHQSxHQUFBLElBQUEsY0FBQSxFQUFBLFVBQUEsSUFBQSxVQUFBLFVBQUEsV0FBQSxPQUFBLElBQUE7Z0NBQ0EsYUFBQSxjQUFBLEtBQUEsU0FBQSxXQUFBOzs7SUFHQSxTQUFBLGlCQUFBLFVBQUEsU0FBQTs7UUFFQSxJQUFBLEtBQUEsWUFBQSxZQUFBOzs7UUFHQSxHQUFBLElBQUEsY0FBQSxFQUFBLFVBQUEsSUFBQSxVQUFBLFVBQUEsV0FBQTtnQ0FDQSxhQUFBLGNBQUEsVUFBQSxTQUFBLFdBQUE7OztJQUdBLFNBQUEsWUFBQTs7UUFFQSxJQUFBLElBQUEsSUFBQSxRQUFBLFNBQUEsU0FBQSxRQUFBOztZQUVBLElBQUEsUUFBQSxHQUFBLEtBQUE7WUFDQSxRQUFBLE1BQUEsTUFBQSxlQUFBLEtBQUEsY0FBQTtZQUNBLE1BQUEsT0FBQSxLQUFBLFNBQUEsUUFBQTtlQUNBLFFBQUE7Ozs7UUFJQSxPQUFBOzs7O0lBSUEsU0FBQSxZQUFBLElBQUE7O1FBRUEsSUFBQSxJQUFBLElBQUEsUUFBQSxTQUFBLFNBQUEsUUFBQTs7WUFFQSxxQkFBQSxJQUFBLEtBQUEsU0FBQSxRQUFBO2dCQUNBLElBQUEsT0FBQSxTQUFBLEdBQUE7b0JBQ0EsSUFBQSxRQUFBLE9BQUE7b0JBQ0EsTUFBQSxjQUFBLGNBQUE7b0JBQ0EsR0FBQSxJQUFBLGNBQUEsT0FBQTs7b0JBRUEsUUFBQTs7Ozs7UUFLQSxPQUFBOzs7SUFHQSxTQUFBLHFCQUFBLFVBQUE7O1FBRUEsSUFBQSxJQUFBLElBQUEsUUFBQSxTQUFBLFNBQUEsUUFBQTs7WUFFQSxJQUFBLElBQUEsR0FBQSxLQUFBO1lBQ0EsSUFBQSxFQUFBLE1BQUEsWUFBQSxLQUFBO1lBQ0EsRUFBQSxPQUFBLEtBQUEsU0FBQSxRQUFBO2dCQUNBLFFBQUE7Ozs7UUFJQSxPQUFBOzs7SUFHQSxTQUFBLHFCQUFBLFVBQUE7O1FBRUEsSUFBQSxJQUFBLElBQUEsUUFBQSxTQUFBLFNBQUEsUUFBQTs7WUFFQSxJQUFBLElBQUEsR0FBQSxLQUFBO1lBQ0EsSUFBQSxFQUFBLE1BQUEsWUFBQSxLQUFBOztZQUVBLEVBQUEsT0FBQSxLQUFBLFNBQUEsUUFBQTs7Z0JBRUEsSUFBQSxpQkFBQTtnQkFDQSxPQUFBLFFBQUEsU0FBQSxPQUFBO29CQUNBLElBQUEsTUFBQSxlQUFBLGNBQUEsU0FBQTt3QkFDQSxlQUFBLEtBQUE7Ozs7Z0JBSUEsUUFBQTs7OztRQUlBLE9BQUE7OztJQUdBLE9BQUE7S0FDQSxhQUFBO1FBQ0Esa0JBQUE7UUFDQSxXQUFBO0tBQ0EsYUFBQTtRQUNBLHNCQUFBO1FBQ0Esc0JBQUE7Ozs7QUFJQSIsImZpbGUiOiJjYW1lcmEuanMiLCJzb3VyY2VzQ29udGVudCI6WyJ2YXIgY2FtZXJhRGlhbG9nID0gKGZ1bmN0aW9uKCkge1xyXG5cclxuXHR2YXIgY29uc3RyYWludHMgPSB7IHZpZGVvOiB0cnVlLCBhdWRpbzogZmFsc2UgfTsgXHJcblx0dmFyIGNhbGxiYWNrOyBcclxuXHJcblx0dmFyICR2aWRlbywgJGNhbnZhczsgXHJcblx0dmFyICRidG5DYXB0dXJlLCAkYnRuUmV0YWtlLCAkYnRuU2F2ZTsgXHJcblxyXG5cdGZ1bmN0aW9uIGNvbmZpZ3VyZUZvcklPUyhjYW1lcmFMaW5rSU9TLCBjYW1lcmFJZCwgY29udGFpbmVySWQsIHNhdmVTbmFwc2hvdENhbGxiYWNrKSB7XHJcblxyXG5cdFx0Y2FtZXJhTGlua0lPUy5jaGFuZ2UoKGZ1bmN0aW9uKGNhbWVyYUlkLCBjb250YWluZXJJZCwgY2FsbGJhY2spIHtcclxuXHJcblx0XHRcdHJldHVybiBmdW5jdGlvbihldnQpIHtcclxuXHRcdFx0XHR2YXIgZiA9IGV2dC50YXJnZXQuZmlsZXNbMF07IFxyXG5cdFx0XHRcdHZhciByZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpO1xyXG5cclxuXHRcdFx0XHRyZWFkZXIub25sb2FkID0gZnVuY3Rpb24odGhlRmlsZSkge1xyXG5cclxuXHRcdFx0ICAgIFx0aWYgKGNhbGxiYWNrKSB7XHJcblx0XHRcdCAgICBcdFx0dmFyIGltZ0RhdGEgPSB0aGVGaWxlLnRhcmdldC5yZXN1bHQ7IFxyXG5cdFx0XHQgICAgXHRcdGNhbGxiYWNrKGNhbWVyYUlkLCBjb250YWluZXJJZCwgaW1nRGF0YSk7IFxyXG5cdFx0XHQgICAgXHR9XHJcblx0XHRcdCAgICBcdGVsc2Uge1xyXG5cdFx0XHQgICAgXHRcdGNvbnNvbGUud2FybihcIkNhbGxiYWNrIGlzIG5vdCBkZWZpbmVkIVwiKTsgXHJcblx0XHRcdCAgICBcdH1cclxuXHRcdFx0XHR9OyBcclxuXHJcblx0XHRcdFx0dmFyICRjYW1lcmFDb250YWluZXIgPSAkKCBcIiNcIiArIGNhbWVyYUlkICk7XHJcblx0XHRcdFx0dmFyICRwaG90b0NvbnRhaW5lciA9ICRjYW1lcmFDb250YWluZXIuZmluZChcIi5waG90by1pbWFnZXNldFwiKTtcclxuXHRcdFx0XHQkcGhvdG9Db250YWluZXIucmVtb3ZlQ2xhc3MoXCJoaWRkZW5cIik7XHRcdFx0XHJcblxyXG5cdFx0XHRcdC8vIFJlYWQgaW4gdGhlIGltYWdlIGZpbGUgYXMgYSBkYXRhIFVSTC5cclxuXHRcdFx0XHRyZWFkZXIucmVhZEFzRGF0YVVSTChmKTtcclxuXHRcdFx0fTsgXHJcblxyXG5cdFx0fSkoY2FtZXJhSWQsIGNvbnRhaW5lcklkLCBzYXZlU25hcHNob3RDYWxsYmFjaykpOyBcclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIGdldENhbWVyYVRlbXBsYXRlSHRtbCgpIHtcclxuXHJcblx0XHRyZXR1cm4gWyc8ZGl2IGlkPVwiY2FtZXJhLWRpYWxvZ1wiPicsIFxyXG5cdFx0XHQgICAgICAgICc8Zm9ybSBuYW1lPVwiY2FtZXJhRm9ybVwiPicsXHJcblx0XHRcdCAgICAgICAgICAgICc8aW1nIHNyYz1cImltZy9zcGlubmVyLmdpZlwiIGNsYXNzPVwic3Bpbm5lclwiIC8+JywgIFxyXG5cdFx0XHQgICAgICAgICAgICAnPGRpdiBjbGFzcz1cInJvd1wiPicsXHJcblx0XHRcdCAgICAgICAgICAgICAgICAnPGRpdiBjbGFzcz1cImNvbC1zbS0xMlwiPicsXHJcblx0XHRcdCAgICAgICAgICAgICAgICBcdCc8dmlkZW8gaWQ9XCJkYXRhVmlkZW9JZFwiIGF1dG9wbGF5IHN0eWxlPVwid2lkdGg6MTAwJVwiIHdpZHRoPVwiMTAwJVwiPjwvdmlkZW8+JyxcclxuXHRcdFx0ICAgICAgICAgICAgICAgICc8L2Rpdj4nLFxyXG5cdFx0XHQgICAgICAgICAgICAnPC9kaXY+JywgXHJcblx0XHRcdCAgICAgICAgICAgICc8ZGl2IGNsYXNzPVwicm93XCI+JyxcclxuXHRcdFx0ICAgICAgICAgICAgICAgICc8ZGl2IGNsYXNzPVwiY29sLXNtLTEyXCI+JyxcclxuXHRcdFx0ICAgICAgICAgICAgICAgIFx0JzxjYW52YXMgaWQ9XCJjYW52YXNJZFwiIGNsYXNzPVwiaGlkZGVuXCIgc3R5bGU9XCJ3aWR0aDoxMDAlO1wiIHdpZHRoPVwiMTAwJVwiPjwvY2FudmFzPicsXHJcblx0XHRcdCAgICAgICAgICAgICAgICAnPC9kaXY+JyxcclxuXHRcdFx0ICAgICAgICAgICAgJzwvZGl2PicsIFxyXG5cdFx0XHQgICAgICAgICc8L2Zvcm0+JyxcclxuXHRcdFx0ICAgICc8L2Rpdj4nXS5qb2luKCdcXG4nKTsgXHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiBkaXNwbGF5Q2FtZXJhRGlhbG9nKGNhbWVyYUlkLCBjb250YWluZXJJZCwgc2F2ZVNuYXBzaG90Q2FsbGJhY2spIHsgXHJcblxyXG4gICAgICAgIEJvb3RzdHJhcERpYWxvZy5zaG93KHtcclxuICAgICAgICAgICAgdGl0bGU6ICdUYWtlIGEgcGhvdG8nLFxyXG4gICAgICAgICAgICBtZXNzYWdlOiAkKGdldENhbWVyYVRlbXBsYXRlSHRtbCgpKSwgXHJcbiAgICAgICAgICAgIGNzc0NsYXNzOiAnbG9naW4tZGlhbG9nJywgXHJcbiAgICAgICAgICAgIG9uc2hvd246IGZ1bmN0aW9uKGRpYWxvZ1JlZikge1xyXG4gICAgICAgICAgICBcdFxyXG4gICAgICAgICAgICBcdGNhbGxiYWNrID0gc2F2ZVNuYXBzaG90Q2FsbGJhY2s7IFxyXG5cclxuICAgICAgICAgICAgXHQvLyBpbml0IHJlZmVyZW5jZXMgdG8gYnV0dG9ucyBmcm9tIG1vZGFsIGZvb3RlciBcclxuXHRcdFx0XHR2YXIgZm9vdGVyID0gZGlhbG9nUmVmLmdldE1vZGFsRm9vdGVyKCk7IFxyXG5cclxuXHRcdFx0XHQkYnRuQ2FwdHVyZSA9IGZvb3Rlci5maW5kKFwiLmJ0bi1jYXB0dXJlXCIpOyBcclxuXHRcdFx0XHQkYnRuUmV0YWtlID0gZm9vdGVyLmZpbmQoXCIuYnRuLXJldGFrZVwiKTsgXHJcblx0XHRcdFx0JGJ0blNhdmUgPSBmb290ZXIuZmluZChcIi5idG4tc2F2ZVwiKTtcclxuICAgICAgICAgICAgXHRcclxuICAgICAgICAgICAgXHR2YXIgYm9keSA9IGRpYWxvZ1JlZi5nZXRNb2RhbEJvZHkoKTtcclxuXHJcbiAgICAgICAgICAgIFx0dmFyIGNoYW5nZUJ0biA9IGJvZHkuZmluZChcIiNjaGFuZ2VJZFwiKTtcclxuICAgICAgICAgICAgXHRjaGFuZ2VCdG4uY2xpY2soc3dhcFZpZGVvV2l0aENhbnZhcyk7XHJcblxyXG4gICAgICAgICAgICBcdC8vIGluaXQgdmlkZW8gJiBjYW52YXMgaGVyZSBcclxuXHRcdFx0XHQkdmlkZW8gPSBib2R5LmZpbmQoXCIjZGF0YVZpZGVvSWRcIik7IFxyXG5cdFx0XHRcdCRjYW52YXMgPSBib2R5LmZpbmQoXCIjY2FudmFzSWRcIik7IFxyXG5cclxuICAgICAgICAgICAgXHR2YXIgdmlkZW8gPSAkdmlkZW9bMF07XHJcblx0XHRcdFx0dmFyIGNhbnZhcyA9IHdpbmRvdy5jYW52YXMgPSAkY2FudmFzWzBdOyBcclxuXHJcblx0XHRcdFx0dmlkZW8ub25sb2FkZWRkYXRhID0gZnVuY3Rpb24oKSB7XHJcblx0XHRcdFx0XHRpZiAoJGJ0bkNhcHR1cmUuaGFzQ2xhc3MoXCJkaXNhYmxlZFwiKSkge1xyXG5cdFx0XHRcdFx0XHQkYnRuQ2FwdHVyZS5yZW1vdmVDbGFzcyhcImRpc2FibGVkXCIpOyBcclxuXHRcdFx0XHRcdH1cclxuXHRcdFx0XHR9XHJcblxyXG5cdFx0XHRcdG5hdmlnYXRvci5tZWRpYURldmljZXMuZ2V0VXNlck1lZGlhKGNvbnN0cmFpbnRzKVxyXG5cdFx0XHRcdC50aGVuKGZ1bmN0aW9uIChzdHJlYW0pIHtcclxuXHRcdFx0XHRcdHdpbmRvdy5zdHJlYW0gPSBzdHJlYW07IFxyXG5cdFx0XHRcdFx0dmlkZW8uc3JjT2JqZWN0ID0gc3RyZWFtO1xyXG5cdFx0XHRcdFx0dmlkZW8uc3JjID0gd2luZG93LlVSTC5jcmVhdGVPYmplY3RVUkwoc3RyZWFtKTsgXHJcblx0XHRcdFx0fSlcclxuXHRcdFx0XHQuY2F0Y2goZnVuY3Rpb24gKGVycm9yKSB7XHJcblx0XHRcdFx0IFx0Y29uc29sZS53YXJuKCduYXZpZ2F0b3IuZ2V0VXNlck1lZGlhIGVycm9yOiAnLCBlcnJvcik7XHJcblx0XHRcdFx0fSk7XHJcblxyXG5cdFx0XHRcdC8vIGRpc3BsYXkgdGhlIGNvbnRhaW5lcj8gXHJcblx0XHRcdFx0dmFyICRjYW1lcmFDb250YWluZXIgPSAkKCBcIiNcIiArIGNhbWVyYUlkICk7XHJcblx0XHRcdFx0dmFyICRwaG90b0NvbnRhaW5lciA9ICRjYW1lcmFDb250YWluZXIuZmluZChcIi5waG90by1pbWFnZXNldFwiKTtcclxuXHRcdFx0XHQkcGhvdG9Db250YWluZXIucmVtb3ZlQ2xhc3MoXCJoaWRkZW5cIik7IFxyXG4gICAgICAgICAgICB9LCBcclxuICAgICAgICAgICAgb25oaWRkZW46IGZ1bmN0aW9uKGRpYWxvZ1JlZikge1xyXG4gICAgICAgICAgICBcdHN0b3BDYW1lcmEoKTsgXHJcbiAgICAgICAgICAgIH0sIFxyXG4gICAgICAgICAgICBjc3NDbGFzczogJ2xvZ2luLWRpYWxvZycsIFxyXG4gICAgICAgICAgICBidXR0b25zOiBbe1xyXG4gICAgICAgICAgICAgICAgbGFiZWw6ICdSZXRha2UnLFxyXG4gICAgICAgICAgICAgICAgaWNvbjogJ2dseXBoaWNvbiBnbHlwaGljb24tc29ydCcsXHJcbiAgICAgICAgICAgICAgICBjc3NDbGFzczogJ2J0biBidG4tcHJpbWFyeSBwdWxsLWxlZnQgaGlkZGVuIGJ0bi1yZXRha2UnLFxyXG4gICAgICAgICAgICAgICAgYWN0aW9uOiBmdW5jdGlvbiAoZGlhbG9nSXRzZWxmKSB7XHJcblx0XHRcdCAgICBcdHN3YXBWaWRlb1dpdGhDYW52YXMoKTsgXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0sIHtcclxuICAgICAgICAgICAgICAgIGxhYmVsOiAnQ2FwdHVyZSBTbmFwc2hvdCcsXHJcbiAgICAgICAgICAgICAgICBpY29uOiAnZ2x5cGhpY29uIGdseXBoaWNvbi1jYW1lcmEnLFxyXG4gICAgICAgICAgICAgICAgY3NzQ2xhc3M6ICdidG4gYnRuLXByaW1hcnkgcHVsbC1sZWZ0IGRpc2FibGVkIGJ0bi1jYXB0dXJlJyxcclxuICAgICAgICAgICAgICAgIGFjdGlvbjogZnVuY3Rpb24gKGRpYWxvZ0l0c2VsZikge1xyXG5cdFx0XHQgICAgXHRjYXB0dXJlU25hcHNob3QoKTsgXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0sIHtcclxuICAgICAgICAgICAgICAgIGxhYmVsOiAnU2F2ZScsXHJcbiAgICAgICAgICAgICAgICBpY29uOiAnZ2x5cGhpY29uIGdseXBoaWNvbi1vaycsXHJcbiAgICAgICAgICAgICAgICBjc3NDbGFzczogJ2J0bi1wcmltYXJ5IGhpZGRlbiBidG4tc2F2ZScsXHJcbiAgICAgICAgICAgICAgICBhY3Rpb246IGZ1bmN0aW9uIChkaWFsb2dJdHNlbGYpIHtcclxuXHJcblx0XHRcdCAgICBcdGlmIChjYWxsYmFjaykge1xyXG5cdFx0XHQgICAgXHRcdHZhciBpbWdEYXRhID0gY2FudmFzLnRvRGF0YVVSTChcImltYWdlL3BuZ1wiKTsgXHJcblx0XHRcdCAgICBcdFx0Y2FsbGJhY2soY2FtZXJhSWQsIGNvbnRhaW5lcklkLCBpbWdEYXRhKTsgXHJcblx0XHRcdCAgICBcdH1cclxuXHRcdFx0ICAgIFx0ZWxzZSB7XHJcblx0XHRcdCAgICBcdFx0Y29uc29sZS53YXJuKFwiQ2FsbGJhY2sgaXMgbm90IGRlZmluZWQhXCIpOyBcclxuXHRcdFx0ICAgIFx0fVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBkaWFsb2dJdHNlbGYuY2xvc2UoKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSwge1xyXG4gICAgICAgICAgICAgICAgbGFiZWw6ICdDYW5jZWwnLFxyXG4gICAgICAgICAgICAgICAgaWNvbjogJ2dseXBoaWNvbiBnbHlwaGljb24tcmVtb3ZlJyxcclxuICAgICAgICAgICAgICAgIGNzc0NsYXNzOiAnYnRuLWRhbmdlcicsXHJcbiAgICAgICAgICAgICAgICBhY3Rpb246IGZ1bmN0aW9uIChkaWFsb2dJdHNlbGYpIHtcclxuICAgICAgICAgICAgICAgICAgICBkaWFsb2dJdHNlbGYuY2xvc2UoKTsgXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1dXHJcbiAgICAgICAgfSk7XHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiBzd2FwVmlkZW9XaXRoQ2FudmFzKCkge1xyXG5cdFx0JHZpZGVvLnRvZ2dsZUNsYXNzKFwiaGlkZGVuXCIpO1xyXG5cdFx0JGNhbnZhcy50b2dnbGVDbGFzcyhcImhpZGRlblwiKTsgXHJcblxyXG5cdFx0JGJ0bkNhcHR1cmUudG9nZ2xlQ2xhc3MoXCJoaWRkZW5cIik7IFxyXG5cdFx0JGJ0blJldGFrZS50b2dnbGVDbGFzcyhcImhpZGRlblwiKTsgIFxyXG5cdH1cclxuXHJcbiAgICBmdW5jdGlvbiBjYXB0dXJlU25hcHNob3QoKSB7IFxyXG5cclxuXHRcdGlmICgkdmlkZW8gJiYgJGNhbnZhcykge1xyXG5cdFx0XHR2YXIgdmlkZW8gPSAkdmlkZW9bMF07IFxyXG5cdFx0XHR2YXIgY2FudmFzID0gJGNhbnZhc1swXTsgXHJcblxyXG5cdFx0XHRjYW52YXMud2lkdGggPSB2aWRlby52aWRlb1dpZHRoO1xyXG4gIFx0XHRcdGNhbnZhcy5oZWlnaHQgPSB2aWRlby52aWRlb0hlaWdodDtcclxuXHRcdFx0Y2FudmFzLmdldENvbnRleHQoJzJkJykuZHJhd0ltYWdlKHZpZGVvLCAwLCAwLCBjYW52YXMud2lkdGgsIGNhbnZhcy5oZWlnaHQpO1xyXG5cclxuXHRcdFx0aWYgKCRidG5TYXZlLmhhc0NsYXNzKFwiaGlkZGVuXCIpKSB7XHJcblx0XHRcdFx0JGJ0blNhdmUucmVtb3ZlQ2xhc3MoXCJoaWRkZW5cIik7IFxyXG5cdFx0XHR9XHJcblxyXG5cdFx0XHRzd2FwVmlkZW9XaXRoQ2FudmFzKCk7IFx0XHRcdFxyXG5cdFx0fSBcclxuICAgIH0gXHJcblxyXG4gICAgZnVuY3Rpb24gc3RvcENhbWVyYSgpIHtcclxuXHRcdHZhciB2aWRlbyA9ICR2aWRlb1swXTtcclxuXHRcdHZhciBzdHJlYW0gPSB2aWRlby5zcmNPYmplY3Q7IFxyXG5cdFx0XHJcblx0XHRpZiAoc3RyZWFtKSB7XHJcblx0XHRcdHN0cmVhbS5nZXRUcmFja3MoKVswXS5zdG9wKCk7IFxyXG5cdFx0XHR2aWRlby5zcmMgPSB2aWRlby5zcmNPYmplY3QgPSBcIlwiOyAgXHJcblx0XHR9XHJcblx0fVxyXG5cclxuICAgIHJldHVybiB7ICAgICAgICBcclxuICAgIFx0ZGlzcGxheUNhbWVyYURpYWxvZzogZGlzcGxheUNhbWVyYURpYWxvZywgXHJcbiAgICBcdGNvbmZpZ3VyZUZvcklPUzogY29uZmlndXJlRm9ySU9TIFxyXG4gICAgfTtcclxuXHJcbn0oKSk7IFxyXG4iLCJ2YXIgY2FtZXJhVUkgPSAoZnVuY3Rpb24oKSB7XHJcblxyXG5cdHZhciBwaG90b1NpemUgPSB7IHdpZHRoOiAxNTAsIGhlaWdodDogMTEzIH07XHJcblxyXG5cdGZ1bmN0aW9uIGNvbmZpZ3VyZUNhbWVyYXMoY2FtZXJhRGV0YWlscykgeyBcclxuXHRcdGNhbWVyYURldGFpbHMuZm9yRWFjaChmdW5jdGlvbihjYW1lcmFEZXRhaWwpIHsgXHJcblxyXG5cdFx0XHR2YXIgY2FtZXJhSWQgPSBjYW1lcmFEZXRhaWwuY2FtZXJhSWQ7IFxyXG5cdFx0XHR2YXIgZXhpc3RpbmdQaG90b3MgPSBjYW1lcmFEZXRhaWwuZXhpc3RpbmdQaG90b3M7IFxyXG5cclxuXHRcdCAgICBjb25maWd1cmVDYW1lcmEoY2FtZXJhSWQsIGV4aXN0aW5nUGhvdG9zKTsgXHJcblx0XHR9KTsgXHJcblx0fVxyXG5cclxuICAgIGZ1bmN0aW9uIGNvbmZpZ3VyZUNhbWVyYShjYW1lcmFJZCwgZXhpc3RpbmdQaG90b3MpIHtcclxuXHJcblx0XHR2YXIgJGNhbWVyYUNvbnRhaW5lciA9ICQoIFwiI1wiICsgY2FtZXJhSWQgKTsgXHJcblx0XHR2YXIgJGNhbWVyYUxpbmsgPSAkY2FtZXJhQ29udGFpbmVyLmZpbmQoXCIuY2FtZXJhLWxpbmtcIik7IFxyXG5cdFx0dmFyICRwaG90b0NvbnRhaW5lciA9ICRjYW1lcmFDb250YWluZXIuZmluZChcIi5waG90by1pbWFnZXNldFwiKTsgXHJcblx0XHR2YXIgcGhvdG9Db250YWluZXJJZCA9ICRwaG90b0NvbnRhaW5lci5hdHRyKFwiaWRcIik7XHJcblxyXG5cdFx0dmFyICRjYW1lcmFMaW5rSU9TID0gJGNhbWVyYUNvbnRhaW5lci5maW5kKFwiLmNhbWVyYS1saW5rLWlvc1wiKTsgXHJcblxyXG5cdFx0dmFyIGlPUyA9IGNhbWVyYVV0aWxzLmlzSU9TKCk7IFxyXG5cdFx0dmFyIGdldERpc3BsYXlWYWx1ZSA9IGZ1bmN0aW9uKGlzVmlzaWJsZSkge1xyXG5cdFx0XHRyZXR1cm4gaXNWaXNpYmxlPyBcIlwiIDogXCJub25lXCI7IFxyXG5cdFx0fTsgXHJcblx0XHQkY2FtZXJhTGlua0lPUy5jc3MoXCJkaXNwbGF5XCIsIGdldERpc3BsYXlWYWx1ZShpT1MpKTsgXHJcblx0XHQkY2FtZXJhTGluay5jc3MoXCJkaXNwbGF5XCIsIGdldERpc3BsYXlWYWx1ZSghaU9TKSk7IFxyXG5cclxuXHRcdGlmIChwaG90b0NvbnRhaW5lcklkKSB7XHJcblx0XHRcdGNhbWVyYURpYWxvZy5jb25maWd1cmVGb3JJT1MoJGNhbWVyYUxpbmtJT1MsIGNhbWVyYUlkLCBwaG90b0NvbnRhaW5lcklkLCBzYXZlU25hcHNob3QpOyBcclxuXHJcblx0XHRcdCRjYW1lcmFMaW5rLmNsaWNrKGZ1bmN0aW9uKCkgeyBcclxuXHRcdFx0XHRjYW1lcmFEaWFsb2cuZGlzcGxheUNhbWVyYURpYWxvZyhjYW1lcmFJZCwgcGhvdG9Db250YWluZXJJZCwgc2F2ZVNuYXBzaG90KTsgXHJcblx0XHRcdH0pOyBcclxuXHRcdH1cclxuXHJcblx0XHRpZiAoZXhpc3RpbmdQaG90b3MgJiYgZXhpc3RpbmdQaG90b3MubGVuZ3RoID4gMCkge1xyXG5cdFx0XHRleGlzdGluZ1Bob3Rvcy5mb3JFYWNoKGZ1bmN0aW9uKGV4aXN0aW5nUGhvdG8pIHtcclxuXHRcdFx0XHRwaG90b0RCLmFkZEV4aXN0aW5nUGhvdG8oY2FtZXJhSWQsIGV4aXN0aW5nUGhvdG8pOyBcclxuXHRcdFx0fSk7IFx0XHJcblx0XHR9XHJcblxyXG5cdFx0cG9wdWxhdGVQaG90b0xpc3QocGhvdG9Db250YWluZXJJZCwgY2FtZXJhSWQpOyBcclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIHBvcHVsYXRlUGhvdG9MaXN0KHBob3RvQ29udGFpbmVySWQsIGNhbWVyYUlkKSB7IFxyXG5cdFx0Ly8gcG9wdWxhdGUgdGhlIGxpc3Qgb2YgYWxsIHBob3RvcyBmb3IgZ2l2ZW4gY2FtZXJhICBcclxuXHRcdHBob3RvREIuZmluZFBob3Rvc0J5Q2FtZXJhSWQoY2FtZXJhSWQpLnRoZW4oZnVuY3Rpb24ocGhvdG9zKSB7IFxyXG5cclxuXHRcdCAgICAkLmVhY2gocGhvdG9zLCBmdW5jdGlvbigpIHsgXHJcblx0XHRcdFx0YWRkUGhvdG9Ub0xpc3QocGhvdG9Db250YWluZXJJZCwgdGhpcyk7IFxyXG5cdFx0XHR9KTsgXHJcblx0XHR9KTsgXHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiBzYXZlU25hcHNob3QoY2FtZXJhSWQsIHBob3RvQ29udGFpbmVySWQsIGltZ0RhdGEpIHtcclxuXHJcblx0XHR2YXIgZmlsZU5hbWUgPSBjYW1lcmFVdGlscy5uZXdHdWlkKCkgKyBcIi5wbmdcIjsgXHJcblx0XHR2YXIgaW1nT2JqZWN0ID0geyBmaWxlTmFtZTogZmlsZU5hbWUsIGNvbnRlbnQ6IGltZ0RhdGEsIGNhbWVyYUlkOiBjYW1lcmFJZCB9O1xyXG5cclxuXHRcdHBob3RvREIuYWRkTmV3UGhvdG8oZmlsZU5hbWUsIGNhbWVyYUlkLCBpbWdEYXRhKTtcclxuXHJcblx0XHRhZGRQaG90b1RvTGlzdChwaG90b0NvbnRhaW5lcklkLCBpbWdPYmplY3QpOyBcclxuXHR9IFxyXG5cclxuXHRmdW5jdGlvbiBhZGRQaG90b1RvTGlzdChwaG90b0NvbnRhaW5lcklkLCBpbWFnZU9iamVjdCkge1xyXG5cclxuXHRcdHZhciAkaW1hZ2VzRGl2ID0gJChcIiNcIiArIHBob3RvQ29udGFpbmVySWQpO1xyXG5cdFx0dmFyICRpbWdEaXYgPSAkKCc8ZGl2IC8+JykuYWRkQ2xhc3MoXCJpbWdcIikuY3NzKFwiaGVpZ2h0XCIsIHBob3RvU2l6ZS5oZWlnaHQgKyBcInB4XCIpOyBcclxuXHRcdHZhciAkZGVsRGl2ID0gJCgnPGRpdiAvPicpLmFkZENsYXNzKFwiZGVsXCIpLmF0dHIoXCJkYXRhLWlkXCIsIGltYWdlT2JqZWN0LmZpbGVOYW1lKTsgXHJcblx0XHR2YXIgJGljb24gPSAkKCc8aSBhcmlhLWhpZGRlbj1cInRydWVcIiAvPicpLmFkZENsYXNzKFwiZmEgZmEtdHJhc2gtb1wiKTsgXHJcblxyXG5cdFx0JGRlbERpdi5hcHBlbmQoJGljb24pOyBcclxuXHJcblx0XHQkaW1nRGl2LmNsaWNrKGZ1bmN0aW9uKGV2dCkgeyBcclxuXHRcdFx0ZXZ0LnN0b3BQcm9wYWdhdGlvbigpOyBcclxuXHJcblx0XHRcdHZhciAkcGljID0gJCgnPGltZyBzdHlsZT1cIndpZHRoOiAxMDAlXCIgd2lkdGg9XCIxMDAlXCIgLz4nKS5hdHRyKCdzcmMnLCBpbWFnZU9iamVjdC5jb250ZW50KTtcclxuXHQgICAgICAgIFxyXG5cdCAgICAgICAgQm9vdHN0cmFwRGlhbG9nLnNob3coe1xyXG5cdCAgICAgICAgICAgIHRpdGxlOiAnUGhvdG8gUHJldmlldycsXHJcblx0ICAgICAgICAgICAgbWVzc2FnZTogJHBpYyxcclxuXHQgICAgICAgICAgICBjc3NDbGFzczogJ2xvZ2luLWRpYWxvZycsIFxyXG5cdCAgICAgICAgICAgIGJ1dHRvbnM6IFt7XHJcblx0ICAgICAgICAgICAgICAgIGxhYmVsOiAnT0snLFxyXG5cdCAgICAgICAgICAgICAgICBjc3NDbGFzczogJ2J0bi1wcmltYXJ5JyxcclxuXHQgICAgICAgICAgICAgICAgYWN0aW9uOiBmdW5jdGlvbihkaWFsb2dSZWYpe1xyXG5cdCAgICAgICAgICAgICAgICAgICAgZGlhbG9nUmVmLmNsb3NlKCk7XHJcblx0ICAgICAgICAgICAgICAgIH1cclxuXHQgICAgICAgICAgICB9XVxyXG5cdCAgICAgICAgfSk7IFxyXG5cdFx0fSk7IFxyXG5cclxuXHRcdCRkZWxEaXYuY2xpY2soZnVuY3Rpb24oZXZ0KSB7IFxyXG5cdFx0ICAgIGV2dC5zdG9wUHJvcGFnYXRpb24oKTsgXHJcblxyXG5cdFx0ICAgIHZhciBpbWFnZUlkID0gaW1hZ2VPYmplY3QuZmlsZU5hbWU7IFxyXG5cdCAgICAgICAgaWYgKGNvbmZpcm0oJ0FyZSB5b3Ugc3VyZT8nKSA9PSB0cnVlKSB7XHJcblxyXG5cdCAgICAgICAgICAgIHZhciAkZGVsSW1nID0gJCgnZGl2W2RhdGEtaWQ9XCInICsgaW1hZ2VJZCArJ1wiXScpO1xyXG5cdCAgICAgICAgICAgIHZhciAkcGhvdG8gPSAkZGVsSW1nLnBhcmVudCgpOyBcclxuXHQgICAgICAgICAgICAkcGhvdG8ucmVtb3ZlKCk7IFxyXG5cclxuXHQgICAgICAgICAgICBwaG90b0RCLmRlbGV0ZVBob3RvKGltYWdlSWQpXHJcblx0ICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24ocGhvdG8pIHtcclxuXHQgICAgICAgICAgICB9KTsgXHJcblx0ICAgICAgICB9XHJcblx0XHR9KTsgXHJcblxyXG5cdFx0JGltZ0Rpdi5hcHBlbmQoJGRlbERpdik7IFxyXG5cdFx0JGltZ0Rpdi5hcHBlbmQoJChcIjxpbWcgLz5cIikuYXR0cihcInNyY1wiLCBpbWFnZU9iamVjdC5jb250ZW50KS5hdHRyKFwid2lkdGhcIiwgcGhvdG9TaXplLndpZHRoKS5hdHRyKFwiaGVpZ2h0XCIsIHBob3RvU2l6ZS5oZWlnaHQpKTsgXHJcblxyXG5cdFx0JGltYWdlc0Rpdi5hcHBlbmQoJGltZ0Rpdik7IFxyXG5cdH1cclxuXHJcblx0cmV0dXJuIHsgICAgICAgIFxyXG4gICAgXHRjb25maWd1cmVDYW1lcmFzOiBjb25maWd1cmVDYW1lcmFzLCBcclxuICAgIFx0Y29uZmlndXJlQ2FtZXJhOiBjb25maWd1cmVDYW1lcmEgXHJcbiAgICB9O1xyXG5cclxufSgpKTsgIiwidmFyIGNhbWVyYVV0aWxzID0gKGZ1bmN0aW9uKCkge1xyXG5cclxuIFx0ZnVuY3Rpb24gUzQoKSB7XHJcbiAgICAgICAgcmV0dXJuICgoKDErTWF0aC5yYW5kb20oKSkqMHgxMDAwMCl8MCkudG9TdHJpbmcoMTYpLnN1YnN0cmluZygxKTsgXHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gbmV3R3VpZCgpIHtcclxuXHJcblx0XHQvLyB0aGVuIHRvIGNhbGwgaXQsIHBsdXMgc3RpdGNoIGluICc0JyBpbiB0aGUgdGhpcmQgZ3JvdXBcclxuXHRcdHZhciBndWlkID0gKFM0KCkgKyBTNCgpICsgXCItXCIgKyBTNCgpICsgXCItNFwiICsgUzQoKS5zdWJzdHIoMCwzKSArIFwiLVwiICsgUzQoKSArIFwiLVwiICsgUzQoKSArIFM0KCkgKyBTNCgpKS50b0xvd2VyQ2FzZSgpO1xyXG5cdFx0cmV0dXJuIGd1aWQ7IFxyXG4gICAgfSBcclxuXHJcbiAgICBmdW5jdGlvbiBpc0lPUygpIHsgXHJcblx0XHR2YXIgaU9TID0gWydpUGFkJywgJ2lQaG9uZScsICdpUG9kJ10uaW5kZXhPZihuYXZpZ2F0b3IucGxhdGZvcm0pID49IDA7IFxyXG5cdFx0cmV0dXJuIGlPUzsgXHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHsgXHJcbiAgICBcdG5ld0d1aWQ6IG5ld0d1aWQsIFxyXG4gICAgXHRpc0lPUzogaXNJT1MgXHJcbiAgICB9O1xyXG5cclxufSgpKTsgXHJcbiIsInZhciBDYW1lcmEgPSAoZnVuY3Rpb24oKSB7IFxyXG5cclxuXHRmdW5jdGlvbiBDYW1lcmEoY2FtZXJhSWQsIGV4aXN0aW5nUGhvdG9zKSB7XHJcblx0XHR0aGlzLmNhbWVyYUlkID0gY2FtZXJhSWQ7IFxyXG5cdFx0dGhpcy5leGlzdGluZ1Bob3RvcyA9IGV4aXN0aW5nUGhvdG9zOyBcclxuXHJcblx0XHRjYW1lcmFVSS5jb25maWd1cmVDYW1lcmEoY2FtZXJhSWQsIGV4aXN0aW5nUGhvdG9zKTsgXHJcblx0fVxyXG5cclxuXHRDYW1lcmEucHJvdG90eXBlLmdldFBob3RvcyA9IGZ1bmN0aW9uKCkge1xyXG5cdFx0XHJcblx0XHRyZXR1cm4gcGhvdG9EQi5maW5kUGhvdG9zQnlDYW1lcmFJZCh0aGlzLmNhbWVyYUlkKTsgXHJcblx0fTsgXHJcblxyXG5cdHJldHVybiBDYW1lcmE7IFxyXG59KSgpO1xyXG5cclxuIiwidmFyIHBob3RvU3RhdHVzZXMgPSB7IE5ldzogMCwgRXhpc3Rpbmc6IDEsIERlbGV0ZWQ6IDIgfTsgXHJcblxyXG52YXIgcGhvdG9EQiA9IChmdW5jdGlvbigpIHtcclxuXHJcblx0dmFyIGRiOyBcclxuXHJcbiAgICBpbml0KCk7IFxyXG5cclxuICAgIGZ1bmN0aW9uIGluaXQoKSB7IFxyXG5cclxuXHRcdHZhciBzY2hlbWEgPSB7XHJcblx0XHQgIHN0b3JlczogW3tcclxuXHRcdCAgICBuYW1lOiAncGhvdG9UYWJsZScsXHJcblx0XHQgICAgaW5kZXhlczogW3sgbmFtZTogJ2ZpbGVOYW1lJyB9LCB7IG5hbWU6ICdjYW1lcmFJZCcgfV1cclxuXHRcdCAgfV1cclxuXHRcdH07IFxyXG5cclxuICAgICAgICBkYiA9IG5ldyB5ZG4uZGIuU3RvcmFnZSgnTU1TUGhvdG9EQicsIHNjaGVtYSk7IFxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGFkZE5ld1Bob3RvKGlkLCBjYW1lcmFJZCwgY29udGVudCkgeyBcclxuXHJcbiAgICAgICAgLy8gd2UgYXNzdW1lIGhlcmUgdGhhdCBpZCAoZmlsZU5hbWUpIGlzIHVuaXF1ZSBcclxuICAgICAgICBkYi5wdXQoJ3Bob3RvVGFibGUnLCB7IGZpbGVOYW1lOiBpZCwgY2FtZXJhSWQ6IGNhbWVyYUlkLCBkYXRlVGFrZW46IFN0cmluZyhuZXcgRGF0ZSgpKSwgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGhvdG9TdGF0dXM6IHBob3RvU3RhdHVzZXMuTmV3LCBjb250ZW50OiBjb250ZW50IH0sIGlkKTsgXHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gYWRkRXhpc3RpbmdQaG90byhjYW1lcmFJZCwgY29udGVudCkgeyAgXHJcblxyXG4gICAgICAgIHZhciBpZCA9IGNhbWVyYVV0aWxzLm5ld0d1aWQoKSArIFwiLnBuZ1wiOyBcclxuXHJcbiAgICAgICAgLy8gd2UgYXNzdW1lIGhlcmUgdGhhdCBpZCAoZmlsZU5hbWUpIGlzIHVuaXF1ZSBcclxuICAgICAgICBkYi5wdXQoJ3Bob3RvVGFibGUnLCB7IGZpbGVOYW1lOiBpZCwgY2FtZXJhSWQ6IGNhbWVyYUlkLCBkYXRlVGFrZW46IG51bGwsIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBob3RvU3RhdHVzOiBwaG90b1N0YXR1c2VzLkV4aXN0aW5nLCBjb250ZW50OiBjb250ZW50IH0sIGlkKTsgXHJcbiAgICB9XHJcbiAgICBcclxuICAgIGZ1bmN0aW9uIGdldFBob3RvcygpIHtcclxuXHJcbiAgICAgICAgdmFyIHAgPSBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcclxuXHJcbiAgICAgICAgICAgIHZhciBxdWVyeSA9IGRiLmZyb20oJ3Bob3RvVGFibGUnKTsgXHJcbiAgICAgICAgICAgIHF1ZXJ5ID0gcXVlcnkud2hlcmUoJ3Bob3RvU3RhdHVzJywgJzwnLCBwaG90b1N0YXR1c2VzLkRlbGV0ZWQpOyBcclxuICAgICAgICAgICAgcXVlcnkubGlzdCgpLmRvbmUoZnVuY3Rpb24ocGhvdG9zKSB7XHJcbiAgICAgICAgICAgICAgIHJlc29sdmUocGhvdG9zKTsgXHJcbiAgICAgICAgICAgIH0pOyBcclxuICAgICAgICB9KTsgXHJcblxyXG4gICAgICAgIHJldHVybiBwOyBcclxuICAgIH1cclxuXHJcbiAgICAvLyBwZXJmb3JtcyBhIHZpcnR1YWwgZGVsZXRlIGhlcmUgXHJcbiAgICBmdW5jdGlvbiBkZWxldGVQaG90byhpZCkgeyBcclxuXHJcbiAgICAgICAgdmFyIHAgPSBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcclxuXHJcbiAgICAgICAgICAgIGZpbmRQaG90b3NCeUZpbGVOYW1lKGlkKS50aGVuKGZ1bmN0aW9uKHBob3Rvcykge1xyXG4gICAgICAgICAgICAgICAgaWYgKHBob3Rvcy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIHBob3RvID0gcGhvdG9zWzBdOyBcclxuICAgICAgICAgICAgICAgICAgICBwaG90by5waG90b1N0YXR1cyA9IHBob3RvU3RhdHVzZXMuRGVsZXRlZDsgXHJcbiAgICAgICAgICAgICAgICAgICAgZGIucHV0KCdwaG90b1RhYmxlJywgcGhvdG8sIGlkKTsgXHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUocGhvdG8pOyBcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7IFxyXG4gICAgICAgIH0pOyBcclxuXHJcbiAgICAgICAgcmV0dXJuIHA7IFxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGZpbmRQaG90b3NCeUZpbGVOYW1lKGZpbGVOYW1lKSB7XHJcblxyXG4gICAgICAgIHZhciBwID0gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XHJcblxyXG4gICAgICAgICAgICB2YXIgcSA9IGRiLmZyb20oJ3Bob3RvVGFibGUnKTtcclxuICAgICAgICAgICAgcSA9IHEud2hlcmUoJ2ZpbGVOYW1lJywgJz0nLCBmaWxlTmFtZSk7XHJcbiAgICAgICAgICAgIHEubGlzdCgpLmRvbmUoZnVuY3Rpb24ocGhvdG9zKSB7XHJcbiAgICAgICAgICAgICAgICByZXNvbHZlKHBob3Rvcyk7IFxyXG4gICAgICAgICAgICB9KTsgXHJcbiAgICAgICAgfSk7IFxyXG5cclxuICAgICAgICByZXR1cm4gcDsgXHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gZmluZFBob3Rvc0J5Q2FtZXJhSWQoY2FtZXJhSWQpIHsgIFxyXG5cclxuICAgICAgICB2YXIgcCA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xyXG5cclxuICAgICAgICAgICAgdmFyIHEgPSBkYi5mcm9tKCdwaG90b1RhYmxlJyk7XHJcbiAgICAgICAgICAgIHEgPSBxLndoZXJlKCdjYW1lcmFJZCcsICc9JywgY2FtZXJhSWQpO1xyXG4gICAgICAgICAgICAvL3EgPSBxLndoZXJlKCdwaG90b1N0YXR1cycsICc8JywgcGhvdG9TdGF0dXNlcy5EZWxldGVkKTsgXHJcbiAgICAgICAgICAgIHEubGlzdCgpLmRvbmUoZnVuY3Rpb24ocGhvdG9zKSB7XHJcblxyXG4gICAgICAgICAgICAgICAgdmFyIGZpbHRlcmVkUGhvdG9zID0gW107IFxyXG4gICAgICAgICAgICAgICAgcGhvdG9zLmZvckVhY2goZnVuY3Rpb24ocGhvdG8pIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAocGhvdG8ucGhvdG9TdGF0dXMgIT0gcGhvdG9TdGF0dXNlcy5EZWxldGVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZpbHRlcmVkUGhvdG9zLnB1c2gocGhvdG8pOyBcclxuICAgICAgICAgICAgICAgICAgICB9ICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIH0pOyBcclxuXHJcbiAgICAgICAgICAgICAgICByZXNvbHZlKGZpbHRlcmVkUGhvdG9zKTsgXHJcbiAgICAgICAgICAgIH0pOyBcclxuICAgICAgICB9KTsgXHJcblxyXG4gICAgICAgIHJldHVybiBwOyBcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4geyAgICAgICAgXHJcbiAgICBcdGFkZE5ld1Bob3RvOiBhZGROZXdQaG90bywgXHJcbiAgICAgICAgYWRkRXhpc3RpbmdQaG90bzogYWRkRXhpc3RpbmdQaG90bywgXHJcbiAgICAgICAgZ2V0UGhvdG9zOiBnZXRQaG90b3MsIFxyXG4gICAgXHRkZWxldGVQaG90bzogZGVsZXRlUGhvdG8sIFxyXG4gICAgICAgIGZpbmRQaG90b3NCeUZpbGVOYW1lOiBmaW5kUGhvdG9zQnlGaWxlTmFtZSwgXHJcbiAgICAgICAgZmluZFBob3Rvc0J5Q2FtZXJhSWQ6IGZpbmRQaG90b3NCeUNhbWVyYUlkICBcclxuICAgIH07XHJcblxyXG59KCkpOyBcclxuIl0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
