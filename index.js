var async = require('async');
var request = require('request');
var ntlm = require('./lib/ntlm');
var Agent = require('agentkeepalive');
var _ = require('lodash');
var url = require('url');


var makeRequest = function(method, options, params, callback) {
  var keepaliveAgent;
  var ntlmOpts = _.clone(options, true);

  //Remove the options that conflict with the request.
  options.domain = '';
  options.workstation = '';

  pUrl = url.parse(options.url);
  if(pUrl.protocol==='https'){
    keepaliveAgent = new Agent.HttpsAgent();
  } else {
    keepaliveAgent = new Agent();
  }

  function startAuth($) {
    var type1msg = ntlm.createType1Message(options);
    options.method = method;
    options.headers = {
      'Connection': 'keep-alive',
      'Authorization': type1msg
    };
    options.agent = keepaliveAgent;
    request(options, $);
  }

  function requestComplete(res, body, $) {
    if (!res.headers['www-authenticate'])
      return $(new Error('www-authenticate not found on response of second request'));

    var type2msg = ntlm.parseType2Message(res.headers['www-authenticate']);
    var type3msg = ntlm.createType3Message(type2msg, ntlmOpts);
    options.method = method;
    options.headers = {
      'Connection': 'keep-alive',
      'Authorization': type3msg
    };
    options.agent = keepaliveAgent;
    options.json = params;
    request(options, $);
  }

  async.waterfall([startAuth, requestComplete], callback);
};

exports.get = _.partial(makeRequest, 'get');
exports.post = _.partial(makeRequest, 'post');
exports.put = _.partial(makeRequest, 'put');
exports.delete = _.partial(makeRequest, 'delete');
