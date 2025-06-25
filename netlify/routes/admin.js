const express = require('express');
const router = express.Router();
const {Pool} = require('pg');
const bcrypt = require('bcrypt');
const multer = require('multer');
const jwt = require('jsonwebtoken');

// define storage for uploading files
const storage = multer.diskStorage({
    destination: function(req,file,cb){
        cb(null,'public/products/');
    },
    filename:function(req,file,cb){
        var product = req.body.product;
        var date = Date.now();
        if(file){
          //rename the file to avoid conflict
          cb(null,product.name+'-'+date.toString()+'.'+file.originalname.split('.')[1]);
        }
    }
});

const upload = multer({storage: storage});

const salt = process.env.SALT;

const pool = new Pool({
  host: process.env.HOST,
  user: process.env.DBUSER,
  password: process.env.PASSWORD,
  database: process.env.DATABASE,
  port: process.env.PORT,
  ssl: {rejectUnauthorized:false}
});

router.post('/admin/login', async(req, res) => {
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
				const {id,first_name,last_name,email,address,password,phone,user_type} = result.rows[0];
				if(bcrypt.compareSync(req.body.password,password)){
					const token = jwt.sign({
						id:id,first_name:first_name,last_name:last_name,email:email,address:address,password:password,phone:phone,user_type:user_type,
					}, salt, { expiresIn: '1h' });
					res.status(200).json({
						status: true,
						result: {id:id,token:token},
						message: 'Logged In successfully'
					});		
				}else{
					res.status(200).json({
						status: false,
						message: 'Password is incorrect'
					});
				}
			}else{
				res.status(404).json({
					status: false,
					message: 'User Not found'
				});
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

router.post('/admin/users',async(req,res)=>{
	try{
		const result = await pool.query(`SELECT id,first_name,last_name,email,address,phone,last_login,createdAt FROM users ORDER BY createdAt DESC;`);
		res.status(200).json({
			status: true,
			result: result.rows,
			count: result.rowCount
		});
	}catch(error){
		res.status(500).json({
			status: false,
			message: error.message
		});
	}
});

router.post('/admin/products',async(req,res)=>{
	try{
		const filter = req.body;
		const query = `SELECT p.id, p.name, p.description, p.price, p.quantity, p.image, p.slug, json_agg(json_build_object('category_id',c.id,'category_name',c.name)) as categories FROM products p 
				LEFT JOIN product_categories pc ON p.id=pc.product_id
				LEFT JOIN categories c ON c.id=pc.category_id
				WHERE
				${filter.search ? `(p.description ILIKE '%${filter.search}%' OR p.name ILIKE '%${filter.search}%') AND`:''}
				${filter.price ? `p.price BETWEEN ${filter.from} AND ${filter.to} AND ` : ''}
				${filter.quantity ? `p.quantity<${filter.quantity} AND`: ''}
				1=1 GROUP BY p.id LIMIT ${filter.limit} OFFSET ${filter.offset};`;
		const result = await pool.query(query);
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

router.post('/admin/products/add', upload.single('image'), async (req, res) => {
	const imageUrl = '/public/products/'+req.file.filename;
	const slug = req.body.name.toLowerCase().replaceAll(' ','-');
	try{
		const query = `INSERT INTO products(name, description, price, quantity, image, slug) VALUES ('${req.body.name}','${req.body.description}',${req.body.price},'${req.body.quantity}','${imageUrl}','${slug}');`;
		const result = await pool.query(query);
		res.status(200).json({
			status: true,
			result: result,
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

router.post('/admin/products/update', async (req, res) => {
	try{
		if(req.body.image){
			var imageUrl = '';
		}
		if(req.body.name){
			var slug = req.body.name.replaceAll(' ','-');
		}
		const result = await pool.query(`UPDATE products SET 
				${req.body.name ? `name=${req.body.name},`:''}
				${req.body.name ? `slug=${slug},`:''}
				${req.body.description ? `description=${req.body.description},`:''} 
				${req.body.price ? `price=${req.body.price},`:''} 
				${req.body.quantity ? `quantity=${req.body.quantity},`:''} 
				${req.body.image ? `image=${imageUrl},`:''} 1=1;`);
		res.status(200).json({
			status: true,
			result: result,
		});
	}catch(error){
		res.status(500).json({
			status:false,
			message:'Unexpected server error',
			servermessage: error.message
		});
	}
});

router.post('/admin/products/delete/:id',async (req,res)=>{
	try{
		const result = await pool.query(`DELETE * FROM products WHERE id=${req.params.id};`);
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

router.post('/admin/orders',async(req,res)=>{
	try{
		const filter = req.body.filter;
		const result = await pool.query(`SELECT 
				o.id AS order_id,
				o.order_date,
				o.status,
				o.total_amount,
				o.voucher_code,
				o.shipping_address,
				json_agg(
					json_build_object(
					'product_id', p.id,
					'name', p.name,
					'image', p.image,
					'quantity', oi.quantity,
					'amount', oi.amount
					)
				) AS items
				FROM 
				orders o
				JOIN 
				order_items oi ON o.id = oi.order_id
				JOIN 
				products p ON oi.product_id = p.id
				WHERE
				${filter.status ? ` o.status = '${filter.status}' AND`:''} 
				1=1
				GROUP BY 
				o.id, o.order_date, o.status, o.total_amount, o.voucher_code, o.shipping_address
				ORDER BY 
				o.order_date DESC;`);
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

router.post('/admin/categories',async(req,res)=>{
	try{
		const result = await pool.query(`SELECT * FROM categories WHERE name LIKE %${req.body.search}%;`);
		if(result.rows){
			res.status(200).json({
				status: true,
				result: result.rows
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

router.post('/admin/categories/add',async(req,res)=>{
	try{
		const result = await pool.query(`INSERT INTO categories(name) VALUES(${req.body.name});`);
		if(result.rows){
			res.status(200).json({
				status: true,
				result: result.rows
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

router.post('/admin/categories/delete/:id',async(req,res)=>{
	try{
		const result = await pool.query(`DELETE FROM categories WHERE id=${req.params.id};`);
		res.status(200).json({
			status: true,
			message: 'Deleted Successfully'
		});
	}catch(error){
		res.status(500).json({
			status:false,
			message: 'Unexpected server error',
			servermessage: error.message
		});
	}
});

router.post('/admin/categories/update',async(req,res)=>{
	try{
		const result = await pool.query(`UPDATE categories SET name='${req.body.name}' WHERE id=${req.body.id};`);
		res.status(200).json({
			status: true,
			message: 'Category Updated Successfully'
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
