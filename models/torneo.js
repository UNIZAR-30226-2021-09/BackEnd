const mongoose=require('mongoose');
const Schema = mongoose.Schema;
mongoose.set('useCreateIndex',true);
const torneoSchema = new Schema ({
    //Diseño físico: lista de partidas que lo conforman.
    //Para facilitar los emparejamientos
    //borrar partidas finalizadas tras volver a emparejar?
    partidas: [{
        type: Schema.Types.ObjectId, 
        ref: 'Partida'
    }]
});

module.exports = torneoSchema;