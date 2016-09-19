var  cluster = require('cluster');

var workers = process.env.WORKERS || 1;

if (cluster.isMaster) {

    console.log('start cluster with %s workers', workers);

    for (var i = 0; i < workers; ++i) {
        var worker = cluster.fork().process;
        console.log('worker %s started.', worker.pid);
    }

    cluster.on('exit', function(worker) {
        console.log('worker %s died. restart...', worker.process.pid);
        cluster.fork();
    });

}
else {

    var express = require('express')
        , app = express()
        , server = require('http').createServer(app)
        , io = require('socket.io').listen(server)
        , readline = require('readline')
        , exec = require('child_process').exec
        , fs = require('fs');


    var bodyParser = require('body-parser');
    app.use(bodyParser.json());


    app.use(express.static(__dirname + '/front/'));
    app.use(express.static(__dirname + '/node_modules/'));
    app.use(express.static(__dirname + '/bower_components/'));

    server.listen(8080);



    process.on('uncaughtException', function (err) {
        console.log('Caught exception: ' + err);
        process.exit();
    });


    var winner_count = {};


    var MATRICE = [
        [0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0],
    ];

    var players = {
        R: {
            id : undefined,
            name : undefined,
        },
        J: {
            id : undefined,
            name : undefined,
        },
        SPECTATORS: [],
    };

    var turn_to = "J";

    var winner = false;


    /**
     *
     *  SOCKET IO EVENTS
     *
     **/

    io.sockets.on('connection', function (socket) {


        socket.on("connectPlayer", function (data) {

            if (players.J.id == undefined) {
                //data.name = data.name + " J";

                socket.player = "J";
                socket.player_name = data.name;
                players.J.id = socket.id;
                players.J.name = data.name;
            }
            else if (players.R.id == undefined) {
                //data.name = data.name + " R";

                socket.player = "R";
                socket.player_name = data.name;
                players.R.id = socket.id;
                players.R.name = data.name;

                io.to(players.J.id).emit("your_turn", {matrice: MATRICE, player: "J"});
            } else {
                console.log(players);
            }


            sendGameData();
        });



        socket.on("disconnect", function(){
            if(players[socket.player])
            {
                players[socket.player] = {id : undefined, name : undefined};
            }
        })

        socket.on("connectSpectator", function () {
            socket.player = "spectator";

            players.SPECTATORS.push(socket.id);

            sendGameData();
        });

        socket.on("play", function (data) {


            if(socket.player == "J" || socket.player == "R" ) {
                var col = data.col;
                var i = 6;

                while (i >= 0 && MATRICE[i][col] != 0) {
                    i--
                }
                ;

                if (i >= 0) {
                    MATRICE[i][col] = socket.player;

                    winner = get_winner();


                    if (winner == "J") {
                        io.to(players.J.id).emit("winner");
                        io.to(players.R.id).emit("loser");

                        if (winner_count[players.J.name] == undefined) {
                            winner_count[players.J.name] = 1;
                        }
                        else {
                            winner_count[players.J.name] += 1;
                        }


                        winner = players.J.name;
                        sendDataToSpectators();

                        setTimeout(function () {
                            reset();
                        }, 500);
                    }
                    else if (winner == "R") {
                        io.to(players.R.id).emit("winner");
                        io.to(players.J.id).emit("loser");

                        if (winner_count[players.R.name] == undefined) {
                            winner_count[players.R.name] = 1;
                        }
                        else {
                            winner_count[players.R.name] += 1;
                        }


                        winner = players.R.name;
                        sendDataToSpectators();

                        setTimeout(function () {
                            reset();
                        }, 500);
                    }
                    else if (winner == "MATCH_NUL") {
                        io.to(players.R.id).emit("loser");
                        io.to(players.J.id).emit("loser");

                        sendDataToSpectators();

                        setTimeout(function () {
                            reset();
                        }, 500);
                    }
                    else {
                        turn_to = socket.player == "J" ? "R" : "J";
                        io.to(players[turn_to].id).emit("your_turn", {matrice: MATRICE, player: turn_to});
                        sendGameData();
                    }
                }
                else {
                    socket.emit("your_turn", {matrice: MATRICE, player: socket.player});
                }

            }
        });


        function sendGameData() {
            socket.emit("played", {matrice: MATRICE, player: socket.player});
            sendDataToSpectators();
        }


        function sendDataToSpectators() {
            for (var i in players.SPECTATORS) {
                io.to(players.SPECTATORS[i]).emit("played", {matrice: MATRICE, players: players, winner: winner, winner_count : winner_count});
            }
        }

        function reset() {

            var jId = players.J.id;
            var rId = players.R.id;

            var spectators = players.SPECTATORS;

            MATRICE = [
                [0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 0],
            ];

            turn_to = "J";

            winner = false;

            players = {
                R: {
                    id : undefined,
                    name : undefined,
                },
                J: {
                    id : undefined,
                    name : undefined,
                },
                SPECTATORS: spectators,
            };



            if(io.sockets.connected[jId])
                io.sockets.connected[jId].disconnect();

            if(io.sockets.connected[rId])
                io.sockets.connected[rId].disconnect();
        }



        socket.on("disconnect", function(){
            if(socket.player == "J")
            {
                players.J = {
                    id : undefined,
                    name : undefined,
                };
            }
            else if(socket.player == "R")
            {
                players.R = {
                    id : undefined,
                    name : undefined,
                };
            }
        });

        function get_winner() {
            var x = 6;
            var y = 6;


            while (x >= 0) {
                while (y >= 0) {
                    var pion = MATRICE[x][y];


                    if (pion !== 0) {

                        //CHECK VERTICAL HAUT
                        if (x > 2) {
                            var pion2 = MATRICE[x - 1][y];
                            var pion3 = MATRICE[x - 2][y];
                            var pion4 = MATRICE[x - 3][y];

                            if (pion == pion2 && pion2 == pion3 && pion3 == pion4) {
                                return pion;
                            }
                        }

                        //CHECK VERTICAL HAUT
                        if (y > 2) {
                            var pion2 = MATRICE[x][y - 1];
                            var pion3 = MATRICE[x][y - 2];
                            var pion4 = MATRICE[x][y - 3];

                            if (pion == pion2 && pion2 == pion3 && pion3 == pion4) {
                                return pion;
                            }
                        }


                        //CHECK DIAGO HAUT DROITE
                        if (x > 2 && y < 4) {
                            var pion2 = MATRICE[x - 1][y + 1];
                            var pion3 = MATRICE[x - 2][y + 2];
                            var pion4 = MATRICE[x - 3][y + 3];

                            if (pion == pion2 && pion2 == pion3 && pion3 == pion4) {
                                return pion;
                            }
                        }

                        //CHECK DIAGO HAUT GAUCHE
                        if (x > 2 && y > 2) {
                            var pion2 = MATRICE[x - 1][y - 1];
                            var pion3 = MATRICE[x - 2][y - 2];
                            var pion4 = MATRICE[x - 3][y - 3];

                            if (pion == pion2 && pion2 == pion3 && pion3 == pion4) {
                                return pion;
                            }
                        }


                    }

                    y--;
                }

                x--;
                y = 6;
            }


            x = 6;

            var found_zero = 0;
            while (x >= 0) {

                if(MATRICE[x].indexOf(0) >= 0)
                {
                    found_zero++;
                }

                x--;
            }


            if(found_zero == 0)
            {
                return "MATCH_NUL";
            }

            return false;
        }
    });


}