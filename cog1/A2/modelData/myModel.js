/**
 * Empty object for groups in scenegraph.
 * 
 * @namespace cog1.data
 * @module empty
 */
define(["exports", "data"], function(exports, data) {
	"use strict";

	/**
	 * Create an instance of the model defined in this module.
	 * 
	 * @parameter object with fields:
	 * @returns instance of this model.
	 */
	exports.create = function(parameter) {
		
		if(parameter) {
			var scale = parameter.scale;
		}
		// Set default values if parameter is undefined.
		if(scale == undefined){
			scale = 200;
		}

		// Instance of the model to be returned.
		var instance = {};

		instance.vertices = [
			// bottom (y=-1)
			[1,1, 1],
			[1,2, 1],
			[2,1,1],
			[2,2,1],
			
			[1,1, 2],
			[1,2, 2],
			[2,1,2],
			[2,2,2],

		];
		instance.polygonVertices = [
			[1,2,3,4],
			[5,6,7,8],
			[1,2,5,6],
			[3,4,7,8],
            [3,7,8,4],
			[1,5,3,7]
		];	
		instance.polygonColors = [2,8,2,8,2,8];

		return instance;		
	};
});