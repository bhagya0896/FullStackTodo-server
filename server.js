require('dotenv').config();

const express = require('express')
const app = express()

//data parsing
app.use(express.json())

const bcrypt = require('bcrypt');
const port = process.env.PORT|| '8080';

const cors = require('cors')
app.use(cors());

const JWT = require("jsonwebtoken");
const JWT_SECRET= process.env.JWT_KEY;

//mongodb
const mongodb = require('mongodb')
const mongoClient = mongodb.MongoClient;
const objectId = mongodb.ObjectID

const dbUrl = process.env.DB_URL || 'mongodb://127.0.0.1:27017'


app.get("/",(req,res)=>{
  res.send("Welcome to My App")
})

//register route
app.post ('/register',async(req,res)=>
{
  const client = await mongoClient.connect(dbUrl);
  if(client)
  {
    try{
  
      let {userName,password}= req.body;
     
         //validation 
       
         if ( !userName || !password )
           return res.send({ message: "Please enter all required fields." });
          
         if (password.length < 6)
           return res.send({
             message: "Please enter a password of at least 6 characters.",
           });
           let client = await mongoClient.connect(dbUrl);
           let db = client.db('tododb');
         let existingUser = await db.collection('users').findOne({"userName" : userName});
        
         if(existingUser)
         {
             return res.send({
              message: "An account with this email already exists, kindly login!!",
               })
         }
     
         else{
     
             // Hash the password
     
                let salt = await bcrypt.genSalt();
                let hashedpassword  = await bcrypt.hash(req.body.password,salt);
                req.body.password=hashedpassword;
     
                // Insert  new user data to db
     
                let newUser = await db.collection('users').insertOne(req.body);
                 
                if(newUser){ 
         
               res.send({message:' Registered successfully.'});
              
                 }
         }
         client.close();
         }catch(error)
         {
             console.log(error);
             client.close();
         }
  }
  
});

//login route
app.post('/login',   async (req, res) => {
    const client = await mongoClient.connect(dbUrl);
    if(client)
    { try 
      {
       
      let { userName, password } = req.body;
      // validate
      if (!userName || !password)
        return res
         .send({ message: "Please enter all required fields." });
  
      let client = await mongoClient.connect(dbUrl);
      let db = client.db('tododb');
      let user = await db.collection('users').findOne({ "userName": userName });
      if (user) { // password validation
  
        let Isvalid = await bcrypt.compare(password, user.password)
  
        if (Isvalid) {
   // signin the token 

   let token = await JWT.sign({ id: user._id,userName: user.userName },JWT_SECRET );
     console.log(`login :::: ${token}`)
   return res.send({message:'Login successful!!',token : token});
  
        }
  
        else {
          res.send({ message: 'Login unsuccessful !!' })
        }
      }
      else{
          res.send({message:"User Does Not Exists, kindly register. "});// 401 unauthorized
      }
        client.close();
      }catch (error) {
        console.log(error);
        client.close();
      };}
   
    });
  

    //middleware function-authentication
    async function auth(req,res,next){

      console.log(req.headers.authorization);
          if(req.headers.authorization!==undefined)
          {
              JWT.verify(req.headers.authorization,
                  JWT_SECRET,
                  (err,decode)=>{
                      if(decode!==undefined){
                          req.body.userName=decode.userName;       
                          next();
                      }else{
                          res.send({message:"Invalid token."});
                      }
                  });
          }else{
              res.send({message:"No token."})
          }
    }
    
    
  //getTodos route
app.get('/todos' , auth,async (req,res)=>
{
   const client = await mongoClient.connect(dbUrl)
   if(client){
       try{
        const db = client.db('tododb');
        const todos =  await db.collection('todos').find({userName:req.body.userName}).toArray();
        if(todos)
        {
          res.send(todos);
          console.log(`entered todos : ${todos}`);
        }
 
        client.close();
       
       }catch(error)
       {
           console.log(error)
           res.send({message : "Error occured while fetching todos."});
           client.close();
       }
   }
 
});

//addTodos route
app.post('/add-todo' , auth,async (req,res)=>
{
   const client = await mongoClient.connect(dbUrl)
   if(client){
       try{

        const db = client.db('tododb'); 
        let addTodo = await db.collection('todos').insertOne(req.body);
        if(addTodo)
        {
          res.send({message:"Todo added successfully."});
          console.log(`Added todos : ${addTodo}`)
        }
        
        client.close();
       
       }catch(error)
       {
           console.log(error)
           res.send({message : "Error occured while adding todo."});
           client.close();
       }
   }
 
});

//updating todo route
app.put('/update-todo/:id' ,auth, async (req,res)=>
{
   const client = await mongoClient.connect(dbUrl)
   if(client){
       try{
         const {id} = req.params;
         const db = client.db('tododb');
         let updateTodo = await db.collection('todos').updateOne({"_id":objectId(id)} ,{$set:{"title":req.body.title,
          "completed":req.body.completed}});
          console.log(updateTodo)
          if(updateTodo)
          {
            res.send({message:"Todo updated successfully."});
            console.log(`Updated todos : ${updateTodo}`);
          }
       
       client.close();
       }catch(error)
       {
           console.log(error)
           res.send({message : "Error occured while updating todo."});
           client.close();
       }
   }
 
});

//deleting todo route
app.delete('/delete-todo/:id' , auth,async (req,res)=>
{
   const client = await mongoClient.connect(dbUrl)
   if(client){
       try{
        const {id} = req.params;
        const db = client.db('tododb');
        let deleteTodo = await db.collection('todos').deleteOne({"_id":objectId(id)});
        if(deleteTodo)
        {
          res.send({message:"Todo deleted successfully."});
          console.log(" todo deleted successfully ");
        }
       client.close();
       }catch(error)
       {
           console.log(error)
           res.send({message : "error occured while deleting todo "});
           client.close();
       }
   }
 
});

//setting up of port
app.listen(port , ()=>{
    console.log(`App started & running on port ${port}`)
})
