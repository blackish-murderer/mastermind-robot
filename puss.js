const Base = require('./base');
const Game = require('./game');

const spaces = '\u00ad' + ' ' + '\u00ad' + ' ' + '\u00ad' + ' ' + '\u00ad' + ' ' + '\u00ad';

function Puss() {
  var myBase = new Base();
  var myGame = new Game();
  var isLocked = false;
  var isPlayed = false;

  var pussy, users, mates, texts, chats, infos;

  myBase.appendChannel('/chatroom/user/left');
  myBase.appendChannel('/chatroom/user/joined');
  myBase.appendChannel('/chatroom/message/add');
  myBase.appendChannel('/chatroom/message/remove');

  myBase.on('/chatroom/user/joined', function sayHello(user) {
    if(user['userUuid'] !== pussy['userUuid']) {
      appendUser(user);
    } else {
      console.log('[debug] delayed response received on user join', user['username']);
    }
  });

  myBase.on('/chatroom/user/left', function sayBye(userUuid) {
    if(userUuid !== pussy['userUuid']) {
      removeUser(userUuid);
    } else {
      console.log('[debug] delayed response received on user left', userUuid);
    }
  });

  myBase.on('/chatroom/message/add', function confirmAppend(text) {
    if(isLocked === true) {
      myBase.removePublicMessage(text['userUuid']);
    } else if(isPlayed === true) {
        appendGuess(text); // await for error catching
    } else {
      appendText(text);
    }
  });

  myBase.on('/chatroom/message/remove', function confirmRemove(userUuid) {
    if(userUuid !== pussy['userUuid']) {
      removeText(userUuid);
    } else {
      console.log('[debug] delayed response received in message removal', userUuid);
    }
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

    if(isPlayed === false) {
      isPlayed = true;
      myGame.startOver();
      isLocked = true;
      await cleanChatroom();
      await notifyChatroom();
      isLocked = false;
    }

    await closeConversations();

    return true;
  }

  function closeConversations() {
    var closedConversationsPromises = new Array();
    for(chat of chats) {
      closedConversationsPromises.push(myBase.removeConversation(chat['otherUser']['userUuid']));
    }
    chats = new Array();
    return Promise.all(closedConversationsPromises);
  }

  function beginConversations() {
    var openedConversationsPromises = new Array();
    for(userUuid in users) {
      openedConversationsPromises.push(myBase.appendConversation(userUuid)); //-------------------------------------- i must update chats ----------------------------------------
    }
    return Promise.all(openedConversationsPromises);
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

  async function appendGuess(text) {
    var myGuess = text['messageBody'].substring(0, 5);
    var comment = text['messageBody'].substring(5);
    var guesser = text['username'];

    if(myGame.validateGuess(myGuess) > 0) {
      myBase.removePublicMessage(text['userUuid']);
      await myBase.appendConversation(text['userUuid']);
      await myBase.appendPrivateMessage(text['userUuid'], 'begin your text with a five digited number including no repeated digits, for example: 12345 hi everyone!');
      await myBase.removeConversation(text['userUuid']);
      return;
    }

    var outcome = myGame.evaluateGuess(myGuess);
    var inPlace = '✓: ' + outcome['inPlace'].toString();
    var inGuess = '≈: ' + outcome['inGuess'].toString();
    var outcomeText = myGuess + spaces + inPlace + spaces + inGuess;

    if(guesser) {
      outcomeText += (spaces + 'Guessed by: ' + guesser);
    }

    if(comment) {
      outcomeText += (spaces + 'Comment: ' + comment);
    }

    myBase.removePublicMessage(text['userUuid']);
    myBase.appendPublicMessage(outcomeText);

    if(outcome['isWon'] === true) {
      isPlayed = false;
      await myBase.appendPublicMessage('congrates ' + text['username'] + ', you guessed it right!');
      await myBase.appendPublicMessage('the game will be restarted in 20 seconds');
      setTimeout(joinChatroom, 20000);
    }
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
