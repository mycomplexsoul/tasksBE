"use strict";
let MoSQL = require("../MoSQL.js");
let baseAPI = require("./api.js");

let API = (function(MoSQL, baseAPI){
	let motor = baseAPI.forModel('Entry');
	let list = function(node) {
		motor.api('list', node);
	}

	let create = function(node) {
		motor.api('create', node);
	}

	let update = function(node) {
		motor.api('update', node);
	}

	return {
		list
		, create
		, update
	}
})(MoSQL, baseAPI);
module.exports = API;