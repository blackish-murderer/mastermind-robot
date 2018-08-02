function Game() {
  var isAlive = false;
  var toGuess = String();
  var guesses = new Array();

  function startOver() {
    isAlive = true;
    generateToGuess();
    guesses = new Array();
  }

  function generateToGuess() {
    var seed = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
    toGuess = seed[Math.floor(Math.random() * Math.floor(seed.length))];
    seed.splice(seed.indexOf(toGuess[toGuess.length - 1]), 1, 0);
    for(var i = 0; i < 4; i++) {
      toGuess += seed[Math.floor(Math.random() * Math.floor(seed.length))];
      seed.splice(seed.indexOf(toGuess[toGuess.length - 1]), 1);
    }
  }

  function appendNewGuess(guess, player) {
    if(!isAlive) {
      return {'error': -1};
    }

    var isNotValid = validateGuess(guess);
    if(isNotValid) {
      return {'error': isNotValid};
    }

    var result = evaluateGuess(guess);
    result['player'] = player;
    isAlive = !result['isWon'];
    guesses.push(result);
    return result;
  }

  function evaluateGuess(guess) {
    var inPlace = 0;
    var inGuess = 0;
    for(var i = 0; i < guess.length; i++) {
      if(guess[i] === toGuess[i]) {
        inPlace++;
      } else if(toGuess.includes(guess[i])) {
        inGuess++;
      }
    }
    return {'inPlace': inPlace, 'inGuess': inGuess, 'isWon': inPlace === 5};
  }

  function validateGuess(guess) {
    if(guess.length != 5) {
      return 1;
    }
    if(!isNumerial(guess)) {
      return 2;
    }
    if(guess.startsWith('0')) {
      return 3;
    }
    if(includesRepeated(guess)) {
      return 4;
    }
    return 0;
  }

  function isNumerial(str) {
    for(chr of str) {
      if(chr < '0' || chr > '9') {
        return false;
      }
    }
    return true;;
  }

  function includesRepeated(str) {
    for(i = 0; i < str.length - 1; i++) {
      for(j = i + 1; j < str.length; j++) {
        if(str[i] === str[j]) {
          return true;
        }
      }
    }
    return false;
  }

  function getStat() {
    return isAlive;
  }

  var publicAPI = {
    'isAlive': getStat,
    'startOver': startOver,
    'validateGuess': validateGuess,
    'evaluateGuess': evaluateGuess,
    'appendNewGuess': appendNewGuess
  };

  return publicAPI;
}

/*
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});


myGame = new Game();
myGame.startOver();
promptForNextGuess();

function promptForNextGuess() {
  rl.question('next guess: ', function processAnswer(answer) {
    var result = myGame.appendNewGuess(answer, 'crosstalk');
    console.log('✓:', result['inPlace'], '≈:', result['inGuess']);
    if(myGame.isAlive()) {
      promptForNextGuess();
    } else {
      console.log('game\'s finished');
      rl.close();
    }
  });
}
*/

/*
var attempts = 0;
while(true) {
  attempts++;
  var seed = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
  var toGuess = seed[Math.floor(Math.random() * Math.floor(seed.length))];
  seed.splice(seed.indexOf(toGuess[toGuess.length - 1]), 1, 0);
  for(var i = 0; i < 4; i++) {
    toGuess += seed[Math.floor(Math.random() * Math.floor(seed.length))];
    seed.splice(seed.indexOf(toGuess[toGuess.length - 1]), 1);
  }
  var guess = '97531';
  var inPlace = 0;
  var inGuess = 0;
  for(var i = 0; i < guess.length; i++) {
    if(guess[i] === toGuess[i]) {
      inPlace++;
    } else if(toGuess.includes(guess[i])) {
      inGuess++;
    }
  }
  if(inPlace == 5) {
    console.log(toGuess, guess);
    console.log(inPlace, inGuess);
    console.log('guessed in', attempts, 'tries');
    break;
  }
}
*/

module.exports = Game;
