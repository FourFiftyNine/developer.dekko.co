/* Author: Anthony Sessa [sessa.com | fourfiftynine.com]
*/
/* jQuery, Modernizr, player*/
/*jslint browser: true, css: true, maxerr: 50, indent: 4 */

jQuery(document).ready(function($) {
    // $('body.home #content article').delay(500).animate({
    //     marginTop: "-5px"
    // }, 1000, 'easeOutBounce', function() {

    // })
  $('#show-footer').click(function() {
      $("footer#news").animate({
          marginTop: "-70px"
      }, 1000, 'easeOutCubic')
  });
  $('#email-submit').click(function(e) {
    e.preventDefault();

    var $newsletter = $('#newsletter'),
        $inputs     = $('#newsletter input'),
        $ajax_gif   = $('#newsletter .ajax-gif');

    $('.error-message').remove();
    $inputs.hide();
    $ajax_gif.show();
    var email = $('#email').val();

    // Let Mailchimp validate?
    $.getJSON('/mailchimp_submit', {email: email}, function(json, textStatus) {
      if(json.error) {
        $ajax_gif.hide();
        $inputs.show();
        $newsletter.append('<div class="error-message">' + json.error + '</div>');
      } else {
        $ajax_gif.hide();
        $newsletter.append('<div class="success-message">Thank you!</div>')
      }
    });    
  });
});
