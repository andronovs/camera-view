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
