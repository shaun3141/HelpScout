const axios = require('axios');

// Constructor
const HelpScoutClient = function (appCreds) {
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
HelpScoutClient.prototype.getAccessToken = async function (errCb, cb) {
  const appCreds = this.appCreds;

  try {
    await authenticate(appCreds);
    if (cb) {
      cb(accessToken);
    }
    return accessToken;
  } catch (e) {
    if (errCb) {
      errCb(e);
    } else {
      throw Error(e);
    }
  }
};

HelpScoutClient.prototype.rawApi = function (method, url, data, errCb, cb) {
  return makeAuthenticatedApiRequest(this.appCreds, method, url, data, errCb, cb);
};

HelpScoutClient.prototype.create = async function (obj, data, parentObjType, parentObjId, errCb, cb) {
  const parentUrl = parentObjType && parentObjId ? parentObjType + '/' + parentObjId + '/' : '';
  const appCreds = this.appCreds;

  try {
    const resourceRes = await makeAuthenticatedApiRequest(
      appCreds,
      'POST',
      BASE_URL + parentUrl + obj,
      data
    );

    if (cb) {
      cb(resourceRes.headers['resource-id']);
    }

    return resourceRes.headers['resource-id'];
  } catch (e) {
    if (errCb) {
      errCb(e);
    } else {
      throw Error(e);
    }
  }
};

HelpScoutClient.prototype.list = function (obj, queryParams, parentObjType, parentObjId, errCb, cb) {
  const parentUrl = parentObjType && parentObjId ? `${parentObjType}/${parentObjId}/` : '';
  const appCreds = this.appCreds;

  let numPages = 1;
  let pageNum = 1;
  let isProcessing = false;
  let objArr = [];

  return new Promise(function (resolve, reject) {
    const pager = setInterval(async function () {
      if (pageNum > numPages) {
        clearInterval(pager);
        if (cb) {
          cb(objArr);
        }
        resolve(objArr);
      } else if (isProcessing) {
      // do nothing, a request is currently pending
      } else {
        try {
          const pageQuery = '?page=' + pageNum;
          isProcessing = true;
          const result = await makeAuthenticatedApiRequest(
            appCreds,
            'GET',
            BASE_URL + parentUrl + obj + (queryParams ? pageQuery + '&' + queryParams : pageQuery),
            ''
          );
          pageNum++;
          isProcessing = false;
          numPages = result.data.page.totalPages;
          if (result.data._embedded && result.data._embedded[obj]) {
          // Add results to returned array
            objArr = objArr.concat(result.data._embedded[obj]);
          } else {
          // no results returned
            const res = [];
            clearInterval(pager);
            if (cb) {
              cb(res);
            }
            return res;
          }
        } catch (e) {
          clearInterval(pager);
          if (errCb) {
            errCb(e);
          } else {
            reject(e);
          }
        }
      }
    }, RATE_LIMIT);
  });
};

HelpScoutClient.prototype.get = async function (obj, objId, embeddables, subObj, errCb, cb) {
  const embedQueryStr = embeddables ? '?embed=' + embeddables.join('&embed=') : '';
  const appCreds = this.appCreds;
  subObj = subObj ? '/' + subObj : '';

  try {
    const resourceRes = await makeAuthenticatedApiRequest(
      appCreds,
      'GET',
      BASE_URL + obj + '/' + objId + subObj + embedQueryStr,
      ''
    );

    const objGotten = resourceRes.data && resourceRes.data._embedded && resourceRes.data._embedded[subObj] ? resourceRes.data._embedded[subObj] : resourceRes.data;
    if (cb) {
      cb(objGotten);
    }
    return objGotten;
  } catch (e) {
    if (errCb) {
      errCb(e);
    } else {
      throw e;
    }
  }
};

HelpScoutClient.prototype.updatePut = async function (obj, objId, data, parentObjType, parentObjId, errCb, cb) {
  const parentUrl = parentObjType && parentObjId ? parentObjType + '/' + parentObjId + '/' : '';
  const appCreds = this.appCreds;

  try {
    await makeAuthenticatedApiRequest(
      appCreds,
      'PUT',
      BASE_URL + parentUrl + obj + '/' + (objId || ''),
      data
    );

    // nothing to return
    if (cb) {
      cb();
    }
    return;
  } catch (e) {
    if (errCb) {
      errCb(e);
    } else {
      throw Error(e);
    }
  }
};

HelpScoutClient.prototype.updatePatch = async function (obj, objId, data, parentObjType, parentObjId, errCb, cb) {
  const parentUrl = parentObjType && parentObjId ? parentObjType + '/' + parentObjId + '/' : '';
  const appCreds = this.appCreds;

  try {
    await makeAuthenticatedApiRequest(
      appCreds,
      'PATCH',
      BASE_URL + parentUrl + obj + '/' + objId,
      data
    );

    // nothing to return
    if (cb) {
      cb();
    }
    return;
  } catch (e) {
    if (errCb) {
      errCb(e);
    } else {
      throw Error(e);
    }
  }
};

HelpScoutClient.prototype.delete = async function (obj, objId, errCb, cb) {
  const appCreds = this.appCreds;

  try {
    await makeAuthenticatedApiRequest(
      appCreds,
      'DELETE',
      BASE_URL + obj + '/' + objId,
      ''
    );

    // nothing to return
    if (cb) {
      cb();
    }
    return;
  } catch (e) {
    if (errCb) {
      errCb(e);
    } else {
      throw Error(e);
    }
  }
};

HelpScoutClient.prototype.addNoteToConversation = function (conversationId, text, errCb, cb) {
  return this.create(
    'notes', { text: text }, 'conversations', conversationId, errCb, cb
  );
};

module.exports = HelpScoutClient;

// =================
// ==== HELPERS ====
// =================

const authenticate = async function (appCreds) {
  // TODO: Have a true singleton class to prevent multiple tokens being generated
  // will happen if multiple authenticate calls occur before first token comes back
  if (accessToken.expiresAt > Date.now()) {
    // Access Token should still be valid, do CB
    return accessToken;
  } else {
    // Get access token for the first time and callback
    // getNewAccessToken(appCreds, errCb, authenticatedCb);
    try {
      await getNewAccessToken(appCreds);
    } catch (e) {
      throw Error(e);
    }
  }
};

const getNewAccessToken = async function (appCreds) {
  // Get access token for the first time and callback
  const res = await axios({
    url: 'https://api.helpscout.net/v2/oauth2/token',
    method: 'POST',
    params: {
      grant_type: 'client_credentials',
      client_id: appCreds.clientId,
      client_secret: appCreds.clientSecret
    }
  });

  accessToken = res.data;
  accessToken.expiresAt = res.data.expires_in * 1000 + Date.now();
  delete accessToken.expires_in; // useless to us from this point on
  return accessToken;
};

const makeAuthenticatedApiRequest = async function (creds, method, url, data, errCb, cb) {
  try {
    await authenticate(creds);

    const options = {
      url: url,
      method: method,
      headers: {
        Authorization: 'Bearer ' + accessToken.access_token,
        'Content-Type': 'application/json'
      }
    };

    if (data) {
      options.data = data;
    }

    const res = await axios(options);
    if (cb) {
      cb(res);
    }
    return res;
  } catch (e) {
    if (errCb) {
      errCb(e);
    } else {
      throw e;
    }
  }
};
