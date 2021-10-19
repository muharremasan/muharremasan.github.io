/**
 * This script is the entry point of the framework, called from index.
 * Project dependent code may go into the index file.
 * Load initial set of dependencies and start rendering.
 * This is the file to set the initial breakpoint when debugging.
 */
 require(["dojo", "dojo/parser", "dojo/domReady!"], function (dojo) {
	"use strict";
	require({
	  async: true,
	  parseOnLoad: true,
	  debug: true,
	  cacheBust: new Date(),
	  waitSeconds: 5,
	  paths: {
		"cog1": "/muharremasan.github.io/cog1/A2"
	  },
	  aliases: [
		["app", "cog1/app"],
		["layout", "cog1/layout"],
		["ui", "cog1/ui"],
		["scene", "cog1/scene"],
		["scenegraph", "cog1/scenegraph"],
		["createScene", "cog1/createScene"],
		["model", "cog1/model"],
		["node", "cog1/node"],
		["raster", "cog1/raster"],
		["shader", "cog1/shader"],
		["framebuffer", "cog1/framebuffer"],
		["texture", "cog1/texture"],
		["animation", "cog1/animation"],
		["data", "cog1/data"],
		["glMatrix", "ext/glMatrix.js"]
	  ]
	});

	// Load the framework with the re-configured parameters.
	require(["app"], function (app) {
	  app.load();
	});
  });
  