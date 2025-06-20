const express = require('express');
const router = express.Router();
const {Pool} = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');


const saltRounds = 10;
const salt = bcrypt.genSaltSync(saltRounds);

const token = jwt.sign({
  id: 1,
  username: 'GFG'
}, salt, { expiresIn: '1h' });

console.log(token);

jwt.verify(token, salt, (err, decoded) => {
    if (err) {
      console.log('Token is invalid');
    } else {
      console.log('Decoded Token:', decoded);
    }
});

const pool = new Pool({
  host: process.env.HOST,
  user: process.env.DBUSER,
  password: process.env.PASSWORD,
  database: process.env.DATABASE,
  port: process.env.PORT,
  ssl: {rejectUnauthorized:false}
});

router.get('/salt',async(req,res)=>{
	res.status(200).json({
		salt:salt
	});
})

router.post('/user/login', async(req, res) => {
	try{
		if(!req.body.phone){
			res.status(200).json({
				status: false,
				message:'Phone is required',
			});	
		}else if(!req.body.password){
			res.status(200).json({
				status: false,
				message:'Password is required',
			});	
		}else{
			const result = await pool.query(`SELECT * FROM users WHERE phone='${req.body.phone}';`);
			if(result.rowCount){
				const {id,first_name,last_name,email,address,password,phone} = result.rows[0];
				if(bcrypt.compareSync(req.body.password,password)){
					res.status(200).json({
						status: true,
						result: {id:id,first_name:first_name,last_name:last_name,email:email,address:address,phone:phone},
						message: 'Logged In successfully'
					});		
				}else{
					res.status(200).json({
						status: false,
						message: 'Password is incorrect'
					});
				}
			}
		}
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
		let date = new Date();
		if(!req.body.first_name){
			res.status(200).json({
				status: false,
				message:'First Name is required',
			});
		}else if(!req.body.last_name){
			res.status(200).json({
				status: false,
				message:'Last Name is required',
			});
		}else if(!req.body.email){
			res.status(200).json({
				status: false,
				message:'Email id is required',
			});
		}else if(!req.body.phone){
			res.status(200).json({
				status: false,
				message:'Phone is required',
			});	
		}else if(!req.body.password){
			res.status(200).json({
				status: false,
				message:'Password is required',
			});	
		}else{
			let password = bcrypt.hashSync(req.body.password,salt);
			const result = await pool.query(`INSERT INTO users(first_name,last_name,email,address,phone,password,createdAt) VALUES(
				'${req.body.first_name}',
				'${req.body.last_name}',
				'${req.body.email}',
				'${req.body.address}',
				'${req.body.phone}',
				'${password}',
				'${date.toISOString()}');`);
			
			res.status(200).json({
				status: true,
				message:'Registered Successfully',
			});
		}
	}catch(error){
		if(error.code=='23505'){
			res.status(200).json({
				status:false,
				message:'This phone number is already used',
				servermessage: error.message,
			});
		}else{
			res.status(500).json({
				status:false,
				message:'Unexpected server error',
				servermessage: error.message,
			});
		}
	}
});

router.get('/products/search', async (req, res) => {
	try{
		const filter = req.body;
		const query = `SELECT p.*, json_agg(json_build_object('category_id',c.id,'category_name',c.name)) as categories FROM products p 
				JOIN product_categories pc ON p.id=pc.product_id
				JOIN categories c ON c.id=pc.category_id
				WHERE
				${filter.search ? `(description LIKE '%${filter.search}%' OR name LIKE '%${filter.search}%') AND`:''}
				${filter.price ? `price BETWEEN ${filter.from} AND ${filter.to} AND ` : ''}
				${filter.quantity ? `quantity<${filter.quantity} AND`: ''}
				1=1 LIMIT ${filter.limit} OFFSET ${filter.offset} GROUP BY p.id;`;

		const result = await pool.query(query);
		console.log(result.rows);
		res.status(200).json({
			status: true,
			result: result.rows,
			count: result.rowCount,
		});
	}catch(error){
		console.log(error);
		res.status(500).json({
			status:false,
			message:'Unexpected server error',
			servermessage: error.message
		});
	}
});

router.get('/products/search', async (req, res) => {
	try{
		const filter = req.body;
		const query = `SELECT p.*, json_agg(json_build_object('category_id',c.id,'category_name',c.name)) as categories FROM products p 
				JOIN product_categories pc ON p.id=pc.product_id
				JOIN categories c ON c.id=pc.category_id
				WHERE
				${filter.search ? `(description LIKE '%${filter.search}%' OR name LIKE '%${filter.search}%') AND`:''}
				${filter.price ? `price BETWEEN ${filter.from} AND ${filter.to} AND ` : ''}
				${filter.quantity ? `quantity<${filter.quantity} AND`: ''}
				1=1 LIMIT ${filter.limit} OFFSET ${filter.offset} GROUP BY p.id;`;

		const result = await pool.query(query);
		console.log(result.rows);
		res.status(200).json({
			status: true,
			result: result.rows,
			count: result.rowCount,
		});
	}catch(error){
		console.log(error);
		res.status(500).json({
			status:false,
			message:'Unexpected server error',
			servermessage: error.message
		});
	}
});

router.get('/products/:id',async (req,res)=>{
	try{
		const result = await pool.query(`SELECT * FROM products WHERE id=${req.params.id};`);
		res.status(200).json({
			status: true,
			result: result.rows[0]
		});
	}catch(error){
		res.status(500).json({
			status:false,
			message: 'Unexpected server error',
			servermessage: error.message
		});
	}
});

router.post('/cart/:user',async (req,res)=>{
	try{
		const result = await pool.query(`SELECT p.id, p.name, p.price, p.image , c.quantity FROM products p JOIN cart c ON p.id = c.product_id WHERE c.user_id=${req.params.user};`);
		res.status(200).json({
			status: true,
			result: result.rows[0]
		});
	}catch(error){
		res.status(500).json({
			status:false,
			message: 'Unexpected server error',
			servermessage: error.message
		});
	}
});

router.post('/cart/add',async (req,res)=>{
	try{
		const result = await pool.query(`INSERT INTO cart(product_id, user_id, quantity) VALUES(${req.body.product_id},${req.body.user_id},${req.body.quantity});`);
		res.status(200).json({
			status: true,
			result: result,
			message: 'Cart fetched successfully'
		});
	}catch(error){
		res.status(500).json({
			status:false,
			message: 'Unexpected server error',
			servermessage: error.message
		});
	}
});

router.post('/cart/update',async (req,res)=>{
	try{
		if(req.body.quantity == 0){
			const result = await pool.query(`DELETE FROM cart WHERE id=${req.body.cart_id};`);
			res.status(200).json({
				status: true,
				result: result
			});
		}else{
			const result = await pool.query(`UPDATE cart SET quantity=${req.body.quantity} WHERE id=${req.body.cart_id};`);
			res.status(200).json({
				status: true,
				result: result
			});
		}
	}catch(error){
		res.status(500).json({
			status:false,
			message: 'Unexpected server error',
			servermessage: error.message
		});
	}
});

router.post('/cart/delete/:id',async (req,res)=>{
	try{
		const result = await pool.query(`DELETE FROM cart WHERE id=${req.params.id};`);
		res.status(200).json({
			status: true,
			result: result
		});
	}catch(error){
		res.status(500).json({
			status:false,
			message: 'Unexpected server error',
			servermessage: error.message
		});
	}
});

router.post('/wishlist/:user',async (req,res)=>{
	try{
		const result = await pool.query(`SELECT p.id, p.name, p.price, p.image FROM products p JOIN wishlist w ON p.id = w.product_id WHERE w.user_id=${req.params.user};`);
		res.status(200).json({
			status: true,
			result: result.rows[0]
		});
	}catch(error){
		res.status(500).json({
			status:false,
			message: 'Unexpected server error',
			servermessage: error.message
		});
	}
});

router.post('/wishlist/add',async (req,res)=>{
	try{
		const result = await pool.query(`INSERT INTO wishlist(product_id,user_id) VALUES(${req.body.product_id},${req.body.user_id});`);
		res.status(200).json({
			status: true,
			result: result
		});
	}catch(error){
		if(error.code=='23505'){
			res.status(200).json({
				status: false,
				message: 'Already present in the wishlist',
				servermessage: error.message
			});
		}else{
			res.status(500).json({
				status:false,
				message: 'Unexpected server error',
				servermessage: error.message
			});
		}
	}
});

router.post('/wishlist/remove',async (req,res)=>{
	try{
		const result = await pool.query(`DELETE FROM wishlist WHERE product_id=${req.body.product_id} AND user_id=${req.body.user_id};`);
		res.status(200).json({
			status: true,
			result: result
		});
	}catch(error){
		res.status(500).json({
			status:false,
			message: 'Unexpected server error',
			servermessage: error.message
		});
	}
});

router.post('/orders/:id',async (req,res)=>{
	try{
		const result = await pool.query(`SELECT o.order_date, o.actual_amount, o.total_amount, o.voucher_code, o.status, o.shipping_address, COUNT(oi) as no_of_items FROM orders o JOIN order_items oi ON oi.order_id = o.id WHERE o.user_id=${req.params.user} GROUP BY o.status, o.id, o.order_date, o.actual_amount, o.total_amount, o.voucher_code, o.status, o.shipping_address ORDER BY o.order_date;`);
		res.status(200).json({
			status: true,
			result: result.rows
		});
	}catch(error){
		res.status(500).json({
			status:false,
			message: 'Unexpected server error',
			servermessage: error.message
		});
	}
});

router.post('/orders/add',async (req,res)=>{
	try{
		const result = await pool.query(`INSERT INTO orders (user_id,actual_amount,total_amount,voucher_code,status,shipping_address) VALUES () RETURNING id;`);
		res.status(200).json({
			status: true,
			result: result
		});
	}catch(error){
		res.status(500).json({
			status:false,
			message: 'Unexpected server error',
			servermessage: error.message
		});
	}
});

router.post('/order-details',async (req,res)=>{
	try{
		const result = await pool.query(`SELECT p.id as product_id, p.name as product_name, p.image, oi.quantity, oi.amount FROM order_items oi JOIN products p ON oi.product_id = p.id WHERE oi.order_id=${req.params.user};`);
		res.status(200).json({
			status: true,
			result: result.rows[0]
		});
	}catch(error){
		res.status(500).json({
			status:false,
			message: 'Unexpected server error',
			servermessage: error.message
		});
	}
});

router.post('/order-detail/create',async(req,res)=>{
	try{
		const {user_id,products,voucher_code,shipping_address,disount_price} = req.body;
		let actual_amount = 0;
		for(let i=0;i<products.length;i++){
			actual_amount = actual_amount + (products[i].price*products[i].quantity);
		}
		let discounted_amount = actual_amount-(actual_amount*(disount_price/100))
		const order = await pool.query(`INSERT INTO orders(user_id, actual_amount, total_amount, voucher_code, shipping_address) VALUES(
									${user_id},
									${actual_amount},
									${discounted_amount},
									${voucher_code},
									${shipping_address}) RETURNING *;`);
		console.log(order);
		const order_id = order.rows[0].id;
		let query = [];
		for (const prod in products) {
			query.push(`(${order_id}, ${prod.quantity}, ${prod.amount}, ${prod.product_id})`);
		}
		const result = await pool.query(`INSERT INTO order_items(order_id, quantity, amount, product_id) VALUES ${query.join(', ')};`);
		res.status(200).json({
			status: true,
			result: result.rows[0],
			order: order,
			messaeg: 'Order created successfully'
		});
		
	}catch(error){
		res.status(500).json({
			status:false,
			message: 'Unexpected server error',
			servermessage: error.message
		});
	}
});


module.exports = router;
