const Users = require('../controllers/Controller');
module.exports=(router) =>{
    router.post('/signin',Users.register );
    router.post('/login',Users.loginUser );
    router.use('/user',Users.autentificar);
    router.post('/user/addfriend',Users.addFriend );
    router.get('/user/friendList',Users.friendList );
    router.get('/user/incomingRequests',Users.friendIncomingRequests);
    router.get('/user/outgoingRequests',Users.friendOutgoingRequests);
    router.post('/user/accept',Users.userAccept );
    router.post('/user/dismiss',Users.userDismiss );
    router.post('/game/newGame',Users.newGame );
    router.use('/game',Users.autentificar);
    router.get('/game/history',Users.history);
    router.post('/game/ia',Users.gameIA );
    router.post('/game/friend',Users.gameFriend);
    router.get('/game/incomingRequests',Users.gameIncomingRequests);
    router.get('/game/outgoingRequests',Users.gameOutgoingRequests);
    router.get('/game/inProgress',Users.gameInProgress);
    router.post('/game/accept',Users.gameAccept);
    router.post('/game/dismiss',Users.gameDismiss);
    router.post('/game/random',Users.blindMatch);
}

