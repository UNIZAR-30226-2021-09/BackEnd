const Users = require('../controllers/Controller');
module.exports=(router) =>{
    router.post('/signin',Users.register );
    router.get('/login',Users.loginUser );
    router.use('/user',Users.autentificar);
    router.post('/user/addfriend',Users.addFriend );
    router.get('/user/friendList',Users.friendList );
    router.post('/user/accept',Users.accept );
    router.post('/user/dismiss',Users.dismiss );
    
}

