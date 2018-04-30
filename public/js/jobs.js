/*jshint esversion: 5 */
/* global moment */

(function () {
  'use strict';
 
  $.widget("custom.jobs", {
    
    _create: function() {
      this.defaultLimit = 10;
      this.defaultSortBy = 'PUBLICATION_END';
      this.defaultSortDir = 'ASCENDING';
      
      this.element.append($("<div>").addClass('jobs-list-container'));
      $('.jobs-list-container').append($('<ul>').addClass('jobs-list'));
      this._getJobs();
    },
    
    _getParameters: function () {
      var limit = $('.kunta-api-job-list').attr('data-limit');
      var sortBy = $('.kunta-api-job-list').attr('data-sort-by');
      var sortDir = $('.kunta-api-job-list').attr('data-sort-dir');
      
      return {
        limit: this._attributeExists(limit) ? limit : this.defaultLimit,
        sortBy: this._attributeExists(sortBy) ? sortBy : this.defaultSortBy,
        sortDir: this._attributeExists(sortDir) ? sortDir : this.defaultSortDir
      };
    },
    
    _attributeExists: function (attr) {
      if (typeof attr !== typeof undefined && attr !== false) {
        return true;
      } else {
        return false;
      }
    },
    
    _getJobs: function () {
      var parameters = this._getParameters();
      
      $.ajax({
        url : '/jobs/'+ Object.values(parameters).join('/'),
        success : $.proxy(function(data) {
          this._appendList(data[0]);
        }, this)
      });
    },
    
    _appendList: function (jobs) {
      for (var i = 0; i < jobs.length; i++) {
        var jobPublished = moment(jobs[i].publicationStart).format('DD.MM.YYYY');
        var html = `
          <li class="jobs-list-item">
            <a href="${jobs[i].link}" target="_blank">
              <h6 class="jobs-list-item-header">${jobs[i].title}</h6>
              <h6 class="jobs-list-item-title">Ilmoitus jätetty ${jobPublished}</h6>
              <p class="jobs-list-item-content">
                ${this._truncateString(jobs[i].description)}
                <span>
                  <i class="fa fa-chevron-right"></i>
                </span>
              </p>
            </a>
          </li>
        `;
        $('.jobs-list').append(html);
      }
    },
    
    _truncateString: function (string) {
      var stringLength = 150;
      return `${string.substring(0, stringLength)}...`;
    }
  
  });
  
  $(document).ready(function () {
    $('.kunta-api-job-list').jobs();
  });
  
}).call(this);