const mongoose=require('mongoose');
const Schema = mongoose.Schema;
mongoose.set('useCreateIndex',true);
const tokenSchema = new Schema ({
    nombreUsuario: {
        type: String
    },
    token: {
        type: String
    }
});

module.exports = tokenSchema;