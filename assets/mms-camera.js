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
            	
            	var body = dialogRef.getModalBody();

            	callback = saveSnapshotCallback; 

            	var changeBtn = body.find("#changeId");
            	changeBtn.click(swapVideoWithCanvas);

            	// init video & canvas here 
				$video = body.find("#dataVideoId"); 
				$canvas = body.find("#canvasId"); 

            	var video = $video[0];
				var canvas = window.canvas = $canvas[0]; 

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
				$btnRetake = footer.find(".btn-retake"); 
				$btnSave = footer.find(".btn-save"); 
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
        console.log("captureSnapshot()...", $video, $canvas); 

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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1tcy1jYW1lcmEtdWkuanMiLCJtbXMtY2FtZXJhLmpzIiwibW1zLWluZGV4ZWREQi5qcyIsIm1tcy11dGlscy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxJQUFBLFlBQUEsV0FBQTs7Q0FFQSxJQUFBLFlBQUEsRUFBQSxPQUFBLEtBQUEsUUFBQTs7Q0FFQSxTQUFBLGlCQUFBLGVBQUE7RUFDQSxjQUFBLFFBQUEsU0FBQSxjQUFBOztHQUVBLElBQUEsV0FBQSxhQUFBO0dBQ0EsSUFBQSxpQkFBQSxhQUFBOztNQUVBLGdCQUFBLFVBQUE7Ozs7SUFJQSxTQUFBLGdCQUFBLFVBQUEsZ0JBQUE7O0VBRUEsSUFBQSxtQkFBQSxHQUFBLE1BQUE7RUFDQSxJQUFBLGNBQUEsaUJBQUEsS0FBQTtFQUNBLElBQUEsa0JBQUEsaUJBQUEsS0FBQTtFQUNBLElBQUEsbUJBQUEsZ0JBQUEsS0FBQTs7RUFFQSxJQUFBLGlCQUFBLGlCQUFBLEtBQUE7O0VBRUEsSUFBQSxNQUFBLE1BQUE7RUFDQSxJQUFBLGtCQUFBLFNBQUEsV0FBQTtHQUNBLE9BQUEsV0FBQSxLQUFBOztFQUVBLGVBQUEsSUFBQSxXQUFBLGdCQUFBO0VBQ0EsWUFBQSxJQUFBLFdBQUEsZ0JBQUEsQ0FBQTs7RUFFQSxJQUFBLGtCQUFBO0dBQ0EsYUFBQSxnQkFBQSxnQkFBQSxVQUFBLGtCQUFBOztHQUVBLFlBQUEsTUFBQSxXQUFBO0lBQ0EsYUFBQSxvQkFBQSxVQUFBLGtCQUFBOzs7O0VBSUEsSUFBQSxrQkFBQSxlQUFBLFNBQUEsR0FBQTtHQUNBLGVBQUEsUUFBQSxTQUFBLGVBQUE7O0lBRUEsWUFBQSxpQkFBQSxVQUFBOzs7O0VBSUEsbUJBQUEsa0JBQUE7OztDQUdBLFNBQUEsbUJBQUEsa0JBQUEsVUFBQTs7RUFFQSxZQUFBLGVBQUEsVUFBQSxLQUFBLFNBQUEsUUFBQTs7TUFFQSxFQUFBLEtBQUEsUUFBQSxXQUFBO0lBQ0EsZUFBQSxrQkFBQTs7Ozs7Q0FLQSxTQUFBLGFBQUEsVUFBQSxr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QSxRQUFBLEtBQUEsa0NBQUE7Ozs7SUFJQSxJQUFBLG1CQUFBLEdBQUEsTUFBQTtJQUNBLElBQUEsa0JBQUEsaUJBQUEsS0FBQTtJQUNBLGdCQUFBLFlBQUE7OztJQUdBLElBQUEsU0FBQSxVQUFBOztJQUVBLGNBQUEsT0FBQSxLQUFBO0lBQ0EsYUFBQSxPQUFBLEtBQUE7SUFDQSxXQUFBLE9BQUEsS0FBQTs7WUFFQSxVQUFBLFNBQUEsV0FBQTthQUNBOztZQUVBLFVBQUE7WUFDQSxTQUFBLENBQUE7Z0JBQ0EsT0FBQTtnQkFDQSxNQUFBO2dCQUNBLFVBQUE7Z0JBQ0EsUUFBQSxVQUFBLGNBQUE7UUFDQTs7ZUFFQTtnQkFDQSxPQUFBO2dCQUNBLE1BQUE7Z0JBQ0EsVUFBQTtnQkFDQSxRQUFBLFVBQUEsY0FBQTtRQUNBOztlQUVBO2dCQUNBLE9BQUE7Z0JBQ0EsTUFBQTtnQkFDQSxVQUFBO2dCQUNBLFFBQUEsVUFBQSxjQUFBOztRQUVBLElBQUEsVUFBQTtTQUNBLElBQUEsVUFBQSxPQUFBLFVBQUE7U0FDQSxTQUFBLFVBQUEsYUFBQTs7YUFFQTtTQUNBLFFBQUEsS0FBQTs7O29CQUdBLGFBQUE7O2VBRUE7Z0JBQ0EsT0FBQTtnQkFDQSxNQUFBO2dCQUNBLFVBQUE7Z0JBQ0EsUUFBQSxVQUFBLGNBQUE7b0JBQ0EsYUFBQTs7Ozs7O0NBTUEsU0FBQSxzQkFBQTtFQUNBLE9BQUEsWUFBQTtFQUNBLFFBQUEsWUFBQTs7RUFFQSxZQUFBLFlBQUE7RUFDQSxXQUFBLFlBQUE7OztJQUdBLFNBQUEsa0JBQUE7UUFDQSxRQUFBLElBQUEsd0JBQUEsUUFBQTs7RUFFQSxJQUFBLFVBQUEsU0FBQTtHQUNBLElBQUEsUUFBQSxPQUFBO0dBQ0EsSUFBQSxTQUFBLFFBQUE7O0dBRUEsT0FBQSxRQUFBLE1BQUE7S0FDQSxPQUFBLFNBQUEsTUFBQTtHQUNBLE9BQUEsV0FBQSxNQUFBLFVBQUEsT0FBQSxHQUFBLEdBQUEsT0FBQSxPQUFBLE9BQUE7O0dBRUEsSUFBQSxTQUFBLFNBQUEsV0FBQTtJQUNBLFNBQUEsWUFBQTs7O0dBR0E7Ozs7SUFJQSxTQUFBLGFBQUE7RUFDQSxJQUFBLFFBQUEsT0FBQTtFQUNBLElBQUEsU0FBQSxNQUFBOztFQUVBLElBQUEsUUFBQTtHQUNBLE9BQUEsWUFBQSxHQUFBO0dBQ0EsTUFBQSxNQUFBLE1BQUEsWUFBQTs7OztJQUlBLE9BQUE7S0FDQSxxQkFBQTtLQUNBLGlCQUFBOzs7OztBQ3ZLQSxJQUFBLGdCQUFBLEVBQUEsS0FBQSxHQUFBLFVBQUEsR0FBQSxTQUFBOztBQUVBLElBQUEsZUFBQSxXQUFBOztDQUVBLElBQUE7O0lBRUE7O0lBRUEsU0FBQSxPQUFBOztFQUVBLElBQUEsU0FBQTtJQUNBLFFBQUEsQ0FBQTtNQUNBLE1BQUE7TUFDQSxTQUFBLENBQUEsRUFBQSxNQUFBLGNBQUEsRUFBQSxNQUFBOzs7O1FBSUEsS0FBQSxJQUFBLElBQUEsR0FBQSxRQUFBLFFBQUE7OztJQUdBLFNBQUEsWUFBQSxJQUFBLFVBQUEsU0FBQTtRQUNBLFFBQUEsSUFBQSxvQkFBQSxJQUFBLFVBQUEsUUFBQTs7O1FBR0EsR0FBQSxJQUFBLGVBQUEsRUFBQSxVQUFBLElBQUEsVUFBQSxVQUFBLFdBQUEsT0FBQSxJQUFBO2dDQUNBLGFBQUEsY0FBQSxLQUFBLFNBQUEsV0FBQTs7O0lBR0EsU0FBQSxpQkFBQSxVQUFBLFNBQUE7UUFDQSxRQUFBLElBQUEseUJBQUEsVUFBQSxRQUFBOztRQUVBLElBQUEsS0FBQSxNQUFBLFlBQUE7OztRQUdBLEdBQUEsSUFBQSxlQUFBLEVBQUEsVUFBQSxJQUFBLFVBQUEsVUFBQSxXQUFBO2dDQUNBLGFBQUEsY0FBQSxVQUFBLFNBQUEsV0FBQTs7O0lBR0EsU0FBQSxZQUFBOzs7Ozs7Ozs7O1FBVUEsSUFBQSxJQUFBLElBQUEsUUFBQSxTQUFBLFNBQUEsUUFBQTs7WUFFQSxJQUFBLFFBQUEsR0FBQSxLQUFBO1lBQ0EsUUFBQSxNQUFBLE1BQUEsZUFBQSxLQUFBLGNBQUE7WUFDQSxNQUFBLE9BQUEsS0FBQSxTQUFBLFFBQUE7OztjQUdBLFFBQUE7Ozs7UUFJQSxPQUFBOzs7Ozs7Ozs7OztJQVdBLFNBQUEsWUFBQSxJQUFBO1FBQ0EsUUFBQSxJQUFBLG9CQUFBOztRQUVBLElBQUEsSUFBQSxJQUFBLFFBQUEsU0FBQSxTQUFBLFFBQUE7O1lBRUEsZUFBQSxJQUFBLEtBQUEsU0FBQSxRQUFBO2dCQUNBLElBQUEsT0FBQSxTQUFBLEdBQUE7b0JBQ0EsSUFBQSxRQUFBLE9BQUE7b0JBQ0EsTUFBQSxjQUFBLGNBQUE7b0JBQ0EsR0FBQSxJQUFBLGVBQUEsT0FBQTs7b0JBRUEsUUFBQTs7Ozs7UUFLQSxPQUFBOzs7SUFHQSxTQUFBLGVBQUEsVUFBQTtRQUNBLFFBQUEsSUFBQSxtQkFBQTs7UUFFQSxJQUFBLElBQUEsSUFBQSxRQUFBLFNBQUEsU0FBQSxRQUFBOztZQUVBLElBQUEsSUFBQSxHQUFBLEtBQUE7WUFDQSxJQUFBLEVBQUEsTUFBQSxZQUFBLEtBQUE7WUFDQSxFQUFBLE9BQUEsS0FBQSxTQUFBLE1BQUE7Z0JBQ0EsUUFBQSxJQUFBO2dCQUNBLFFBQUE7Ozs7UUFJQSxPQUFBOzs7SUFHQSxTQUFBLGVBQUEsVUFBQTtRQUNBLFFBQUEsSUFBQSx1QkFBQTs7UUFFQSxJQUFBLElBQUEsSUFBQSxRQUFBLFNBQUEsU0FBQSxRQUFBOztZQUVBLElBQUEsSUFBQSxHQUFBLEtBQUE7WUFDQSxJQUFBLEVBQUEsTUFBQSxZQUFBLEtBQUE7O1lBRUEsRUFBQSxPQUFBLEtBQUEsU0FBQSxNQUFBOztnQkFFQSxJQUFBLGVBQUE7Z0JBQ0EsS0FBQSxRQUFBLFNBQUEsT0FBQTtvQkFDQSxJQUFBLE1BQUEsZUFBQSxjQUFBLFNBQUE7d0JBQ0EsYUFBQSxLQUFBOzs7O2dCQUlBLFFBQUEsSUFBQSxxQkFBQSxVQUFBO2dCQUNBLFFBQUE7Ozs7UUFJQSxPQUFBOzs7SUFHQSxPQUFBO0tBQ0EsYUFBQTtRQUNBLGtCQUFBO1FBQ0EsV0FBQTtLQUNBLGFBQUE7UUFDQSxnQkFBQTtRQUNBLGdCQUFBOzs7OztBQ3hJQSxJQUFBLFNBQUEsV0FBQTs7RUFFQSxTQUFBLEtBQUE7UUFDQSxPQUFBLENBQUEsQ0FBQSxDQUFBLEVBQUEsS0FBQSxVQUFBLFNBQUEsR0FBQSxTQUFBLElBQUEsVUFBQTs7O0lBR0EsU0FBQSxVQUFBOzs7RUFHQSxJQUFBLE9BQUEsQ0FBQSxPQUFBLE9BQUEsTUFBQSxPQUFBLE9BQUEsS0FBQSxPQUFBLEVBQUEsS0FBQSxNQUFBLE9BQUEsTUFBQSxPQUFBLE9BQUEsTUFBQTtFQUNBLE9BQUE7OztJQUdBLFNBQUEsUUFBQTtFQUNBLElBQUEsTUFBQSxDQUFBLFFBQUEsVUFBQSxRQUFBLFFBQUEsVUFBQSxhQUFBO0VBQ0EsT0FBQTs7O0lBR0EsT0FBQTtLQUNBLFNBQUE7S0FDQSxPQUFBOzs7O0FBSUEiLCJmaWxlIjoibW1zLWNhbWVyYS5qcyIsInNvdXJjZXNDb250ZW50IjpbInZhciBjYW1lcmFVSSA9IChmdW5jdGlvbigpIHtcclxuXHJcblx0dmFyIHBob3RvU2l6ZSA9IHsgd2lkdGg6IDE1MCwgaGVpZ2h0OiAxMTMgfTtcclxuXHJcblx0ZnVuY3Rpb24gY29uZmlndXJlQ2FtZXJhcyhjYW1lcmFEZXRhaWxzKSB7IFxyXG5cdFx0Y2FtZXJhRGV0YWlscy5mb3JFYWNoKGZ1bmN0aW9uKGNhbWVyYURldGFpbCkgeyBcclxuXHJcblx0XHRcdHZhciBjYW1lcmFJZCA9IGNhbWVyYURldGFpbC5jYW1lcmFJZDsgXHJcblx0XHRcdHZhciBleGlzdGluZ1Bob3RvcyA9IGNhbWVyYURldGFpbC5leGlzdGluZ1Bob3RvczsgXHJcblxyXG5cdFx0ICAgIGNvbmZpZ3VyZUNhbWVyYShjYW1lcmFJZCwgZXhpc3RpbmdQaG90b3MpOyBcclxuXHRcdH0pOyBcclxuXHR9XHJcblxyXG4gICAgZnVuY3Rpb24gY29uZmlndXJlQ2FtZXJhKGNhbWVyYUlkLCBleGlzdGluZ1Bob3Rvcykge1xyXG5cclxuXHRcdHZhciAkY2FtZXJhQ29udGFpbmVyID0gJCggXCIjXCIgKyBjYW1lcmFJZCApOyBcclxuXHRcdHZhciAkY2FtZXJhTGluayA9ICRjYW1lcmFDb250YWluZXIuZmluZChcIi5jYW1lcmEtbGlua1wiKTsgXHJcblx0XHR2YXIgJHBob3RvQ29udGFpbmVyID0gJGNhbWVyYUNvbnRhaW5lci5maW5kKFwiLnBob3RvLWltYWdlc2V0XCIpOyBcclxuXHRcdHZhciBwaG90b0NvbnRhaW5lcklkID0gJHBob3RvQ29udGFpbmVyLmF0dHIoXCJpZFwiKTtcclxuXHJcblx0XHR2YXIgJGNhbWVyYUxpbmtJT1MgPSAkY2FtZXJhQ29udGFpbmVyLmZpbmQoXCIuY2FtZXJhLWxpbmstaW9zXCIpOyBcclxuXHJcblx0XHR2YXIgaU9TID0gdXRpbHMuaXNJT1MoKTsgXHJcblx0XHR2YXIgZ2V0RGlzcGxheVZhbHVlID0gZnVuY3Rpb24oaXNWaXNpYmxlKSB7XHJcblx0XHRcdHJldHVybiBpc1Zpc2libGU/IFwiXCIgOiBcIm5vbmVcIjsgXHJcblx0XHR9OyBcclxuXHRcdCRjYW1lcmFMaW5rSU9TLmNzcyhcImRpc3BsYXlcIiwgZ2V0RGlzcGxheVZhbHVlKGlPUykpOyBcclxuXHRcdCRjYW1lcmFMaW5rLmNzcyhcImRpc3BsYXlcIiwgZ2V0RGlzcGxheVZhbHVlKCFpT1MpKTsgXHJcblxyXG5cdFx0aWYgKHBob3RvQ29udGFpbmVySWQpIHtcclxuXHRcdFx0Y2FtZXJhRGlhbG9nLmNvbmZpZ3VyZUZvcklPUygkY2FtZXJhTGlua0lPUywgY2FtZXJhSWQsIHBob3RvQ29udGFpbmVySWQsIHNhdmVTbmFwc2hvdCk7IFxyXG5cclxuXHRcdFx0JGNhbWVyYUxpbmsuY2xpY2soZnVuY3Rpb24oKSB7IFxyXG5cdFx0XHRcdGNhbWVyYURpYWxvZy5kaXNwbGF5Q2FtZXJhRGlhbG9nKGNhbWVyYUlkLCBwaG90b0NvbnRhaW5lcklkLCBzYXZlU25hcHNob3QpOyBcclxuXHRcdFx0fSk7IFxyXG5cdFx0fVxyXG5cclxuXHRcdGlmIChleGlzdGluZ1Bob3RvcyAmJiBleGlzdGluZ1Bob3Rvcy5sZW5ndGggPiAwKSB7XHJcblx0XHRcdGV4aXN0aW5nUGhvdG9zLmZvckVhY2goZnVuY3Rpb24oZXhpc3RpbmdQaG90bykge1xyXG5cdFx0XHRcdC8vIFRPRE86IHRlc3QgdGhpcyBtZXRob2QgY2FsbCBcclxuXHRcdFx0XHRteUluZGV4ZWREQi5hZGRFeGlzdGluZ0ltYWdlKGNhbWVyYUlkLCBleGlzdGluZ1Bob3RvKTsgXHJcblx0XHRcdH0pOyBcdFxyXG5cdFx0fVxyXG5cclxuXHRcdHBvcHVsYXRlSW1hZ2VzTGlzdChwaG90b0NvbnRhaW5lcklkLCBjYW1lcmFJZCk7IFxyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gcG9wdWxhdGVJbWFnZXNMaXN0KHBob3RvQ29udGFpbmVySWQsIGNhbWVyYUlkKSB7IFxyXG5cdFx0Ly8gcG9wdWxhdGUgdGhlIGxpc3Qgb2YgYWxsIGltYWdlcyBmb3IgZ2l2ZW4gY2FtZXJhICBcclxuXHRcdG15SW5kZXhlZERCLmZpbmRCeUNhbWVyYUlkKGNhbWVyYUlkKS50aGVuKGZ1bmN0aW9uKGltYWdlcykgeyBcclxuXHJcblx0XHQgICAgJC5lYWNoKGltYWdlcywgZnVuY3Rpb24oKSB7IFxyXG5cdFx0XHRcdGFkZEltYWdlVG9MaXN0KHBob3RvQ29udGFpbmVySWQsIHRoaXMpOyBcclxuXHRcdFx0fSk7IFxyXG5cdFx0fSk7IFxyXG5cdH1cclxuXHJcblx0ZnVuY3Rpb24gc2F2ZVNuYXBzaG90KGNhbWVyYUlkLCBwaG90b0NvbnRhaW5lcklkLCBpbWdEYXRhKSB7XHJcblx0XHRjb25zb2xlLmxvZyhcInNhdmVTbmFwc2hvdCgpLi4uXCIsIHBob3RvQ29udGFpbmVySWQsIGltZ0RhdGEubGVuZ3RoKTsgXHJcblxyXG5cdFx0dmFyIGZpbGVOYW1lID0gdXRpbHMubmV3R3VpZCgpICsgXCIucG5nXCI7IFxyXG5cdFx0dmFyIGltZ09iamVjdCA9IHsgZmlsZU5hbWU6IGZpbGVOYW1lLCBjb250ZW50OiBpbWdEYXRhLCBjYW1lcmFJZDogY2FtZXJhSWQgfTtcclxuXHJcblx0XHRteUluZGV4ZWREQi5hZGROZXdJbWFnZShmaWxlTmFtZSwgY2FtZXJhSWQsIGltZ0RhdGEpO1xyXG5cclxuXHRcdGFkZEltYWdlVG9MaXN0KHBob3RvQ29udGFpbmVySWQsIGltZ09iamVjdCk7IFxyXG5cdH0gXHJcblxyXG5cdGZ1bmN0aW9uIGFkZEltYWdlVG9MaXN0KHBob3RvQ29udGFpbmVySWQsIGltYWdlT2JqZWN0KSB7XHJcblxyXG5cdFx0dmFyICRpbWFnZXNEaXYgPSAkKFwiI1wiICsgcGhvdG9Db250YWluZXJJZCk7XHJcblx0XHR2YXIgJGltZ0RpdiA9ICQoJzxkaXYgLz4nKS5hZGRDbGFzcyhcImltZ1wiKS5jc3MoXCJoZWlnaHRcIiwgcGhvdG9TaXplLmhlaWdodCArIFwicHhcIik7IFxyXG5cdFx0dmFyICRkZWxEaXYgPSAkKCc8ZGl2IC8+JykuYWRkQ2xhc3MoXCJkZWxcIikuYXR0cihcImRhdGEtaWRcIiwgaW1hZ2VPYmplY3QuZmlsZU5hbWUpOyBcclxuXHRcdHZhciAkaWNvbiA9ICQoJzxpIGFyaWEtaGlkZGVuPVwidHJ1ZVwiIC8+JykuYWRkQ2xhc3MoXCJmYSBmYS10cmFzaC1vXCIpOyBcclxuXHJcblx0XHQkZGVsRGl2LmFwcGVuZCgkaWNvbik7IFxyXG5cclxuXHRcdCRpbWdEaXYuY2xpY2soZnVuY3Rpb24oZXZ0KSB7IFxyXG5cdFx0XHRldnQuc3RvcFByb3BhZ2F0aW9uKCk7IFxyXG5cclxuXHRcdFx0dmFyICRwaWMgPSAkKCc8aW1nIHN0eWxlPVwid2lkdGg6IDEwMCVcIiB3aWR0aD1cIjEwMCVcIiAvPicpLmF0dHIoJ3NyYycsIGltYWdlT2JqZWN0LmNvbnRlbnQpO1xyXG5cdCAgICAgICAgXHJcblx0ICAgICAgICBCb290c3RyYXBEaWFsb2cuc2hvdyh7XHJcblx0ICAgICAgICAgICAgdGl0bGU6ICdQaG90byBQcmV2aWV3JyxcclxuXHQgICAgICAgICAgICBtZXNzYWdlOiAkcGljLFxyXG5cdCAgICAgICAgICAgIGNzc0NsYXNzOiAnbG9naW4tZGlhbG9nJywgXHJcblx0ICAgICAgICAgICAgYnV0dG9uczogW3tcclxuXHQgICAgICAgICAgICAgICAgbGFiZWw6ICdPSycsXHJcblx0ICAgICAgICAgICAgICAgIGNzc0NsYXNzOiAnYnRuLXByaW1hcnknLFxyXG5cdCAgICAgICAgICAgICAgICBhY3Rpb246IGZ1bmN0aW9uKGRpYWxvZ1JlZil7XHJcblx0ICAgICAgICAgICAgICAgICAgICBkaWFsb2dSZWYuY2xvc2UoKTtcclxuXHQgICAgICAgICAgICAgICAgfVxyXG5cdCAgICAgICAgICAgIH1dXHJcblx0ICAgICAgICB9KTsgXHJcblx0XHR9KTsgXHJcblxyXG5cdFx0JGRlbERpdi5jbGljayhmdW5jdGlvbihldnQpIHsgXHJcblx0XHQgICAgZXZ0LnN0b3BQcm9wYWdhdGlvbigpOyBcclxuXHJcblx0XHQgICAgdmFyIGltYWdlSWQgPSBpbWFnZU9iamVjdC5maWxlTmFtZTsgXHJcblx0ICAgICAgICBpZiAoY29uZmlybSgnQXJlIHlvdSBzdXJlPycpID09IHRydWUpIHtcclxuXHQgICAgICAgICAgICBjb25zb2xlLmxvZyhcIkRlbGV0aW5nKCk6XCIsIGltYWdlSWQpOyBcclxuXHJcblx0ICAgICAgICAgICAgdmFyICRkZWxJbWcgPSAkKCdkaXZbZGF0YS1pZD1cIicgKyBpbWFnZUlkICsnXCJdJyk7XHJcblx0ICAgICAgICAgICAgdmFyICRwaG90byA9ICRkZWxJbWcucGFyZW50KCk7IFxyXG5cdCAgICAgICAgICAgICRwaG90by5yZW1vdmUoKTsgXHJcblxyXG5cdCAgICAgICAgICAgIG15SW5kZXhlZERCLmRlbGV0ZUltYWdlKGltYWdlSWQpXHJcblx0ICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24ocGhvdG8pIHtcclxuXHQgICAgICAgICAgICBcdGNvbnNvbGUubG9nKFwiUGhvdG8gZGVsZXRlZDpcIiwgcGhvdG8pOyBcclxuXHQgICAgICAgICAgICB9KTsgXHJcblx0ICAgICAgICB9XHJcblx0XHR9KTsgXHJcblxyXG5cdFx0JGltZ0Rpdi5hcHBlbmQoJGRlbERpdik7IFxyXG5cdFx0JGltZ0Rpdi5hcHBlbmQoJChcIjxpbWcgLz5cIikuYXR0cihcInNyY1wiLCBpbWFnZU9iamVjdC5jb250ZW50KS5hdHRyKFwid2lkdGhcIiwgcGhvdG9TaXplLndpZHRoKS5hdHRyKFwiaGVpZ2h0XCIsIHBob3RvU2l6ZS5oZWlnaHQpKTsgXHJcblxyXG5cdFx0JGltYWdlc0Rpdi5hcHBlbmQoJGltZ0Rpdik7IFxyXG5cdH1cclxuXHJcblx0cmV0dXJuIHsgICAgICAgIFxyXG4gICAgXHRjb25maWd1cmVDYW1lcmFzOiBjb25maWd1cmVDYW1lcmFzIFxyXG4gICAgfTtcclxuXHJcbn0oKSk7ICIsIlxyXG52YXIgY2FtZXJhRGlhbG9nID0gKGZ1bmN0aW9uKCkge1xyXG5cclxuXHR2YXIgY29uc3RyYWludHMgPSB7IHZpZGVvOiB0cnVlLCBhdWRpbzogZmFsc2UgfTsgXHJcblx0dmFyIGNhbGxiYWNrOyBcclxuXHJcblx0dmFyICR2aWRlbywgJGNhbnZhczsgXHJcblx0dmFyICRidG5DYXB0dXJlLCAkYnRuUmV0YWtlLCAkYnRuU2F2ZTsgXHJcblxyXG5cdGZ1bmN0aW9uIGNvbmZpZ3VyZUZvcklPUyhjYW1lcmFMaW5rSU9TLCBjYW1lcmFJZCwgY29udGFpbmVySWQsIHNhdmVTbmFwc2hvdENhbGxiYWNrKSB7XHJcblxyXG5cdFx0Y2FtZXJhTGlua0lPUy5jaGFuZ2UoKGZ1bmN0aW9uKGNhbWVyYUlkLCBjb250YWluZXJJZCwgY2FsbGJhY2spIHtcclxuXHJcblx0XHRcdHJldHVybiBmdW5jdGlvbihldnQpIHtcclxuXHRcdFx0XHR2YXIgZiA9IGV2dC50YXJnZXQuZmlsZXNbMF07IFxyXG5cdFx0XHRcdHZhciByZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpO1xyXG5cclxuXHRcdFx0XHRyZWFkZXIub25sb2FkID0gZnVuY3Rpb24odGhlRmlsZSkge1xyXG5cclxuXHRcdFx0ICAgIFx0aWYgKGNhbGxiYWNrKSB7XHJcblx0XHRcdCAgICBcdFx0dmFyIGltZ0RhdGEgPSB0aGVGaWxlLnRhcmdldC5yZXN1bHQ7IFxyXG5cdFx0XHQgICAgXHRcdGNhbGxiYWNrKGNhbWVyYUlkLCBjb250YWluZXJJZCwgaW1nRGF0YSk7IFxyXG5cdFx0XHQgICAgXHR9XHJcblx0XHRcdCAgICBcdGVsc2Uge1xyXG5cdFx0XHQgICAgXHRcdGNvbnNvbGUud2FybihcIkNhbGxiYWNrIGlzIG5vdCBkZWZpbmVkIVwiKTsgXHJcblx0XHRcdCAgICBcdH1cclxuXHRcdFx0XHR9OyBcclxuXHJcblx0XHRcdFx0dmFyICRjYW1lcmFDb250YWluZXIgPSAkKCBcIiNcIiArIGNhbWVyYUlkICk7XHJcblx0XHRcdFx0dmFyICRwaG90b0NvbnRhaW5lciA9ICRjYW1lcmFDb250YWluZXIuZmluZChcIi5waG90by1pbWFnZXNldFwiKTtcclxuXHRcdFx0XHQkcGhvdG9Db250YWluZXIucmVtb3ZlQ2xhc3MoXCJoaWRkZW5cIik7XHRcdFx0XHJcblxyXG5cdFx0XHRcdC8vIFJlYWQgaW4gdGhlIGltYWdlIGZpbGUgYXMgYSBkYXRhIFVSTC5cclxuXHRcdFx0XHRyZWFkZXIucmVhZEFzRGF0YVVSTChmKTtcclxuXHRcdFx0fTsgXHJcblxyXG5cdFx0fSkoY2FtZXJhSWQsIGNvbnRhaW5lcklkLCBzYXZlU25hcHNob3RDYWxsYmFjaykpOyBcclxuXHR9XHJcblxyXG5cdGZ1bmN0aW9uIGRpc3BsYXlDYW1lcmFEaWFsb2coY2FtZXJhSWQsIGNvbnRhaW5lcklkLCBzYXZlU25hcHNob3RDYWxsYmFjaykgeyBcclxuXHJcbiAgICAgICAgQm9vdHN0cmFwRGlhbG9nLnNob3coe1xyXG4gICAgICAgICAgICB0aXRsZTogJ1Rha2UgYSBwaG90bycsXHJcbiAgICAgICAgICAgIG1lc3NhZ2U6ICQoJzxkaXY+PC9kaXY+JykubG9hZCgnY2FtZXJhLmh0bWwnKSwgXHJcbiAgICAgICAgICAgIGNzc0NsYXNzOiAnbG9naW4tZGlhbG9nJywgXHJcbiAgICAgICAgICAgIG9uc2hvd246IGZ1bmN0aW9uKGRpYWxvZ1JlZikge1xyXG4gICAgICAgICAgICBcdFxyXG4gICAgICAgICAgICBcdHZhciBib2R5ID0gZGlhbG9nUmVmLmdldE1vZGFsQm9keSgpO1xyXG5cclxuICAgICAgICAgICAgXHRjYWxsYmFjayA9IHNhdmVTbmFwc2hvdENhbGxiYWNrOyBcclxuXHJcbiAgICAgICAgICAgIFx0dmFyIGNoYW5nZUJ0biA9IGJvZHkuZmluZChcIiNjaGFuZ2VJZFwiKTtcclxuICAgICAgICAgICAgXHRjaGFuZ2VCdG4uY2xpY2soc3dhcFZpZGVvV2l0aENhbnZhcyk7XHJcblxyXG4gICAgICAgICAgICBcdC8vIGluaXQgdmlkZW8gJiBjYW52YXMgaGVyZSBcclxuXHRcdFx0XHQkdmlkZW8gPSBib2R5LmZpbmQoXCIjZGF0YVZpZGVvSWRcIik7IFxyXG5cdFx0XHRcdCRjYW52YXMgPSBib2R5LmZpbmQoXCIjY2FudmFzSWRcIik7IFxyXG5cclxuICAgICAgICAgICAgXHR2YXIgdmlkZW8gPSAkdmlkZW9bMF07XHJcblx0XHRcdFx0dmFyIGNhbnZhcyA9IHdpbmRvdy5jYW52YXMgPSAkY2FudmFzWzBdOyBcclxuXHJcblx0XHRcdFx0bmF2aWdhdG9yLm1lZGlhRGV2aWNlcy5nZXRVc2VyTWVkaWEoY29uc3RyYWludHMpXHJcblx0XHRcdFx0LnRoZW4oZnVuY3Rpb24gKHN0cmVhbSkge1xyXG5cdFx0XHRcdFx0d2luZG93LnN0cmVhbSA9IHN0cmVhbTsgXHJcblx0XHRcdFx0XHR2aWRlby5zcmNPYmplY3QgPSBzdHJlYW07XHJcblx0XHRcdFx0XHR2aWRlby5zcmMgPSB3aW5kb3cuVVJMLmNyZWF0ZU9iamVjdFVSTChzdHJlYW0pOyBcclxuXHRcdFx0XHR9KVxyXG5cdFx0XHRcdC5jYXRjaChmdW5jdGlvbiAoZXJyb3IpIHtcclxuXHRcdFx0XHQgXHRjb25zb2xlLndhcm4oJ25hdmlnYXRvci5nZXRVc2VyTWVkaWEgZXJyb3I6ICcsIGVycm9yKTtcclxuXHRcdFx0XHR9KTtcclxuXHJcblx0XHRcdFx0Ly8gZGlzcGxheSB0aGUgY29udGFpbmVyPyBcclxuXHRcdFx0XHR2YXIgJGNhbWVyYUNvbnRhaW5lciA9ICQoIFwiI1wiICsgY2FtZXJhSWQgKTtcclxuXHRcdFx0XHR2YXIgJHBob3RvQ29udGFpbmVyID0gJGNhbWVyYUNvbnRhaW5lci5maW5kKFwiLnBob3RvLWltYWdlc2V0XCIpO1xyXG5cdFx0XHRcdCRwaG90b0NvbnRhaW5lci5yZW1vdmVDbGFzcyhcImhpZGRlblwiKTtcclxuXHJcblx0XHRcdFx0Ly8gaW5pdCByZWZlcmVuY2VzIHRvIGJ1dHRvbnMgZnJvbSBtb2RhbCBmb290ZXIgXHJcblx0XHRcdFx0dmFyIGZvb3RlciA9IGRpYWxvZ1JlZi5nZXRNb2RhbEZvb3RlcigpOyBcclxuXHJcblx0XHRcdFx0JGJ0bkNhcHR1cmUgPSBmb290ZXIuZmluZChcIi5idG4tY2FwdHVyZVwiKTsgXHJcblx0XHRcdFx0JGJ0blJldGFrZSA9IGZvb3Rlci5maW5kKFwiLmJ0bi1yZXRha2VcIik7IFxyXG5cdFx0XHRcdCRidG5TYXZlID0gZm9vdGVyLmZpbmQoXCIuYnRuLXNhdmVcIik7IFxyXG4gICAgICAgICAgICB9LCBcclxuICAgICAgICAgICAgb25oaWRkZW46IGZ1bmN0aW9uKGRpYWxvZ1JlZikge1xyXG4gICAgICAgICAgICBcdHN0b3BDYW1lcmEoKTsgXHJcbiAgICAgICAgICAgIH0sIFxyXG4gICAgICAgICAgICBjc3NDbGFzczogJ2xvZ2luLWRpYWxvZycsIFxyXG4gICAgICAgICAgICBidXR0b25zOiBbe1xyXG4gICAgICAgICAgICAgICAgbGFiZWw6ICdSZXRha2UnLFxyXG4gICAgICAgICAgICAgICAgaWNvbjogJ2dseXBoaWNvbiBnbHlwaGljb24tc29ydCcsXHJcbiAgICAgICAgICAgICAgICBjc3NDbGFzczogJ2J0biBidG4tcHJpbWFyeSBwdWxsLWxlZnQgaGlkZGVuIGJ0bi1yZXRha2UnLFxyXG4gICAgICAgICAgICAgICAgYWN0aW9uOiBmdW5jdGlvbiAoZGlhbG9nSXRzZWxmKSB7XHJcblx0XHRcdCAgICBcdHN3YXBWaWRlb1dpdGhDYW52YXMoKTsgXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0sIHtcclxuICAgICAgICAgICAgICAgIGxhYmVsOiAnQ2FwdHVyZSBTbmFwc2hvdCcsXHJcbiAgICAgICAgICAgICAgICBpY29uOiAnZ2x5cGhpY29uIGdseXBoaWNvbi1jYW1lcmEnLFxyXG4gICAgICAgICAgICAgICAgY3NzQ2xhc3M6ICdidG4gYnRuLXByaW1hcnkgcHVsbC1sZWZ0IGJ0bi1jYXB0dXJlJyxcclxuICAgICAgICAgICAgICAgIGFjdGlvbjogZnVuY3Rpb24gKGRpYWxvZ0l0c2VsZikge1xyXG5cdFx0XHQgICAgXHRjYXB0dXJlU25hcHNob3QoKTsgXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0sIHtcclxuICAgICAgICAgICAgICAgIGxhYmVsOiAnU2F2ZScsXHJcbiAgICAgICAgICAgICAgICBpY29uOiAnZ2x5cGhpY29uIGdseXBoaWNvbi1vaycsXHJcbiAgICAgICAgICAgICAgICBjc3NDbGFzczogJ2J0bi1wcmltYXJ5IGhpZGRlbiBidG4tc2F2ZScsXHJcbiAgICAgICAgICAgICAgICBhY3Rpb246IGZ1bmN0aW9uIChkaWFsb2dJdHNlbGYpIHtcclxuXHJcblx0XHRcdCAgICBcdGlmIChjYWxsYmFjaykge1xyXG5cdFx0XHQgICAgXHRcdHZhciBpbWdEYXRhID0gY2FudmFzLnRvRGF0YVVSTChcImltYWdlL3BuZ1wiKTsgXHJcblx0XHRcdCAgICBcdFx0Y2FsbGJhY2soY2FtZXJhSWQsIGNvbnRhaW5lcklkLCBpbWdEYXRhKTsgXHJcblx0XHRcdCAgICBcdH1cclxuXHRcdFx0ICAgIFx0ZWxzZSB7XHJcblx0XHRcdCAgICBcdFx0Y29uc29sZS53YXJuKFwiQ2FsbGJhY2sgaXMgbm90IGRlZmluZWQhXCIpOyBcclxuXHRcdFx0ICAgIFx0fVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBkaWFsb2dJdHNlbGYuY2xvc2UoKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSwge1xyXG4gICAgICAgICAgICAgICAgbGFiZWw6ICdDYW5jZWwnLFxyXG4gICAgICAgICAgICAgICAgaWNvbjogJ2dseXBoaWNvbiBnbHlwaGljb24tcmVtb3ZlJyxcclxuICAgICAgICAgICAgICAgIGNzc0NsYXNzOiAnYnRuLWRhbmdlcicsXHJcbiAgICAgICAgICAgICAgICBhY3Rpb246IGZ1bmN0aW9uIChkaWFsb2dJdHNlbGYpIHtcclxuICAgICAgICAgICAgICAgICAgICBkaWFsb2dJdHNlbGYuY2xvc2UoKTsgXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1dXHJcbiAgICAgICAgfSk7XHJcblx0fVxyXG5cclxuXHRmdW5jdGlvbiBzd2FwVmlkZW9XaXRoQ2FudmFzKCkge1xyXG5cdFx0JHZpZGVvLnRvZ2dsZUNsYXNzKFwiaGlkZGVuXCIpO1xyXG5cdFx0JGNhbnZhcy50b2dnbGVDbGFzcyhcImhpZGRlblwiKTsgXHJcblxyXG5cdFx0JGJ0bkNhcHR1cmUudG9nZ2xlQ2xhc3MoXCJoaWRkZW5cIik7IFxyXG5cdFx0JGJ0blJldGFrZS50b2dnbGVDbGFzcyhcImhpZGRlblwiKTsgIFxyXG5cdH1cclxuXHJcbiAgICBmdW5jdGlvbiBjYXB0dXJlU25hcHNob3QoKSB7IFxyXG4gICAgICAgIGNvbnNvbGUubG9nKFwiY2FwdHVyZVNuYXBzaG90KCkuLi5cIiwgJHZpZGVvLCAkY2FudmFzKTsgXHJcblxyXG5cdFx0aWYgKCR2aWRlbyAmJiAkY2FudmFzKSB7XHJcblx0XHRcdHZhciB2aWRlbyA9ICR2aWRlb1swXTsgXHJcblx0XHRcdHZhciBjYW52YXMgPSAkY2FudmFzWzBdOyBcclxuXHJcblx0XHRcdGNhbnZhcy53aWR0aCA9IHZpZGVvLnZpZGVvV2lkdGg7XHJcbiAgXHRcdFx0Y2FudmFzLmhlaWdodCA9IHZpZGVvLnZpZGVvSGVpZ2h0O1xyXG5cdFx0XHRjYW52YXMuZ2V0Q29udGV4dCgnMmQnKS5kcmF3SW1hZ2UodmlkZW8sIDAsIDAsIGNhbnZhcy53aWR0aCwgY2FudmFzLmhlaWdodCk7XHJcblxyXG5cdFx0XHRpZiAoJGJ0blNhdmUuaGFzQ2xhc3MoXCJoaWRkZW5cIikpIHtcclxuXHRcdFx0XHQkYnRuU2F2ZS5yZW1vdmVDbGFzcyhcImhpZGRlblwiKTsgXHJcblx0XHRcdH1cclxuXHJcblx0XHRcdHN3YXBWaWRlb1dpdGhDYW52YXMoKTsgXHRcdFx0XHJcblx0XHR9IFxyXG4gICAgfSBcclxuXHJcbiAgICBmdW5jdGlvbiBzdG9wQ2FtZXJhKCkge1xyXG5cdFx0dmFyIHZpZGVvID0gJHZpZGVvWzBdO1xyXG5cdFx0dmFyIHN0cmVhbSA9IHZpZGVvLnNyY09iamVjdDsgXHJcblx0XHRcclxuXHRcdGlmIChzdHJlYW0pIHtcclxuXHRcdFx0c3RyZWFtLmdldFRyYWNrcygpWzBdLnN0b3AoKTsgXHJcblx0XHRcdHZpZGVvLnNyYyA9IHZpZGVvLnNyY09iamVjdCA9IFwiXCI7ICBcclxuXHRcdH1cclxuXHR9XHJcbiBcclxuICAgIHJldHVybiB7ICAgICAgICBcclxuICAgIFx0ZGlzcGxheUNhbWVyYURpYWxvZzogZGlzcGxheUNhbWVyYURpYWxvZywgXHJcbiAgICBcdGNvbmZpZ3VyZUZvcklPUzogY29uZmlndXJlRm9ySU9TIFxyXG4gICAgfTtcclxuXHJcbn0oKSk7IFxyXG4iLCJ2YXIgcGhvdG9TdGF0dXNlcyA9IHsgTmV3OiAwLCBFeGlzdGluZzogMSwgRGVsZXRlZDogMiB9OyBcclxuXHJcbnZhciBteUluZGV4ZWREQiA9IChmdW5jdGlvbigpIHtcclxuXHJcblx0dmFyIGRiOyBcclxuXHJcbiAgICBpbml0KCk7IFxyXG5cclxuICAgIGZ1bmN0aW9uIGluaXQoKSB7IFxyXG5cclxuXHRcdHZhciBzY2hlbWEgPSB7XHJcblx0XHQgIHN0b3JlczogW3tcclxuXHRcdCAgICBuYW1lOiAnaW1hZ2VzVGFibGUnLFxyXG5cdFx0ICAgIGluZGV4ZXM6IFt7IG5hbWU6ICdmaWxlTmFtZScgfSwgeyBuYW1lOiAnY2FtZXJhSWQnIH1dXHJcblx0XHQgIH1dXHJcblx0XHR9OyBcclxuXHJcbiAgICAgICAgZGIgPSBuZXcgeWRuLmRiLlN0b3JhZ2UoJ015REInLCBzY2hlbWEpOyBcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBhZGROZXdJbWFnZShpZCwgY2FtZXJhSWQsIGNvbnRlbnQpIHsgXHJcbiAgICAgICAgY29uc29sZS5sb2coXCJhZGROZXdJbWFnZSgpLi4uXCIsIGlkLCBjYW1lcmFJZCwgY29udGVudC5sZW5ndGgpOyBcclxuXHJcbiAgICAgICAgLy8gd2UgYXNzdW1lIGhlcmUgdGhhdCBpZCAoZmlsZU5hbWUpIGlzIHVuaXF1ZSBcclxuICAgICAgICBkYi5wdXQoJ2ltYWdlc1RhYmxlJywgeyBmaWxlTmFtZTogaWQsIGNhbWVyYUlkOiBjYW1lcmFJZCwgZGF0ZVRha2VuOiBTdHJpbmcobmV3IERhdGUoKSksIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBob3RvU3RhdHVzOiBwaG90b1N0YXR1c2VzLk5ldywgY29udGVudDogY29udGVudCB9LCBpZCk7IFxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGFkZEV4aXN0aW5nSW1hZ2UoY2FtZXJhSWQsIGNvbnRlbnQpIHsgXHJcbiAgICAgICAgY29uc29sZS5sb2coXCJhZGRFeGlzdGluZ0ltYWdlKCkuLi5cIiwgY2FtZXJhSWQsIGNvbnRlbnQubGVuZ3RoKTsgXHJcblxyXG4gICAgICAgIHZhciBpZCA9IHV0aWxzLm5ld0d1aWQoKSArIFwiLnBuZ1wiOyBcclxuXHJcbiAgICAgICAgLy8gd2UgYXNzdW1lIGhlcmUgdGhhdCBpZCAoZmlsZU5hbWUpIGlzIHVuaXF1ZSBcclxuICAgICAgICBkYi5wdXQoJ2ltYWdlc1RhYmxlJywgeyBmaWxlTmFtZTogaWQsIGNhbWVyYUlkOiBjYW1lcmFJZCwgZGF0ZVRha2VuOiBudWxsLCBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwaG90b1N0YXR1czogcGhvdG9TdGF0dXNlcy5FeGlzdGluZywgY29udGVudDogY29udGVudCB9LCBpZCk7IFxyXG4gICAgfVxyXG4gICAgXHJcbiAgICBmdW5jdGlvbiBnZXRJbWFnZXMoKSB7XHJcblxyXG4gICAgICAgIC8vY29uc29sZS5sb2coXCJTdGFydGluZyBnZXRJbWFnZXMoKS4uLlwiLCBkYik7XHJcblxyXG4gICAgICAgIC8qdmFyIHEgPSBkYi5mcm9tKCdpbWFnZXNUYWJsZScpO1xyXG4gICAgICAgIC8vcSA9IHEud2hlcmUoJ2NvdW50cnknLCAnPScsICdTRycpLm9yZGVyKCdhZ2UnKTtcclxuICAgICAgICBxLmxpc3QoZnVuY3Rpb24obGlzdCkge1xyXG4gICAgICAgICAgY29uc29sZS5sb2coXCJnZXRJbWFnZXMoKS4uLlwiLCBsaXN0KTtcclxuICAgICAgICB9KTsgKi9cclxuXHJcbiAgICAgICAgdmFyIHAgPSBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcclxuXHJcbiAgICAgICAgICAgIHZhciBxdWVyeSA9IGRiLmZyb20oJ2ltYWdlc1RhYmxlJyk7IFxyXG4gICAgICAgICAgICBxdWVyeSA9IHF1ZXJ5LndoZXJlKCdwaG90b1N0YXR1cycsICc8JywgcGhvdG9TdGF0dXNlcy5EZWxldGVkKTsgXHJcbiAgICAgICAgICAgIHF1ZXJ5Lmxpc3QoKS5kb25lKGZ1bmN0aW9uKGltYWdlcykge1xyXG4gICAgICAgICAgICAgIC8vY29uc29sZS5sb2coXCJSZXR1cm5pbmcgZ2V0SW1hZ2VzKCk6XCIsIGltYWdlcyk7IC8vIGxpc3Qgb2YgYWxsIGltYWdlcyBcclxuXHJcbiAgICAgICAgICAgICAgcmVzb2x2ZShpbWFnZXMpOyBcclxuICAgICAgICAgICAgfSk7IFxyXG4gICAgICAgIH0pOyBcclxuXHJcbiAgICAgICAgcmV0dXJuIHA7IFxyXG4gICAgfVxyXG4gICAgLypcclxuICAgIGZ1bmN0aW9uIHJlbW92ZUltYWdlKGlkKSB7IFxyXG4gICAgXHRjb25zb2xlLmxvZyhcInJlbW92ZUltYWdlKCkuLi5cIiwgaWQpOyBcclxuXHJcbiAgICAgICAgZGIucmVtb3ZlKFwiaW1hZ2VzVGFibGVcIiwgaWQpOyBcclxuXHR9XHJcbiAgICAqL1xyXG5cclxuICAgIC8vIHBlcmZvcm1zIGEgdmlydHVhbCBkZWxldGUgaGVyZSBcclxuICAgIGZ1bmN0aW9uIGRlbGV0ZUltYWdlKGlkKSB7IFxyXG4gICAgICAgIGNvbnNvbGUubG9nKFwiZGVsZXRlSW1hZ2UoKS4uLlwiLCBpZCk7IFxyXG5cclxuICAgICAgICB2YXIgcCA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xyXG5cclxuICAgICAgICAgICAgZmluZEJ5RmlsZU5hbWUoaWQpLnRoZW4oZnVuY3Rpb24ocGhvdG9zKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAocGhvdG9zLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgcGhvdG8gPSBwaG90b3NbMF07IFxyXG4gICAgICAgICAgICAgICAgICAgIHBob3RvLnBob3RvU3RhdHVzID0gcGhvdG9TdGF0dXNlcy5EZWxldGVkOyBcclxuICAgICAgICAgICAgICAgICAgICBkYi5wdXQoJ2ltYWdlc1RhYmxlJywgcGhvdG8sIGlkKTsgXHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUocGhvdG8pOyBcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7IFxyXG4gICAgICAgIH0pOyBcclxuXHJcbiAgICAgICAgcmV0dXJuIHA7IFxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGZpbmRCeUZpbGVOYW1lKGZpbGVOYW1lKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coXCJmaW5kQnlOYW1lKCkuLi5cIiwgZmlsZU5hbWUpOyBcclxuXHJcbiAgICAgICAgdmFyIHAgPSBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcclxuXHJcbiAgICAgICAgICAgIHZhciBxID0gZGIuZnJvbSgnaW1hZ2VzVGFibGUnKTtcclxuICAgICAgICAgICAgcSA9IHEud2hlcmUoJ2ZpbGVOYW1lJywgJz0nLCBmaWxlTmFtZSk7XHJcbiAgICAgICAgICAgIHEubGlzdCgpLmRvbmUoZnVuY3Rpb24obGlzdCkge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2cobGlzdCk7XHJcbiAgICAgICAgICAgICAgICByZXNvbHZlKGxpc3QpOyBcclxuICAgICAgICAgICAgfSk7IFxyXG4gICAgICAgIH0pOyBcclxuXHJcbiAgICAgICAgcmV0dXJuIHA7IFxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGZpbmRCeUNhbWVyYUlkKGNhbWVyYUlkKSB7IFxyXG4gICAgICAgIGNvbnNvbGUubG9nKFwiZmluZEJ5Q2FtZXJhSWQoKS4uLlwiLCBjYW1lcmFJZCk7IFxyXG5cclxuICAgICAgICB2YXIgcCA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xyXG5cclxuICAgICAgICAgICAgdmFyIHEgPSBkYi5mcm9tKCdpbWFnZXNUYWJsZScpO1xyXG4gICAgICAgICAgICBxID0gcS53aGVyZSgnY2FtZXJhSWQnLCAnPScsIGNhbWVyYUlkKTtcclxuICAgICAgICAgICAgLy9xID0gcS53aGVyZSgncGhvdG9TdGF0dXMnLCAnPCcsIHBob3RvU3RhdHVzZXMuRGVsZXRlZCk7IFxyXG4gICAgICAgICAgICBxLmxpc3QoKS5kb25lKGZ1bmN0aW9uKGxpc3QpIHtcclxuXHJcbiAgICAgICAgICAgICAgICB2YXIgZmlsdGVyZWRMaXN0ID0gW107IFxyXG4gICAgICAgICAgICAgICAgbGlzdC5mb3JFYWNoKGZ1bmN0aW9uKHBob3RvKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHBob3RvLnBob3RvU3RhdHVzICE9IHBob3RvU3RhdHVzZXMuRGVsZXRlZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBmaWx0ZXJlZExpc3QucHVzaChwaG90byk7IFxyXG4gICAgICAgICAgICAgICAgICAgIH0gICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgfSk7IFxyXG5cclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiZmluZEJ5Q2FtZXJhSWQoKTpcIiwgY2FtZXJhSWQsIGZpbHRlcmVkTGlzdCk7XHJcbiAgICAgICAgICAgICAgICByZXNvbHZlKGZpbHRlcmVkTGlzdCk7IFxyXG4gICAgICAgICAgICB9KTsgXHJcbiAgICAgICAgfSk7IFxyXG5cclxuICAgICAgICByZXR1cm4gcDsgXHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHsgICAgICAgIFxyXG4gICAgXHRhZGROZXdJbWFnZTogYWRkTmV3SW1hZ2UsIFxyXG4gICAgICAgIGFkZEV4aXN0aW5nSW1hZ2U6IGFkZEV4aXN0aW5nSW1hZ2UsIFxyXG4gICAgICAgIGdldEltYWdlczogZ2V0SW1hZ2VzLCBcclxuICAgIFx0ZGVsZXRlSW1hZ2U6IGRlbGV0ZUltYWdlLCBcclxuICAgICAgICBmaW5kQnlGaWxlTmFtZTogZmluZEJ5RmlsZU5hbWUsIFxyXG4gICAgICAgIGZpbmRCeUNhbWVyYUlkOiBmaW5kQnlDYW1lcmFJZCAgXHJcbiAgICB9O1xyXG5cclxufSgpKTsgXHJcbiIsInZhciB1dGlscyA9IChmdW5jdGlvbigpIHtcclxuXHJcbiBcdGZ1bmN0aW9uIFM0KCkge1xyXG4gICAgICAgIHJldHVybiAoKCgxK01hdGgucmFuZG9tKCkpKjB4MTAwMDApfDApLnRvU3RyaW5nKDE2KS5zdWJzdHJpbmcoMSk7IFxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIG5ld0d1aWQoKSB7XHJcblxyXG5cdFx0Ly8gdGhlbiB0byBjYWxsIGl0LCBwbHVzIHN0aXRjaCBpbiAnNCcgaW4gdGhlIHRoaXJkIGdyb3VwXHJcblx0XHR2YXIgZ3VpZCA9IChTNCgpICsgUzQoKSArIFwiLVwiICsgUzQoKSArIFwiLTRcIiArIFM0KCkuc3Vic3RyKDAsMykgKyBcIi1cIiArIFM0KCkgKyBcIi1cIiArIFM0KCkgKyBTNCgpICsgUzQoKSkudG9Mb3dlckNhc2UoKTtcclxuXHRcdHJldHVybiBndWlkOyBcclxuICAgIH0gXHJcblxyXG4gICAgZnVuY3Rpb24gaXNJT1MoKSB7IFxyXG5cdFx0dmFyIGlPUyA9IFsnaVBhZCcsICdpUGhvbmUnLCAnaVBvZCddLmluZGV4T2YobmF2aWdhdG9yLnBsYXRmb3JtKSA+PSAwOyBcclxuXHRcdHJldHVybiBpT1M7IFxyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB7IFxyXG4gICAgXHRuZXdHdWlkOiBuZXdHdWlkLCBcclxuICAgIFx0aXNJT1M6IGlzSU9TIFxyXG4gICAgfTtcclxuXHJcbn0oKSk7IFxyXG4iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
