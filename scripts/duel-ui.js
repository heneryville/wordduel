var duel = duel || new Duel();

(function(duel){

  var template_history_row;
  var $history;
  var $selector;
  var $guess_entry;
  var $guess_button;
  var guess_buffer = '';

  function compile_templates(){
    var strTemplate = $('#history_row').html();
    template_history_row = _.template(strTemplate);
  };

  $(document).ready(function(){
    compile_templates(); 
    //Common variables/
    $history = $('#history')
    $selector = $('table','#selector');
    $guess_entry = $('table tr','#pad');
    $guess_button = $('#guess');

    //Bind to the letters
    $selector.on("click","div",function() {
      var $this = $(this);
      var letter = $this.html();
      duel.active_game().toggle(letter);
    });
    //Bindings
    $('#in_game').unbind('keydown').bind('keydown', typing_handler);
    $guess_button.click(function(){ make_guess(); });
    //Sign in
    $('#sign_in').click(function(){
      var email = $('#email').val();
      var password = $('#password').val();
      duel.sign_in(email,password,function(success,why){
        if(!success) {
          show_message(why);
        }
      });
    });
    //Bind game selection
    $('#select_game').on('click','button',function(){
      var $this = $(this);
      var game_id = $this.data('game-id');
      var game_opponent = $this.data('game-opponent');
      duel.get_game_with(game_opponent,function(game,success,why){
        console.log(success + ":" + why);
      });
    });

  });

  function make_guess() {
    if(guess_buffer.length < 4)
    {
      show_message("You're new in town, ain'y 'ya. Ya gotta guess four letter words");
      return;
    }
    duel.active_game().guess(guess_buffer,function(success,why) {
      console.log(success + ":" + why);
      if(success){
        guess_buffer = "";
        render_game_state();
        render_history();
        render_guess();
      }
      else {
        show_message(why);
      }
    });
  }

  function show_message(message) {
    var $messages;
    var current_mode = mode();
    if(current_mode === 0) {
      $messages = $('.messages', '#sign_wall'); 
    }
    else{ 
      $messages = $('.messages','#in_game'); 
    }
    $messages.text(message);
    $messages.slideToggle('slow',function(){
      //Messages show for only a short while.
      setTimeout(function(){unshow_message($messages);},2000);
    });
  }

  function unshow_message($messages) {
    $messages.slideToggle('slow');
  }

  function render_selectors(){
    $selector.html('');
    var charOrdinals = _.range(65,91);
    var html = '';
    var curChar = 0;

    var count = 0;
    html = _.reduce(charOrdinals,function(memo,val){
      var html = render_token(String.fromCharCode(val));
      count += 1;
      if(count%9 === 0) { //Add row endings on the I and R
        html += '</tr><tr>';
      }
      return memo + html;
    },'<tr>');
    html += '</tr>';
    $selector.html(html);
  }

  function render_game_state() {
    var game = duel.active_game();
    //Update player names
    $('.name','#left').html(game.me.Name);
    $('.name','#right').html(game.opponent.Name);
  }
  
  function render_history() {
    var game = duel.active_game();
    var left = game.my_guesses();
    var right = game.their_guesses();
    var html = "";
    $history.html(""); //Clear the history
    var maxLength = _.max([left.length,right.length]);
    for(var i=0; i<maxLength; ++i) {
      var strLeft = left[i];
      var strRight = right[i];

      var context = {
        left: strLeft,
        right: strRight,
        row: i,
        mark_as: markingClass,
        left_stars: game.my_stars()[i],
        right_stars: game.their_stars()[i]
      };
      var rowHtml = template_history_row(context);
      html += rowHtml;
    };
    $history.html(html);

    //Render turns
    $('.indicator','#left').toggleClass('hidden',!game.i_can_go());
    $('.indicator','#right').toggleClass('hidden',!game.they_can_go());
  }

  function render_guess() {
    var character;
    var html = "";
    for(var i=0; i<4; ++i) {
      character = guess_buffer.length -1 < i ? '' : guess_buffer[i];
      html += render_token(character);
    }
    $guess_entry.html(html);
  }

  function render_token(letter) {
      var letter_html = '<td><div class="'
      letter_html += markingClass(letter);
      letter_html += '">'
      letter_html += letter;
      letter_html += '</div></td>';
      return letter_html;
  }

  function markingClass(letter) {
    if(letter=='') return 'token_ghost';
    var game = duel.active_game();
    if(game.is_marked(letter)) return 'token_red';
    if(game.is_grayed(letter)) return 'token_gray';
    return 'token_yellow';
  }


  //The main render for game changes
  $(document).bind('active_game', function() {
    //Setup the guesses
    render_selectors();
    render_history();
    render_game_state();
  });

  $(document).bind('enter_game',function() {
    change_modes();
  });

  $(document).bind('marks',function() {
    //We could more efficiently just re-render the changed letters.
    render_selectors();
    render_history();
  });

  $(document).bind('sign_in', function() {
    change_modes();
  });

  $(document).bind('games', render_select_games);

  function render_select_games() {
    var ready; 
    var waiting;

    ready = _(duel.games()).filter(function(iter){
      return iter.i_can_go();
    });
    
    waiting = _(duel.games()).filter(function(iter){
      return !iter.i_can_go();
    });

    function render_game_list($to,games){
      var html = "";
      _(games).each(function(game){
        var rowHtml = "<tr><td><button data-game-id='" + game.id() + "' ";
        rowHtml += "data-game-opponent='" + game.opponent.Email + "'>";
        rowHtml += game.opponent.Name + " &#8211; Turn " + game.turns();
        rowHtml += "</button></td></tr>";
        html += rowHtml;
      });
      $to.html(html);
    }

    render_game_list($('#ready'),ready);
    render_game_list($('#waiting'),waiting);
  }

  function change_modes() {
    var cur_mode = mode();
    var $sign_wall = $('#sign_wall');
    var $select_game = $('#select_game');
    var $in_game = $('#in_game');
    console.log("Change modes to: " + cur_mode);

    var sign_wall_visible = cur_mode===0;
    var select_game_visible = cur_mode ===1;
    var in_game_visible = cur_mode ===2;

    $sign_wall.toggleClass('invisible',!sign_wall_visible);
    $select_game.toggleClass('invisible',!select_game_visible);
    $in_game.toggleClass('invisible',!in_game_visible);

    //Toggle the sign out
    if(cur_mode === 1 || cur_mode === 2) {
      $('#welcome-name').text('Welcome ' + duel.user());
    }
    $('#welcome').toggleClass('hidden',cur_mode===0)

    //Rendering for each mode
    if(cur_mode ===1) {
      duel.get_games(); //Trigger a game list update
    }
    if(cur_mode === 2) {
      render_selectors();
      render_history();
      render_game_state();
    }
  }

  // Prevent the backspace key from navigating back.
  function typing_handler(event) {
    if(event.keyCode == 8)
    { 
      event.preventDefault();
      if(guess_buffer.length === 1) {
        guess_buffer = "";
      }
      else {
        guess_buffer = guess_buffer.substring(0,guess_buffer.length-1);
      }
      render_guess();
      return false;
    }
    else if(event.keyCode == 13) {
      make_guess();
      return false;
    }
    var character = String.fromCharCode(event.keyCode).toUpperCase();
    if(!/[A-Z]/.exec(character))
    {
      return true;
    }
    if(guess_buffer.length < 4) {
      guess_buffer += character;
      render_guess();
    }
  }

  function mode() {
    if(!duel.is_signed_in()) return 0;
    if(duel.active_game() == undefined) return 1;
    return 2;
  }
})(duel);

