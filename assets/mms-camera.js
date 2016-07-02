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

var cameraDialog = (function() {

	var constraints = { video: true, audio: false }; 
	var blankCanvasURL; 
	var callback; 

	var $video, $canvas; 
	var $btnCapture, $btnSwap, $btnSave; 

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
            	
            	var body = dialogRef.getModalBody();

            	callback = saveSnapshotCallback; 

            	var changeBtn = body.find("#changeId");
            	changeBtn.click(swapVideoWithCanvas);

            	// init video & canvas here 
				$video = body.find("#dataVideoId"); 
				$canvas = body.find("#canvasId"); 

            	var video = $video[0];
				var canvas = window.canvas = $canvas[0]; 

				if (blankCanvasURL) {
					blankCanvasURL = canvas.toDataURL(); 
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

				// init references to buttons from modal footer 
				var footer = dialogRef.getModalFooter(); 

				$btnCapture = footer.find(".btn-capture"); 
				$btnSwap = footer.find(".btn-swap"); 
				$btnSave = footer.find(".btn-save"); 
            }, 
            onhidden: function(dialogRef) {
            	stopCamera(); 
            }, 
            cssClass: 'login-dialog', 
            buttons: [{
                label: 'Swap',
                icon: 'glyphicon glyphicon-sort',
                cssClass: 'btn btn-primary pull-left hidden btn-swap',
                action: function (dialogItself) {
			    	swapVideoWithCanvas(); 
                }
            }, {
                label: 'Capture Snapshot',
                icon: 'glyphicon glyphicon-camera',
                cssClass: 'btn btn-primary pull-left btn-capture',
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
 
		var isShowingVideo = !$video.hasClass("hidden"); 
		if (isShowingVideo) {
			// make sure we let to switch to canvas only if there is something drawn on the canvas 
			var currentCanvasURL = $canvas[0].toDataURL(); 
			if (currentCanvasURL != blankCanvasURL) {
				// canvas has some content -> enable video-to-canvas swapping 
				if ($btnSwap.hasClass("hidden")) {
					$btnSwap.removeClass("hidden"); 
				}
			}

			if ($btnCapture.hasClass("hidden")) {
				$btnCapture.removeClass("hidden"); 
			}
		}
		else {
			// when showing canvas, hide the 'capture video' button 
			if (!$btnCapture.hasClass("hidden")) {
				$btnCapture.addClass("hidden"); 
			}
		}
	}

    function captureSnapshot() { 
        console.log("captureSnapshot()...", $video, $canvas); 

		if ($video && $canvas) {
			var video = $video[0]; 
			var canvas = $canvas[0]; 

			canvas.width = video.videoWidth;
  			canvas.height = video.videoHeight;
			canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);

			if ($btnSwap.hasClass("hidden")) {
				$btnSwap.removeClass("hidden"); 
			}
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

var myIndexedDB = (function() {

	var db; 

    init(); 

    function init() { 

		var schema = {
		  stores: [{
		    name: 'imagesTable',
		    indexes: [{ name: 'fileName' }, { name: 'cameraId' }]
		  }]
		}; 

        db = new ydn.db.Storage('MyDB', schema); 
    }

    function addNewImage(id, cameraId, content) { 
        console.log("addNewImage()...", id, cameraId, content.length); 

        // we assume here that id (fileName) is unique 
        db.put('imagesTable', { fileName: id, cameraId: cameraId, dateTaken: String(new Date()), 
                                photoStatus: photoStatuses.New, content: content }, id); 
    }

    function addExistingImage(cameraId, content) { 
        console.log("addExistingImage()...", cameraId, content.length); 

        var id = utils.newGuid() + ".png"; 

        // we assume here that id (fileName) is unique 
        db.put('imagesTable', { fileName: id, cameraId: cameraId, dateTaken: null, 
                                photoStatus: photoStatuses.Existing, content: content }, id); 
    }
    
    function getImages() {

        //console.log("Starting getImages()...", db);

        /*var q = db.from('imagesTable');
        //q = q.where('country', '=', 'SG').order('age');
        q.list(function(list) {
          console.log("getImages()...", list);
        }); */

        var p = new Promise(function(resolve, reject) {

            var query = db.from('imagesTable'); 
            query = query.where('photoStatus', '<', photoStatuses.Deleted); 
            query.list().done(function(images) {
              //console.log("Returning getImages():", images); // list of all images 

              resolve(images); 
            }); 
        }); 

        return p; 
    }
    /*
    function removeImage(id) { 
    	console.log("removeImage()...", id); 

        db.remove("imagesTable", id); 
	}
    */

    // performs a virtual delete here 
    function deleteImage(id) { 
        console.log("deleteImage()...", id); 

        var p = new Promise(function(resolve, reject) {

            findByFileName(id).then(function(photos) {
                if (photos.length > 0) {
                    var photo = photos[0]; 
                    photo.photoStatus = photoStatuses.Deleted; 
                    db.put('imagesTable', photo, id); 

                    resolve(photo); 
                }
            }); 
        }); 

        return p; 
    }

    function findByFileName(fileName) {
        console.log("findByName()...", fileName); 

        var p = new Promise(function(resolve, reject) {

            var q = db.from('imagesTable');
            q = q.where('fileName', '=', fileName);
            q.list().done(function(list) {
                console.log(list);
                resolve(list); 
            }); 
        }); 

        return p; 
    }

    function findByCameraId(cameraId) { 
        console.log("findByCameraId()...", cameraId); 

        var p = new Promise(function(resolve, reject) {

            var q = db.from('imagesTable');
            q = q.where('cameraId', '=', cameraId);
            //q = q.where('photoStatus', '<', photoStatuses.Deleted); 
            q.list().done(function(list) {

                var filteredList = []; 
                list.forEach(function(photo) {
                    if (photo.photoStatus != photoStatuses.Deleted) {
                        filteredList.push(photo); 
                    }                    
                }); 

                console.log("findByCameraId():", cameraId, filteredList);
                resolve(filteredList); 
            }); 
        }); 

        return p; 
    }

    return {        
    	addNewImage: addNewImage, 
        addExistingImage: addExistingImage, 
        getImages: getImages, 
    	deleteImage: deleteImage, 
        findByFileName: findByFileName, 
        findByCameraId: findByCameraId  
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1tcy1jYW1lcmEtdWkuanMiLCJtbXMtY2FtZXJhLmpzIiwibW1zLWluZGV4ZWREQi5qcyIsIm1tcy11dGlscy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxJQUFBLFlBQUEsV0FBQTs7Q0FFQSxJQUFBLFlBQUEsRUFBQSxPQUFBLEtBQUEsUUFBQTs7Q0FFQSxTQUFBLGlCQUFBLGVBQUE7RUFDQSxjQUFBLFFBQUEsU0FBQSxjQUFBOztHQUVBLElBQUEsV0FBQSxhQUFBO0dBQ0EsSUFBQSxpQkFBQSxhQUFBOztNQUVBLGdCQUFBLFVBQUE7Ozs7SUFJQSxTQUFBLGdCQUFBLFVBQUEsZ0JBQUE7O0VBRUEsSUFBQSxtQkFBQSxHQUFBLE1BQUE7RUFDQSxJQUFBLGNBQUEsaUJBQUEsS0FBQTtFQUNBLElBQUEsa0JBQUEsaUJBQUEsS0FBQTtFQUNBLElBQUEsbUJBQUEsZ0JBQUEsS0FBQTs7RUFFQSxJQUFBLGlCQUFBLGlCQUFBLEtBQUE7O0VBRUEsSUFBQSxNQUFBLE1BQUE7RUFDQSxJQUFBLGtCQUFBLFNBQUEsV0FBQTtHQUNBLE9BQUEsV0FBQSxLQUFBOztFQUVBLGVBQUEsSUFBQSxXQUFBLGdCQUFBO0VBQ0EsWUFBQSxJQUFBLFdBQUEsZ0JBQUEsQ0FBQTs7RUFFQSxJQUFBLGtCQUFBO0dBQ0EsYUFBQSxnQkFBQSxnQkFBQSxVQUFBLGtCQUFBOztHQUVBLFlBQUEsTUFBQSxXQUFBO0lBQ0EsYUFBQSxvQkFBQSxVQUFBLGtCQUFBOzs7O0VBSUEsSUFBQSxrQkFBQSxlQUFBLFNBQUEsR0FBQTtHQUNBLGVBQUEsUUFBQSxTQUFBLGVBQUE7O0lBRUEsWUFBQSxpQkFBQSxVQUFBOzs7O0VBSUEsbUJBQUEsa0JBQUE7OztDQUdBLFNBQUEsbUJBQUEsa0JBQUEsVUFBQTs7RUFFQSxZQUFBLGVBQUEsVUFBQSxLQUFBLFNBQUEsUUFBQTs7TUFFQSxFQUFBLEtBQUEsUUFBQSxXQUFBO0lBQ0EsZUFBQSxrQkFBQTs7Ozs7Q0FLQSxTQUFBLGFBQUEsVUFBQSxr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QUEsUUFBQTs7RUFFQSxJQUFBLFVBQUEsU0FBQTtHQUNBLElBQUEsUUFBQSxPQUFBO0dBQ0EsSUFBQSxTQUFBLFFBQUE7O0dBRUEsT0FBQSxRQUFBLE1BQUE7S0FDQSxPQUFBLFNBQUEsTUFBQTtHQUNBLE9BQUEsV0FBQSxNQUFBLFVBQUEsT0FBQSxHQUFBLEdBQUEsT0FBQSxPQUFBLE9BQUE7O0dBRUEsSUFBQSxTQUFBLFNBQUEsV0FBQTtJQUNBLFNBQUEsWUFBQTs7R0FFQSxJQUFBLFNBQUEsU0FBQSxXQUFBO0lBQ0EsU0FBQSxZQUFBOzs7R0FHQTs7OztJQUlBLFNBQUEsYUFBQTtFQUNBLElBQUEsUUFBQSxPQUFBO0VBQ0EsSUFBQSxTQUFBLE1BQUE7O0VBRUEsSUFBQSxRQUFBO0dBQ0EsT0FBQSxZQUFBLEdBQUE7R0FDQSxNQUFBLE1BQUEsTUFBQSxZQUFBOzs7O0lBSUEsT0FBQTtLQUNBLHFCQUFBO0tBQ0EsaUJBQUE7Ozs7O0FDNUxBLElBQUEsZ0JBQUEsRUFBQSxLQUFBLEdBQUEsVUFBQSxHQUFBLFNBQUE7O0FBRUEsSUFBQSxlQUFBLFdBQUE7O0NBRUEsSUFBQTs7SUFFQTs7SUFFQSxTQUFBLE9BQUE7O0VBRUEsSUFBQSxTQUFBO0lBQ0EsUUFBQSxDQUFBO01BQ0EsTUFBQTtNQUNBLFNBQUEsQ0FBQSxFQUFBLE1BQUEsY0FBQSxFQUFBLE1BQUE7Ozs7UUFJQSxLQUFBLElBQUEsSUFBQSxHQUFBLFFBQUEsUUFBQTs7O0lBR0EsU0FBQSxZQUFBLElBQUEsVUFBQSxTQUFBO1FBQ0EsUUFBQSxJQUFBLG9CQUFBLElBQUEsVUFBQSxRQUFBOzs7UUFHQSxHQUFBLElBQUEsZUFBQSxFQUFBLFVBQUEsSUFBQSxVQUFBLFVBQUEsV0FBQSxPQUFBLElBQUE7Z0NBQ0EsYUFBQSxjQUFBLEtBQUEsU0FBQSxXQUFBOzs7SUFHQSxTQUFBLGlCQUFBLFVBQUEsU0FBQTtRQUNBLFFBQUEsSUFBQSx5QkFBQSxVQUFBLFFBQUE7O1FBRUEsSUFBQSxLQUFBLE1BQUEsWUFBQTs7O1FBR0EsR0FBQSxJQUFBLGVBQUEsRUFBQSxVQUFBLElBQUEsVUFBQSxVQUFBLFdBQUE7Z0NBQ0EsYUFBQSxjQUFBLFVBQUEsU0FBQSxXQUFBOzs7SUFHQSxTQUFBLFlBQUE7Ozs7Ozs7Ozs7UUFVQSxJQUFBLElBQUEsSUFBQSxRQUFBLFNBQUEsU0FBQSxRQUFBOztZQUVBLElBQUEsUUFBQSxHQUFBLEtBQUE7WUFDQSxRQUFBLE1BQUEsTUFBQSxlQUFBLEtBQUEsY0FBQTtZQUNBLE1BQUEsT0FBQSxLQUFBLFNBQUEsUUFBQTs7O2NBR0EsUUFBQTs7OztRQUlBLE9BQUE7Ozs7Ozs7Ozs7O0lBV0EsU0FBQSxZQUFBLElBQUE7UUFDQSxRQUFBLElBQUEsb0JBQUE7O1FBRUEsSUFBQSxJQUFBLElBQUEsUUFBQSxTQUFBLFNBQUEsUUFBQTs7WUFFQSxlQUFBLElBQUEsS0FBQSxTQUFBLFFBQUE7Z0JBQ0EsSUFBQSxPQUFBLFNBQUEsR0FBQTtvQkFDQSxJQUFBLFFBQUEsT0FBQTtvQkFDQSxNQUFBLGNBQUEsY0FBQTtvQkFDQSxHQUFBLElBQUEsZUFBQSxPQUFBOztvQkFFQSxRQUFBOzs7OztRQUtBLE9BQUE7OztJQUdBLFNBQUEsZUFBQSxVQUFBO1FBQ0EsUUFBQSxJQUFBLG1CQUFBOztRQUVBLElBQUEsSUFBQSxJQUFBLFFBQUEsU0FBQSxTQUFBLFFBQUE7O1lBRUEsSUFBQSxJQUFBLEdBQUEsS0FBQTtZQUNBLElBQUEsRUFBQSxNQUFBLFlBQUEsS0FBQTtZQUNBLEVBQUEsT0FBQSxLQUFBLFNBQUEsTUFBQTtnQkFDQSxRQUFBLElBQUE7Z0JBQ0EsUUFBQTs7OztRQUlBLE9BQUE7OztJQUdBLFNBQUEsZUFBQSxVQUFBO1FBQ0EsUUFBQSxJQUFBLHVCQUFBOztRQUVBLElBQUEsSUFBQSxJQUFBLFFBQUEsU0FBQSxTQUFBLFFBQUE7O1lBRUEsSUFBQSxJQUFBLEdBQUEsS0FBQTtZQUNBLElBQUEsRUFBQSxNQUFBLFlBQUEsS0FBQTs7WUFFQSxFQUFBLE9BQUEsS0FBQSxTQUFBLE1BQUE7O2dCQUVBLElBQUEsZUFBQTtnQkFDQSxLQUFBLFFBQUEsU0FBQSxPQUFBO29CQUNBLElBQUEsTUFBQSxlQUFBLGNBQUEsU0FBQTt3QkFDQSxhQUFBLEtBQUE7Ozs7Z0JBSUEsUUFBQSxJQUFBLHFCQUFBLFVBQUE7Z0JBQ0EsUUFBQTs7OztRQUlBLE9BQUE7OztJQUdBLE9BQUE7S0FDQSxhQUFBO1FBQ0Esa0JBQUE7UUFDQSxXQUFBO0tBQ0EsYUFBQTtRQUNBLGdCQUFBO1FBQ0EsZ0JBQUE7Ozs7O0FDeElBLElBQUEsU0FBQSxXQUFBOztFQUVBLFNBQUEsS0FBQTtRQUNBLE9BQUEsQ0FBQSxDQUFBLENBQUEsRUFBQSxLQUFBLFVBQUEsU0FBQSxHQUFBLFNBQUEsSUFBQSxVQUFBOzs7SUFHQSxTQUFBLFVBQUE7OztFQUdBLElBQUEsT0FBQSxDQUFBLE9BQUEsT0FBQSxNQUFBLE9BQUEsT0FBQSxLQUFBLE9BQUEsRUFBQSxLQUFBLE1BQUEsT0FBQSxNQUFBLE9BQUEsT0FBQSxNQUFBO0VBQ0EsT0FBQTs7O0lBR0EsU0FBQSxRQUFBO0VBQ0EsSUFBQSxNQUFBLENBQUEsUUFBQSxVQUFBLFFBQUEsUUFBQSxVQUFBLGFBQUE7RUFDQSxPQUFBOzs7SUFHQSxPQUFBO0tBQ0EsU0FBQTtLQUNBLE9BQUE7Ozs7QUFJQSIsImZpbGUiOiJtbXMtY2FtZXJhLmpzIiwic291cmNlc0NvbnRlbnQiOlsidmFyIGNhbWVyYVVJID0gKGZ1bmN0aW9uKCkge1xyXG5cclxuXHR2YXIgcGhvdG9TaXplID0geyB3aWR0aDogMTUwLCBoZWlnaHQ6IDExMyB9O1xyXG5cclxuXHRmdW5jdGlvbiBjb25maWd1cmVDYW1lcmFzKGNhbWVyYURldGFpbHMpIHsgXHJcblx0XHRjYW1lcmFEZXRhaWxzLmZvckVhY2goZnVuY3Rpb24oY2FtZXJhRGV0YWlsKSB7IFxyXG5cclxuXHRcdFx0dmFyIGNhbWVyYUlkID0gY2FtZXJhRGV0YWlsLmNhbWVyYUlkOyBcclxuXHRcdFx0dmFyIGV4aXN0aW5nUGhvdG9zID0gY2FtZXJhRGV0YWlsLmV4aXN0aW5nUGhvdG9zOyBcclxuXHJcblx0XHQgICAgY29uZmlndXJlQ2FtZXJhKGNhbWVyYUlkLCBleGlzdGluZ1Bob3Rvcyk7IFxyXG5cdFx0fSk7IFxyXG5cdH1cclxuXHJcbiAgICBmdW5jdGlvbiBjb25maWd1cmVDYW1lcmEoY2FtZXJhSWQsIGV4aXN0aW5nUGhvdG9zKSB7XHJcblxyXG5cdFx0dmFyICRjYW1lcmFDb250YWluZXIgPSAkKCBcIiNcIiArIGNhbWVyYUlkICk7IFxyXG5cdFx0dmFyICRjYW1lcmFMaW5rID0gJGNhbWVyYUNvbnRhaW5lci5maW5kKFwiLmNhbWVyYS1saW5rXCIpOyBcclxuXHRcdHZhciAkcGhvdG9Db250YWluZXIgPSAkY2FtZXJhQ29udGFpbmVyLmZpbmQoXCIucGhvdG8taW1hZ2VzZXRcIik7IFxyXG5cdFx0dmFyIHBob3RvQ29udGFpbmVySWQgPSAkcGhvdG9Db250YWluZXIuYXR0cihcImlkXCIpO1xyXG5cclxuXHRcdHZhciAkY2FtZXJhTGlua0lPUyA9ICRjYW1lcmFDb250YWluZXIuZmluZChcIi5jYW1lcmEtbGluay1pb3NcIik7IFxyXG5cclxuXHRcdHZhciBpT1MgPSB1dGlscy5pc0lPUygpOyBcclxuXHRcdHZhciBnZXREaXNwbGF5VmFsdWUgPSBmdW5jdGlvbihpc1Zpc2libGUpIHtcclxuXHRcdFx0cmV0dXJuIGlzVmlzaWJsZT8gXCJcIiA6IFwibm9uZVwiOyBcclxuXHRcdH07IFxyXG5cdFx0JGNhbWVyYUxpbmtJT1MuY3NzKFwiZGlzcGxheVwiLCBnZXREaXNwbGF5VmFsdWUoaU9TKSk7IFxyXG5cdFx0JGNhbWVyYUxpbmsuY3NzKFwiZGlzcGxheVwiLCBnZXREaXNwbGF5VmFsdWUoIWlPUykpOyBcclxuXHJcblx0XHRpZiAocGhvdG9Db250YWluZXJJZCkge1xyXG5cdFx0XHRjYW1lcmFEaWFsb2cuY29uZmlndXJlRm9ySU9TKCRjYW1lcmFMaW5rSU9TLCBjYW1lcmFJZCwgcGhvdG9Db250YWluZXJJZCwgc2F2ZVNuYXBzaG90KTsgXHJcblxyXG5cdFx0XHQkY2FtZXJhTGluay5jbGljayhmdW5jdGlvbigpIHsgXHJcblx0XHRcdFx0Y2FtZXJhRGlhbG9nLmRpc3BsYXlDYW1lcmFEaWFsb2coY2FtZXJhSWQsIHBob3RvQ29udGFpbmVySWQsIHNhdmVTbmFwc2hvdCk7IFxyXG5cdFx0XHR9KTsgXHJcblx0XHR9XHJcblxyXG5cdFx0aWYgKGV4aXN0aW5nUGhvdG9zICYmIGV4aXN0aW5nUGhvdG9zLmxlbmd0aCA+IDApIHtcclxuXHRcdFx0ZXhpc3RpbmdQaG90b3MuZm9yRWFjaChmdW5jdGlvbihleGlzdGluZ1Bob3RvKSB7XHJcblx0XHRcdFx0Ly8gVE9ETzogdGVzdCB0aGlzIG1ldGhvZCBjYWxsIFxyXG5cdFx0XHRcdG15SW5kZXhlZERCLmFkZEV4aXN0aW5nSW1hZ2UoY2FtZXJhSWQsIGV4aXN0aW5nUGhvdG8pOyBcclxuXHRcdFx0fSk7IFx0XHJcblx0XHR9XHJcblxyXG5cdFx0cG9wdWxhdGVJbWFnZXNMaXN0KHBob3RvQ29udGFpbmVySWQsIGNhbWVyYUlkKTsgXHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiBwb3B1bGF0ZUltYWdlc0xpc3QocGhvdG9Db250YWluZXJJZCwgY2FtZXJhSWQpIHsgXHJcblx0XHQvLyBwb3B1bGF0ZSB0aGUgbGlzdCBvZiBhbGwgaW1hZ2VzIGZvciBnaXZlbiBjYW1lcmEgIFxyXG5cdFx0bXlJbmRleGVkREIuZmluZEJ5Q2FtZXJhSWQoY2FtZXJhSWQpLnRoZW4oZnVuY3Rpb24oaW1hZ2VzKSB7IFxyXG5cclxuXHRcdCAgICAkLmVhY2goaW1hZ2VzLCBmdW5jdGlvbigpIHsgXHJcblx0XHRcdFx0YWRkSW1hZ2VUb0xpc3QocGhvdG9Db250YWluZXJJZCwgdGhpcyk7IFxyXG5cdFx0XHR9KTsgXHJcblx0XHR9KTsgXHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiBzYXZlU25hcHNob3QoY2FtZXJhSWQsIHBob3RvQ29udGFpbmVySWQsIGltZ0RhdGEpIHtcclxuXHRcdGNvbnNvbGUubG9nKFwic2F2ZVNuYXBzaG90KCkuLi5cIiwgcGhvdG9Db250YWluZXJJZCwgaW1nRGF0YS5sZW5ndGgpOyBcclxuXHJcblx0XHR2YXIgZmlsZU5hbWUgPSB1dGlscy5uZXdHdWlkKCkgKyBcIi5wbmdcIjsgXHJcblx0XHR2YXIgaW1nT2JqZWN0ID0geyBmaWxlTmFtZTogZmlsZU5hbWUsIGNvbnRlbnQ6IGltZ0RhdGEsIGNhbWVyYUlkOiBjYW1lcmFJZCB9O1xyXG5cclxuXHRcdG15SW5kZXhlZERCLmFkZE5ld0ltYWdlKGZpbGVOYW1lLCBjYW1lcmFJZCwgaW1nRGF0YSk7XHJcblxyXG5cdFx0YWRkSW1hZ2VUb0xpc3QocGhvdG9Db250YWluZXJJZCwgaW1nT2JqZWN0KTsgXHJcblx0fSBcclxuXHJcblx0ZnVuY3Rpb24gYWRkSW1hZ2VUb0xpc3QocGhvdG9Db250YWluZXJJZCwgaW1hZ2VPYmplY3QpIHtcclxuXHJcblx0XHR2YXIgJGltYWdlc0RpdiA9ICQoXCIjXCIgKyBwaG90b0NvbnRhaW5lcklkKTtcclxuXHRcdHZhciAkaW1nRGl2ID0gJCgnPGRpdiAvPicpLmFkZENsYXNzKFwiaW1nXCIpLmNzcyhcImhlaWdodFwiLCBwaG90b1NpemUuaGVpZ2h0ICsgXCJweFwiKTsgXHJcblx0XHR2YXIgJGRlbERpdiA9ICQoJzxkaXYgLz4nKS5hZGRDbGFzcyhcImRlbFwiKS5hdHRyKFwiZGF0YS1pZFwiLCBpbWFnZU9iamVjdC5maWxlTmFtZSk7IFxyXG5cdFx0dmFyICRpY29uID0gJCgnPGkgYXJpYS1oaWRkZW49XCJ0cnVlXCIgLz4nKS5hZGRDbGFzcyhcImZhIGZhLXRyYXNoLW9cIik7IFxyXG5cclxuXHRcdCRkZWxEaXYuYXBwZW5kKCRpY29uKTsgXHJcblxyXG5cdFx0JGltZ0Rpdi5jbGljayhmdW5jdGlvbihldnQpIHsgXHJcblx0XHRcdGV2dC5zdG9wUHJvcGFnYXRpb24oKTsgXHJcblxyXG5cdFx0XHR2YXIgJHBpYyA9ICQoJzxpbWcgc3R5bGU9XCJ3aWR0aDogMTAwJVwiIHdpZHRoPVwiMTAwJVwiIC8+JykuYXR0cignc3JjJywgaW1hZ2VPYmplY3QuY29udGVudCk7XHJcblx0ICAgICAgICBcclxuXHQgICAgICAgIEJvb3RzdHJhcERpYWxvZy5zaG93KHtcclxuXHQgICAgICAgICAgICB0aXRsZTogJ1Bob3RvIFByZXZpZXcnLFxyXG5cdCAgICAgICAgICAgIG1lc3NhZ2U6ICRwaWMsXHJcblx0ICAgICAgICAgICAgY3NzQ2xhc3M6ICdsb2dpbi1kaWFsb2cnLCBcclxuXHQgICAgICAgICAgICBidXR0b25zOiBbe1xyXG5cdCAgICAgICAgICAgICAgICBsYWJlbDogJ09LJyxcclxuXHQgICAgICAgICAgICAgICAgY3NzQ2xhc3M6ICdidG4tcHJpbWFyeScsXHJcblx0ICAgICAgICAgICAgICAgIGFjdGlvbjogZnVuY3Rpb24oZGlhbG9nUmVmKXtcclxuXHQgICAgICAgICAgICAgICAgICAgIGRpYWxvZ1JlZi5jbG9zZSgpO1xyXG5cdCAgICAgICAgICAgICAgICB9XHJcblx0ICAgICAgICAgICAgfV1cclxuXHQgICAgICAgIH0pOyBcclxuXHRcdH0pOyBcclxuXHJcblx0XHQkZGVsRGl2LmNsaWNrKGZ1bmN0aW9uKGV2dCkgeyBcclxuXHRcdCAgICBldnQuc3RvcFByb3BhZ2F0aW9uKCk7IFxyXG5cclxuXHRcdCAgICB2YXIgaW1hZ2VJZCA9IGltYWdlT2JqZWN0LmZpbGVOYW1lOyBcclxuXHQgICAgICAgIGlmIChjb25maXJtKCdBcmUgeW91IHN1cmU/JykgPT0gdHJ1ZSkge1xyXG5cdCAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiRGVsZXRpbmcoKTpcIiwgaW1hZ2VJZCk7IFxyXG5cclxuXHQgICAgICAgICAgICB2YXIgJGRlbEltZyA9ICQoJ2RpdltkYXRhLWlkPVwiJyArIGltYWdlSWQgKydcIl0nKTtcclxuXHQgICAgICAgICAgICB2YXIgJHBob3RvID0gJGRlbEltZy5wYXJlbnQoKTsgXHJcblx0ICAgICAgICAgICAgJHBob3RvLnJlbW92ZSgpOyBcclxuXHJcblx0ICAgICAgICAgICAgbXlJbmRleGVkREIuZGVsZXRlSW1hZ2UoaW1hZ2VJZClcclxuXHQgICAgICAgICAgICAudGhlbihmdW5jdGlvbihwaG90bykge1xyXG5cdCAgICAgICAgICAgIFx0Y29uc29sZS5sb2coXCJQaG90byBkZWxldGVkOlwiLCBwaG90byk7IFxyXG5cdCAgICAgICAgICAgIH0pOyBcclxuXHQgICAgICAgIH1cclxuXHRcdH0pOyBcclxuXHJcblx0XHQkaW1nRGl2LmFwcGVuZCgkZGVsRGl2KTsgXHJcblx0XHQkaW1nRGl2LmFwcGVuZCgkKFwiPGltZyAvPlwiKS5hdHRyKFwic3JjXCIsIGltYWdlT2JqZWN0LmNvbnRlbnQpLmF0dHIoXCJ3aWR0aFwiLCBwaG90b1NpemUud2lkdGgpLmF0dHIoXCJoZWlnaHRcIiwgcGhvdG9TaXplLmhlaWdodCkpOyBcclxuXHJcblx0XHQkaW1hZ2VzRGl2LmFwcGVuZCgkaW1nRGl2KTsgXHJcblx0fVxyXG5cclxuXHRyZXR1cm4geyAgICAgICAgXHJcbiAgICBcdGNvbmZpZ3VyZUNhbWVyYXM6IGNvbmZpZ3VyZUNhbWVyYXMgXHJcbiAgICB9O1xyXG5cclxufSgpKTsgIiwiXHJcbnZhciBjYW1lcmFEaWFsb2cgPSAoZnVuY3Rpb24oKSB7XHJcblxyXG5cdHZhciBjb25zdHJhaW50cyA9IHsgdmlkZW86IHRydWUsIGF1ZGlvOiBmYWxzZSB9OyBcclxuXHR2YXIgYmxhbmtDYW52YXNVUkw7IFxyXG5cdHZhciBjYWxsYmFjazsgXHJcblxyXG5cdHZhciAkdmlkZW8sICRjYW52YXM7IFxyXG5cdHZhciAkYnRuQ2FwdHVyZSwgJGJ0blN3YXAsICRidG5TYXZlOyBcclxuXHJcblx0ZnVuY3Rpb24gY29uZmlndXJlRm9ySU9TKGNhbWVyYUxpbmtJT1MsIGNhbWVyYUlkLCBjb250YWluZXJJZCwgc2F2ZVNuYXBzaG90Q2FsbGJhY2spIHtcclxuXHJcblx0XHRjYW1lcmFMaW5rSU9TLmNoYW5nZSgoZnVuY3Rpb24oY2FtZXJhSWQsIGNvbnRhaW5lcklkLCBjYWxsYmFjaykge1xyXG5cclxuXHRcdFx0cmV0dXJuIGZ1bmN0aW9uKGV2dCkge1xyXG5cdFx0XHRcdHZhciBmID0gZXZ0LnRhcmdldC5maWxlc1swXTsgXHJcblx0XHRcdFx0dmFyIHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKCk7XHJcblxyXG5cdFx0XHRcdHJlYWRlci5vbmxvYWQgPSBmdW5jdGlvbih0aGVGaWxlKSB7XHJcblxyXG5cdFx0XHQgICAgXHRpZiAoY2FsbGJhY2spIHtcclxuXHRcdFx0ICAgIFx0XHR2YXIgaW1nRGF0YSA9IHRoZUZpbGUudGFyZ2V0LnJlc3VsdDsgXHJcblx0XHRcdCAgICBcdFx0Y2FsbGJhY2soY2FtZXJhSWQsIGNvbnRhaW5lcklkLCBpbWdEYXRhKTsgXHJcblx0XHRcdCAgICBcdH1cclxuXHRcdFx0XHR9OyBcclxuXHJcblx0XHRcdFx0dmFyICRjYW1lcmFDb250YWluZXIgPSAkKCBcIiNcIiArIGNhbWVyYUlkICk7XHJcblx0XHRcdFx0dmFyICRwaG90b0NvbnRhaW5lciA9ICRjYW1lcmFDb250YWluZXIuZmluZChcIi5waG90by1pbWFnZXNldFwiKTtcclxuXHRcdFx0XHQkcGhvdG9Db250YWluZXIucmVtb3ZlQ2xhc3MoXCJoaWRkZW5cIik7XHRcdFx0XHJcblxyXG5cdFx0XHRcdC8vIFJlYWQgaW4gdGhlIGltYWdlIGZpbGUgYXMgYSBkYXRhIFVSTC5cclxuXHRcdFx0XHRyZWFkZXIucmVhZEFzRGF0YVVSTChmKTtcclxuXHRcdFx0fTsgXHJcblxyXG5cdFx0fSkoY2FtZXJhSWQsIGNvbnRhaW5lcklkLCBzYXZlU25hcHNob3RDYWxsYmFjaykpOyBcclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIGRpc3BsYXlDYW1lcmFEaWFsb2coY2FtZXJhSWQsIGNvbnRhaW5lcklkLCBzYXZlU25hcHNob3RDYWxsYmFjaykgeyBcclxuXHJcbiAgICAgICAgQm9vdHN0cmFwRGlhbG9nLnNob3coe1xyXG4gICAgICAgICAgICB0aXRsZTogJ1Rha2UgYSBwaG90bycsXHJcbiAgICAgICAgICAgIG1lc3NhZ2U6ICQoJzxkaXY+PC9kaXY+JykubG9hZCgnY2FtZXJhLmh0bWwnKSwgXHJcbiAgICAgICAgICAgIGNzc0NsYXNzOiAnbG9naW4tZGlhbG9nJywgXHJcbiAgICAgICAgICAgIG9uc2hvd246IGZ1bmN0aW9uKGRpYWxvZ1JlZikge1xyXG4gICAgICAgICAgICBcdFxyXG4gICAgICAgICAgICBcdHZhciBib2R5ID0gZGlhbG9nUmVmLmdldE1vZGFsQm9keSgpO1xyXG5cclxuICAgICAgICAgICAgXHRjYWxsYmFjayA9IHNhdmVTbmFwc2hvdENhbGxiYWNrOyBcclxuXHJcbiAgICAgICAgICAgIFx0dmFyIGNoYW5nZUJ0biA9IGJvZHkuZmluZChcIiNjaGFuZ2VJZFwiKTtcclxuICAgICAgICAgICAgXHRjaGFuZ2VCdG4uY2xpY2soc3dhcFZpZGVvV2l0aENhbnZhcyk7XHJcblxyXG4gICAgICAgICAgICBcdC8vIGluaXQgdmlkZW8gJiBjYW52YXMgaGVyZSBcclxuXHRcdFx0XHQkdmlkZW8gPSBib2R5LmZpbmQoXCIjZGF0YVZpZGVvSWRcIik7IFxyXG5cdFx0XHRcdCRjYW52YXMgPSBib2R5LmZpbmQoXCIjY2FudmFzSWRcIik7IFxyXG5cclxuICAgICAgICAgICAgXHR2YXIgdmlkZW8gPSAkdmlkZW9bMF07XHJcblx0XHRcdFx0dmFyIGNhbnZhcyA9IHdpbmRvdy5jYW52YXMgPSAkY2FudmFzWzBdOyBcclxuXHJcblx0XHRcdFx0aWYgKGJsYW5rQ2FudmFzVVJMKSB7XHJcblx0XHRcdFx0XHRibGFua0NhbnZhc1VSTCA9IGNhbnZhcy50b0RhdGFVUkwoKTsgXHJcblx0XHRcdFx0fSBcclxuXHJcblx0XHRcdFx0bmF2aWdhdG9yLm1lZGlhRGV2aWNlcy5nZXRVc2VyTWVkaWEoY29uc3RyYWludHMpXHJcblx0XHRcdFx0LnRoZW4oZnVuY3Rpb24gKHN0cmVhbSkge1xyXG5cdFx0XHRcdFx0d2luZG93LnN0cmVhbSA9IHN0cmVhbTsgXHJcblx0XHRcdFx0XHR2aWRlby5zcmNPYmplY3QgPSBzdHJlYW07XHJcblx0XHRcdFx0XHR2aWRlby5zcmMgPSB3aW5kb3cuVVJMLmNyZWF0ZU9iamVjdFVSTChzdHJlYW0pOyBcclxuXHRcdFx0XHR9KVxyXG5cdFx0XHRcdC5jYXRjaChmdW5jdGlvbiAoZXJyb3IpIHtcclxuXHRcdFx0XHQgXHRjb25zb2xlLndhcm4oJ25hdmlnYXRvci5nZXRVc2VyTWVkaWEgZXJyb3I6ICcsIGVycm9yKTtcclxuXHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0Ly8gZGlzcGxheSB0aGUgY29udGFpbmVyPyBcclxuXHRcdFx0XHR2YXIgJGNhbWVyYUNvbnRhaW5lciA9ICQoIFwiI1wiICsgY2FtZXJhSWQgKTtcclxuXHRcdFx0XHR2YXIgJHBob3RvQ29udGFpbmVyID0gJGNhbWVyYUNvbnRhaW5lci5maW5kKFwiLnBob3RvLWltYWdlc2V0XCIpO1xyXG5cdFx0XHRcdCRwaG90b0NvbnRhaW5lci5yZW1vdmVDbGFzcyhcImhpZGRlblwiKTtcclxuXHJcblx0XHRcdFx0Ly8gaW5pdCByZWZlcmVuY2VzIHRvIGJ1dHRvbnMgZnJvbSBtb2RhbCBmb290ZXIgXHJcblx0XHRcdFx0dmFyIGZvb3RlciA9IGRpYWxvZ1JlZi5nZXRNb2RhbEZvb3RlcigpOyBcclxuXHJcblx0XHRcdFx0JGJ0bkNhcHR1cmUgPSBmb290ZXIuZmluZChcIi5idG4tY2FwdHVyZVwiKTsgXHJcblx0XHRcdFx0JGJ0blN3YXAgPSBmb290ZXIuZmluZChcIi5idG4tc3dhcFwiKTsgXHJcblx0XHRcdFx0JGJ0blNhdmUgPSBmb290ZXIuZmluZChcIi5idG4tc2F2ZVwiKTsgXHJcbiAgICAgICAgICAgIH0sIFxyXG4gICAgICAgICAgICBvbmhpZGRlbjogZnVuY3Rpb24oZGlhbG9nUmVmKSB7XHJcbiAgICAgICAgICAgIFx0c3RvcENhbWVyYSgpOyBcclxuICAgICAgICAgICAgfSwgXHJcbiAgICAgICAgICAgIGNzc0NsYXNzOiAnbG9naW4tZGlhbG9nJywgXHJcbiAgICAgICAgICAgIGJ1dHRvbnM6IFt7XHJcbiAgICAgICAgICAgICAgICBsYWJlbDogJ1N3YXAnLFxyXG4gICAgICAgICAgICAgICAgaWNvbjogJ2dseXBoaWNvbiBnbHlwaGljb24tc29ydCcsXHJcbiAgICAgICAgICAgICAgICBjc3NDbGFzczogJ2J0biBidG4tcHJpbWFyeSBwdWxsLWxlZnQgaGlkZGVuIGJ0bi1zd2FwJyxcclxuICAgICAgICAgICAgICAgIGFjdGlvbjogZnVuY3Rpb24gKGRpYWxvZ0l0c2VsZikge1xyXG5cdFx0XHQgICAgXHRzd2FwVmlkZW9XaXRoQ2FudmFzKCk7IFxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9LCB7XHJcbiAgICAgICAgICAgICAgICBsYWJlbDogJ0NhcHR1cmUgU25hcHNob3QnLFxyXG4gICAgICAgICAgICAgICAgaWNvbjogJ2dseXBoaWNvbiBnbHlwaGljb24tY2FtZXJhJyxcclxuICAgICAgICAgICAgICAgIGNzc0NsYXNzOiAnYnRuIGJ0bi1wcmltYXJ5IHB1bGwtbGVmdCBidG4tY2FwdHVyZScsXHJcbiAgICAgICAgICAgICAgICBhY3Rpb246IGZ1bmN0aW9uIChkaWFsb2dJdHNlbGYpIHtcclxuXHRcdFx0ICAgIFx0Y2FwdHVyZVNuYXBzaG90KCk7IFxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9LCB7XHJcbiAgICAgICAgICAgICAgICBsYWJlbDogJ1NhdmUnLFxyXG4gICAgICAgICAgICAgICAgaWNvbjogJ2dseXBoaWNvbiBnbHlwaGljb24tb2snLFxyXG4gICAgICAgICAgICAgICAgY3NzQ2xhc3M6ICdidG4tcHJpbWFyeSBoaWRkZW4gYnRuLXNhdmUnLFxyXG4gICAgICAgICAgICAgICAgYWN0aW9uOiBmdW5jdGlvbiAoZGlhbG9nSXRzZWxmKSB7XHJcblxyXG5cdFx0XHQgICAgXHRpZiAoY2FsbGJhY2spIHtcclxuXHRcdFx0ICAgIFx0XHR2YXIgaW1nRGF0YSA9IGNhbnZhcy50b0RhdGFVUkwoXCJpbWFnZS9wbmdcIik7IFxyXG5cdFx0XHQgICAgXHRcdGNhbGxiYWNrKGNhbWVyYUlkLCBjb250YWluZXJJZCwgaW1nRGF0YSk7IFxyXG5cdFx0XHQgICAgXHR9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGRpYWxvZ0l0c2VsZi5jbG9zZSgpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9LCB7XHJcbiAgICAgICAgICAgICAgICBsYWJlbDogJ0NhbmNlbCcsXHJcbiAgICAgICAgICAgICAgICBpY29uOiAnZ2x5cGhpY29uIGdseXBoaWNvbi1yZW1vdmUnLFxyXG4gICAgICAgICAgICAgICAgY3NzQ2xhc3M6ICdidG4tZGFuZ2VyJyxcclxuICAgICAgICAgICAgICAgIGFjdGlvbjogZnVuY3Rpb24gKGRpYWxvZ0l0c2VsZikge1xyXG4gICAgICAgICAgICAgICAgICAgIGRpYWxvZ0l0c2VsZi5jbG9zZSgpOyBcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfV1cclxuICAgICAgICB9KTtcclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIHN3YXBWaWRlb1dpdGhDYW52YXMoKSB7XHJcblx0XHQkdmlkZW8udG9nZ2xlQ2xhc3MoXCJoaWRkZW5cIik7XHJcblx0XHQkY2FudmFzLnRvZ2dsZUNsYXNzKFwiaGlkZGVuXCIpOyBcclxuIFxyXG5cdFx0dmFyIGlzU2hvd2luZ1ZpZGVvID0gISR2aWRlby5oYXNDbGFzcyhcImhpZGRlblwiKTsgXHJcblx0XHRpZiAoaXNTaG93aW5nVmlkZW8pIHtcclxuXHRcdFx0Ly8gbWFrZSBzdXJlIHdlIGxldCB0byBzd2l0Y2ggdG8gY2FudmFzIG9ubHkgaWYgdGhlcmUgaXMgc29tZXRoaW5nIGRyYXduIG9uIHRoZSBjYW52YXMgXHJcblx0XHRcdHZhciBjdXJyZW50Q2FudmFzVVJMID0gJGNhbnZhc1swXS50b0RhdGFVUkwoKTsgXHJcblx0XHRcdGlmIChjdXJyZW50Q2FudmFzVVJMICE9IGJsYW5rQ2FudmFzVVJMKSB7XHJcblx0XHRcdFx0Ly8gY2FudmFzIGhhcyBzb21lIGNvbnRlbnQgLT4gZW5hYmxlIHZpZGVvLXRvLWNhbnZhcyBzd2FwcGluZyBcclxuXHRcdFx0XHRpZiAoJGJ0blN3YXAuaGFzQ2xhc3MoXCJoaWRkZW5cIikpIHtcclxuXHRcdFx0XHRcdCRidG5Td2FwLnJlbW92ZUNsYXNzKFwiaGlkZGVuXCIpOyBcclxuXHRcdFx0XHR9XHJcblx0XHRcdH1cclxuXHJcblx0XHRcdGlmICgkYnRuQ2FwdHVyZS5oYXNDbGFzcyhcImhpZGRlblwiKSkge1xyXG5cdFx0XHRcdCRidG5DYXB0dXJlLnJlbW92ZUNsYXNzKFwiaGlkZGVuXCIpOyBcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0ZWxzZSB7XHJcblx0XHRcdC8vIHdoZW4gc2hvd2luZyBjYW52YXMsIGhpZGUgdGhlICdjYXB0dXJlIHZpZGVvJyBidXR0b24gXHJcblx0XHRcdGlmICghJGJ0bkNhcHR1cmUuaGFzQ2xhc3MoXCJoaWRkZW5cIikpIHtcclxuXHRcdFx0XHQkYnRuQ2FwdHVyZS5hZGRDbGFzcyhcImhpZGRlblwiKTsgXHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9XHJcblxyXG4gICAgZnVuY3Rpb24gY2FwdHVyZVNuYXBzaG90KCkgeyBcclxuICAgICAgICBjb25zb2xlLmxvZyhcImNhcHR1cmVTbmFwc2hvdCgpLi4uXCIsICR2aWRlbywgJGNhbnZhcyk7IFxyXG5cclxuXHRcdGlmICgkdmlkZW8gJiYgJGNhbnZhcykge1xyXG5cdFx0XHR2YXIgdmlkZW8gPSAkdmlkZW9bMF07IFxyXG5cdFx0XHR2YXIgY2FudmFzID0gJGNhbnZhc1swXTsgXHJcblxyXG5cdFx0XHRjYW52YXMud2lkdGggPSB2aWRlby52aWRlb1dpZHRoO1xyXG4gIFx0XHRcdGNhbnZhcy5oZWlnaHQgPSB2aWRlby52aWRlb0hlaWdodDtcclxuXHRcdFx0Y2FudmFzLmdldENvbnRleHQoJzJkJykuZHJhd0ltYWdlKHZpZGVvLCAwLCAwLCBjYW52YXMud2lkdGgsIGNhbnZhcy5oZWlnaHQpO1xyXG5cclxuXHRcdFx0aWYgKCRidG5Td2FwLmhhc0NsYXNzKFwiaGlkZGVuXCIpKSB7XHJcblx0XHRcdFx0JGJ0blN3YXAucmVtb3ZlQ2xhc3MoXCJoaWRkZW5cIik7IFxyXG5cdFx0XHR9XHJcblx0XHRcdGlmICgkYnRuU2F2ZS5oYXNDbGFzcyhcImhpZGRlblwiKSkge1xyXG5cdFx0XHRcdCRidG5TYXZlLnJlbW92ZUNsYXNzKFwiaGlkZGVuXCIpOyBcclxuXHRcdFx0fVxyXG5cclxuXHRcdFx0c3dhcFZpZGVvV2l0aENhbnZhcygpOyBcdFx0XHRcclxuXHRcdH0gXHJcbiAgICB9IFxyXG5cclxuICAgIGZ1bmN0aW9uIHN0b3BDYW1lcmEoKSB7XHJcblx0XHR2YXIgdmlkZW8gPSAkdmlkZW9bMF07XHJcblx0XHR2YXIgc3RyZWFtID0gdmlkZW8uc3JjT2JqZWN0OyBcclxuXHRcdFxyXG5cdFx0aWYgKHN0cmVhbSkge1xyXG5cdFx0XHRzdHJlYW0uZ2V0VHJhY2tzKClbMF0uc3RvcCgpOyBcclxuXHRcdFx0dmlkZW8uc3JjID0gdmlkZW8uc3JjT2JqZWN0ID0gXCJcIjsgIFxyXG5cdFx0fVxyXG5cdH1cclxuIFxyXG4gICAgcmV0dXJuIHsgICAgICAgIFxyXG4gICAgXHRkaXNwbGF5Q2FtZXJhRGlhbG9nOiBkaXNwbGF5Q2FtZXJhRGlhbG9nLCBcclxuICAgIFx0Y29uZmlndXJlRm9ySU9TOiBjb25maWd1cmVGb3JJT1MgXHJcbiAgICB9O1xyXG5cclxufSgpKTsgXHJcbiIsInZhciBwaG90b1N0YXR1c2VzID0geyBOZXc6IDAsIEV4aXN0aW5nOiAxLCBEZWxldGVkOiAyIH07IFxyXG5cclxudmFyIG15SW5kZXhlZERCID0gKGZ1bmN0aW9uKCkge1xyXG5cclxuXHR2YXIgZGI7IFxyXG5cclxuICAgIGluaXQoKTsgXHJcblxyXG4gICAgZnVuY3Rpb24gaW5pdCgpIHsgXHJcblxyXG5cdFx0dmFyIHNjaGVtYSA9IHtcclxuXHRcdCAgc3RvcmVzOiBbe1xyXG5cdFx0ICAgIG5hbWU6ICdpbWFnZXNUYWJsZScsXHJcblx0XHQgICAgaW5kZXhlczogW3sgbmFtZTogJ2ZpbGVOYW1lJyB9LCB7IG5hbWU6ICdjYW1lcmFJZCcgfV1cclxuXHRcdCAgfV1cclxuXHRcdH07IFxyXG5cclxuICAgICAgICBkYiA9IG5ldyB5ZG4uZGIuU3RvcmFnZSgnTXlEQicsIHNjaGVtYSk7IFxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGFkZE5ld0ltYWdlKGlkLCBjYW1lcmFJZCwgY29udGVudCkgeyBcclxuICAgICAgICBjb25zb2xlLmxvZyhcImFkZE5ld0ltYWdlKCkuLi5cIiwgaWQsIGNhbWVyYUlkLCBjb250ZW50Lmxlbmd0aCk7IFxyXG5cclxuICAgICAgICAvLyB3ZSBhc3N1bWUgaGVyZSB0aGF0IGlkIChmaWxlTmFtZSkgaXMgdW5pcXVlIFxyXG4gICAgICAgIGRiLnB1dCgnaW1hZ2VzVGFibGUnLCB7IGZpbGVOYW1lOiBpZCwgY2FtZXJhSWQ6IGNhbWVyYUlkLCBkYXRlVGFrZW46IFN0cmluZyhuZXcgRGF0ZSgpKSwgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGhvdG9TdGF0dXM6IHBob3RvU3RhdHVzZXMuTmV3LCBjb250ZW50OiBjb250ZW50IH0sIGlkKTsgXHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gYWRkRXhpc3RpbmdJbWFnZShjYW1lcmFJZCwgY29udGVudCkgeyBcclxuICAgICAgICBjb25zb2xlLmxvZyhcImFkZEV4aXN0aW5nSW1hZ2UoKS4uLlwiLCBjYW1lcmFJZCwgY29udGVudC5sZW5ndGgpOyBcclxuXHJcbiAgICAgICAgdmFyIGlkID0gdXRpbHMubmV3R3VpZCgpICsgXCIucG5nXCI7IFxyXG5cclxuICAgICAgICAvLyB3ZSBhc3N1bWUgaGVyZSB0aGF0IGlkIChmaWxlTmFtZSkgaXMgdW5pcXVlIFxyXG4gICAgICAgIGRiLnB1dCgnaW1hZ2VzVGFibGUnLCB7IGZpbGVOYW1lOiBpZCwgY2FtZXJhSWQ6IGNhbWVyYUlkLCBkYXRlVGFrZW46IG51bGwsIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBob3RvU3RhdHVzOiBwaG90b1N0YXR1c2VzLkV4aXN0aW5nLCBjb250ZW50OiBjb250ZW50IH0sIGlkKTsgXHJcbiAgICB9XHJcbiAgICBcclxuICAgIGZ1bmN0aW9uIGdldEltYWdlcygpIHtcclxuXHJcbiAgICAgICAgLy9jb25zb2xlLmxvZyhcIlN0YXJ0aW5nIGdldEltYWdlcygpLi4uXCIsIGRiKTtcclxuXHJcbiAgICAgICAgLyp2YXIgcSA9IGRiLmZyb20oJ2ltYWdlc1RhYmxlJyk7XHJcbiAgICAgICAgLy9xID0gcS53aGVyZSgnY291bnRyeScsICc9JywgJ1NHJykub3JkZXIoJ2FnZScpO1xyXG4gICAgICAgIHEubGlzdChmdW5jdGlvbihsaXN0KSB7XHJcbiAgICAgICAgICBjb25zb2xlLmxvZyhcImdldEltYWdlcygpLi4uXCIsIGxpc3QpO1xyXG4gICAgICAgIH0pOyAqL1xyXG5cclxuICAgICAgICB2YXIgcCA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xyXG5cclxuICAgICAgICAgICAgdmFyIHF1ZXJ5ID0gZGIuZnJvbSgnaW1hZ2VzVGFibGUnKTsgXHJcbiAgICAgICAgICAgIHF1ZXJ5ID0gcXVlcnkud2hlcmUoJ3Bob3RvU3RhdHVzJywgJzwnLCBwaG90b1N0YXR1c2VzLkRlbGV0ZWQpOyBcclxuICAgICAgICAgICAgcXVlcnkubGlzdCgpLmRvbmUoZnVuY3Rpb24oaW1hZ2VzKSB7XHJcbiAgICAgICAgICAgICAgLy9jb25zb2xlLmxvZyhcIlJldHVybmluZyBnZXRJbWFnZXMoKTpcIiwgaW1hZ2VzKTsgLy8gbGlzdCBvZiBhbGwgaW1hZ2VzIFxyXG5cclxuICAgICAgICAgICAgICByZXNvbHZlKGltYWdlcyk7IFxyXG4gICAgICAgICAgICB9KTsgXHJcbiAgICAgICAgfSk7IFxyXG5cclxuICAgICAgICByZXR1cm4gcDsgXHJcbiAgICB9XHJcbiAgICAvKlxyXG4gICAgZnVuY3Rpb24gcmVtb3ZlSW1hZ2UoaWQpIHsgXHJcbiAgICBcdGNvbnNvbGUubG9nKFwicmVtb3ZlSW1hZ2UoKS4uLlwiLCBpZCk7IFxyXG5cclxuICAgICAgICBkYi5yZW1vdmUoXCJpbWFnZXNUYWJsZVwiLCBpZCk7IFxyXG5cdH1cclxuICAgICovXHJcblxyXG4gICAgLy8gcGVyZm9ybXMgYSB2aXJ0dWFsIGRlbGV0ZSBoZXJlIFxyXG4gICAgZnVuY3Rpb24gZGVsZXRlSW1hZ2UoaWQpIHsgXHJcbiAgICAgICAgY29uc29sZS5sb2coXCJkZWxldGVJbWFnZSgpLi4uXCIsIGlkKTsgXHJcblxyXG4gICAgICAgIHZhciBwID0gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XHJcblxyXG4gICAgICAgICAgICBmaW5kQnlGaWxlTmFtZShpZCkudGhlbihmdW5jdGlvbihwaG90b3MpIHtcclxuICAgICAgICAgICAgICAgIGlmIChwaG90b3MubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBwaG90byA9IHBob3Rvc1swXTsgXHJcbiAgICAgICAgICAgICAgICAgICAgcGhvdG8ucGhvdG9TdGF0dXMgPSBwaG90b1N0YXR1c2VzLkRlbGV0ZWQ7IFxyXG4gICAgICAgICAgICAgICAgICAgIGRiLnB1dCgnaW1hZ2VzVGFibGUnLCBwaG90bywgaWQpOyBcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShwaG90byk7IFxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTsgXHJcbiAgICAgICAgfSk7IFxyXG5cclxuICAgICAgICByZXR1cm4gcDsgXHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gZmluZEJ5RmlsZU5hbWUoZmlsZU5hbWUpIHtcclxuICAgICAgICBjb25zb2xlLmxvZyhcImZpbmRCeU5hbWUoKS4uLlwiLCBmaWxlTmFtZSk7IFxyXG5cclxuICAgICAgICB2YXIgcCA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xyXG5cclxuICAgICAgICAgICAgdmFyIHEgPSBkYi5mcm9tKCdpbWFnZXNUYWJsZScpO1xyXG4gICAgICAgICAgICBxID0gcS53aGVyZSgnZmlsZU5hbWUnLCAnPScsIGZpbGVOYW1lKTtcclxuICAgICAgICAgICAgcS5saXN0KCkuZG9uZShmdW5jdGlvbihsaXN0KSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhsaXN0KTtcclxuICAgICAgICAgICAgICAgIHJlc29sdmUobGlzdCk7IFxyXG4gICAgICAgICAgICB9KTsgXHJcbiAgICAgICAgfSk7IFxyXG5cclxuICAgICAgICByZXR1cm4gcDsgXHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gZmluZEJ5Q2FtZXJhSWQoY2FtZXJhSWQpIHsgXHJcbiAgICAgICAgY29uc29sZS5sb2coXCJmaW5kQnlDYW1lcmFJZCgpLi4uXCIsIGNhbWVyYUlkKTsgXHJcblxyXG4gICAgICAgIHZhciBwID0gbmV3IFByb21pc2UoZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XHJcblxyXG4gICAgICAgICAgICB2YXIgcSA9IGRiLmZyb20oJ2ltYWdlc1RhYmxlJyk7XHJcbiAgICAgICAgICAgIHEgPSBxLndoZXJlKCdjYW1lcmFJZCcsICc9JywgY2FtZXJhSWQpO1xyXG4gICAgICAgICAgICAvL3EgPSBxLndoZXJlKCdwaG90b1N0YXR1cycsICc8JywgcGhvdG9TdGF0dXNlcy5EZWxldGVkKTsgXHJcbiAgICAgICAgICAgIHEubGlzdCgpLmRvbmUoZnVuY3Rpb24obGlzdCkge1xyXG5cclxuICAgICAgICAgICAgICAgIHZhciBmaWx0ZXJlZExpc3QgPSBbXTsgXHJcbiAgICAgICAgICAgICAgICBsaXN0LmZvckVhY2goZnVuY3Rpb24ocGhvdG8pIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAocGhvdG8ucGhvdG9TdGF0dXMgIT0gcGhvdG9TdGF0dXNlcy5EZWxldGVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZpbHRlcmVkTGlzdC5wdXNoKHBob3RvKTsgXHJcbiAgICAgICAgICAgICAgICAgICAgfSAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICB9KTsgXHJcblxyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJmaW5kQnlDYW1lcmFJZCgpOlwiLCBjYW1lcmFJZCwgZmlsdGVyZWRMaXN0KTtcclxuICAgICAgICAgICAgICAgIHJlc29sdmUoZmlsdGVyZWRMaXN0KTsgXHJcbiAgICAgICAgICAgIH0pOyBcclxuICAgICAgICB9KTsgXHJcblxyXG4gICAgICAgIHJldHVybiBwOyBcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4geyAgICAgICAgXHJcbiAgICBcdGFkZE5ld0ltYWdlOiBhZGROZXdJbWFnZSwgXHJcbiAgICAgICAgYWRkRXhpc3RpbmdJbWFnZTogYWRkRXhpc3RpbmdJbWFnZSwgXHJcbiAgICAgICAgZ2V0SW1hZ2VzOiBnZXRJbWFnZXMsIFxyXG4gICAgXHRkZWxldGVJbWFnZTogZGVsZXRlSW1hZ2UsIFxyXG4gICAgICAgIGZpbmRCeUZpbGVOYW1lOiBmaW5kQnlGaWxlTmFtZSwgXHJcbiAgICAgICAgZmluZEJ5Q2FtZXJhSWQ6IGZpbmRCeUNhbWVyYUlkICBcclxuICAgIH07XHJcblxyXG59KCkpOyBcclxuIiwidmFyIHV0aWxzID0gKGZ1bmN0aW9uKCkge1xyXG5cclxuIFx0ZnVuY3Rpb24gUzQoKSB7XHJcbiAgICAgICAgcmV0dXJuICgoKDErTWF0aC5yYW5kb20oKSkqMHgxMDAwMCl8MCkudG9TdHJpbmcoMTYpLnN1YnN0cmluZygxKTsgXHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gbmV3R3VpZCgpIHtcclxuXHJcblx0XHQvLyB0aGVuIHRvIGNhbGwgaXQsIHBsdXMgc3RpdGNoIGluICc0JyBpbiB0aGUgdGhpcmQgZ3JvdXBcclxuXHRcdHZhciBndWlkID0gKFM0KCkgKyBTNCgpICsgXCItXCIgKyBTNCgpICsgXCItNFwiICsgUzQoKS5zdWJzdHIoMCwzKSArIFwiLVwiICsgUzQoKSArIFwiLVwiICsgUzQoKSArIFM0KCkgKyBTNCgpKS50b0xvd2VyQ2FzZSgpO1xyXG5cdFx0cmV0dXJuIGd1aWQ7IFxyXG4gICAgfSBcclxuXHJcbiAgICBmdW5jdGlvbiBpc0lPUygpIHsgXHJcblx0XHR2YXIgaU9TID0gWydpUGFkJywgJ2lQaG9uZScsICdpUG9kJ10uaW5kZXhPZihuYXZpZ2F0b3IucGxhdGZvcm0pID49IDA7IFxyXG5cdFx0cmV0dXJuIGlPUzsgXHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHsgXHJcbiAgICBcdG5ld0d1aWQ6IG5ld0d1aWQsIFxyXG4gICAgXHRpc0lPUzogaXNJT1MgXHJcbiAgICB9O1xyXG5cclxufSgpKTsgXHJcbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
