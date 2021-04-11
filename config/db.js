const mongoose = require('mongoose');
const dbURL= require('./properties').DB;

module.exports =() =>{
    mongoose.connect(dbURL, {useNewUrlParser:true, useFindAndModify: false,useUnifiedTopology: true })
    .then(() => console.log(`Mongo connected on ${dbURL}`))
    .catch(err => console.log(`Connection has error ${err}`))
    //mongoose.set('useFindAndModify', false);
    process.on('SIGINT',()=> {
        mongoose.connection.close(()=>{
            console.log('Mongo is disconnected');
            process.exit(0)
        });
    });
}