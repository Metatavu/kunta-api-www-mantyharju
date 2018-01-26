/* global flatpickr */

(function () {
  'use strict';

  let PAGE = 0;

  function refreshEvents() {
    var startDateString = $('.date-range-filter.filter-start').val();
    var endDateString = $('.date-range-filter.filter-end').val();
    $('.events-container').addClass('loading');

    var params = [];

    if (startDateString) {
      params.push(["start", startDateString].join('='));
    }

    if (endDateString) {
      params.push(["end", endDateString].join('='));
    }

    if (PAGE) {
      params.push(["page", PAGE].join('='));
    }

    $.ajax('/ajax/events?' + params.join('&'), {
      success: $.proxy(function (html) {
        $('.events-container')
          .html(html)
          .removeClass('loading')
          .find('*[data-lazy-bg-image]')
          .lazyBackgroundImage();
      }, this),
      error: $.proxy(function (jqXHR, textStatus) {
        // TODO: ERROR
      }, this)
    });
  }
  
  $(document).ready(function () {
    flatpickr(".date-range-filter", {
      dateFormat: 'd.m.Y',
      onChange: function () {
        PAGE = 0;
        refreshEvents();
      }
    });
  });
  
  $(document).on('click', '.empty-date-filter-btn', function (event) {
    var button = $(event.target);
    var dateFilter = button.closest('.input-group').find('.date-range-filter');
    dateFilter[0]._flatpickr.clear();
  });
  
  $(document).on('click', 'a.page-prev', function (event) {
    event.preventDefault();
    PAGE--;
    refreshEvents();
  });
  
  $(document).on('click', 'a.page-next', function (event) {
    event.preventDefault();
    PAGE++;
    refreshEvents();
  });
  
  $(document).ready(function () {
    refreshEvents();
  });
  
}).call(this);