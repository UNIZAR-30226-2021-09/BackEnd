const mongoose = require('mongoose');
const userSchema = require('../models/usuario');
userSchema.statics = {
    create: function(data,cb){
        const user = new this(data);
        user.save(cb);
    },
    login: function(query,cb){
        this.find(query,cb);
    }
}

const UserModel= mongoose.model('Users',userSchema);
module.exports= UserModel;
