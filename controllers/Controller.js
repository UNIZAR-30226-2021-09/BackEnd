const User = require('../dataAccess/DataAccess');
const jwt=require('jsonwebtoken');
const bcrypt=require('bcryptjs');
const SECRET_KEY='secretkey123456';


exports.autentificar=(req, res, next) => {
    const token = req.body.accessToken;

    if (token) {
        jwt.verify(token, SECRET_KEY, (err, verified) => {     

            if (err || verified.nombreUsuario!=req.body.nombreUsuario) {
                return res.json({ mensaje: 'Token inválido' });    
            } else {    
                //VERIFICADO
                //console.log("VERIFICADO")
                next();
            } 
        });
    } else {
      res.send({ 
          mensaje: 'Token no proveído.' 
      });
    }
 };


exports.loginUser= (req, res) => {
    const userData={
        nombreUsuario: req.body.nombreUsuario,
        contrasena: req.body.contrasena
    }
    User.findOne({nombreUsuario: userData.nombreUsuario}, (err,user)=>{
        if(err) return res.status(500).send('Server error!');
        
        if(!user){
            // No existe el email
            res.status(409).send({message: 'Something is wrong'});
        } else{
            //correcto
            resultPassword =bcrypt.compareSync( userData.contrasena, user.contrasena);
            if(resultPassword){
                const expiresIn= 24*60*60;
                const accessToken = jwt.sign({nombreUsuario: user.nombreUsuario}, SECRET_KEY,{expiresIn: expiresIn});
                const dataUser ={
                    nombreUsuario: user.nombreUsuario,
                    email: user.email,
                    amigos: user.amigos,
                    accessToken: accessToken,
                    expiresIn: expiresIn,
                    
                }
                res.send({dataUser});
            }else{
                // password wrong
                res.status(409).send({message: 'Semething is wrong'});
            }
        }

    })
}



exports.createUser=(req,res,next)=>{
    const newUser={
        nombreUsuario: req.body.nombreUsuario,
        email: req.body.email,
        contrasena: bcrypt.hashSync(req.body.contrasena)
    }

    User.create(newUser,(err,user)=>{
        if(err && err.code==11000) return res.status(409).send('Email or user already exist');
        if(err) return res.status(500).send('Server error');
        const expiresIn = 24*60*60;
        const accessToken= jwt.sign(
                {
                nombreUsuario: user.nombreUsuario,contrasena:user.contrasena
                },
                SECRET_KEY,
                {
                    expiresIn:expiresIn
                }
            );
            const dataUser ={
                nombreUsuario: user.nombreUsuario,
                email: user.email,
                accessToken: accessToken,
                expiresIn: expiresIn
            }
        //Response
        res.send({dataUser});
    });
}




exports.addFriend=(req,res,next)=>{
    console.log("añadiendo");
    const petitionData={
        nombreUsuario: req.body.nombreUsuario,
        nombreAmigo: req.body.nombreAmigo,
        accessToken: req.body.accessToken
    }
    if (petitionData.nombreAmigo==petitionData.nombreUsuario){
        return res.status(500).send('No te puedes agregar a ti mismo');
    }

    User.findOne({nombreUsuario: petitionData.nombreAmigo}, (err,user)=>{
        if(err) return res.status(500).send('Server error!');

        if(!user){
            // usuario no existe
            res.send({message: `usuario ${petitionData.nombreAmigo} no encontrado` });
        } else{
            //El amigo existe
            User.findOneAndUpdate({ 
                nombreUsuario: petitionData.nombreUsuario
                },
                {$addToSet:{
                    amigos: user._id
                }},
                {new: true},
                (err,result) =>{
                    console.log(result);
                    if(err) return res.status(500).send('Server error!');

                    return res.send(result.amigos);
                });

            
        }

    })

}