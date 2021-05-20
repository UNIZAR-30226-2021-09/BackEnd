const Users = require('../controllers/Controller');
module.exports=(router) =>{
    router.post('/signin',Users.register );
    router.post('/login',Users.loginUser );
    router.post('/profile',Users.profile );
    router.use('/user',Users.autentificar);
    router.post('/user/addfriend',Users.addFriend );
    router.post('/user/friendList',Users.friendList );
    router.post('/user/incomingRequests',Users.friendIncomingRequests);
    router.post('/user/outgoingRequests',Users.friendOutgoingRequests);
    router.post('/user/accept',Users.userAccept );
    router.post('/user/dismiss',Users.userDismiss );
    router.post('/user/ranking',Users.ranking);
    router.post('/user/me',Users.me);
    router.use('/game',Users.autentificar);
    router.post('/game/newGame',Users.newGame );
    router.post('/game/history',Users.history);
    router.post('/game/ia',Users.gameIA );
    router.post('/game/friend',Users.gameFriend);
    router.post('/game/incomingRequests',Users.gameIncomingRequests);
    router.post('/game/outgoingRequests',Users.gameOutgoingRequests);
    router.post('/game/inProgress',Users.gameInProgress);
    router.post('/game/accept',Users.gameAccept);
    router.post('/game/dismiss',Users.gameDismiss);
    router.post('/game/random',Users.blindMatch);
    //router.post('/game/torneo',Users.crearTorneo);
    router.post('/match/colocarBarcos',Users.colocarBarcos);
    router.post('/match/movimiento',Users.disparo);
    router.post('/match/infoPartida',Users.infoPartida);
    router.post('/match/cogerTablero',Users.cogerTablero);
    router.use('/match',Users.autentificar);
}

