'use strict';

/* Filters */
myApp.filter('unsafe', function($sce) { return $sce.trustAsHtml; });