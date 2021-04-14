const mongoose = require('mongoose');
require('dotenv').config({ path: 'variables.env'});

module.exports =() =>{
    mongoose.connect(process.env.DB_URL, {useNewUrlParser:true, useFindAndModify: false,useUnifiedTopology: true })
    .then(() => console.log(`Mongo connected on ${DB_URL}`))
    .catch(err => console.log(`Connection has error ${err}`))
    //mongoose.set('useFindAndModify', false);
    process.on('SIGINT',()=> {
        mongoose.connection.close(()=>{
            console.log('Mongo is disconnected');
            process.exit(0)
        });
    });
}