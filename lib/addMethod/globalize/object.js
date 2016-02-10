/*
* Given an object and some parameters, set up the full object, populated
* with global parameters. Uses `_.defaultsDeep`
*/ 
var startsWith = require('mout/string/startsWith');
var _          = require('lodash');
var substitute = require('../substitute');


module.exports = function (key, object, params) {

  var subbedGlobalObject = substitute(this._globalOptions[key], params || {});
  var subbedObject       = substitute(object || {}, params || {});

  return _.defaultsDeep(subbedObject, subbedGlobalObject);

};