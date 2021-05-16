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
    subestado:{//VALORES:"colocandoBarcos","turnoJ1","turnoJ2"
        type: String
    },
    tipo:{//VALORES:"ciegas","amistoso","ia","torneo"
        type: String
    },
    barcos1:
    {
        colocados:{
            type: Boolean
        },
        barcos:
        [{  
            tipo: {
            //VALORES:"portaaviones"(5 casillas),"buque"(4),"submarino1"(3),"submarino2"(3),"crucero"(2)
                type: String
            },
            estado:{//VALORES:"sano","tocado","hundido"
                type: String
            },
            restantes:{//casillas restantes sin tocar del barco
                type:Number
            },
            coordenadas: [{
                fila: {
                    type: Number
                },
                columna: {
                    type: Number
                }
            }]
        }]
    },
    barcos2:
    {
        colocados:{
            type: Boolean
        },
        barcos:
        [{  
            tipo: {
            //VALORES:"portaaviones"(5 casillas),"buque"(4),"submarino1"(3),"submarino2"(3),"crucero"(2)
                type: String
            },
            estado:{//VALORES:"sano","tocado","hundido"
                type: String
            },
            restantes:{
                type:Number
            },
            coordenadas: [{
                fila: {
                    type: Number
                },
                columna: {
                    type: Number
                }
            }]
        }]
    },
    tablero1:[{//disparos sobre el tablero del J1
        casilla: {
            fila: {
                type: Number
            },
            columna: {
                type: Number
            },
            //VALORES:"fallo","acierto"
            estado: {
                type: String
            }
        }
    }],
    tablero2:[{//disparos sobre el tablero del J2
        casilla: {
            fila: {
                type: Number
            },
            columna: {
                type: Number
            },
            //VALORES:"fallo","acierto"
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