const Base = require('./base');
const Game = require('./game');

const aTab = '\u00ad' + ' ' + '\u00ad' + ' ' + '\u00ad' + ' ' + '\u00ad' + ' ' + '\u00ad';

Array.prototype.remove = function removeArrayItem(item) {
  let index = this.indexOf(item);
  this.splice(index, 1);
};

function Puss() {
  var myBase = new Base();
  var myGame = new Game();
  var isLocked = false;

  var pussy, users, mates, texts, chats, infos;

  myBase.appendChannel('/chatroom/user/left');
  myBase.appendChannel('/chatroom/user/joined');
  myBase.appendChannel('/chatroom/message/add');
  myBase.appendChannel('/chatroom/message/remove');

  myBase.on('/chatroom/user/joined', function sayHello(user) {
    appendUser(user);
  });

  myBase.on('/chatroom/user/left', function sayBye(userUuid) {
    removeUser(userUuid);
  });

  myBase.on('/chatroom/message/add', async function confirmAppend(text) {
    if(isLocked === true) {
      myBase.removePublicMessage(text['userUuid']);
    } else if(myGame.isAlive() === false) {
      appendText(text);
    } else {
      if(text['messageBody'].length < 5) {
        text['messageBody'] += '     ';
      }
      var result = myGame.appendNewGuess(text['messageBody'].substring(0, 5), text['username']);
      if(result.hasOwnProperty('inPlace') || result.hasOwnProperty('inGuess')) {
        var guesser = 'Guessed by: ' + text['username'];
        var inPlace = '✓: ' + result['inPlace'].toString();
        var inGuess = '≈: ' + result['inGuess'].toString();
        var myGuess = text['messageBody'].substring(0, 5);
        var comment = 'Comment: ' + text['messageBody'].substring(5, text['messageBody'].length);
        var resultText = myGuess + aTab + inPlace + aTab + inGuess + aTab + guesser + aTab + comment;
        myBase.removePublicMessage(text['userUuid']);
        myBase.appendPublicMessage(resultText);
        if(result['isWon'] === true) {
          myBase.appendPublicMessage('congrates ' + text['username'] + ', you guessed it right!');
          myBase.appendPublicMessage('the game will be restarted in 10 seconds');
          setTimeout(function restartGame() {
            joinChatroom();
          }, 10000);
        }
      } else {
        myBase.removePublicMessage(text['userUuid']);
        await myBase.appendConversation(text['userUuid']);
        await myBase.appendPrivateMessage(text['userUuid'], 'begin your text with a five digited number including no repeated digits, for example: 12345 hi everyone!');
        await myBase.removeConversation(text['userUuid']);
      }
    }
    //console.log(require('util').inspect(texts, { depth: null }));
  });

  myBase.on('/chatroom/message/remove', function confirmRemove(userUuid) {
    removeText(userUuid);
    //console.log(require('util').inspect(texts, { depth: null }));
  });

  async function joinChatroom(doPolling, cookies, chatroomId) {
    var stageResult;

    myBase.resetSession(cookies, chatroomId);

    stageResult = await myBase.signIntoUserAccount(myBase.checkSignInResult, myBase.reportFailedRequest);
    if(stageResult === false) {
        return false;
    }

    stageResult = await myBase.handshakeChatroom(myBase.checkHandshakeResult, myBase.reportFailedRequest);
    if(stageResult === false) {
        return false;
    }

    stageResult = await myBase.retrieveSelfContext(myBase.checkSelfContextResult, myBase.reportFailedRequest);
    if(stageResult === null) {
        return false;
    }

    infos = stageResult;
    mates = stageResult['friends'];
    chats = stageResult['conversations'];
    pussy = stageResult['accountContext'];
    users = stageResult['chatroomContext']['data']['users'];
    texts = stageResult['chatroomContext']['data']['messages'];

    if(doPolling === true) {
      myBase.longPollChatroom(myBase.checkLongPollingResult, myBase.reportFailedRequest);
    }

    if(myGame.isAlive() === false) {
      myGame.startOver();
      var isLocked = true;
      await cleanChatroom();
      await notifyChatroom();
      var isLocked = false;
    }

    return true;
  }

  function cleanChatroom() {
    var removedTextsPromises = new Array();
    for(text of texts) {
      removedTextsPromises.push(myBase.removePublicMessage(text['userUuid']));
    }
    texts = new Array();
    return Promise.all(removedTextsPromises);
  }

  async function notifyChatroom() {
    await myBase.appendPublicMessage('a new game of mastermind has been initiated, anyone with a little bit of wisdom can participate of course');
    await myBase.appendPublicMessage('take turns and guess the number i have in mind, which is only five digits long and does not contain repeated digits');
    await myBase.appendPublicMessage('after each guess made, i will hint you by notifying you of the number of digits that are in correct place and the count of those inculded but in the wrong place');
  }

  function appendUser(user) {
    //if(users.hasOwnProperty(user['userUuid'])) {
      //i do not know what to do
    //}
    users[user['userUuid']] = user;
  }

  function removeUser(userUuid) {
    if(users.hasOwnProperty(userUuid)) {
      delete users[userUuid];
    }
    //i do not know what to do
  }

  function appendText(text) {
    if(text['userUuid'] !== pussy['userUuid']) {
      texts.push(text);
    }
    //i do not know what to do
  }

  function removeText(userUuid) {
    for(index = 0; index < texts.length; index++) {
      if(texts[index]['userUuid'] === userUuid) {
        texts.splice(index, 1);
      }
    }
  }

  var publicAPI = new Object();

  publicAPI['joinChatroom'] = joinChatroom;

  return publicAPI;
}

//var myPuss = new Puss();
//myPuss.joinChatroom(true);

module.exports = Puss;
