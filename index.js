'use strict'

const cors= require('cors');
const authRoutes = require('./routers/routers');
const express = require('express');
const properties = require('./config/properties');
const DB = require('./config/db');
const app = express();
const server = require("http").createServer(app);
const io = require("socket.io")(server, { cors: { origin: "*" } });
require('./controllers/sockets.js')(io);

//init DB
DB();

const router=express.Router();
const bodyParser=require('body-parser');
const bodyParserJSON = bodyParser.json();
const bodyParserURLEncoded= bodyParser.urlencoded({extended: true});

app.use(bodyParserJSON);
app.use(bodyParserURLEncoded);

app.use(cors());
app.use('/api', router);
authRoutes(router);
router.get('/', (req, res)=>{
    res.send('Hello from home');
});

app.use(router);
server.listen(properties.PORT,()=> console.log(`server running on port ${properties.PORT}`));
