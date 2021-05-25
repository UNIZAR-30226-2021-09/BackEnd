
const User = require('../dataAccess/DataAccess');
const mongoose = require('mongoose');

const requestSchema = require('../models/peticiones');
const Request = mongoose.model('Requests',requestSchema);

const partidaSchema = require('../models/partidas');
const Partida = mongoose.model('Partidas',partidaSchema);

require('./authController');

userSockets = new Map();

module.exports = function(io) {

  // socket connection
io.on("connection", (socket) => {
  console.log("conectado");
  
  //añadir al array al usuario con su socket actual
  socket.on("logMe", (user) => {
    userSockets.set(user.nombreUsuario.toString(), socket.id.toString());
    console.log(userSockets);
  })

  //Redirigir peticion de amistad
  socket.on("friendPetition", (user) => {
    let friendSocket = userSockets.get(user.nombreUsuario.toString());
    console.log("llega peticion de amistad" + user.nombreUsuario.toString());
    console.log(friendSocket);
    if(typeof friendSocket === 'undefined'){
        console.log("must send")
        transporter.sendMail({
        from:'"hola" <ps09unizar@gmail.com>',
        to:'theheroshadexd@gmail.com',
        subject:'Tienes una nueva petición de amistad!',
        html:`<b>Inicia sesión para aceptarla o rechazarla</b>
            <a href="https://keen-thompson-0eaf88.netlify.app/">https://keen-thompson-0eaf88.netlify.app/</a>`
      })
    }
    else{
      mustSend=true;
      io.sockets.connected[friendSocket].emit("llegaInvitacion", () => 
        mustSend = false
      );
      if(mustSend){
        console.log("must send")
        transporter.sendMail({
          from:'"hola" <ps09unizar@gmail.com>',
          to:'theheroshadexd@gmail.com',
          subject:'Tienes una nueva petición de amistad!',
          html:`<b>Inicia sesión para aceptarla o rechazarla</b>
              <a href="https://keen-thompson-0eaf88.netlify.app/">https://keen-thompson-0eaf88.netlify.app/</a>`
        })
      }
      console.log(mustSend);  
    }
    console.log(friendSocket);
    
    
    
  })
  
  socket.on("aceptarInvitacionAmigo", (user) => {
    let friendSocket = userSockets.get(user.nombreUsuario.toString());
    console.log("llega peticion aceptar amigo" + user.nombreUsuario.toString());
    console.log(friendSocket);
    socket.to(friendSocket).emit("llegaAceptarInvitacionAmigo");
  })
  
  //Redirigir desafio
  socket.on("challenge", (user) => {
    let friendSocket = userSockets.get(user.nombreUsuario.toString());
    console.log("llega desafio de" + user.nombreUsuario.toString());
    console.log(friendSocket);
    socket.to(friendSocket).emit("llegaChallenge");
  })
  
  socket.on("aceptarChallenge", (user) => {
    let friendSocket = userSockets.get(user.nombreUsuario.toString());
    console.log("llega aceptar desafio" + user.nombreUsuario.toString());
    console.log(friendSocket);
    socket.to(friendSocket).emit("llegaAceptarChallenge", user.game);
    console.log("despues de emit llegaAceptarChallenge");
  })

  //entrar en una sala por partida en curso
  socket.on("getIntoAllGames", (user) => {
    Partida.find(
      {$and:[
          {estado:"enCurso"},
          {$or:[
              {participante1: user.nombreUsuario},
              {participante2: user.nombreUsuario}
          ]}
      ]},
      null, null,
      (err,result)=>{
        if (err) console.log(err.message);
        result.forEach(function(record){
          console.log(record._id);
          socket.join(record._id.toString());          
        });
        console.log("unido a todos los juegos");
        //socket.join("hola");          
      });
    
  });
      
  socket.on("movement", ({game, nuevoTurno }) => {
    //redirigir movimiento al rival
    console.log("hace movimiento:");
    console.log("user.nombreUsuario");
    console.log(game);
    console.log(io.sockets.adapter.rooms);
    socket.broadcast.to(game.toString()).emit("llegaMovement", {
      game: game,
      nuevoTurno: nuevoTurno
    });

    //alterar tambien en la base de datos
    Partida.findById(
      game,
      null, null,
      (err,result)=>{
      if (err) ;
              
    });
  });
  
  // on incoming message
  /*socket.on("movement", ({game, user }) => {
    //redirigir movimiento al rival
    console.log("llega movimiento de:");
    console.log(game._id);
    console.log(io.sockets.adapter.rooms);
    socket.broadcast.to(game._id.toString()).emit("incomingMovement", {
      movement: mv
    });

    //alterar tambien en la base de datos
    Partida.findById(
      game._id,
      null, null,
      (err,result)=>{
      if (err) ;
              
    });
  });*/
  
  //cuando creas o aceptas una partida se te une a su room
  socket.on("joinGame", (room) => {
      socket.join(room.toString());
    console.log("alguien se ha unido a");
    console.log(room.toString());
      //socket.to(room).broadcast.emit("notification joined");
  });

  //cuando acaba una partida se te saca de su room
  socket.on("leaveGame", (room) =>
    socket.leave(room.toString(), () => {
      socket
        .to(room.toString())
        .broadcast.emit("gameEnded");
    })
  );

  socket.on("disconnect", () => {    
      console.log("disconected");
  });
});
};
