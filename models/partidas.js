const mongoose=require('mongoose');
const Schema = mongoose.Schema;
mongoose.set('useCreateIndex',true);
const partidaSchema = new Schema ({
    participante1: {
        type: String, 
        ref: 'Usuario'
    },
    participante2: {
        type: String, 
        ref: 'Usuario'
    },
    ganador: {
        type: String,
        ref: 'Usuario'
    },
    estado:{//VALORES:"pendiente","enCurso","finalizada"
        type: String
    },
    tipo:{//VALORES:"ciegas","amistoso","ia","torneo"
        type: String
    },
    barcos:[{
        propietario: {
            type: Schema.Types.ObjectId, 
            ref: 'Usuario'
        },
        tipo: {
            type: String
        },
        coordenadas: [{
            fila: {
                type: Number
            },
            columna: {
                type: Number
            }
        }]
    }],
    tablero:[{
        casilla: {
            fila: {
                type: Number
            },
            columna: {
                type: Number
            },
            estado: {
                type: String
            }
        }
    }],
    //torneo al que pertenece si es parte de algún torneo
    torneo: {
        propietario: {
            type: Schema.Types.ObjectId, 
            ref: 'Torneo'
        },
        eliminatoria: {
            type: Number
        }
    }
});

module.exports = partidaSchema;