/*jshint esversion: 5 */
/* global moment */

(function () {
  'use strict';
 
  $.widget("custom.jobs", {
    
    _create: function() {
      this.element.append($("<div>").addClass('jobs-list-container'));
      $('.jobs-list-container').append($('<ul>').addClass('jobs-list'));
      this._getJobs();
    },
    
    _getParameters: function () {
      var limit = $('.kunta-api-job-list').attr('data-limit');
      var sortBy = $('.kunta-api-job-list').attr('data-sort-by');
      var sortDir = $('.kunta-api-job-list').attr('data-sort-dir');
      
      return {
        limit: limit,
        sortBy: sortBy,
        sortDir: sortDir
      };
    },
    
    _getJobs: function () {
      $.ajax({
        url : '/jobs',
        data: this._getParameters(),
        success : $.proxy(function(data) {
          this._appendList(data[0]);
        }, this)
      });
    },
    
    _appendList: function (jobs) {
      for (var i = 0; i < jobs.length; i++) {
        var jobPublished = moment(jobs[i].publicationStart).format('DD.MM.YYYY');
        var html = '';
        
        html += '<li class="jobs-list-item">';
        html += '<a href="' + jobs[i].link + '" target="_blank">';
        html += '<h6 class="jobs-list-item-header">' + jobs[i].title + '</h6>';
        html += '<h6 class="jobs-list-item-title">Ilmoitus jätetty ' + jobPublished + '</h6>';
        html += '<p class="jobs-list-item-content">' + this._truncateString(jobs[i].description);
        html += '<span><i class="fa fa-chevron-right"></i></span>';
        html += '</p></a></li>';
         
        $('.jobs-list').append(html);
      }
    },
    
    _truncateString: function (string) {
      var stringLength = 150;
      return string.substring(0, stringLength) + '...';
    }
  
  });
  
  $(document).ready(function () {
    $('.kunta-api-job-list').jobs();
  });
  
}).call(this);