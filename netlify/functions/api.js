const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const productRoutes = require('../routes/app');
const adminRoutes = require('../routes/admin');

var corsOptions = {
    methods : ['GET','POST'],
    credentials:true,
    optionsSuccessStatus:200
};

const salt = process.env.SALT;

const app = express();
// app.use(bodyParser.raw({type: '*/*'}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// app.use(cors(corsOptions));//enable cors
// app.options('*',cors());

app.use((req, res, next) => {
  let data = '';
  req.on('data', chunk => {
    data += chunk;
  });
  req.on('end', () => {
    try {
      const contentType = req.headers['content-type'];
      if (contentType && contentType.includes('application/json')) {
		console.log('data',data);
        req.body = JSON.parse(data);
      } else if (contentType && contentType.includes('application/x-www-form-urlencoded')) {
        const querystring = require('querystring');
        req.body = querystring.parse(data);
      } else {
        req.body = data;
      }
    } catch (err) {
      console.error('Body parsing error:', err);
      req.body = {};
    }
    next();
  });
});

const jwtVerify = (req,res,next)=>{
    const token = req.header('Authorization');
    if(token){
        jwt.verify(token, salt, async(err, decoded) => {
            if (err) {
                res.status(401).json({
                    status: false,
                    message: 'Access Denied'
                });
            } else {
                if(decoded.user_type=='admin'){
                    next();
                }else{
                    res.status(401).json({
                        status: false,
                        message: 'Only admins are allowed to access this page'
                    });
                }
            }
        });
    }else{
        res.status(401).json({
            status: false,
            message: 'Access Denied'
        });
    }
}


app.use('/.netlify/functions/api/',productRoutes);
app.use('/.netlify/functions/api/',jwtVerify,adminRoutes);

module.exports.handler = serverless(app);
