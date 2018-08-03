const events = require('events');
const connection = require('./conn');

const hostroomId = 19779708; //207920; //19779708;

const supportedChannels = [
    '/meta/connect',
    '/meta/handshake',
    '/chatroom/user/left',
    '/channel/user/friend',
    '/chatroom/user/joined',
    '/chatroom/message/add',
    '/chatroom/message/remove',
    '/channel/user/conversation',
    '/service/conversation/opened',
    '/service/conversation/closed',
    '/service/conversation/message',
    '/service/user/context/self/complete',
    '/service/conversation/notification/added',
    '/service/conversation/notification/removed'
];

function Base() {
  var name, uuid;

  var clientId = String();
  var requestId = Number(0);
  var chatroomId = hostroomId;

  var channels = new Array();
  var myClient = new connection();
  var listener = new events.EventEmitter();

  var selfContextData = null;

  function reportFailedRequest(reqObj, resObj) {
    console.log('[error] failed in the following request:');
    console.log(require('util').inspect(reqObj, { depth: null }));
    console.log('[error] the response object is as follows:');
    console.log(require('util').inspect(resObj, { depth: null }));
    return false;
  }

  function callbackRequest(options, onResolve, onReject, onError) {
    var reqPath = options.path;
    var reqBody = options.body;
    var reqType = options.type;
    var reqMeth = options.meth;

    if(reqType === undefined) {
      reqType = 'application/json';
    }

    if(reqMeth === undefined) {
      reqMeth = 'POST';
    }

    myClient.sendHttpRequest(reqPath, reqBody, reqType, reqMeth).then(
      function processResponse(response) {
        var resBody = response.body;
        if(resBody !== null && onResolve) {
          //console.log('[debug] callback resolved');
          onResolve(reqBody, resBody);
        } else if(onReject) { //json conversion error
          console.log('[debug] callback rejected');
          onReject(reqBody, resBody);
        } else {
          return {'req': reqBody, 'res': resBody};
        }
      },
      function handleError(error) { //connection error
        console.log('[debug] callback troubled');
        if(onError) {
          onError(error);
        } else if(onReject) {
          console.log('[error] in callback request', error.name, error.message);
          onReject();
        } else {
          console.log('[error] in callback request', error.name, error.message);
          console.log(error);
        }
      }
    );
  }

  function promisedRequest(options, onResolve, onReject, onError) {
    var reqPath = options.path;
    var reqBody = options.body;
    var reqType = options.type;
    var reqMeth = options.meth;

    if(reqType === undefined) {
      reqType = 'application/json';
    }

    if(reqMeth === undefined) {
      reqMeth = 'POST';
    }

    return new Promise(function sendPromisedRequest(resolve, reject) {
      myClient.sendHttpRequest(reqPath, reqBody, reqType, reqMeth).then(
        function processResponse(response) {
          var resBody = response.body;
          if(resBody !== null && onResolve) {
            //console.log('[debug] promised resolved');
            resolve(onResolve(reqBody, resBody));
          } else if(onReject) { //json conversion error
            console.log('[debug] promised rejected');
            reject(onRejcet(reqBody, resBody));
          } else {
            resolve({'req': reqBody, 'res': resBody});
          }
        },
        function handleError(error) { //connection error
          console.log('[debug] promised troubled');
          if(onError) {
            reject(onError(error));
          } else if(onReject) {
            console.log('[error] in promised request', error.name, error.message);
            reject(onReject());
          } else {
            console.log('[error] in promised request', error.name, error.message);
            reject(error);
          }
        }
      );
    });
  }

  function checkSignInResult(reqObj, resObj) {
    if(myClient.getCookies().includes('JSESSIONID')) {
      console.log('[debug] succeeded to login');
      return true;
    }
    console.log('[debug] failed to login');
    return false;
  }

  function checkHandshakeResult(reqObj, resObj) {
    try {
      clientId = resObj[0]['clientId'];
      if(resObj[0]['successful'] === true && clientId) {
        console.log('[debug] succeeded in handshake');
        return true;
      } else {
        console.log('[debug] failed in handshake');
        return false;
      }
    } catch(error) {
      console.log('[error] faced a problem in handshake', error.name, error.message);
      return false;
    }
  }

  function checkSelfContextResult(reqObj, resObj) {
    try {
      selfContextData = resObj[0]['data'];
      if(resObj[1]['successful'] === true && selfContextData) {
        console.log('[debug] succeeded to obtain context');
        return selfContextData;
      } else {
        console.log('[debug] failed to obtain context');
        return null;
      }
    } catch(error) {
      console.log('[error] faced a problem in obtaining context', error.name, error.message);
      return null;
    }
  }

  function checkLongPollingResult(reqObj, resObj) {
    // todo: check if resObj is iteretable
    if(resObj === null) {
      return;
    }

    var success = false;
    for(item of resObj) {
      if(item['channel'] !== '/meta/connect' && item['data']) {
        var channel = fixChannel(item['channel']);
        if(channel !== '/unknown/channel') {
          listener.emit(channel, item['data']);
        }
      } else {
        success = item['successful'];
      }
    }

    if(success === true) {
      longPollChatroom(checkLongPollingResult, reportFailedRequest);
    } // else reconnect??
  }

  function signIntoUserAccount(resolve, reject) {
    var options = {
      'path': '/room/' + chatroomId.toString(),
      'body': undefined,
      'type': undefined,
      'meth': 'GET'
    };

    return promisedRequest(options, resolve, reject);
  }

  function handshakeChatroom(resolve, reject) {
    var options = {
      'path': '/cometd/handshake',
      'body': [{'ext': {'chatroomId': chatroomId}, 'version': '1.0', 'channel': '/meta/handshake', 'id': incerementRequestId()}],
      'type': 'application/json',
      'meth': 'POST'
    };

    return promisedRequest(options, resolve, reject);
  }

  function retrieveSelfContext(resolve, reject) {
    var options = {
      'path': '/cometd/',
      'body': [{'channel': '/service/user/context/self/complete', 'data': {}, 'id': incerementRequestId(), 'clientId': clientId}],
      'type': 'application/json',
      'meth': 'POST'
    };

    return promisedRequest(options, resolve, reject);
  }

  function longPollChatroom(resolve, reject) {
    var options = {
      'path': '/cometd/connect',
      'body': [{'channel': '/meta/connect', 'connectionType': 'long-polling', 'id': incerementRequestId(), 'clientId': clientId}],
      'type': 'application/json',
      'meth': 'POST'
    };

    callbackRequest(options, resolve, reject);
  }

  function createChatroom(chatroomName, resolve, reject) {
    var options = {
      'path': '/cometd/',
      'body': 'chatroomName=' + chatroomName,
      'type': 'application/x-www-form-urlencoded',
      'meth': 'POST'
    };

    return promisedRequest(options, resolve, reject);
  }

  function deleteChatroom(accountPassword, resolve, reject) {
    var options = {
      'path': '/cometd/',
      'body': [{'channel': '/service/moderator/options/delete', 'data': {'accountPassword': accountPassword}, 'id': incerementRequestId(), 'clientId': clientId}],
      'type': 'application/json',
      'meth': 'POST'
    };

    return promisedRequest(options, resolve, reject);
  }

  function appendPrivateMessage(userUuid, message, resolve, reject) {
    var options = {
      'path': '/cometd/',
      'body': [{'channel': '/service/conversation/message', 'data': {'conversationUserUuid': userUuid, 'messageBody': message}, 'id': incerementRequestId(), 'clientId': clientId}],
      'type': 'application/json',
      'meth': 'POST'
    };

    return promisedRequest(options, resolve, reject);
  }

  function removeNotification(userUuid, resolve, reject) {
    var options = {
      'path': '/cometd/',
      'body': [{'channel': '/service/conversation/notification/removed', 'data': {'notificationUserUuid': userUuid}, 'id': incerementRequestId(), 'clientId': clientId}],
      'type': 'application/json',
      'meth': 'POST'
    };

    return promisedRequest(options, resolve, reject);
  }

  function appendConversation(userUuid, resolve, reject) {
    var options = {
      'path': '/cometd/',
      'body': [{'channel': '/service/conversation/opened', 'data': {'conversationUserUuid': userUuid}, 'id': incerementRequestId(), 'clientId': clientId}],
      'type': 'application/json',
      'meth': 'POST'
    };

    return promisedRequest(options, resolve, reject);
  }

  function removeConversation(userUuid, resolve, reject) {
    var options = {
      'path': '/cometd/',
      'body': [{'channel': '/service/conversation/closed', 'data': {'conversationUserUuid': userUuid}, 'id': incerementRequestId(), 'clientId': clientId}],
      'type': 'application/json',
      'meth': 'POST'
    };

    return promisedRequest(options, resolve, reject);
  }

  function appendIgnored(userUuid, resolve, reject) {
    var options = {
      'path': '/cometd/',
      'body': [{'channel': '/service/ignored/add', 'data': {'userUuid': userUuid}, 'id': incerementRequestId(), 'clientId': clientId}],
      'type': 'application/json',
      'meth': 'POST'
    };

    return promisedRequest(options, resolve, reject);
  }

  function removeIgnored(userUuid, resolve, reject) {
    var options = {
      'path': '/cometd/',
      'body': [{'channel': '/service/ignored/remove', 'data': {'userUuid': userUuid}, 'id': incerementRequestId(), 'clientId': clientId}],
      'type': 'application/json',
      'meth': 'POST'
    };

    return promisedRequest(options, resolve, reject);
  }

  function appendFriend(userUuid, resolve, reject) {
    var options = {
      'path': '/cometd/',
      'body': [{'channel': '/service/friends/add', 'data': {'userUuid': userUuid}, 'id': incerementRequestId(), 'clientId': clientId}],
      'type': 'application/json',
      'meth': 'POST'
    };

    return promisedRequest(options, resolve, reject);
  }

  function removeFriend(userUuid, resolve, reject) {
    var options = {
      'path': '/cometd/',
      'body': [{'channel': '/service/friends/remove', 'data': {'userUuid': userUuid}, 'id': incerementRequestId(), 'clientId': clientId}],
      'type': 'application/json',
      'meth': 'POST'
    };

    return promisedRequest(options, resolve, reject);
  }

  function appendBan(userUuid, resolve, reject) {
    var options = {
      'path': '/cometd/',
      'body': [{'channel': '/service/moderator/ban/add', 'data': {'targetUserUuid': userUuid}, 'id': incerementRequestId(), 'clientId': clientId}],
      'type': 'application/json',
      'meth': 'POST'
    };

    return promisedRequest(options, resolve, reject);
  }

  function removeBan(userUuid, resolve, reject) {
    var options = {
      'path': '/cometd/',
      'body': [{'channel': '/service/moderator/ban/remove', 'data': {'targetUserUuid': userUuid}, 'id': incerementRequestId(), 'clientId': clientId}],
      'type': 'application/json',
      'meth': 'POST'
    };

    return promisedRequest(options, resolve, reject);
  }

  function appendPublicMessage(message, resolve, reject) {
    var options = {
      'path': '/cometd/',
      'body': [{'channel': '/service/chatroom/message', 'data': {'messageBody': message}, 'id': incerementRequestId(), 'clientId': clientId}],
      'type': 'application/json',
      'meth': 'POST'
    };

    return promisedRequest(options, resolve, reject);
  }

  function removePublicMessage(userUuid, resolve, reject) {
    var options = {
      'path': '/cometd/',
      'body': [{'channel': '/service/moderator/messages/remove', 'data': {'targetUserUuid': userUuid}, 'id': incerementRequestId(), 'clientId': clientId}],
      'type': 'application/json',
      'meth': 'POST'
    };

    return promisedRequest(options, resolve, reject);
  }

  function appendChannel(_channel) {
    var success = false;
    if(supportedChannels.includes(_channel)) {
      channels.push(_channel);
      success = true;
    } else {
      console.log('[debug] channel is not supported');
      success = false;
    }
    return success;
  }

  function removeChannel(_channel) {
    var success = false;
    var index = channels.indexOf(_channel);
    if(index >= 0) {
      channels.splice(index, 1);
      success = true;
    } else {
      console.log('[debug] channel does not exist');
      success = false;
    }
    return success;
  }

  function fixChannel(_channel) {
    for(channel of channels) {
      if(_channel.toLowerCase().includes(channel)) {
        return channel;
      }
    }
    return '/unknown/channel';
  }

  function resetSession(_cookies, _chatroomId) {
    if(_chatroomId && typeof _chatroomId === 'number') {
      chatroomId = _chatroomId;
    } else {
      chatroomId = hostroomId;
    }

    clientId = String();
    requestId = Number(0);

    myClient.resetConnection(_cookies);

    selfContextData = null;
  }

  function incerementRequestId() {
    return (++requestId).toString();
  }

  function isLoggedIn() {
    return myClient.getCookies().includes('JSESSIONID');
  }

  //listener.on('/unknown/channel', function handleUnknownChannel(obj) {
  //  console.log('[debug] received unknown channel');
  //  console.log(require('util').inspect(obj, { depth: null }));
  //});

  var publicAPI = listener;

  //publicAPI['getName'] = function getName() { return name; };
  //publicAPI['getUuid'] = function getUuid() { return uuid; };

  publicAPI['appendBan'] = appendBan;
  publicAPI['removeBan'] = removeBan;
  publicAPI['appendFriend'] = appendFriend;
  publicAPI['removeFriend'] = removeFriend;
  publicAPI['appendChannel'] = appendChannel;
  publicAPI['removeChannel'] = removeChannel;
  publicAPI['appendIgnored'] = appendIgnored;
  publicAPI['removeIgnored'] = removeIgnored;
  publicAPI['createChatroom'] = createChatroom;
  publicAPI['deleteChatroom'] = deleteChatroom;
  publicAPI['appendConversation'] = appendConversation;
  publicAPI['removeConversation'] = removeConversation;
  publicAPI['removeNotification'] = removeNotification;
  publicAPI['appendPublicMessage'] = appendPublicMessage;
  publicAPI['removePublicMessage'] = removePublicMessage;
  publicAPI['appendPrivateMessage'] = appendPrivateMessage;

  publicAPI['resetSession'] = resetSession;
  publicAPI['longPollChatroom'] = longPollChatroom;
  publicAPI['handshakeChatroom'] = handshakeChatroom;
  publicAPI['checkSignInResult'] = checkSignInResult;
  publicAPI['retrieveSelfContext'] = retrieveSelfContext;
  publicAPI['signIntoUserAccount'] = signIntoUserAccount;
  publicAPI['reportFailedRequest'] = reportFailedRequest;
  publicAPI['checkHandshakeResult'] = checkHandshakeResult;
  publicAPI['checkSelfContextResult'] = checkSelfContextResult;
  publicAPI['checkLongPollingResult'] = checkLongPollingResult;

  return publicAPI;
}

module.exports = Base;
