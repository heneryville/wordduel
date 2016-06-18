function Duel(){
  //Data memebers
  var _user = "";
  var _pin = "";
  var _email = "";
  var _games = [];
  var _active_game = undefined;
  var _async = true;

  //Utility functions
  var send = function(obj,done) {
    var data = JSON.stringify(obj);
    $.ajax({
      url: 'http://kelvswordgame.appspot.com/awordgame',
      type: 'POST',
      data: data,
      dataType: 'json',
      success: function(data,why){
        //Look for an error in the returned object and success as no if found
        var success = true;
        if(data && data.error) {
          success = false;
          why = data.error;
        }
        if(done) done(data,success,why);
      },
      error: function(data,textStatus){
        if(done) done(data,false,textStatus);
      },
      async: _async
    },'json');
  }
  
  //Implementations
  
  var set_active_game_impl = function(game) {
    _active_game = game;
    $(document).triggerHandler("enter_game");
  }
  
  var sign_out_impl = function(trigger) {
    _user = "";
    _pin = "";
    _email = "";
    _games = [];
    if(trigger) $(document).triggerHandler('sign_in');
  }

  //Sign the user in to the given email and pin
  var sign_in_impl = function(user,email,pin) {
    sign_out_impl(false);

    _user = user;
    _pin = String(pin);
    _email = email;
    
    $(document).triggerHandler('sign_in');
  }

  var assert_sign_in = function(done) {
    if(_pin==="") {
      if(done) done(false,'Not signed in');
      return false;
    }
    return true;
  }

  var setSync = function() {
    _async = false;
  }

  //Creates a new user, and signs them in if successful
  //done(success = boolean,why = string)
  var create_user = function(name, email, hash, done) {
    var obj = {
      action: 'createUser',
      name: name,
      myEmail: email,
      passwordHash: hash
    }
    send(obj,function(data,success,why) {
      if(data.error) {
        success = false;
        why = data.error
      }
      if(success) {
        sign_in_impl(data.Name,data.Email,data.Pin);
      }
      if(done) done(success,why);
    });
  }

  var sign_out = function() {
    sign_out_impl(true);
  }

  //Signs the user in.
  //done(success = boolean, why=string)
  var sign_in = function(email,hash, done) {
    send({action: 'signIn', myEmail: email, passwordHash: hash},
      function(data,success,why) {
        if(success) {
          sign_in_impl(data.Name,data.Email,data.Pin);
        }
        if(done) {done(success,why);}
    });
  }

  var game_init = function(gameObj) {
    var _active; //If the game is currently active to play
    var _id; //The game id
    var _player1; //An object with data about player 1
    var _player2; //An object with data about player 2
    var who; //Who the signed in player is. 0 for player 1, 1 for player 2
    var marks = []; //Letters that are circled or crossed. Stored as an array of each character
    // in the alphabet. The character will be caps if it's circled, and an underscore if it is
    // crossed out.
    var i_can_go; //True if the current player can take their turn
    var they_can_go; //True if the opponent can take their turn
    var my_word; //The word of the player
    var my_guesses; //The guesses of the player
    var my_stars; //The stars of each guess of the current player
    var their_guesses; //The guesses of the opponent
    var their_stars; //The stars of each guess of the opposing player

    function update(gameObj) {
      _active = gameObj.Active || false;
      _id = gameObj.Id;

      who = gameObj.Player1.Email === _email ? 0 : 1;

      me = (who === 0 ? gameObj.Player1 : gameObj.Player2);
      opponent = (who === 1 ? gameObj.Player1 : gameObj.Player2);


      var tmpMarks = (who === 0 ? gameObj.P1Alphabet : gameObj.P2Alphabet);
      //Really, we want marks to be an array so that it is mutable
      marks = [];
      for(var i=0; i<tmpMarks.length; ++i) {
        marks.push(tmpMarks[i]);
      }

      i_can_go = (who === 0 ? gameObj.p1CanGuess : gameObj.p2CanGuess);
      they_can_go = (who === 0 ? gameObj.p2CanGuess : gameObj.p1CanGuess); 

      my_word = (who === 0 ? gameObj.P1Word : gameObj.P2Word);
      my_guesses = (who === 0 ? gameObj.P1Guesses : gameObj.P2Guesses) || [];
      my_stars = (who === 0 ? gameObj.P1GuessCounts : gameObj.P2GuessCounts) || [];
      their_guesses = (who === 0 ? gameObj.P2Guesses: gameObj.P1Guesses) || [];
      their_stars = (who === 1 ? gameObj.P1GuessCounts : gameObj.P2GuessCounts) || [];

      //To upper everything
      my_guesses = _(my_guesses).map(function(word){return word.toUpperCase();});
      their_guesses = _(their_guesses).map(function(word){return word.toUpperCase();});
    }

    var char_spot = function(letter) {
      letter = normalize_to_letter(letter);
      var spot = letter.charCodeAt(0) - 65;
      return spot
    }

    var normalize_to_letter = function(letter) {
      if(_.isNumber(letter)) 
          return String.fromCharCode(letter).toUpperCase();
      else
        return letter.toUpperCase();
    }

    var is_marked = function(letter) {
      var spot = char_spot(letter);
      return marks[spot].charCodeAt(0) < 94
    }

    var is_grayed = function(letter) {
      var spot = char_spot(letter);
      return marks[spot].charCodeAt(0) === 95;
    }

    var toggle_mark = function(letter) {
      letter = normalize_to_letter(letter);
      var spot = char_spot(letter);
      var action;
      if(is_grayed(letter)) {
        //Toggle to marked
        marks[spot] = letter;
        actin = "circleLetters";
      }
      else if(is_marked(letter)) {
        //Toggle to normal
        marks[spot] = letter.toLowerCase();
        action = "unmarkLetters";
      }
      else {
        marks[spot] = '_';
        action="crossLetters";
      }
      send({
          action: action,
          myEmail: _email,
          pin: _pin,
          gameId: _id,
          letters: lette1338608516r
          });
      $(document).triggerHandler('marks');
    };

    var guess = function(word,done) {
      send({
        action: 'guessWord',
        myEmail: _email,
        pin: _pin,
        gameId: _id,
        word: word.toLowerCase()
      },function(data,success,why){
        if(success){
          update(data)
          $(document).triggerHandler("active_game");
        }
        if(done) done(success,why);
      });
    }

    var turns = function() {
      return _.max([
        _(my_guesses).size(),
        _(their_guesses).size()
      ]);
    }

    update(gameObj);

    return {
      me: me,
      opponent: opponent,
      id: function(){return _id;},
      is_marked : is_marked,
      is_grayed : is_grayed,
      toggle: toggle_mark,
      i_can_go : function() {return i_can_go;},
      they_can_go : function(){return they_can_go;},
      their_guesses: function(){return their_guesses;},
      their_stars: function(){return their_stars;},
      my_guesses: function(){return my_guesses;},
      my_stars: function(){return my_stars;},
      my_word: function(){return my_word;},
      active: function(){return _active;},
      turns: turns,
      guess: guess
    }
  }


  //Starts a game with another user of the given email
  //done(success = boolean, game = {})
  var start_game = function(theirEmail,done) {
    if(!assert_sign_in(done)) return;
    send(
      {action: 'startGameWith',
       myEmail: _email,
       pin: _pin,
       theirEmail: theirEmail
      },
      function(data,success,why){
        var game;
        if(success) {
          game = game_init(data);
          set_active_game_impl(game);
        }

        if(done) {done(success,why,game);}


    });
  }

  var get_game_with = function(theirEmail,done) {
    if(!assert_sign_in(done)) return;
    send(
      {action: 'getGameWith',
       myEmail: _email,
       pin: _pin,
       theirEmail: theirEmail
      },
      function(data,success,why){
        var game;
        if(success) {
          game = game_init(data);
          set_active_game_impl(game);
        }

        if(done) {done(game,success,why);}
    });
  }

  var get_games = function(done) {
    send({
      action: 'listCurrentGames',
      myEmail: _email,
      pin: _pin
    },
    function(data,success,why){
      _games = [];
      if(success) {
        var mapFunc = function(game){_games.push(game_init(game))};
        _(data.Mine).each(mapFunc);
        _(data.Theirs).each(mapFunc);
      }
      $(document).triggerHandler('games');
      if(done) done(_games,success,why);
    });

  }

  //Public
  return {
    create_user: create_user,
    sign_in: sign_in,
    is_signed_in: function(){return !(_pin === "");},
    sign_out: sign_out,
    start_game: start_game,
    get_game_with: get_game_with,
    setSync: setSync,
    active_game: function(){return _active_game;},
    games: function(){return _games;},
    game: function(i){return _games[i];},
    user: function(){return _user;},
    pin: function(){return _pin;},
    email: function(){return _email;},
    get_games: get_games
  };
}(jQuery,document);

