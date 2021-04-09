const mongoose=require('mongoose');
const Schema = mongoose.Schema;
mongoose.set('useCreateIndex',true);
const userSchema = new Schema ({
    nombreUsuario: {
        type: String,
        //required: true,
        trim: true,
        unique: true
    },
    email:{
        type: String,
        //required: true,
        trim: true,
        unique: true
    },
    contrasena:{
        type: String,
        //required: true,
        trim: true
    },
    partidasGanadas:{
        type: Number
    },
    partidasPerdidas:{
        type: Number
    },
    torneosGanados:{
        type: Number
    },
    puntos:{
        type: Number
    },
    configuracion:{
        volumenSonidos:{
            type: Number
        },
        idioma:{
            type: String
        },
        colorBarcos:{
            type: String
        },
        colorTableros:{
            type: String
        },
    },
    amigos:[{
        type: String
    }],
    //Diseño fisico: para acceder más rápido a la lista de partidas
    partidas:[{
        type: Schema.Types.ObjectId, 
        ref: 'Partida'
    }]
    
},{
    timestamps: true
});

module.exports = userSchema;
