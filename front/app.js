'use strict';


// Declare app level module which depends on views, and components

var myApp = angular.module('vendetta2', [
                                'ngRoute',
                                'ui.bootstrap'
                             ]
).config(function($routeProvider, $compileProvider) {

        $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|tel|mailto|file):/);

        $routeProvider.when('/', {
            templateUrl: 'views/game.html',
            controller: 'gameCtrl'
        })
        .otherwise({redirectTo: '/'});
});