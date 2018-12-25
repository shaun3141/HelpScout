var request = require('request');

// Constructor
const HelpScoutClient = function(appCreds){
  this.appCreds = appCreds;
};

// Application Vars
const BASE_URL = 'https://api.helpscout.net/v2/';
const RATE_LIMIT = 200; // tightest rate limit possible is 150 ms between calls

// Global Vars
let accessToken = {
  expiresAt: 0
};

// Methods
HelpScoutClient.prototype.getAccessToken = function (errCb, cb) {
  let appCreds = this.appCreds;

  return new Promise(async function(resolve, reject) {
    try {
      await authenticate(appCreds);
      cb ? cb(accessToken) : resolve(accessToken);
    } catch (e) {
      errCb ? errCb(e): reject(Error(e));
    }
  });
}

HelpScoutClient.prototype.rawApi = function(method, url, data, errCb, cb){
  return makeAuthenticatedApiRequest(this.appCreds, method, url, data, errCb, cb);
}

HelpScoutClient.prototype.create = function (obj, data, parentObjType, parentObjId, errCb, cb) {
  let parentUrl = parentObjType && parentObjId ? parentObjType + '/' + parentObjId + '/' : '';
  let appCreds = this.appCreds;

  return new Promise(async function(resolve, reject) {
    try {
      let resourceRes = await makeAuthenticatedApiRequest(
        appCreds,
        'POST',
        BASE_URL + parentUrl + obj,
        data,
      );
      cb ? cb(resourceRes.headers['resource-id']) : resolve(resourceRes.headers['resource-id']);
    } catch (e) {
      errCb ? errCb(e): reject(Error(e));
    }
  });
}

HelpScoutClient.prototype.list = function (obj, queryParams, parentObjType, parentObjId, errCb, cb) {
  let parentUrl = parentObjType && parentObjId ? parentObjType + '/' + parentObjId + '/' : '';
  let appCreds = this.appCreds;

  let numPages = 1;
  let pageNum = 1;
  let isProcessing = false;
  let objArr = [];

  return new Promise(function(resolve, reject) {
    let pager = setInterval(async function() {
      if (pageNum > numPages) {
        clearInterval(pager);
        cb ? cb(objArr) : resolve(objArr);
      } else if (isProcessing) {
        // do nothing, a request is currently pending
      } else {
        try {
          let pageQuery = '?page=' + pageNum;
          isProcessing = true;
          let result = await makeAuthenticatedApiRequest(
            appCreds,
            'GET',
            BASE_URL + parentUrl + obj + (queryParams ? pageQuery + '&' + queryParams : pageQuery),
            ''
          );
          pageNum++;
          isProcessing = false;
          numPages = JSON.parse(result.body)["page"]["totalPages"];
          objArr = objArr.concat(JSON.parse(result.body)["_embedded"][obj]);
        } catch (e) {
          clearInterval(pager);
          errCb ? errCb(e): reject(Error(e));
        }
      }
    }, RATE_LIMIT);
  });
}

HelpScoutClient.prototype.get = function (obj, objId, embeddables, subObj, errCb, cb) {
  let embedQueryStr = embeddables ? '?embed=' + embeddables.join('&embed=') : '';
  let appCreds = this.appCreds;
  subObj = subObj ? '/' + subObj : '';

  return new Promise(async function(resolve, reject) {
    try {
      let resourceRes = await makeAuthenticatedApiRequest(
        appCreds,
        'GET',
        BASE_URL + obj + '/' + objId + subObj + embedQueryStr,
        ''
      );
      let body = resourceRes.body ? JSON.parse(resourceRes.body) : undefined;
      let objGotten = body && body._embedded ? body._embedded[subObj] : body;
      cb ? cb(objGotten) : resolve(objGotten);
    } catch (e) {
      errCb ? errCb(e): reject(Error(e));
    }
  });
}

HelpScoutClient.prototype.updatePut = function (obj, objId, data, parentObjType, parentObjId, errCb, cb) {
  let parentUrl = parentObjType && parentObjId ? parentObjType + '/' + parentObjId + '/' : '';
  let appCreds = this.appCreds;

  return new Promise(async function(resolve, reject) {
    try {
      await makeAuthenticatedApiRequest(
        appCreds,
        'PUT',
        BASE_URL + parentUrl + obj + '/' + objId,
        data
      );
      cb ? cb() : resolve(); // nothing to return
    } catch (e) {
      errCb ? errCb(e): reject(Error(e));
    }
  });
}

HelpScoutClient.prototype.updatePatch = function (obj, objId, data, parentObjType, parentObjId, errCb, cb) {
  let parentUrl = parentObjType && parentObjId ? parentObjType + '/' + parentObjId + '/' : '';
  let appCreds = this.appCreds;

  return new Promise(async function(resolve, reject) {
    try {
      await makeAuthenticatedApiRequest(
        appCreds,
        'PATCH',
        BASE_URL + parentUrl + obj + '/' + objId,
        data
      );
      cb ? cb() : resolve(); // nothing to return
    } catch (e) {
      errCb ? errCb(e): reject(Error(e));
    }
  });
}

HelpScoutClient.prototype.delete = function (obj, objId, errCb, cb) {
  let appCreds = this.appCreds;

  return new Promise(async function(resolve, reject) {
    try {
      await makeAuthenticatedApiRequest(
        appCreds,
        'DELETE',
        BASE_URL + obj + '/' + objId,
        ''
      );
      cb ? cb() : resolve(); // nothing to return
    } catch (e) {
      errCb ? errCb(e): reject(Error(e));
    }
  });
}

HelpScoutClient.prototype.addNoteToConversation = function (conversationId, text, errCb, cb) {
  return this.create(
    'notes', { "text" : text}, "conversations", conversationId, errCb, cb
  );
}

module.exports = HelpScoutClient;

// =================
// ==== HELPERS ====
// =================

let authenticate = function(appCreds) {
  // TODO: Have a true singleton class to prevent multiple tokens being generated
  // will happen if multiple authenticate calls occur before first token comes back
  return new Promise(async function(resolve, reject) {
    if (accessToken.expiresAt > Date.now()) {
      // Access Token should still be valid, do CB
      resolve(accessToken);
    } else {
      // Get access token for the first time and callback
      // getNewAccessToken(appCreds, errCb, authenticatedCb);
      try {
        accessToken = await getNewAccessToken(appCreds);
        resolve(accessToken);
      } catch (e) {
        reject(e)
      }
    }
  });
}

let getNewAccessToken = function(appCreds) {
  // Get access token for the first time and callback
  let authStr = 'grant_type=client_credentials' +
                '&client_id=' + appCreds.clientId +
                '&client_secret=' + appCreds.clientSecret;

  return new Promise(function(resolve, reject) {
    request({
      url: 'https://api.helpscout.net/v2/oauth2/token?' + authStr,
      method: 'POST'
    }, function (err, res, body) {
      if (err || res.statusCode >= 400) {
        // either log the error returned, or the body if status != success
        reject(err ? err : body);
      } else {
        accessToken = JSON.parse(body);
        accessToken.expiresAt = accessToken.expires_in * 1000 + Date.now();
        delete accessToken.expires_in; // useless to us from this point on
        resolve(accessToken);
      }
    });
  });
}

let makeAuthenticatedApiRequest = function (creds, method, url, data, errCb, cb) {
  return new Promise(async function(resolve, reject) {
    try {
      await authenticate(creds);

      let options = {
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
          reject(err ? err : body);
          errCb(err ? err : body);
        } else {
          cb ? cb(res) : resolve(res);
        }
      });
    } catch (e) {
      errCb ? errCb(e): reject(Error(e));
    }
  });
}
