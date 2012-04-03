/* Author: 

*/
/* jQuery, Modernizr, player*/
/*jslint browser: true, css: true, maxerr: 50, indent: 4 */

var Phone = (function ($, M) {
    'use strict';
    var $clickableArea          = $('#clickable-area'),
        $phoneVideoContainer    = $('#phone-video-container'),
        $envelopeContainer      = $('#envelope-container'),
        $phone                  = $('#phone'),
        $dekkoLogo              = $('#logo a'),
        fadeSpeed               = 300,
        $activeNav = $('#main-header nav li.active');

    var peek = function () {
        if ($phoneVideoContainer.hasClass('inside')) {
            bindPeek();
        }
    }

    var bindPeek = function () {
        $clickableArea.on('hover', function () {
            $phoneVideoContainer.toggleClass('peek');
            if (!M.csstransitions) {
                if ($phoneVideoContainer.hasClass('peek')) {
                    $phoneVideoContainer.animate({top: '-10px'}, fadeSpeed);
                } else {
                    $phoneVideoContainer.animate({top: '0px'}, fadeSpeed);
                }
            }
        });
    }

    var unbindPeek = function () {
        $phoneVideoContainer.removeClass('peek');
        $clickableArea.off('hover');
        if (!M.csstransitions) {
            if ($phoneVideoContainer.hasClass('outside')) {
                $phoneVideoContainer.animate({height: '337px', top: '-10px'}, fadeSpeed);
                $envelopeContainer.animage({height: '400px'}, fadeSpeed);
            }
        }
    }

    var showPhone = function () {
        unbindPeek();
        $phoneVideoContainer.toggleClass('inside');
        $phoneVideoContainer.toggleClass('outside');
        $envelopeContainer.toggleClass('inside');
        $envelopeContainer.toggleClass('outside');
        unbindPeek();
        player.playVideo();
    }

    var hidePhone = function () {
            $phoneVideoContainer.toggleClass('inside');
            $phoneVideoContainer.toggleClass('outside');
            $envelopeContainer.toggleClass('inside');
            $envelopeContainer.toggleClass('outside');
            if (!M.csstransitions) {
                if ($phoneVideoContainer.hasClass('inside')) {
                    $phoneVideoContainer.animate({height: '30px', top: '0px'}, fadeSpeed);
                    $envelopeContainer.animage({height: '235px'}, fadeSpeed);

                }
            }
            player.pauseVideo();
            bindPeek();
    }

    var toggleVideo = function () {
        // Show and play video
        if($phoneVideoContainer.hasClass('inside')){
            showPhone();
        } else if ($dekkoLogo.hasClass('active')) {
            hidePhone();
        }

    }

    var fadeInPhone = function () {
        $phoneVideoContainer.fadeIn(fadeSpeed);
    }

    var bindHomeLogo = function () {
        if(!$('body.home').length){
            $dekkoLogo.on('click', function (e) {
                e.preventDefault();
                if (!$(this).hasClass('active')) {
                    toggleVideo();
                    $(this).toggleClass('active');
                    $('#magic-monkey').slideToggle(fadeSpeed);
                    $('#content').slideToggle(fadeSpeed);
                    $activeNav.toggleClass('active');
                }
            });
        }
    }
    return {
        init : function () {
            $clickableArea.click(function() {
                showPhone();
                // player.mute();
            });
            
            $phone.click(function() {
                hidePhone();
            });

                $activeNav.click(function(e) {
                    if($phoneVideoContainer.hasClass('outside')){
                        e.preventDefault();
                        toggleVideo();
                        $('#magic-monkey').slideToggle(fadeSpeed);
                        $('#content').slideToggle(fadeSpeed);
                        $activeNav.toggleClass('active');
                        $dekkoLogo.toggleClass('active');
                    }
                });             
            

            bindHomeLogo();
            fadeInPhone();
            peek();

            // Must be after toggleVideo which binds events
            if($('body.home').length){

                var startVideo = setInterval(function () {
                    if(player){
                        if (typeof player.playVideo === 'function') {
                            $clickableArea.trigger('click');
                            clearInterval(startVideo);
                        }
                    }
                }, 500);
            }
        }
    }

}(jQuery, Modernizr));

$(document).ready(function () {
    
        Phone.init();

        // blur focus functionality
        var mailChimpInputValue = 'Email',
            $mailChimpInput = $('.widget_ns_mailchimp input[type="text"]');
        $mailChimpInput.val(mailChimpInputValue);
        $mailChimpInput.focus(function () {
            if ($(this).val() == mailChimpInputValue) {
                $(this).val('');
            }
        });

        $mailChimpInput.blur(function () {
            if ($(this).val() == '') {
                $(this).val(mailChimpInputValue);
            }
        });

        // SHARRRE jQuery Plugin
        $('.twitter').sharrre({
          share: {
            twitter: true
          },
          enableHover: false,
          enableTracking: true,
          buttons: { twitter: {}},
          click: function(api, options){
            api.simulateClick();
            api.openPopup('twitter')
          }
        });
        
        $('.facebook').sharrre({
          share: {
            facebook: true
          },
          buttons: {
            facebook: { //http://developers.facebook.com/docs/reference/plugins/like/
              url: '',  //if you need to personalize url button
              action: 'like',
              layout: 'button_count',
              width: '',
              send: 'true',
              faces: 'false',
              colorscheme: '',
              font: '',
              lang: 'en_US'
            }
          },
          hover: function(api, options){
            $(api.element).find('.buttons').show();
          },
          hide: function(api, options){
            $(api.element).find('.buttons').hide();
          },
          // enableHover: true,
          enableTracking: true,
          click: function(api, options){
            // api.simulateClick();
            // api.openPopup('facebook')
          }
        });


    });