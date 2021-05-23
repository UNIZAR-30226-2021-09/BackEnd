const User = require('../dataAccess/DataAccess');
const mongoose = require('mongoose');

const requestSchema = require('../models/peticiones');
const Request = mongoose.model('Requests',requestSchema);

const partidaSchema = require('../models/partidas');
const Partida = mongoose.model('Partidas',partidaSchema);

const torneoSchema = require('../models/torneo');
const Torneo = mongoose.model('Torneo',torneoSchema);

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
        if(err) return res.status(500).send({ mensaje:'Server error!'});
        
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
                    puntos:user.puntos,
                    historial:historial
                }
                return res.send(dataUser);
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
        contrasena: bcrypt.hashSync(req.body.contrasena),
        puntos:0,
        partidasGanadas:0,
        partidasPerdidas:0,
        torneosGanados:0
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
                expiresIn: expiresIn,
                puntos:0,
                partidasGanadas:0,
                partidasPerdidas:0,
                torneosGanados:0
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
            return res.send({mensake: `usuario ${req.body.nombreUsuario} no encontrado` });
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
        subestado: "colocandoBarcos",
        tipo: "amistoso",
        barcos1:
        {
            colocados: false,
            barcos:[]
        },
        barcos2:
        {
            colocados: false,
            barcos:[]
        }
    });
    //Añadimos la partida a la base de datos
    partida.save(function (err) {
        if (err) return res.status(500).send('Error al crear la partida');
        //devolvemos la lista de solicitudes pendientes
        return res.send(partida);
    });});
}

exports.gameIA=(req,res)=>{
    partida= new Partida ({
        participante1: req.body.nombreUsuario,
        participante2: "I.A",
        ganador: undefined,
        estado: "enCurso",
        subestado: "colocandoBarcos",
        tipo: "ia",
        barcos1:
        {
            colocados: false,
            barcos:[]
        },
        barcos2:
        {
            colocados: true,
            barcos:[]
        },
    });
    partida=colocarBarcosIA(partida);
    //Añadimos la partida a la base de datos
    partida.save(function (err) {
        if (err) return res.status(500).send('Error en la petición');
        partida.barcos2.barcos=[];
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
        tipo: "amistoso",
        barcos1:
        {
            colocados: false,
            barcos:[]
        },
        barcos2:
        {
            colocados: false,
            barcos:[]
        }
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
                if(item.subestado=="turnoJ1"){
                    turno= "TuTurno";
                }else{
                    turno= "TurnoRival";
                }
            }else{
                contrincante=item.participante1;
                if(item.subestado=="turnoJ2"){
                    turno= "TuTurno";
                }else{
                    turno= "TurnoRival";
                }
            }
            if(item.subestado=="colocandoBarcos"){
                if (req.body.nombreUsuario==item.participante1&&item.barcos1.colocados){
                    turno= "ColocandoBarcosRival";
                }else if(req.body.nombreUsuario==item.participante2&&item.barcos2.colocados){
                    turno= "ColocandoBarcosRival";
                }else{
                    turno= "ColocandoBarcos";
                }
            }
            return {
                contrincante: contrincante,
                tipo:item.tipo,
                id: item._id,
                tuTurno: turno
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
        estado:"enCurso",
        subestado: "colocandoBarcos",
        barcos1:
        {
            colocados: false,
            barcos:[]
        },
        barcos2:
        {
            colocados: false,
            barcos:[]
        }
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
    Partida.findOneAndUpdate(
        {$and:[
            {
                estado:"pendiente"
            },{
                tipo:"ciegas"
            },
            {participante1:{$ne: req.body.nombreUsuario},
            }
        ]}
        ,
        {
            participante2: req.body.nombreUsuario,
            estado: "enCurso",
            subestado: "colocandoBarcos",
            barcos1:
            {
                colocados: false,
                barcos:[]
            },
            barcos2:
            {
                colocados: false,
                barcos:[]
            }
        },
        {new: true},
        (err,partida)=>{
        if (err) return res.status(500).send('Server error!');
        if (!partida) {
            const nuevaPartida= new Partida ({
                participante1: req.body.nombreUsuario,                    
                estado: "pendiente",
                tipo: "ciegas",
                ganador:undefined,
                barcos1:
                {
                    colocados: false,
                    barcos:[]
                },
                barcos2:
                {
                    colocados: false,
                    barcos:[]
                }
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

exports.ranking=(req,res)=>{
    //Lista de jugadores ordenada por puntos
    User.find(
        null
        ,
        null,
        { sort: { 'puntos': 'desc' }, limit: 10 },
        (err,result)=>{
        if (err) return res.status(500).send('Error al buscar el listado de usuarios');
        ranking = result.map(function(item){
            return {
                nombreUsuario: item.nombreUsuario,
                puntos: item.puntos,
                partidasGanadas: item.partidasGanadas,
                partidasPerdidas: item.partidasPerdidas
            };
        });
        //buscar los puntos que tiene mi usuario
        User.findOne(
            {
                nombreUsuario:req.body.nombreUsuario,
            },
            (err,user)=>{
            if (err) return res.status(500).send(`Error al encontrar el usuario ${req.body.nombreUsuario}`);
            mypoints= user.puntos;
            //Contar el numero de usuarios con más puntos que yo
            User.count(
                {
                    puntos:{$gt:mypoints}
                },(err,result) =>{
                    if (err) return res.status(500).send(`Error al calcular tu posicion en el ranking`);
                    posicion=result+1;
                    respuesta= {
                        ranking: ranking,
                        me:{
                            nombreUsuario: user.nombreUsuario,
                            posicion: posicion,
                            puntos: user.puntos,
                            partidasGanadas: user.partidasGanadas,
                            partidasPerdidas: user.partidasPerdidas
                        }
                        
                    }

                    return res.send(respuesta);
            });});});  
}

exports.me=(req,res)=>{
    User.findOne({nombreUsuario: req.body.nombreUsuario}, (err,user)=>{
        if(err) return res.status(500).send({ mensaje:`No se ha encontrado el usuario ${req.body.nombreUsuario}`});
        const dataUser ={
            nombreUsuario: user.nombreUsuario,
            amigos: user.amigos,
            puntos: user.puntos,
            partidasGanadas:user.partidasGanadas,
            partidasPerdidas:user.partidasPerdidas,
            torneosGanados:user.torneosGanados
        }
        return res.send(dataUser);
    });
}

exports.profile=(req,res)=>{
    User.findOne({nombreUsuario: req.body.nombreUsuario}, (err,user)=>{
        if(err) return res.status(500).send({ mensaje:`No se ha encontrado el usuario ${req.body.nombreUsuario}`});
        User.count(
            {
                puntos:{$gt:user.puntos}
            },(err,result) =>{
            if (err) return res.status(500).send(`Error al calcular tu posicion en el ranking`);
            posicion=result+1;
            const dataUser ={
                nombreUsuario: user.nombreUsuario,
                puntos: user.puntos,
                partidasGanadas:user.partidasGanadas,
                partidasPerdidas:user.partidasPerdidas,
                torneosGanados:user.torneosGanados,
                email:user.email,
                posicion: posicion
            }
            return res.send(dataUser);
            });
    });
}


function comprobarCoordenada(fila,columna,map){
    //comprueba si las coordenadas estan dentro de los limites del tablero
    if(fila>=10 || fila<0 || columna>=10 || columna<0){
        return false;
    }
    Xs=[0,1,-1,0,0,-1,-1,1,1];
    Ys=[0,0,0,1,-1,-1,1,1,-1];
    //mira si hay barcos en los alrededores 
    for(j=0;j<9;j++){
        col=columna+Xs[j];
        fil=fila+Ys[j];
        if(fil<10 && fil>=0 && col<10 & col>=0){
            key=fil*10+col;
            if(map.get(key)==true){
                return false;
            }
        }
    }
    return true;
}

function colocarBarco(barco,longitud,mapa,barcos,tipobarco){
    nuevobarco={  
        tipo: tipobarco,
        estado:"sano",
        restantes: longitud,
        coordenadas: []
    }
    fila=barco.posicion.fila;
    columna=barco.posicion.columna;
    if(barco.direccion=="horizontal"){ 
        for(i=0;i<longitud;i++){
            if(!comprobarCoordenada(fila,columna,mapa)){
                return false;
            }else{
                nuevobarco.coordenadas.push(
                    {
                        fila:fila,
                        columna:columna
                    }
                )
            }
            columna++;
        }
    }else{
        for(i=0;i<longitud;i++){
            if(!comprobarCoordenada(fila,columna,mapa)){
                return false;
            }else{
                nuevobarco.coordenadas.push(
                    {
                        fila:fila,
                        columna:columna
                    }
                )
            }
            fila++;
        }
        
    }
    nuevobarco.coordenadas.forEach(element =>
        mapa.set(element.fila*10+element.columna,true)
    );
    barcos.push(nuevobarco);
    return true;
}

function barcoRandomIA(){
    randomfil=Math.floor((Math.random() * 10));
    randomdcol=Math.floor((Math.random() * 10));
    randomdir=Math.floor((Math.random() * 2));
    if(randomdir==0){
        direccion="horizontal";
    }else{
        direccion="vertical";
    }
    return({
        posicion:{
            fila:randomfil,
            columna:randomdcol
        },
        direccion: direccion
    })
}

function colocarBarcosIA(partida){
    
    
    colocados= new Map();
    barcos=[];
    
    correcto=false;
    while(!correcto){
        barco=barcoRandomIA();
        correcto=colocarBarco(barco,5,colocados,barcos,"portaaviones");
    }
    correcto=false;
    while(!correcto){
        barco=barcoRandomIA();
        correcto=colocarBarco(barco,4,colocados,barcos,"buque");
    }

    correcto=false;
    while(!correcto){
        barco=barcoRandomIA();
        correcto=colocarBarco(barco,3,colocados,barcos,"submarino1");
    }
    correcto=false;
    while(!correcto){
        barco=barcoRandomIA();
        correcto=colocarBarco(barco,3,colocados,barcos,"submarino2");
    }
    correcto=false;
    while(!correcto){
        barco=barcoRandomIA();
        correcto=colocarBarco(barco,2,colocados,barcos,"crucero");
    }

    barcosinsert={
        colocados:true,
        barcos:barcos
    }
    partida.barcos2=barcosinsert;
    

    return partida;
}

exports.colocarBarcos=(req,res)=>{
    Partida.findById(
    { 
        _id: req.body.gameid
    },
    (err,partida) =>{
    if (err) return res.status(500).send('Server error!');
    if(!partida) return res.status(500).send('No existe una partida con esa id');
    if(partida.participante1!=req.body.nombreUsuario && partida.participante2!=req.body.nombreUsuario) return res.status(500).send('No perteneces a esta partida');
    if(partida.estado!="enCurso"||partida.subestado!="colocandoBarcos") return res.status(500).send('No se pueden colocar los barcos ahora');
    if(partida.participante1==req.body.nombreUsuario&&partida.barcos1.colocados==true) return res.status(500).send('Ya habías colocado tus barcos');
    if(partida.participante2==req.body.nombreUsuario&&partida.barcos2.colocados==true) return res.status(500).send('Ya habías colocado tus barcos');
    
    const barcosReq={
        portaaviones:req.body.portaaviones,
        buque:req.body.buque,
        submarino1:req.body.submarino1,
        submarino2:req.body.submarino2,
        crucero:req.body.crucero
    }
    correcto=true;
    colocados= new Map();
    barcos=[];
    
    correcto=correcto&&colocarBarco(barcosReq.portaaviones,5,colocados,barcos,"portaaviones");
    correcto=correcto&&colocarBarco(barcosReq.buque,4,colocados,barcos,"buque");
    correcto=correcto&&colocarBarco(barcosReq.submarino1,3,colocados,barcos,"submarino1");
    correcto=correcto&&colocarBarco(barcosReq.submarino2,3,colocados,barcos,"submarino2");
    correcto=correcto&&colocarBarco(barcosReq.crucero,2,colocados,barcos,"crucero");

    if(!correcto){
        return res.status(500).send('Barcos mal colocados, no cumlen alguna restricción');
    }
    barcosinsert={
        colocados:true,
        barcos:barcos
    }
    if(partida.participante1==req.body.nombreUsuario){
        partida.barcos1=barcosinsert;
    }else{
        partida.barcos2=barcosinsert;
    }

    //
    if(partida.barcos1.colocados==true&&partida.barcos2.colocados==true){
        partida.subestado="turnoJ1"
        if(req.body.nombreUsuario==partida.participante1){
            turno="TuTurno";
        }else{
            turno="TurnoRival";
        }
        
    }else{
        turno="ColocarBarcosRival";
    }


    Partida.findByIdAndUpdate( 
    { 
        _id: req.body.gameid
    },
    partida
    ,
    (err,partida2) =>{
    if (err) return res.status(500).send('Server error!');  
        return res.send({barcos:barcos,turno:turno});
    })});
}

function disparovalido(tablero,fila,columna){
    if(fila>=10 || fila<0 || columna>=10 || columna<0){
        return false;
    }
    if(tablero.find(c=> c.casilla.fila==fila&&c.casilla.columna==columna)) return false;
    else return true;
}

function movimientoIA(partida){
    tocado=true;
    finIA=false;
    disparosIA=[];
    while(tocado&&!finIA){
        objetivo  = partida.barcos1.barcos.find(barco=> barco.estado=="tocado");
        if(objetivo){
            continuar=false;
            tocados=[];
            for(var k = 0; k < objetivo.coordenadas.length; ++k){
                coordenadas={
                    fila:   objetivo.coordenadas[k].fila,
                    columna:objetivo.coordenadas[k].columna
                }
                tocado = partida.tablero1.find(c=> c.casilla.fila==coordenadas.fila
                    &&c.casilla.columna==coordenadas.columna);
                if(tocado) tocados.push(coordenadas);
            }

            if(tocados.length==1){//sabemos unicamente un casilla tocada
                valido=false;
                while(!valido){
                    random=Math.floor((Math.random() * 4));
                    if(random==0){
                        randomup=0;randomright=1;
                    }else if(random==1){
                        randomup=0;randomright=-1;
                    }else if(random==2){
                        randomup=1;randomright=0;
                    }else{
                        randomup=-1;randomright=0;
                    }
                    disparo={
                        fila:tocados[0].fila+randomup,
                        columna:tocados[0].columna+randomright
                    };
                    valido= disparovalido(partida.tablero1,disparo.fila,disparo.columna);
                }
            }else{//sabemos al menos 2 coordenadas de un barco tocado
                if(tocados[0].fila==tocados[1].fila){
                    //el barco esta en posición horizontal, disparamos en la misma fila
                    disparo={
                        fila:tocados[0].fila,
                        columna:tocados[0].columna-1
                    }
                    if(!disparovalido(partida.tablero1,disparo.fila,disparo.columna)){
                        disparo={
                            fila:tocados[tocados.length-1].fila,
                            columna:tocados[tocados.length-1].columna+1
                        }
                    }
                }else{
                    //el barco esta en posición vertical, disparamos en la misma columna
                    disparo={
                        fila:tocados[0].fila-1,
                        columna:tocados[0].columna
                    }
                    if(!disparovalido(partida.tablero1,disparo.fila,disparo.columna)){
                        disparo={
                            fila:tocados[tocados.length-1].fila+1,
                            columna:tocados[tocados.length-1].columna
                        }
                    }
                    
                }            
            }
            
        }else{
            //No hay pistas sobre donde hay barcos
            valido=false;
            while(!valido){
                randomfil=Math.floor((Math.random() * 11));
                randomdcol=Math.floor((Math.random() * 11));
                disparo={
                    fila:randomfil,
                    columna:randomdcol
                };
                valido= disparovalido(partida.tablero1,disparo.fila,disparo.columna);
            }
        }
        //Ya se ha decidido el disparo a realizar

        partida.subestado="turnoJ1";
        //busca un barco del J1 que tenga un barco que tenga una coordenada que coincida con el disparo
        tocado=false;
        for (var i in partida.barcos1.barcos) {
            if (partida.barcos1.barcos[i].coordenadas.find(coordenada=>(coordenada.fila==disparo.fila)
                &&(coordenada.columna==disparo.columna))){
                //Ha tocado a un barco
                tocado=true;
                partida.subestado="turnoJ2"
                partida.barcos1.barcos[i].restantes=partida.barcos1.barcos[i].restantes-1;
                hundido=false;
                if(partida.barcos1.barcos[i].restantes>0){
                    partida.barcos1.barcos[i].estado="tocado";
                }else{
                    partida.barcos1.barcos[i].estado="hundido";
                    hundido=true;
                }
                partida.tablero1.push({
                    casilla: {
                        fila: disparo.fila,
                        columna: disparo.columna,
                        estado: "acierto"
                    }}
                );
                if(hundido){
                    //has hundido un barco
                    barco  = partida.barcos1.barcos.find(barco=> barco.estado!="hundido");
                    if(!barco){
                        //no quedan barcos en pie "HA GANADO LA I.A"
                        finIA=true;
                        partida.ganador=partida.participante2;
                        partida.estado="finalizada";
                        //Estadisticas de partida
                        ganador=(partida.ganador==partida.participante2);
                        puntos=20;
                        if(partida.tipo!="ciegas") puntos=0;
                        disparosRealizados=partida.tablero2.length;
                        //El número de barcos destruidos
                        barcosDestruidos = 0;
                        for(var j = 0; j < partida.barcos2.barcos.length; ++j){
                            if(partida.barcos2.barcos[j].estado =="hundido" ) barcosDestruidos++;
                        }
                        //El número de disparos acertados
                        disparosAcertados=0;
                        for(var k = 0; k < partida.tablero2.length; ++k){
                            if(partida.tablero2[k].casilla.estado =="acierto" ) disparosAcertados++;
                        }
                        respuesta={
                            disparo:"fallo",
                            fin:true,  
                            infoPartida:{
                                ganador:false,
                                puntos:0,
                                disparosRealizados:disparosRealizados,
                                barcosDestruidos:barcosDestruidos,
                                disparosAcertados:disparosAcertados
                            }                      
                        }
                        respuestaIA={
                            disparo:"hundido",
                            fin:true                               
                        }        
                    }else{
                        //has hundido un barco, pero siguen barcos en pie
                        respuestaIA={
                            disparo:"hundido",
                            barco:partida.barcos1.barcos[i],
                            fin:false                               
                        }
                    }
                }else{
                    //has tocado un barco, pero no lo has hundido
                    respuestaIA={
                        disparo:"tocado",
                        fin:false                               
                    }
                }
            }
        }
        //no ha tocado un barco
        if(!tocado){
            partida.tablero1.push({
                casilla: {
                    fila: disparo.fila,
                    columna: disparo.columna,
                    estado: "fallo"
                }
            });
            respuestaIA={disparo:"fallo",fin:false};
        }
        insert={
            fila:disparo.fila,
            columna:disparo.columna,
            estado:respuestaIA.disparo,
            fin:respuestaIA.fin

        }
        disparosIA.push(insert);
        console.log(insert);

    }
    partida.subestado="turnoJ1";
    return {
        partida:partida,
        disparosIA:disparosIA
    };
}

exports.disparo=(req,res)=>{
    Partida.findById(
    {
        _id: req.body.gameid
    },(err,partida) =>{
        if (err) return res.status(500).send('Server error!');
        if(!partida) return res.status(500).send('No existe una partida con esa id');
        if(partida.participante1!=req.body.nombreUsuario && partida.participante2!=req.body.nombreUsuario) return res.status(500).send('No perteneces a esta partida');
        if(partida.estado!="enCurso") return res.status(500).send('No puedes realizar disparos ahora mismo');
        if(partida.subestado=="colocandoBarcos") return res.status(500).send('Aún falta que algún jugador coloque sus barcos');
        if(partida.participante1==req.body.nombreUsuario) {
            if(partida.subestado!="turnoJ1") return res.status(500).send('No es tu turno');
            disparo={
                fila: req.body.fila,
                columna:req.body.columna
            }
            if(disparo.fila>=10 || disparo.fila<0 || disparo.columna>=10 || disparo.columna<0) return res.status(500).send('Disparo fuera de los límites');
            if(partida.tablero2.find(coordenada=>(coordenada.casilla.fila==disparo.fila)
            &&(coordenada.casilla.columna==disparo.columna))) return res.status(500).send('Ya has disparado a esa ubicación');
            partida.subestado="turnoJ2"
            //busca un barco del J2 que tenga un barco que tenga una coordenada que coincida con el disparo
            tocado=false;
            fin=false;
            for (var i in partida.barcos2.barcos) {
                if (partida.barcos2.barcos[i].coordenadas.find(coordenada=>(coordenada.fila==disparo.fila)
                    &&(coordenada.columna==disparo.columna))){
                    //Ha tocado a un barco
                    tocado=true;
                    partida.subestado="turnoJ1"
                    partida.barcos2.barcos[i].restantes=partida.barcos2.barcos[i].restantes-1;
                    hundido=false;
                    if(partida.barcos2.barcos[i].restantes>0){
                        partida.barcos2.barcos[i].estado="tocado";
                    }else{
                        partida.barcos2.barcos[i].estado="hundido";
                        hundido=true;
                    }
                    partida.tablero2.push({
                        casilla: {
                            fila: disparo.fila,
                            columna: disparo.columna,
                            estado: "acierto"
                        }}
                    );
                    if(hundido){
                        //has hundido un barco
                        barco  = partida.barcos2.barcos.find(barco=> barco.estado!="hundido");
                        if(!barco){
                            //no quedan barcos en pie "HAS GANADO"
                            fin=true;
                            partida.ganador=req.body.nombreUsuario;
                            partida.estado="finalizada";
                            
                            console.log("has ganado")
                            console.log(partida.tipo);
                            console.log(partida.tipo == "torneo");
                            //Si la partida es un torneo compruebas si ya existe la siguiente partida. Si no, la creas
                            if(partida.tipo == "torneo"){
                                console.log("partida de torneo ganada por j1")
                                console.log(partida.eliminatoria)
                                if(partida.eliminatoria == 1){
                                    console.log("es semifinal")
                                    console.log("partida.torneo")
                                    Partida.find(
                                        {
                                            torneo:partida.torneo,
                                            eliminatoria: 2
                                        },
                                        (err,result)=>{
                                            if (err) return res.status(500).send('Server Error');
                                            if(result.length === 0){
                                                console.log("primero en ganar")
                                                
                                                //los otros dos contendientes no han terminado, creamos la partida
                                                const final= new Partida ({
                                                    participante1: req.body.nombreUsuario,
                                                    ganador: undefined,
                                                    estado: "enCurso",
                                                    subestado: "colocandoBarcos",
                                                    tipo: "torneo",
                                                    barcos1:
                                                    {
                                                        colocados: false,
                                                        barcos:[]
                                                    },
                                                    barcos2:
                                                    {
                                                        colocados: false,
                                                        barcos:[]
                                                    },
                                                    torneo: partida.torneo,
                                                    eliminatoria: 2,
                                                });

                                                final.save(function (err) {
                                                    if (err) return res.status(500).send('Error al guardar final de torneo');                    
                                                });
                                            }
                                            else{
                                                console.log("segundo en ganar")
                                                console.log(result)
                                                result[0].participante2 = req.body.nombreUsuario;
                                                result[0].save(function (err) {
                                                    if (err) return res.status(500).send('Error al actualiza final de torneo');                    
                                                });
                                            }
                                        }
                                    )
                                }
                            }
                            
                            //Estadisticas de partida
                            ganador=(partida.ganador==req.body.nombreUsuario);
                            puntos=20;
                            if(partida.tipo!="ciegas") puntos=0;
                            disparosRealizados=partida.tablero2.length;
                            //El número de barcos destruidos
                            barcosDestruidos = 0;
                            for(var j = 0; j < partida.barcos2.barcos.length; ++j){
                                if(partida.barcos2.barcos[j].estado =="hundido" ) barcosDestruidos++;
                            }
                            //El número de disparos acertados
                            disparosAcertados=0;
                            for(var k = 0; k < partida.tablero2.length; ++k){
                                if(partida.tablero2[k].casilla.estado =="acierto" ) disparosAcertados++;
                            }
                            //si es torneo, es semifinal o final?
                            torneo="no";
                            if(partida.tipo=="torneo"){
                                if(partida.eliminatoria==1){
                                    torneo="semifinal";
                                } else{
                                    torneo="final";
                                }
                            }
                            respuesta={
                                disparo:"hundido",
                                barco:partida.barcos2.barcos[i],
                                fin:true,  
                                infoPartida:{
                                    ganador:ganador,
                                    puntos:puntos,
                                    disparosRealizados:disparosRealizados,
                                    barcosDestruidos:barcosDestruidos,
                                    disparosAcertados:disparosAcertados,
                                    torneo:torneo
                                }                              
                            }
                        }else{
                            //has hundido un barco, pero siguen barcos en pie
                            respuesta={
                                disparo:"hundido",
                                barco:partida.barcos2.barcos[i],
                                fin:false                               
                            }
                        }
                    }else{
                        //has tocado un barco, pero no lo has hundido
                        respuesta={
                            disparo:"tocado",
                            fin:false                               
                        }
                    }
                }
            }
            //no ha tocado un barco
            if(!tocado){
                partida.tablero2.push({
                    casilla: {
                        fila: disparo.fila,
                        columna: disparo.columna,
                        estado: "fallo"
                    }
                });
                respuesta={disparo:"fallo",fin:false};
                if(partida.tipo=="ia"){ 
                    console.log("Movimiento I.A.");
                    IA=movimientoIA(partida);
                    partida=IA.partida;
                    respuesta.movimientoIA=IA.disparosIA;
                }
            }
            Partida.findByIdAndUpdate( 
                { 
                    _id: req.body.gameid
                },
                partida
                ,
                (err,partida2) =>{
                    if (err) return res.status(500).send('Server error!');  
                    if(!fin){
                        return res.send(respuesta);
                    }else{
                        //HAS GANADO, actualizamos los marcadores del usuario
                        console.log("partida2")
                    console.log(partida2.tipo)
                    console.log(partida2.eliminatoria)
                    if(partida2.tipo=="torneo" && partida2.eliminatoria==2){
                        //actualizamos los marcadores del usuario
                        console.log("es torneo y final")
                    User.findOneAndUpdate(
                        { 
                            nombreUsuario: req.body.nombreUsuario,
                        },
                        {
                            $inc: { 'partidasGanadas':1,'puntos':respuesta.infoPartida.puntos,'torneosGanados':1}                
                        },
                        {new: true},
                        (err,myuser) =>{
                        if(err) return res.status(500).send('Server error!');
                        if(!myuser)return res.status(500).send({mensaje: 'Error al actualizar los datos del usuario' });
                        console.log("actualizacion estadisticas torneo")
                       
    
                        //Actualizamos los datos del rival
                        if(partida.participante1==req.body.nombreUsuario){
                            rival=partida.participante2;
                        }else{
                            rival=partida.participante1;
                        }
                        User.findOneAndUpdate(
                        { 
                            nombreUsuario: rival,
                        },
                        {
                            $inc: { 'partidasPerdidas':1,'puntos':-respuesta.infoPartida.puntos}                
                        },
                        {new: true},
                        (err,myuser2) =>{
                        if(err) return res.status(500).send('Server error!');
                        if(!myuser2)return res.status(500).send({mensaje: 'Error al actualizar los datos del rival' });
                        
                            return res.send(respuesta);
                
                        });
                    });
                    } else {
                        //actualizamos los marcadores del usuario
                    User.findOneAndUpdate(
                        { 
                            nombreUsuario: req.body.nombreUsuario,
                        },
                        {
                            $inc: { 'partidasGanadas':1,'puntos':respuesta.infoPartida.puntos}                
                        },
                        {new: true},
                        (err,myuser) =>{
                        if(err) return res.status(500).send('Server error!');
                        if(!myuser)return res.status(500).send({mensaje: 'Error al actualizar los datos del usuario' });
                        
                       
    
                        //Actualizamos los datos del rival
                        if(partida.participante1==req.body.nombreUsuario){
                            rival=partida.participante2;
                        }else{
                            rival=partida.participante1;
                        }
                        User.findOneAndUpdate(
                        { 
                            nombreUsuario: rival,
                        },
                        {
                            $inc: { 'partidasPerdidas':1,'puntos':-respuesta.infoPartida.puntos}                
                        },
                        {new: true},
                        (err,myuser2) =>{
                        if(err) return res.status(500).send('Server error!');
                        if(!myuser2)return res.status(500).send({mensaje: 'Error al actualizar los datos del rival' });
                        
                            return res.send(respuesta);
                
                        });
                    });
                    }
                    }
                });
            
        }else if(partida.participante2==req.body.nombreUsuario) { 
            if(partida.subestado!="turnoJ2") return res.status(500).send('No es tu turno');
            disparo={
                fila: req.body.fila,
                columna:req.body.columna
            }
            if(disparo.fila>=10 || disparo.fila<0 || disparo.columna>=10 || disparo.columna<0) return res.status(500).send('Disparo fuera de los límites');
            if(partida.tablero1.find(coordenada=>(coordenada.casilla.fila==disparo.fila)
            &&(coordenada.casilla.columna==disparo.columna))) return res.status(500).send('Ya has disparado a esa ubicación');
            partida.subestado="turnoJ1"
            //busca un barco del J2 que tenga un barco que tenga una coordenada que coincida con el disparo
            tocado=false;
            for (var i in partida.barcos1.barcos) {
                if (partida.barcos1.barcos[i].coordenadas.find(coordenada=>(coordenada.fila==disparo.fila)
                    &&(coordenada.columna==disparo.columna))){
                    //Ha tocado a un barco
                    tocado=true;
                    partida.subestado="turnoJ2"
                    partida.barcos1.barcos[i].restantes=partida.barcos1.barcos[i].restantes-1;
                    hundido=false;
                    if(partida.barcos1.barcos[i].restantes>0){
                        partida.barcos1.barcos[i].estado="tocado";
                    }else{
                        partida.barcos1.barcos[i].estado="hundido";
                        hundido=true;
                    }
                    partida.tablero1.push({
                        casilla: {
                            fila: disparo.fila,
                            columna: disparo.columna,
                            estado: "acierto"
                        }}
                    );
                    if(hundido){
                        //has hundido un barco
                        barco  = partida.barcos1.barcos.find(barco=> barco.estado!="hundido");
                        if(!barco){
                            //no quedan barcos en pie "HAS GANADO"
                            console.log("has ganado")
                            console.log(partida.tipo);
                            console.log(partida.tipo == "torneo");
                            //Si la partida es un torneo compruebas si ya existe la siguiente partida. Si no, la creas
                            if(partida.tipo == "torneo"){
                                console.log("partida de torneo ganada por j2")
                                console.log(partida.eliminatoria)
                                if(partida.eliminatoria == 1){
                                    console.log("es semifinal")
                                    Partida.find(
                                        {
                                            torneo:partida.torneo,
                                            eliminatoria: 2
                                        },
                                        (err,result)=>{
                                            if (err) return res.status(500).send('Server Error');
                                            if(result.length === 0){
                                                console.log("primero en ganar")
                                                
                                                //los otros dos contendientes no han terminado, creamos la partida
                                                const final= new Partida ({
                                                    participante1: req.body.nombreUsuario,
                                                    ganador: undefined,
                                                    estado: "enCurso",
                                                    subestado: "colocandoBarcos",
                                                    tipo: "torneo",
                                                    barcos1:
                                                    {
                                                        colocados: false,
                                                        barcos:[]
                                                    },
                                                    barcos2:
                                                    {
                                                        colocados: false,
                                                        barcos:[]
                                                    },
                                                    torneo: partida.torneo,
                                                    eliminatoria: 2,
                                                });

                                                final.save(function (err) {
                                                    if (err) return res.status(500).send('Error al guardar final de torneo');                    
                                                });
                                            }
                                            else{
                                                console.log("segundo en ganar")
                                                console.log(result)
                                                result[0].participante2 = req.body.nombreUsuario;
                                                result[0].save(function (err) {
                                                    if (err) return res.status(500).send('Error al actualiza final de torneo');                    
                                                });
                                            }
                                        }
                                    )
                                }
                            }
                            fin=true;
                            partida.ganador=req.body.nombreUsuario;
                            partida.estado="finalizada";
                            //Estadisticas de partida
                            ganador=(partida.ganador==req.body.nombreUsuario);
                            puntos=20;
                            if(partida.tipo!="ciegas") puntos=0;
                            disparosRealizados=partida.tablero1.length;
                            //El número de barcos destruidos
                            barcosDestruidos = 0;
                            for(var j = 0; j < partida.barcos1.barcos.length; ++j){
                                if(partida.barcos1.barcos[j].estado =="hundido" ) barcosDestruidos++;
                            }
                            //El número de disparos acertados
                            disparosAcertados=0;
                            for(var k = 0; k < partida.tablero1.length; ++k){
                                if(partida.tablero1[k].casilla.estado =="acierto" ) disparosAcertados++;
                            }
                            //si es torneo, es semifinal o final?
                            torneo="no";
                            if(partida.tipo=="torneo"){
                                if(partida.eliminatoria==1){
                                    torneo="semifinal";
                                } else{
                                    torneo="final";
                                }
                            }
                            respuesta={
                                disparo:"hundido",
                                barco:partida.barcos1.barcos[i],
                                fin:true,  
                                infoPartida:{
                                    ganador:ganador,
                                    puntos:puntos,
                                    disparosRealizados:disparosRealizados,
                                    barcosDestruidos:barcosDestruidos,
                                    disparosAcertados:disparosAcertados,
                                    torneo:torneo
                                }                              
                            }
                        }else{
                            //has hundido un barco, pero siguen barcos en pie
                            respuesta={
                                disparo:"hundido",
                                barco:partida.barcos1.barcos[i],
                                fin:false                               
                            }
                        }
                    }else{
                        //has tocado un barco, pero no lo has hundido
                        respuesta={
                            disparo:"tocado",
                            fin:false                               
                        }
                    }
                }
            }
            //no ha tocado un barco
            if(!tocado){
                partida.tablero1.push({
                    casilla: {
                        fila: disparo.fila,
                        columna: disparo.columna,
                        estado: "fallo"
                    }
                });
                respuesta={disparo:"fallo",fin:false};
            }
            Partida.findByIdAndUpdate( 
            { _id: req.body.gameid },
            partida
            ,
            (err,partida2) =>{
                if (err) return res.status(500).send('Server error!');  
                if(!fin){
                    return res.send(respuesta);
                }else{
                    //HAS GANADO, actualizamos los marcadores del usuario
                    
                    
                    
                   console.log("partida2")
                    console.log(partida2.tipo)
                    console.log(partida2.eliminatoria)
                    if(partida2.tipo=="torneo" && partida2.eliminatoria==2){
                        //actualizamos los marcadores del usuario
                        console.log("es torneo y final")
                    User.findOneAndUpdate(
                        { 
                            nombreUsuario: req.body.nombreUsuario,
                        },
                        {
                            $inc: { 'partidasGanadas':1,'puntos':respuesta.infoPartida.puntos,'torneosGanados':1}                
                        },
                        {new: true},
                        (err,myuser) =>{
                        if(err) return res.status(500).send('Server error!');
                        if(!myuser)return res.status(500).send({mensaje: 'Error al actualizar los datos del usuario' });
                        console.log("actualizacion estadisticas torneo")
                       
    
                        //Actualizamos los datos del rival
                        if(partida.participante1==req.body.nombreUsuario){
                            rival=partida.participante2;
                        }else{
                            rival=partida.participante1;
                        }
                        User.findOneAndUpdate(
                        { 
                            nombreUsuario: rival,
                        },
                        {
                            $inc: { 'partidasPerdidas':1,'puntos':-respuesta.infoPartida.puntos}                
                        },
                        {new: true},
                        (err,myuser2) =>{
                        if(err) return res.status(500).send('Server error!');
                        if(!myuser2)return res.status(500).send({mensaje: 'Error al actualizar los datos del rival' });
                        
                            return res.send(respuesta);
                
                        });
                    });
                    } else {
                        //actualizamos los marcadores del usuario
                    User.findOneAndUpdate(
                        { 
                            nombreUsuario: req.body.nombreUsuario,
                        },
                        {
                            $inc: { 'partidasGanadas':1,'puntos':respuesta.infoPartida.puntos}                
                        },
                        {new: true},
                        (err,myuser) =>{
                        if(err) return res.status(500).send('Server error!');
                        if(!myuser)return res.status(500).send({mensaje: 'Error al actualizar los datos del usuario' });
                        
                       
    
                        //Actualizamos los datos del rival
                        if(partida.participante1==req.body.nombreUsuario){
                            rival=partida.participante2;
                        }else{
                            rival=partida.participante1;
                        }
                        User.findOneAndUpdate(
                        { 
                            nombreUsuario: rival,
                        },
                        {
                            $inc: { 'partidasPerdidas':1,'puntos':-respuesta.infoPartida.puntos}                
                        },
                        {new: true},
                        (err,myuser2) =>{
                        if(err) return res.status(500).send('Server error!');
                        if(!myuser2)return res.status(500).send({mensaje: 'Error al actualizar los datos del rival' });
                        
                            return res.send(respuesta);
                
                        });
                    });
                    }
                }
            });
        }
    })
};

exports.infoPartida=(req,res)=>{
    Partida.findById(
    {
        _id: req.body.gameid
    },(err,partida) =>{
    if (err) return res.status(500).send('Server error!');
    if(!partida) return res.status(500).send('No existe una partida con esa id');
    if(partida.participante1!=req.body.nombreUsuario && partida.participante2!=req.body.nombreUsuario) return res.status(500).send('No perteneces a esta partida');
    if(partida.participante1==req.body.nombreUsuario){
        
        //Estadisticas de partida del J1
        ganador=(partida.ganador==req.body.nombreUsuario);
        if(ganador){
            puntos=20;
        }else{
            puntos=-20;
        }
        if(partida.tipo!="ciegas") puntos=0;
        disparosRealizados=partida.tablero2.length;
        //El número de barcos destruidos
        barcosDestruidos = 0;
        for(var i = 0; i < partida.barcos2.barcos.length; ++i){
            if(partida.barcos2.barcos[i].estado =="hundido" ) barcosDestruidos++;
        }
        //El número de disparos acertados
        disparosAcertados=0;
        for(var i = 0; i < partida.tablero2.length; ++i){
            if(partida.tablero2[i].casilla.estado =="acierto" ) disparosAcertados++;
        }
        respuesta={
            infoPartida:{
                ganador:ganador,
                puntos:puntos,
                disparosRealizados:disparosRealizados,
                barcosDestruidos:barcosDestruidos,
                disparosAcertados:disparosAcertados
            }                              
        }
        return res.send(respuesta);
    }else{
        //Estadisticas de partida del J2
        ganador=(partida.ganador==req.body.nombreUsuario);
        if(ganador){
            puntos=20;
        }else{
            puntos=-20;
        }
        if(partida.tipo!="ciegas") puntos=0;
       
        disparosRealizados=partida.tablero1.length;
        //El número de barcos destruidos
        barcosDestruidos = 0;
        for(var i = 0; i < partida.barcos1.barcos.length; ++i){
            if(partida.barcos1.barcos[i].estado =="hundido" ) barcosDestruidos++;
        }
        //El número de disparos acertados
        disparosAcertados=0;
        for(var i = 0; i < partida.tablero1.length; ++i){
            if(partida.tablero1[i].casilla.estado =="acierto" ) disparosAcertados++;
        }
        respuesta={
            infoPartida:{
                ganador:ganador,
                puntos:puntos,
                disparosRealizados:disparosRealizados,
                barcosDestruidos:barcosDestruidos,
                disparosAcertados:disparosAcertados
            }                              
        }
        return res.send(respuesta);
    }
    
    });
}



exports.cogerTablero=(req,res)=>{
    Partida.findById(
    {
        _id: req.body.gameid
    },(err,partida) =>{
    if (err) return res.status(500).send('Server error!');
    if(!partida) return res.status(500).send('No existe una partida con esa id');
    if(partida.participante1!=req.body.nombreUsuario && partida.participante2!=req.body.nombreUsuario) return res.status(500).send('No perteneces a esta partida');
    if(partida.participante1==req.body.nombreUsuario){
        //Tablero visible para J1
        tuTablero=partida.tablero1;
        tusBarcos=partida.barcos1.barcos;
        disparos=partida.tablero2;
        if(partida.subestado == "turnoJ1") turno="tuTurno";
        else turno="turnoRival";
        barcosHundidosRival=[];
        for(var i = 0; i < partida.barcos2.barcos.length; ++i){
            if(partida.barcos2.barcos[i].estado =="hundido" ) barcosHundidosRival.push(partida.barcos2.barcos[i]);
        }
    }else{
        //Tablero visible para J2
        tuTablero=partida.tablero2;
        tusBarcos=partida.barcos2.barcos;
        disparos=partida.tablero1;
        if(partida.subestado == "turnoJ2") turno="tuTurno";
        else turno="turnoRival";
        barcosHundidosRival=[];
        for(var i = 0; i < partida.barcos1.barcos.length; ++i){
            if(partida.barcos1.barcos[i].estado =="hundido" ) barcosHundidosRival.push(partida.barcos1.barcos[i]);
        }
    }
    respuesta={
        tuTablero:tuTablero,
        tusBarcos:tusBarcos,
        disparos:disparos,
        turno:turno,
        barcosHundidosRival:barcosHundidosRival
    }
    return res.send(respuesta);
    });
}


exports.rendirse=(req,res)=>{
    Partida.findById(
    {
        _id: req.body.gameid
    },(err,partida) =>{
    if (err) return res.status(500).send('Server error!');
    if(!partida) return res.status(500).send('No existe una partida con esa id');
    if(partida.estado!="enCurso") return res.status(500).send('No te puedes rendir ahora');
    if(partida.participante1!=req.body.nombreUsuario && partida.participante2!=req.body.nombreUsuario) return res.status(500).send('No perteneces a esta partida');
    if(partida.participante1==req.body.nombreUsuario){
        
        //Estadisticas de partida del J1
        partida.ganador=partida.participante2;
        ganador=false;
        puntos=-20;
        if(partida.tipo!="ciegas") puntos=0;
        disparosRealizados=partida.tablero2.length;
        //El número de barcos destruidos
        barcosDestruidos = 0;
        for(var i = 0; i < partida.barcos2.barcos.length; ++i){
            if(partida.barcos2.barcos[i].estado =="hundido" ) barcosDestruidos++;
        }
        //El número de disparos acertados
        disparosAcertados=0;
        for(var i = 0; i < partida.tablero2.length; ++i){
            if(partida.tablero2[i].casilla.estado =="acierto" ) disparosAcertados++;
        }
        respuesta={
            infoPartida:{
                ganador:ganador,
                puntos:puntos,
                disparosRealizados:disparosRealizados,
                barcosDestruidos:barcosDestruidos,
                disparosAcertados:disparosAcertados
            }                              
        }
        Partida.findByIdAndUpdate(
        {
            _id: req.body.gameid
        },{
            ganador:partida.participante2,
            estado:"finalizada"
        }
        ,(err,partida) =>{
        if(partida.tipo=="ciegas"){
            
            User.findOneAndUpdate(
            { 
                nombreUsuario: partida.participante2,
            },
            {
                $inc: { 'partidasGanadas':1,'puntos':puntos}                
            },
            {new: true},
            (err,myuser) =>{
            if(err) return res.status(500).send('Server error!');
            if(!myuser)return res.status(500).send({mensaje: 'Error al actualizar los datos del rival' });
            
            
            User.findOneAndUpdate(
            { 
                nombreUsuario: req.body.nombreUsuario,
            },
            {
                $inc: { 'partidasPerdidas':1,'puntos':-respuesta.infoPartida.puntos}                
            },
            {new: true},
            (err,myuser2) =>{
            if(err) return res.status(500).send('Server error!');
            if(!myuser2)return res.status(500).send({mensaje: 'Error al actualizar los datos del usuario' });
            
                return res.send(respuesta);
    
            });});
        }
        return res.send(respuesta);
        });
    }else{
        //Estadisticas de partida del J2
        partida.ganador=partida.participante1;
        ganador=false;
        puntos=-20;
        if(partida.tipo!="ciegas") puntos=0;
        disparosRealizados=partida.tablero1.length;
        //El número de barcos destruidos
        barcosDestruidos = 0;
        for(var i = 0; i < partida.barcos1.barcos.length; ++i){
            if(partida.barcos1.barcos[i].estado =="hundido" ) barcosDestruidos++;
        }
        //El número de disparos acertados
        disparosAcertados=0;
        for(var i = 0; i < partida.tablero1.length; ++i){
            if(partida.tablero1[i].casilla.estado =="acierto" ) disparosAcertados++;
        }
        respuesta={
            infoPartida:{
                ganador:ganador,
                puntos:puntos,
                disparosRealizados:disparosRealizados,
                barcosDestruidos:barcosDestruidos,
                disparosAcertados:disparosAcertados
            }                              
        }
        Partida.findByIdAndUpdate(
        {
            _id: req.body.gameid
        },{
            ganador:partida.participante1,
            estado:"finalizada"
        }
        ,(err,partida) =>{
        if(partida.tipo=="ciegas"){
            
            User.findOneAndUpdate(
            { 
                nombreUsuario: partida.participante1,
            },
            {
                $inc: { 'partidasGanadas':1,'puntos':puntos}                
            },
            {new: true},
            (err,myuser) =>{
            if(err) return res.status(500).send('Server error!');
            if(!myuser)return res.status(500).send({mensaje: 'Error al actualizar los datos del rival' });
            
            
            User.findOneAndUpdate(
            { 
                nombreUsuario: req.body.nombreUsuario,
            },
            {
                $inc: { 'partidasPerdidas':1,'puntos':-respuesta.infoPartida.puntos}                
            },
            {new: true},
            (err,myuser2) =>{
            if(err) return res.status(500).send('Server error!');
            if(!myuser2)return res.status(500).send({mensaje: 'Error al actualizar los datos del usuario' });
            
                return res.send(respuesta);
    
            });});
        }
        return res.send(respuesta);
        });
    }
    
    });
}
exports.crearTorneo=(req,res)=>{
    console.log("crear torneo");
    User.find(
        {
            nombreUsuario:req.body.participante1,
            amigos:req.body.participante2
        },
        (err,result)=>{
        if (err) return res.status(500).send('Server Error');
        if(!result){
            return res.status(500).send(
            `El usuario ${req.body.nombreAmigo} no está en tu lista de amigos`)
        }
        User.find(
            {
                nombreUsuario:req.body.participante1,
                amigos:req.body.participante3
            },
            (err,result)=>{
            if (err) return res.status(500).send('Server Error');
            if(!result){
                return res.status(500).send(
                `El usuario ${req.body.nombreAmigo} no está en tu lista de amigos`)
            }
            User.find(
                {
                    nombreUsuario:req.body.participante1,
                    amigos:req.body.participante4
                },
                (err,result)=>{
                if (err) return res.status(500).send('Server Error');
                if(!result){
                    return res.status(500).send(
                    `El usuario ${req.body.nombreAmigo} no está en tu lista de amigos`)
                }
        
                //Se crean el torneo y las partidas
                const torneo= new Torneo ({
                    
                });
                
                const partida1= new Partida ({
                    participante1: req.body.nombreUsuario,
                    participante2: req.body.participante2,
                    ganador: undefined,
                    estado: "enCurso",
                    subestado: "colocandoBarcos",
                    tipo: "torneo",
                    barcos1:
                    {
                        colocados: false,
                        barcos:[]
                    },
                    barcos2:
                    {
                        colocados: false,
                        barcos:[]
                    },
                    torneo: torneo,
                    eliminatoria: 1,
                });

                const partida2= new Partida ({
                    participante1: req.body.participante3,
                    participante2: req.body.participante4,
                    ganador: undefined,
                    estado: "enCurso",
                    subestado: "colocandoBarcos",
                    tipo: "torneo",
                    barcos1:
                    {
                        colocados: false,
                        barcos:[]
                    },
                    barcos2:
                    {
                        colocados: false,
                        barcos:[]
                    },
                    torneo: torneo,
                    eliminatoria: 1,
                });

                torneo.partidas.push(partida1);
                torneo.partidas.push(partida2);

                //Añadimos torneo y partida a la base de datos
                torneo.save(function (err) {
                    if (err) return res.status(500).send('Error al guardar partida1 de torneo');                    
                });
                partida1.save(function (err) {
                    if (err) return res.status(500).send('Error al guardar partida1 de torneo');                    
                });
                partida2.save(function (err) {
                    if (err) return res.status(500).send('Error al guardar partida2 de torneo');
                    //devolvemos Mensaje
                    respuesta={
                        mensaje:'El torneo ha comenzado. En tu lista de partidas encontrarás la partida que te toca jugar'
                    }
                    return res.send(respuesta);
                });
            })
        })
    })     
}
