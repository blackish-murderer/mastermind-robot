const http = require('http');
const html = require('./html');

const manonAuthCookie = 'echat-authentication-cookie=6d849eb3-fe46-48e8-8a26-05d9a126b78d;';
const blackAuthCookie = 'echat-authentication-cookie=51931e33-0f46-432c-85f8-6e3566366571;';
const whiteAuthCookie = 'echat-authentication-cookie=39edc78a-49ee-47c3-b8e0-89e775038905;';

function Connection(){
  const port = 80;
  const host = 'e-chat.co';//'e-chat.co'; //'92.222.216.113';

  var agent = new http.Agent({keepAlive: true, keepAliveMsecs: 40000});
  var cookies = 'echat-authentication-cookie=6d849eb3-fe46-48e8-8a26-05d9a126b78d;'; //manonAuthCookie

  function sendHttpRequest(path = '/', body = undefined, type = 'application/json', meth = 'GET') {
    var config = {
      'headers': {
        'Cookie': cookies,
        'Host': 'e-chat.co',
        'Connection': 'keep-alive'
      },
      'host': host,
      'port': port,
      'path': path,
      'method': meth
    }

    if(typeof body === 'object' && type === 'application/json') {
        body = objectToString(body);
    }

    if(body && type) {
      config['headers']['Content-Length'] = Buffer.byteLength(body);
      config['headers']['Content-Type'] = type;
      config['method'] = 'POST';
      config['body'] = body;
    }

//    console.log('[debug] connection: sending request');
//    console.log(require('util').inspect(config, { depth: null }));

    return new Promise(function sendAndReceiveHttp(resolve, reject) {
      var req = http.request(config);
      var reqBody = config['body'];

      req.setTimeout(40000, function handleTimeoutError() {
        req.abort();
        reject(new Error('request timed out'));
      });

      req.on('error', function sendError(error) {
        reject(error);
      });

      req.on('response', function receiveHttpResponse(res) {
        res.on('error', function sendError(error) {
          reject(error);
        });

        var resBody = '';
        res.on('data', function fetchBodyChunk(chunk) {
          resBody += chunk;
        });

        res.on('end', function endHttpRespons() {
          if(res.headers['set-cookie']) {
            addCookies(res.headers['set-cookie']);
          }

          var _res = {
            'statusCode': res['statusCode'],
            'statusMessage': res['statusMessage'],
            'headers': res['headers'],
            'body': resBody
          };

          if(!_res.headers['content-type']) {
            _res.headers['content-type'] = 'text/plain'; /////////////// should i change this?????????? ////////////////
          }

          if(_res.headers['content-type'].includes('application/json')) {
            _res['body'] = stringToObject(resBody);
          }

//          console.log('[debug] plain response body:');
//          console.log(resBody);

//          console.log('[debug] connection: received request');
//          console.log(require('util').inspect(_res, { depth: null }));

          resolve(_res);
        });
      });

      if(reqBody) {
        req.end(reqBody);
      } else {
        req.end();
      }
    });
  }

  function resetConnection(_cookies) {
    if(_cookies) {
      cookies = String(_cookies);
    } else {
      cookies = whiteAuthCookie;
    }

    agent = new http.Agent({keepAlive: true, keepAliveMsecs: 40000});
  }

	function setCookies(_cookies) {
		cookies = String(_cookies);
	}

  function getCookies() {
		return cookies;
	}

  function addCookies(_cookies) {
    var cookie = '';
    for(i = 0; i < _cookies.length; i++)
      cookie += _cookies[i].split(';')[0];
    cookies += cookie + ';';
	}

  function objectToString(obj) {
    try {
      return JSON.stringify(obj);
    } catch(error) {
      return null;
    }
  }

  function stringToObject(str) {
    try {
      return JSON.parse(html.decode(str, '\\', '\"'));
    } catch(error) {
      return null;
    }
  }

  var publicAPI = {
    resetConnection: resetConnection,
    sendHttpRequest: sendHttpRequest,
    setCookies: setCookies,
    getCookies: getCookies
  };
  return publicAPI;
}

module.exports = Connection;
