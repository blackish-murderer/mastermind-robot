function Html() {
  const keys = require('./keys');

  function replaceEntities(string, escapeChar, specialChar) {
    //var escapeChar = '\\';
    //var specialChar = '\'';
    function fixEscapeChars(input, output) {
      if(escapeChar && output === escapeChar) {
        return escapeChar + escapeChar;
      }

      if(specialChar && output === specialChar) {
        return escapeChar + specialChar;
      }

      if(output === undefined) {
        return input;
      }

      return output;
    }

    string = string.replace(/(&[a-zA-Z0-9]+;)|(&#[0-9]+;)|(&#[xX]{1}[a-fA-F0-9]+;)/g, function replacer(match, p1, p2, p3, offset, string) {
      if(p1) {
        return fixEscapeChars(match, keys[match]);
      }

      if(p2) {
        return fixEscapeChars(match, String.fromCodePoint(Number(match.substring(2, match.length - 1))));
      }

      if(p3) {
        return fixEscapeChars(match, String.fromCodePoint(Number('0x' + match.substring(3, match.length - 1))));
      }

      return match;
    });
/*
    string = string.replace(/&[a-zA-Z0-9]+;/g, function replacer(match, offset, string) {
      return fixEscapeChars(match, keys[match]);
    });

    string = string.replace(/&#[0-9]+;/g, function replacer(match, offset, string) {
      return fixEscapeChars(match, String.fromCodePoint(Number(match.substring(2, match.length - 1))));
    });

    string = string.replace(/&#[xX]{1}[a-fA-F0-9]+;/g, function replacer(match, offset, string) {
      return fixEscapeChars(match, String.fromCodePoint(Number('0x' + match.substring(3, match.length - 1))));
    });
*/
    return string;
  }

  const publicAPI = {
    replaceEntities: replaceEntities,
    decode: replaceEntities
  };
  return publicAPI;
}

module.exports = Html();
/*
if(require.main === module) {
  var html = Html();
  encodedString = '"&quot;":&#4568;&#x00af;&#X00Ff;';
  decodedString = html.replaceEntities(encodedString, '\\', '\"');
  console.log('encoded:', encodedString);
  console.log('decoded:', decodedString);
  encodedString = '"&#x005C;&#x0022;":&#00034;&#x005C;&#X0022;';
  decodedString = html.replaceEntities(encodedString, '\\', '\"');
  console.log('encoded:', encodedString);
  console.log('decoded:', decodedString);
}
*/
/*
if(require.main === module) {
  const fs = require('fs');
  var html = Html();
  fs.readFile('./keys.js', function processData(err, data) {
    if(err) {
      throw err;
    }
    console.log(html.replaceEntities(data.toString(), '\\', '\''));
  });
}
*/
