const Users = require('../controllers/Controller');
module.exports=(router) =>{
    router.post('/register',Users.createUser );
    router.post('/login',Users.loginUser );
}