const express = require('express');
const router = express.Router();
const {Pool} = require('pg'); 

const pool = new Pool({
  host: process.env.HOST,
  user: process.env.DBUSER,
  password: process.env.PASSWORD,
  database: process.env.DATABASE,
  port: process.env.PORT,
  ssl: {rejectUnauthorized:false}
});


router.post('/user/login', async(req, res) => {
	try{
		const result = await pool.query(``);
		res.status(200).json({
			status: true,
			result: result.rows,
			count: result.rowCount
		});
	}catch(error){
		res.status(500).json({
			status:false,
			message:'Unexpected server error',
			servermessage: error.message
		});
	}
});

router.post('/user/register', async(req, res) =>{
	try{
		console.log('formdata',req.body);
		const result = await pool.query(`INSERT INTO users(userName,first_name,last_name,email,address,phone) VALUES(
									${req.body.phone},
									${req.body.first_name},
									${req.body.last_name},
									${req.body.email},
									${req.body.address},
									${req.body.phone}) RETURNING id;`);
		console.log(result);
		res.status(200).json({
			status: true,
			result: result.rows,
			response: req.body,
			count: result.rowCount
		});
	}catch(error){
		res.status(500).json({
			status:false,
			message:'Unexpected server error',
			servermessage: error
		});
	}
});

module.exports = router;
