const User = require('../dataAccess/DataAccess');
const mongoose = require('mongoose');

const requestSchema = require('../models/peticiones');
const Request = mongoose.model('Requests',requestSchema);

const partidaSchema = require('../models/partidas');
const Partida = mongoose.model('Partidas',partidaSchema);

const jwt=require('jsonwebtoken');
const bcrypt=require('bcryptjs');
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
}

exports.loginUser= (req, res) => {
    const userData={
        nombreUsuario: req.body.nombreUsuario,
        contrasena: req.body.contrasena
    }
    User.findOne({nombreUsuario: userData.nombreUsuario}, (err,user)=>{
        if(err) return res.status(500).send({ mensaje:'no existe el usuario'});
        
        if(!user){
            // No existe el email
            return res.status(409).send({mensaje: 'Something is wrong'});
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

                //Obtener el historial del usuario
                Partida.find(
                    {$and:[
                        {estado:"finalizada"},
                        {$or:[
                            {participante1: user.nombreUsuario},
                            {participante2: user.nombreUsuario}
                        ]}
                    ]},
                    null,
                    { sort: { 'date': 'desc' }, limit: 10 },
                    (err,result)=>{
                    if (err) return res.status(500).send({ mensaje:'Server error!'});
                    historial = result.map(function(item){
                        if(user.nombreUsuario==item.ganador )
                        {
                            resultado="victoria";
                        }else{
                            resultado="derrota";
                        }
                        if(user.nombreUsuario==item.participante1){
                            contrincante=item.participante2;
                        }else{
                            contrincante=item.participante1;
                        }

                        return {
                            contrincante: contrincante,
                            resultado: resultado,
                            id: item._id
                        };
                    });
                    
                //devolvemos los datos del usuario
                const dataUser ={
                    nombreUsuario: user.nombreUsuario,
                    email: user.email,
                    amigos: user.amigos,
                    solicitudesEntrantes: iReq,
                    solicitudesSalientes: oReq,
                    accessToken: accessToken,
                    puntos:user.puntos,
                    partidasGanadas:user.partidasGanadas,
                    partidasPerdidas:user.partidasPerdidas,
                    torneosGanados:user.torneosGanados,
                    historial:historial
                }
                res.send(dataUser);
                });});});
            }else{
                // contraseña equivocada
                return res.status(409).send({mensaje: 'Something is wrong'});
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
    if(newUser.nombreUsuario=="I.A") return res.status(409).send({ mensaje:'Nombre reservado'});
    User.create(newUser,(err,user)=>{//añadimos al usuario a la base de datos
        if(err && err.code==11000) return res.status(409).send({ mensaje:'Email or user already exist'});
        if(err) return res.status(500).send({ mensaje:'Server error'});
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
        return res.send(dataUser);
    });
}

exports.addFriend=(req,res)=>{
    const request= new Request ({
        solicitante: req.body.nombreUsuario,
        solicitado: req.body.nombreAmigo,
    });
    if (request.solicitado==request.solicitante){
        return res.status(500).send({ mensaje:'No puedes enviar una solicitud de amistad a ti mismo'});
    }
    //Añadimos la petición en la base de datos
    request.save(function (err) {
        if (err) return res.status(500).send({ mensaje:'Error en la petición'});
        //devolvemos la lista de solicitudes pendientes
        Request.find({solicitante: req.body.nombreUsuario},(err,result)=>{
            if (err) return res.status(500).send({ mensaje:'Server error!'});
            oReq =new Object(result.map(a => a.solicitado));
            return res.send(oReq);
        });
    });

}

exports.friendList=(req,res)=>{
    //Busca al usuario en la base de datos
    User.findOne({nombreUsuario: req.body.nombreUsuario}, (err,user)=>{
        if(err) return res.status(500).send({ mensaje:'Server error!'});

        if(!user){
            // usuario no existe
            res.send({mensake: `usuario ${req.body.nombreUsuario} no encontrado` });
        } else{
            //devuelve la lista de amigos
            return res.send(user.amigos);
        }
    })
}

exports.friendIncomingRequests=(req,res)=>{
    Request.find({solicitado: req.body.nombreUsuario},(err,result)=>{
        if (err) return res.status(500).send({ mensaje:'Server error!'});
        iReq =new Object(result.map(a => a.solicitante));
        return res.send(iReq);
    });

}

exports.friendOutgoingRequests=(req,res)=>{
    Request.find({solicitante: req.body.nombreUsuario},(err,result)=>{
        if (err) return res.status(500).send({ mensaje:'Server error!'});
        oReq =new Object(result.map(a => a.solicitado));
        return res.send(oReq);
    });
}

exports.userAccept=(req,res)=>{
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
        if(err) return res.status(500).send({mensaje: 'Server error!' });
        if(!result) return res.send({mensaje: 'petición erronea' });
    
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
                return res.status(500).send({mensaje: 'petición erronea' });
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
                        return res.status(500).send({mensaje: 'petición erronea' });
                    }
                    
                    return res.send(myuser.amigos);
                });
        });
    });
}

exports.userDismiss=(req,res)=>{
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
            if(!result) return res.status(500).send({mensaje: 'petición erronea' });
            //Devolvemos la nueva lista de peticiones entrantes
            Request.find({solicitado: req.body.nombreUsuario},(err,result)=>{
                if (err) return res.status(500).send('Server error!');
                iReq =new Object(result.map(a => a.solicitante));
                return res.send(iReq);
            });    
        }
    )
}

exports.newGame=(req,res)=>{
    //comprobamos que el usuario a retar está en tu lista de amigos
    User.find(
    {
        nombreUsuario:req.body.nombreUsuario,
        amigos:req.body.nombreAmigo
    },
    (err,result)=>{
    if (err) return res.status(500).send('Server Error');
    if(!result){
        return res.status(500).send(
        `El usuario ${req.body.nombreAmigo} no está en tu lista de amigos`)
    }
    const partida= new Partida ({
        participante1: req.body.nombreUsuario,
        participante2: req.body.nombreAmigo,
        ganador: undefined,
        estado: "enCurso",
        tipo: "amistoso"
    });
    //Añadimos la partida a la base de datos
    partida.save(function (err) {
        if (err) return res.status(500).send('Error al crear la partida');
        //devolvemos la lista de solicitudes pendientes
        return res.send(partida);
    });});
}

exports.gameIA=(req,res)=>{
    const partida= new Partida ({
        participante1: req.body.nombreUsuario,
        participante2: "I.A",
        ganador: undefined,
        estado: "enCurso",
        tipo: "ia"
    });
    //Añadimos la partida a la base de datos
    partida.save(function (err) {
        if (err) return res.status(500).send('Error en la petición');
        //devolvemos la lista de solicitudes pendientes
        return res.send(partida);
    });
}

exports.gameFriend=(req,res)=>{
    //comprobamos que el usuario a retar está en tu lista de amigos
    User.find(
    {
        nombreUsuario:req.body.nombreUsuario,
        amigos:req.body.nombreAmigo
    },
    (err,result)=>{
    if (err) return res.status(500).send('Server Error');
    if(!result){
        return res.status(500).send(
        `El usuario ${req.body.nombreAmigo} no está en tu lista de amigos`)
    }
    const partida= new Partida ({
        participante1: req.body.nombreUsuario,
        participante2: req.body.nombreAmigo,
        ganador: undefined,
        estado: "pendiente",
        tipo: "amistoso"
    });
    //Añadimos la partida a la base de datos
    partida.save(function (err) {
        if (err) return res.status(500).send('Error en la petición');
        //devolvemos la lista de solicitudes pendientes
        return res.send(partida);
    });});
}

exports.gameIncomingRequests=(req,res)=>{
    //Partidas pendientes de aceptar
    Partida.find(
        {estado:"pendiente",
        participante2: req.body.nombreUsuario},
        (err,result)=>{
        if (err) return res.status(500).send('Server error!');
        peticiones = result.map(function(item){
            return {
                contrincante: item.participante1,
                id: item._id
            };
        });
        return res.send(peticiones);
        });
}

exports.gameOutgoingRequests=(req,res)=>{
    //Partidas pendientes de aceptar
    Partida.find(
        {estado:"pendiente",
        participante1: req.body.nombreUsuario},
        (err,result)=>{
        if (err) return res.status(500).send('Server error!');
        peticiones = result.map(function(item){
            return {
                contrincante: item.participante2,
                id: item._id
            };
        });
        return res.send(peticiones);
        });
}

exports.gameInProgress=(req,res)=>{
    //Partidas pendientes de aceptar
    Partida.find(
        {$and:[
            {estado:"enCurso"},
            {$or:[
                {participante1: req.body.nombreUsuario},
                {participante2: req.body.nombreUsuario}
            ]}
        ]},
        (err,result)=>{
        if (err) return res.status(500).send('Server error!');
        peticiones = result.map(function(item){
            if(req.body.nombreUsuario==item.participante1){
                contrincante=item.participante2;
            }else{
                contrincante=item.participante1;
            }
            return {
                contrincante: contrincante,
                tipo:item.tipo,
                id: item._id
            };
        });
        return res.send(peticiones);
        });
}

exports.history=(req,res)=>{
    Partida.find(
        {$and:[
            {estado:"finalizada"},
            {$or:[
                {participante1: req.body.nombreUsuario},
                {participante2: req.body.nombreUsuario}
            ]}
        ]},
        null,
        { sort: { 'date': 'desc' }/*, limit: 10*/ },
        (err,result)=>{
        if (err) return res.status(500).send('Server error!');
        historial = result.map(function(item){
            if(req.body.nombreUsuario==item.ganador ){
                resultado="victoria";
            }else{
                resultado="derrota";
            }
            if(req.body.nombreUsuario==item.participante1){
                contrincante=item.participante2;
            }else{
                contrincante=item.participante1;
            }
            return {
                contrincante: contrincante,
                resultado: resultado,
                id: item._id
            };
        });
        return res.send(historial);
        });
}

exports.gameAccept=(req,res)=>{
    Partida.findByIdAndUpdate(
    { 
        _id: req.body.gameid,
        participante2: req.body.nombreUsuario
    },
    {
        estado:"enCurso"
    },
    {new: true},
    (err,partida) =>{
        if (err) return res.status(500).send('Server error!');
        if(!partida) return res.status(500).send('Error en la petición');
        return res.send(partida);
    }
    )
}
exports.gameDismiss=(req,res)=>{
    Partida.findByIdAndDelete(
    { 
        _id: req.body.gameid,
        participante2: req.body.nombreUsuario
    },
    (err,partida) =>{
        if (err) return res.status(500).send('Server error!');
        if(!partida) return res.status(500).send('Error en la petición');
        return res.send("Petición rechazada correctamente");
    });
}

exports.blindMatch=(req,res)=>{
    Partida.find(
        {
            estado: "pendiente",
            tipo: "ciegas"
        },
        {
            participante2: req.body.nombreUsuario,
            estado: "enCurso"
        },
        null,
        (err,partida)=>{
        if (err) return res.status(500).send('Server error!');
        if (!partida) {
            const nuevaPartida= new Partida ({
                participante1: req.body.participante1,                    
                estado: "pendiente",
                tipo: "ciegas"
            });
            //Añadimos la partida a la base de datos
            nuevaPartida.save(function (err) {
                if (err) return res.status(500).send('Error en la petición');
                return res.send({ mensaje: 'No hay nadie esperando partida, cuando aparezca un contrincante se añadira la partida a tu lista de partidas' });
            });
        } else {
            return res.send(partida);
        }            
        }
    );    
}
