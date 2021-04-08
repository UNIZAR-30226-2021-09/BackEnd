const Users = require('../controllers/Controller');
module.exports=(router) =>{
    router.use('/user',Users.autentificar);
    router.post('/user/addfriend',Users.addFriend );
    router.post('/signin',Users.createUser );
    router.get('/login',Users.loginUser );
}

