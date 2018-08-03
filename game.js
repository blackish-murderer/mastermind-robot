String.prototype.isNumerial = function CheckIfIsNumerial() {
  for(char of this) {
    if(char < '0' || char > '9') {
      return false;
    }
  }
  return true;
}

String.prototype.isRepeated = function CheckIfIsRepeated() {
  for(i = 0; i < this.length - 1; i++) {
    for(j = i + 1; j < this.length; j++) {
      if(this[i] === this[j]) {
        return true;
      }
    }
  }
  return false;
}

String.prototype.isFixSized = function CheckIfIsFixSized(length) {
  if(this.length !== length) {
    return false;
  }
  return true;
}

function Game() {
  var toGuess = String();
//  var guesses = new Array();

  function startOver() {
//    guesses = new Array();
    toGuess = generateToGuess();
  }

  function generateToGuess() {
    var seed = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
    var myGuess = seed[Math.floor(Math.random() * seed.length)];
    seed.splice(seed.indexOf(toGuess[toGuess.length - 1]), 1, '0');
    for(var i = 0; i < 4; i++) {
      myGuess += seed[Math.floor(Math.random() * seed.length)];
      seed.splice(seed.indexOf(toGuess[toGuess.length - 1]), 1);
    }
    return myGuess;
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
    if(guess.isFixSized(5) === false) {
      return 1;
    }
    if(guess.isNumerial() === false) {
      return 2;
    }
    if(guess.startsWith('0') === true) {
      return 3;
    }
    if(guess.isRepeated() === true) {
      return 4;
    }
    return 0;
  }

  var publicAPI = {
    'startOver': startOver,
    'validateGuess': validateGuess,
    'evaluateGuess': evaluateGuess,
  };

  return publicAPI;
}

module.exports = Game;
