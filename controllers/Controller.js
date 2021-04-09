const User = require('../dataAccess/DataAccess');
const mongoose = require('mongoose');
const requestSchema = require('../models/peticiones');
const Request = mongoose.model('Requests',requestSchema);
const jwt=require('jsonwebtoken');
const bcrypt=require('bcryptjs');
const { get } = require('../models/usuario');
const SECRET_KEY='secretkey123456';


exports.autentificar=(req, res, next) => {
    const token = req.body.accessToken;

    if (token) {
        jwt.verify(token, SECRET_KEY, (err, verified) => {     

            if (err || verified.nombreUsuario!=req.body.nombreUsuario) {
                //token inválido
                return res.json({ mensaje: 'Token inválido' });    
            } else {    
                //VERIFICADO
                next();
            } 
        });
    } else {
      return res.send({ 
          mensaje: 'Token no proveído.' 
      });
    }
 };



exports.loginUser= (req, res) => {
    const userData={
        nombreUsuario: req.body.nombreUsuario,
        contrasena: req.body.contrasena
    }
    User.findOne({nombreUsuario: userData.nombreUsuario}, (err,user)=>{
        if(err) return res.status(500).send('Server error!');
        
        if(!user){
            // No existe el email
            return res.status(409).send({message: 'Something is wrong'});
        } else{
            //correcto
            resultPassword =bcrypt.compareSync( userData.contrasena, user.contrasena);
            if(resultPassword){
                //generamos token de acceso
                const expiresIn= 24*60*60;
                const accessToken = jwt.sign(
                {
                    nombreUsuario: user.nombreUsuario,
                    contrasena: user.contrasena
                }, 
                SECRET_KEY,
                {
                    expiresIn: expiresIn
                });
                //Listamos las solicitudes de amistad entrantes y salientes
                Request.find({solicitante: user.nombreUsuario},(err,result)=>{
                    if (err) return res.status(500).send('Server error!');
                    oReq =new Object(result.map(a => a.solicitado));
                Request.find({solicitado: user.nombreUsuario},(err,result)=>{
                    if (err) return res.status(500).send('Server error!');
                    iReq =new Object(result.map(a => a.solicitante));
                //devolvemos los datos del usuario
                const dataUser ={
                    nombreUsuario: user.nombreUsuario,
                    email: user.email,
                    amigos: user.amigos,
                    solicitudesEntrantes: iReq,
                    solicitudesSalientes: oReq,
                    accessToken: accessToken,
                    expiresIn: expiresIn,
                    
                }
                res.send({dataUser});
                });});
            }else{
                // contraseña equivocada
                return res.status(409).send({message: 'Something is wrong'});
            }
        }
 
    })
}



exports.register=(req,res)=>{
    const newUser={
        nombreUsuario: req.body.nombreUsuario,
        email: req.body.email,
        contrasena: bcrypt.hashSync(req.body.contrasena)
    }

    User.create(newUser,(err,user)=>{//añadimos al usuario a la base de datos
        if(err && err.code==11000) return res.status(409).send('Email or user already exist');
        if(err) return res.status(500).send('Server error');
        const expiresIn = 24*60*60;
        //creamos un token de acceso
        const accessToken= jwt.sign(
                {
                nombreUsuario: user.nombreUsuario,contrasena:user.contrasena
                },
                SECRET_KEY,
                {
                    expiresIn:expiresIn
                }
            );
            const dataUser ={
                nombreUsuario: user.nombreUsuario,
                email: user.email,
                accessToken: accessToken,
                expiresIn: expiresIn
            }
        //devolvemos los datos del usuario creado
        return res.send({dataUser});
    });
}




exports.addFriend=(req,res)=>{
    const request= new Request ({
        solicitante: req.body.nombreUsuario,
        solicitado: req.body.nombreAmigo,
    });
    if (request.solicitado==request.solicitante){
        return res.status(500).send('No puedes enviar una solicitud de amistad a ti mismo');
    }
    //Añadimos la petición en la base de datos
    request.save(function (err) {
        if (err) return res.status(500).send('Error en la petición');
        //devolvemos la lista de solicitudes pendientes
        Request.find({solicitante: req.body.nombreUsuario},(err,result)=>{
            if (err) return res.status(500).send('Server error!');
            oReq =new Object(result.map(a => a.solicitado));
            return res.send(oReq);
        });
    });

}




exports.friendList=(req,res)=>{
    //Busca al usuario en la base de datos
    User.findOne({nombreUsuario: req.body.nombreUsuario}, (err,user)=>{
        if(err) return res.status(500).send('Server error!');

        if(!user){
            // usuario no existe
            res.send({message: `usuario ${req.body.nombreUsuario} no encontrado` });
        } else{
            //devuelve la lista de amigos
            return res.send(user.amigos);
        }
    })
}

exports.accept=(req,res)=>{
    const petitionData={
        nombreUsuario: req.body.nombreUsuario,
        nombreAmigo: req.body.nombreAmigo,
    }
    //Eliminamos la peticion de la base de datos
    Request.deleteOne(
    { 
        solicitado: petitionData.nombreUsuario,
        solicitante: petitionData.nombreAmigo,
    },(err,result)=>{
        if(err) return res.status(500).send({message: 'Server error!' });
        if(!result) return res.send({message: 'petición erronea' });
    
    //actualizamos la lista de amigos de ambos usuarios
    User.findOneAndUpdate(
        { 
            nombreUsuario: petitionData.nombreUsuario,
        },
        {$addToSet:{
            amigos: petitionData.nombreAmigo
        }},
        {new: true},
        (err,myuser) =>{
            if(err) return res.status(500).send('Server error!');
            else if(!myuser){
                // usuario no existe 
                return res.status(500).send({message: 'petición erronea' });
            }
            User.findOneAndUpdate(
                { 
                    nombreUsuario: petitionData.nombreAmigo,
                },
                {$addToSet:{
                    amigos: petitionData.nombreUsuario
                }},
                (err,userFriend) =>{
                    if(err) return res.status(500).send('Server error!');
                    else if(!userFriend){
                        // usuario no existe 
                        return res.status(500).send({message: 'petición erronea' });
                    }
                    
                    return res.send(myuser.amigos);
                });
        });
    });
}

exports.dismiss=(req,res)=>{
    const petitionData={
        nombreUsuario: req.body.nombreUsuario,
        nombreAmigo: req.body.nombreAmigo,
    }
    //Eliminamos la peticion de la base de datos
    Request.deleteOne(
        { 
            solicitado: petitionData.nombreUsuario,
            solicitante: petitionData.nombreAmigo,
        },(err,result)=>{
            if(err) return res.status(500).send('Server error!');
            if(!result) return res.status(500).send({message: 'petición erronea' });
            //Devolvemos la nueva lista de peticiones entrantes
            Request.find({solicitado: req.body.nombreUsuario},(err,result)=>{
                if (err) return res.status(500).send('Server error!');
                iReq =new Object(result.map(a => a.solicitante));
                return res.send(iReq);
            });    
        }
    )
}