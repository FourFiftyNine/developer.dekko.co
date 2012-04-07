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
    })
    
});
