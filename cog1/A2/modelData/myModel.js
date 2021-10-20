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
			[2,2,2]

		];
		instance.polygonVertices = [
			[0,1,2,3],
			[4,5,6,7],
			[0,1,4,5],
			[2,3,6,7],
            [2,6,7,3],
			[0,4,2,6]
		];	
		instance.polygonColors = [2,8,2,8,2,8];

		return instance;		
	};
});