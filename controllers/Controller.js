const User = require('../dataAccess/DataAccess');
const jwt=require('jsonwebtoken');
const bcrypt=require('bcryptjs');
const SECRET_KEY='secretkey123456';

exports.createUser=(req,res,next)=>{
    const newUser={
        nombreUsuario: req.body.nombreUsuario,
        email: req.body.email,
        contrasena: bcrypt.hashSync(req.body.contrasena)
    }

    User.create(newUser,(err,user)=>{
        if(err && err.code==11000) return res.status(409).send('Email already exist');
        if(err) return res.status(500).send('Server error');
        const expiresIn = 24*60*60;
        const accessToken= jwt.sign({id: user.id},
            SECRET_KEY,{
                expiresIn:expiresIn
            });
            const dataUser ={
                nombreUsuario: user.nombreUsuario,
                email: user.email,
                accessToken: accessToken,
                expiresIn: expiresIn
            }
        //Response
        res.send({dataUser});
    });
}

exports.loginUser=(req,res,next)=>{
    const userData={
        email: req.body.email,
        contrasena: req.body.contrasena
    }
    User.findOne({email: userData.email}, (err,user)=>{
        if(err) return res.status(500).send('Server error!');
        
        if(!user){
            // email doesn't exist
            res.status(409).send({message: 'Semething is wrong'});
        } else{
            const resultPassword =bcrypt.compareSync( userData.contrasena, user.contrasena);
            if(resultPassword){
                const expiresIn= 24*60*60;
                const accessToken = jwt.sign({id: user.id}, SECRET_KEY,{expiresIn: expiresIn});
                const dataUser ={
                    nombreUsuario: user.nombreUsuario,
                    email: user.email,
                    accessToken: accessToken,
                    expiresIn: expiresIn
                }
                res.send({dataUser});
            }else{
                // password wrong
                res.status(409).send({message: 'Semething is wrong'});
            }
        }

    })
}