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
      const limit = $('.kunta-api-job-list').attr('data-limit');
      const sortBy = $('.kunta-api-job-list').attr('data-sort-by');
      const sortDir = $('.kunta-api-job-list').attr('data-sort-dir');
      
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
      const parameters = this._getParameters();
      
      $.ajax({
        url : '/jobs/'+ Object.values(parameters).join('/'),
        success : $.proxy(function(data) {
          this._appendList(data[0]);
        }, this)
      });
    },
    
    _appendList: function (jobs) {
      jobs.forEach((job) => {
        const jobPublished = moment(job.publicationStart).format('DD.MM.YYYY');
        const html = `
          <li class="jobs-list-item">
            <a href="${job.link}" target="_blank">
              <h6 class="jobs-list-item-header">${job.title}</h6>
              <h6 class="jobs-list-item-title">Ilmoitus jätetty ${jobPublished}</h6>
              <p class="jobs-list-item-content">
                ${this._truncateString(job.description)}
                <span>
                  <i class="fa fa-chevron-right"></i>
                </span>
              </p>
            </a>
          </li>
        `;
        $('.jobs-list').append(html);
      });
    },
    
    _truncateString: function (string) {
      const stringLength = 150;
      return `${string.substring(0, stringLength)}...`;
    }
  
  });
  
  $(document).ready(function () {
    $('.kunta-api-job-list').jobs();
  });
  
}).call(this);