var request = require('request');

// Constructor
var HelpScoutClient = function(appCreds){
  this.appCreds = appCreds;
};

// Application Vars
const BASE_URL = 'https://api.helpscout.net/v2/';
var accessToken = {
  expiresAt: 0
};
const RATE_LIMIT = 200; // tightest rate limit possible is 150 ms between calls

// Methods
HelpScoutClient.prototype.getAccessToken = function(errCb, cb){
  authenticate(this.appCreds, errCb, cb);
}

HelpScoutClient.prototype.rawApi = function(method, url, data, errCb, cb){
  makeAuthenticatedApiRequest(this.appCreds, method, url, data, errCb, cb);
}

HelpScoutClient.prototype.create = function(obj, data, parentObjType, parentObjId, errCb, cb){
  var parentUrl = parentObjType && parentObjId ? parentObjType + '/' + parentObjId + '/' : '';
  makeAuthenticatedApiRequest(
    this.appCreds,
    'POST',
    BASE_URL + parentUrl + obj,
    data,
    errCb,
    function (res) {
      cb(res.headers['resource-id']);
    }
  );
}

HelpScoutClient.prototype.list = function(obj, queryParams, parentObjType, parentObjId, errCb, cb){
  var parentUrl = parentObjType && parentObjId ? parentObjType + '/' + parentObjId + '/' : '';
  var appCreds = this.appCreds;

  var numPages = 1;
  var pageNum = 1;
  var isProcessing = false;
  var objArr = [];

  var pager = setInterval(function() {
    if (pageNum > numPages) {
      clearInterval(pager);
      cb(objArr);
    } else if (isProcessing) {
      // do nothing, a request is currently pending
    } else {
      var pageQuery = '?page=' + pageNum;
      isProcessing = true;
      makeAuthenticatedApiRequest(
        appCreds,
        'GET',
        BASE_URL + parentUrl + obj + (queryParams ? pageQuery + '&' + queryParams : pageQuery),
        '',
        errCb,
        function(res) {
          pageNum++;
          isProcessing = false;
          numPages = JSON.parse(res.body)["page"]["totalPages"];
          objArr = objArr.concat(JSON.parse(res.body)["_embedded"][obj]);
        }
      );
    }
  }, RATE_LIMIT);
}

HelpScoutClient.prototype.get = function(obj, objId, embeddables, subObj, errCb, cb){
  var embedQueryStr = embeddables ? '?embed=' + embeddables.join('&embed=') : '';
  var subObj = subObj ? '/' + subObj : '';
  makeAuthenticatedApiRequest(
    this.appCreds,
    'GET',
    BASE_URL + obj + '/' + objId + subObj + embedQueryStr,
    '',
    errCb,
    function (res) {
      cb(res.body ? JSON.parse(res.body) : undefined);
    }
  );
}

HelpScoutClient.prototype.updatePut = function(obj, objId, data, parentObjType, parentObjId, errCb, cb){
  var parentUrl = parentObjType && parentObjId ? parentObjType + '/' + parentObjId + '/' : '';
  makeAuthenticatedApiRequest(
    this.appCreds,
    'PUT',
    BASE_URL + parentUrl + obj + '/' + objId,
    data,
    errCb,
    function (res) {
      cb(); // nothing to return
    }
  );
}

HelpScoutClient.prototype.updatePatch = function(obj, objId, data, parentObjType, parentObjId, errCb, cb){
  var parentUrl = parentObjType && parentObjId ? parentObjType + '/' + parentObjId + '/' : '';
  makeAuthenticatedApiRequest(
    this.appCreds,
    'PATCH',
    BASE_URL + parentUrl + obj + '/' + objId,
    data,
    errCb,
    function (res) {
      cb(); // nothing to return
    }
  );
}

HelpScoutClient.prototype.delete = function(obj, objId, errCb, cb){
  makeAuthenticatedApiRequest(
    this.appCreds,
    'DELETE',
    BASE_URL + obj + '/' + objId,
    '',
    errCb,
    function (res) {
      cb(); // nothing to return
    }
  );
}

HelpScoutClient.prototype.addNoteToConversation = function(conversationId, text, errCb, cb){
  this.create(
    'notes', { "text" : text}, "conversations", conversationId, errCb, cb
  );
}

module.exports = HelpScoutClient;

// =================
// ==== HELPERS ====
// =================

var authenticate = function(appCreds, errCb, authenticatedCb){
    // TODO: Have a singleton class to prevent multiple tokens being generated
    // if multiple authenticate calls occur before first token comes back
    if (accessToken.expiresAt > Date.now()) {
      // Access Token should still be valid, do CB
      authenticatedCb(accessToken);
    } else {
      // Get access token for the first time and callback
      getNewAccessToken(appCreds, errCb, authenticatedCb);
    }
}

var getNewAccessToken = function(appCreds, errCb, authenticatedCb) {
  // Get access token for the first time and callback
  var authStr = 'grant_type=client_credentials' +
                '&client_id=' + appCreds.clientId +
                '&client_secret=' + appCreds.clientSecret;

  request({
    url: 'https://api.helpscout.net/v2/oauth2/token?' + authStr,
    method: 'POST'
  }, function (err, res, body) {
    if (err || res.statusCode >= 400) {
      // either log the error returned, or the body if status != success
      errCb(err ? err : body);
    } else {
      accessToken = JSON.parse(body);
      accessToken.expiresAt = accessToken.expires_in * 1000 + Date.now();
      delete accessToken.expires_in; // useless to us from this point on
      authenticatedCb(accessToken);
    }
  });
}

var makeAuthenticatedApiRequest = function(creds, method, url, data, errCb, cb) {
  authenticate(creds, console.error, function() {
    var options = {
      url: url,
      method: method,
      headers: {
        'Authorization': 'Bearer ' + accessToken.access_token,
        'Content-Type': 'application/json'
      }
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    request(options, function (err, res, body) {
      if (err || res.statusCode >= 400) {
        // either log the error returned, or the body if status != success
        errCb(err ? err : body);
      } else {
        cb(res);
      }
    });
  });
}
