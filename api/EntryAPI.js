"use strict";
let MoSQL = require("../MoSQL.js");
let baseAPI = require("./api.js");

let API = (function(MoSQL, baseAPI){
	baseAPI.setModel('Entry');
	let list = function(node) {
		baseAPI.api('list', node);
	}

	let create = function(node) {
		baseAPI.api('create', node);
	}

	let update = function(node) {
		baseAPI.api('update', node);
	}

	return {
		list
		, create
		, update
	}
})(MoSQL, baseAPI);
module.exports = API;