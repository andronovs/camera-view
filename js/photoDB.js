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
