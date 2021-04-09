const mongoose=require('mongoose');
const Schema = mongoose.Schema;
mongoose.set('useCreateIndex',true);
const peticionSchema = new Schema ({
    solicitante:{
        type: String,
        required: true
    },
    solicitado:{
        type: String,
        required: true
    }
    },
    {
        timestamps: true
    });
peticionSchema.index({
    solicitante: 1,
    solicitado: 1,
    }, {
    unique: true,
    });
module.exports = peticionSchema;