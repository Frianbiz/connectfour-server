'use strict';

/* Controllers */

myApp.controller("gameCtrl", function($scope, $window, $location, $http) {

    var socket;

    $scope.matrice = [];

    connect();


    function connect()
    {
        socket = io.connect("http://192.168.1.104:8080");
        socket.emit("connectSpectator");

        socket.on("played", function(data)
        {
            console.log(data);
            $scope.$apply(function(){
                $scope.matrice = data.matrice;
                $scope.winner = data.winner;
                $scope.players = data.players;
                $scope.winner_count = data.winner_count;
            })
        });

        socket.on("disconnect", function(){
            socket.disconnect();

            console.log("DISCONNECTED");
            setTimeout(function() {
                connect();
            }, 300);
        });
    }

});