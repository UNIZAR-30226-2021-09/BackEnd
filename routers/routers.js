const Users = require('../controllers/Controller');
module.exports=(router) =>{
    router.post('/user/signin',Users.createUser );
    router.get('/user/login',Users.loginUser );
    router.get('/user/addfriend',Users.loginUser );
}