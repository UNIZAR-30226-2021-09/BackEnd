
const User = require('../dataAccess/DataAccess');
const mongoose = require('mongoose');

const requestSchema = require('../models/peticiones');
const Request = mongoose.model('Requests',requestSchema);

const partidaSchema = require('../models/partidas');
const Partida = mongoose.model('Partidas',partidaSchema);

module.exports = function(io) {

  // socket connection
io.on("connection", (socket) => {
  console.log("conectado");
  
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
        if (err) return res.status(500).send('Server error!');
        result.forEach(function(record){
          console.log(record._id);
          socket.join(record._id.toString());          
        });
        //socket.join("hola");          
      });
    
  });
      
  // on incoming message
  socket.on("movement", ({ mv, game, user }) => {
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
      result.tablero.forEach(function(record){
        if (record.casilla.fila == mv.fila && record.casilla.columna == mv.columna){
          record.casilla.estado = 'disparada';
        }
      });
      Partida.findByIdAndUpdate(
        game._id,
        {
          tablero: result.tablero
        },
        null,
        (err,result2)=>{
          if (err) return res.status(500).send('Server error!');
        }
      )          
    });
  });
  
  //cuando creas o aceptas una partida se te une a su room
  socket.on("joinGame", (room) => {
      socket.join(room);
      //socket.to(room).broadcast.emit("notification joined");
  });

  //cuando acaba una partida se te saca de su room
  socket.on("leave-group", (room) =>
    socket.leave(room, () => {
      socket
        .to(room)
        .broadcast.emit("notification", `${getUserRoom(socket.id).user} left`);
      removeUser({ id: socket.id });
    })
  );

  socket.on("disconnect", () => {    
      console.log("disconected");
  });
});
};
