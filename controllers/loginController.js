const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const SECRET_KEY= 'asdf';

exports.createUser = (req, res, next) => {
    const newUser = {
        name: req.body.name,
        mail: req.body.mail,
        passwd: req.body.passwd,
        rep_passwd: req.body.rep_passwd,
    }

    newUser.create(newUser, (err, user) => {
        if (err) return res.status(500).send('Error en el servidor');
        const 
    })
}