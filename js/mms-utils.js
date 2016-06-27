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
