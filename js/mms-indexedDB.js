var myIndexedDB = (function() {

	var db; 

    init(); 

    function init() { 

		var schema = {
		  stores: [{
		    name: 'imagesTable',
		    indexes: [{ name: 'fileName' }]
		  }]
		}; 

        db = new ydn.db.Storage('MyDB', schema); 
    }
    
    function addImage(id, dateTaken, content) { 
    	console.log("addImage()...", id, dateTaken, content.length); 

        // we assume here that id (fileName) is unique 
    	db.put('imagesTable', { fileName: id, dateTaken: String(dateTaken), content: content }, id); 
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
            //console.log("getImages()...", query);
            query.list().done(function(images) {
              //console.log("Returning getImages():", images); // list of all images 

              resolve(images); 
            }); 
        }); 

        return p; 
    }

    function removeImage(id) { 
    	console.log("removeImage()...", id); 

        db.remove("imagesTable", id); 
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
            q.list().done(function(list) {
                console.log(list);
                resolve(list); 
            }); 
        }); 

        return p; 
    }

    return {        
    	addImage: addImage, 
        getImages: getImages, 
    	removeImage: removeImage, 
        findByFileName: findByFileName, 
        findByCameraId: findByCameraId  
    };

}()); 
