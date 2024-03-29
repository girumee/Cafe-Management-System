const express = require('express');
const connection = require('../connection');
const router = express.Router();

const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
require('dotenv').config();
var auth = require('../services/Authentication');
var checkRole = require('../services/checkRole');

router.post('/signup',(req,res) =>{
    let user = req.body;
    query = "select email,password,role,status from user where email=?"
    connection.query(query,[user.email],(err,results)=>{
        if(!err){
            if(results.length <=0){
                query = "insert into user(name,contactNumber,email,password,status,role) values(?,?,?,?,'false','user')"
                connection.query(query,[user.name,user.contactNumber,user.email,user.password],(err,results) =>{
                if(!err){
                    return res.status(200).json({message: "Successfully Registered"});
                }
                else{
                    return res.status(500).json(err);
                }
                })
            }
            else {
                return res.status(400).json({message: "Email Already Exist."});
            }
        }
    else{
        return res.status(500).json(err);
        }
    })
    
})

router.post('/login',(req,res) =>{
    const user = req.body;
    query = "select email,password,role,status from user where email=?";
    connection.query(query,[user.email],(err,results)=>{
        if(!err){
            if(results.length <=0 || results[0].password !=user.password){
                return res.status(401).json({message: "incorrect username or password"});
            }
            else if(results[0].status === 'false'){
                return res.status(401).json({message: "Wait for Admin Approval"});
            }
            else if(results[0].password == user.password){
                const response = { email: results[0].email, role: results[0].role}
                const accesstoken = jwt.sign(response, process.env.ACCESS_TOKEN, {expiresIn: '8h'})
                res.status(200).json({ token: accesstoken});
            }
            else{
                return res.status(400).json({message: "Something went wrong. Please try again later"});
            }
        }
        else{
            return res.status(500).json(err);        }
    })
})

var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth:{
        user: process.env.EMAIL,
        pass: process.env.PASSWORD
    }
})

router.post('/forgetPassword',(req,res)=>{
    const user = req.body;
    query = "select email,password from user where email=?"
    connection.query(query,[user.email],(err,results)=>{
        if(!err){
            if(results.length <=0)
            {
                return res.status(200).json({massege: "Password successfully sent to your email."});
            }
        else{
            var mailoptions ={
                from: process.env.EMAIL,
                to: results[0].email,
                subject: 'Password by Cafe Management System',
                html: '<p><b>Your Login details for Cafe Management System</b><br><b>Email: </b>'+results[0].email+'<br><b>password: </b>'+results[0].password+'<br><a href="http://localhost:4200/">click here to login</a></p>'
            };
        }
            transporter.sendMail(mailoptions,function(error,info){
                if(error){
                    console.log(error);
                }
                else{
                    console.log('Email sent: '+info.respose);
                }
            });
            return res.status(200).json({message: "Password sent succcessfully to your email"});
        }
        else {
        return res.status(500).json(err);
        }
    })
})

router.get("/get",auth.authenticateToken,checkRole.checkRole,(req,res)=>{
    var query = "select id,name, email,contactNumber,status from user where role='user'";
    connection.query(query,(err,results)=>{
        if(!err){
            return res.status(200).json(results);
        }
        else{
            return res.status(500).json(err);
        }
    })
})

router.patch("/update",auth.authenticateToken,checkRole.checkRole,(req,res)=>{
    let user = req.body;
    var query = "update user set status=? where id=?";
    connection.query(query,[user.status,user.id],(err,results)=>{
        if(!err){
            if(results.affectedRows == 0){
                return res.status(400).json({message: "User id not Exist"});
            }
            return res.status(200).json({message: "User Updated Successfully"});
        }
        else{
            return res.status(500).json(err);
        }
    }) 
})

router.get('/checkToken',auth.authenticateToken,(req,res)=>{
    return res.status(200).json({message: "true"});
})

router.post('/changePassword',auth.authenticateToken,(req,res)=>{
    const user = req.body;
    const email = res.locals.email;
    console.log(email);
    var query = "select *from user where email=? and Password=?";
    connection.query(query,[email,user.oldPassword],(err,results)=>{
        if(!err){
            if(results.length <=0){
                return res.status(400).json({message: "Incorrect Old Password"});
            }
            else if(results[0].password ==  user.oldPassword){
                query = "update user set password=? where email=?";
                connection.query(query,[user.newPassword,email],(err,results)=>{
                    if(!err){
                        return res.status(200).json({message: "Password Updated Successfully."})
                    }
                    else{
                        return res.status(500).json(err);
                    }
                })
            }
            else{
                return res.status(400).json({message: "Something went wrong. Please try again later"});
            }
        }
        else{
            return res.status(500).json(err);
        }
    })
})


module.exports = router;