require("dotenv").config();
const express = require('express');
const app = express();
// require('./db/conn');
// const Register = require('./models/models');
const path = require("path");
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const auth = require("./middleware/auth")
var multer = require('multer');
const port = process.env.PORT || 3000;



const {spawn} = require('child_process'); 
// EXPRESS SPECIFIC STUFF
app.use('/static', express.static('static')) // For serving static files 
app.use(express.urlencoded({ extended: true })) //To extract the data from the website to the app.js file

// app.use('/css', express.static(path.join(__dirname, '../node_modules/bootstrap/dist/css'))) 
// app.use('/js', express.static(path.join(__dirname, '../node_modules/bootstrap/dist/js'))) 
// app.use('/jq', express.static(path.join(__dirname, '../node_modules/jquery/dist'))) 
app.use(cookieParser())

// PUG SPECIFIC STUFF
app.set('view engine', 'pug') // Set the template engine as pug
app.set('views', path.join(__dirname, './views')) // Set the views directory

var Storage= multer.diskStorage({
  destination:"",
  filename:(req,file,cb)=>{
    cb(null,"input.mp4");
  }
});




app.post('/videoupload',async (req, res, next)=> {
  
  // var videoupload = multer({
  //   storage:Storage
  // }).single('file');
  

  
  // videoupload(req, res, function(err) {
  //   var imageFile=req.file.filename;
  //   var success =req.file.filename+ " uploaded successfully";
  //   console.log("File uploaded");
  //   res.status(200).redirect("/pred");
  // })

  var upload = multer({
    storage: Storage}).single('file');
  
    upload(req, res, function(err) {
    console.log("File uploaded");
  })
  
  // console.log(req.body);
  // console.log(req.body)
  
  console.log("Processing Video");
  res.status(200).redirect("/pred");

});

// Home Page 
app.get("/", (req, res) => {
  res.render("index.pug")
});


app.get('/pred', async (req, res) => {
  var x;
  
  const childpython=spawn('python',['./static/Python/pysrc.py']);
  await childpython.stdout.on('data',(data)=>{
    
    x=data.toString();

    console.log(x);
    
    res.status(200).redirect("/static/my_output.avi");
  });
  childpython.stderr.on('data',(data)=>{
    x=data.toString();

    console.log(x);
  

  });
})



// rendering login page
app.get("/login", (req, res) => {
  res.render("login.pug")
});

// verifying user credentials with database credentials
app.post("/login", async (req, res) => {
  try {
    const email = req.body.email;
    const password = req.body.password;

    const useremail = await Register.findOne({ email: email })
    const isMatch = await bcrypt.compare(password, useremail.password)

    const token = await useremail.generateAuthToken();

    res.cookie("jwt", token, {
      expires: new Date(Date.now() + 30000000),
      httpOnly: true,
      //secure: true
    })

    if (isMatch) {
      res.status(201).redirect("/admin1")
    }
    else {
      res.status(200).render("login.pug", { 'err': "Invalid Credentials" ,"email": req.body.email})
      // res.status(201).redirect("/login")
      // res.status(400).send("invalid credentials")

    }
  } catch (error) {
    res.status(200).render("login.pug", { 'err': "Invalid Credentials" ,"email": req.body.email})
    // res.status(201).redirect("/login")
  }
});


// rendering admin page 
app.get('/admin1', auth, async (req, res) => {
  await showDocument();
  res.status(200).render('admin1.pug', object);
})





// delelting token and removing cookies for current user only
app.get("/logout", auth, async (req, res) => {
  try {
    console.log(req.user)
    try {
      req.user.tokens = req.user.tokens.filter((currentElement) => {
        return currentElement.token !== req.token
      })

    } catch (error) {
      console.log(error)
    }

    res.clearCookie('jwt');
    await req.user.save();

    res.redirect("/login")
  } catch (error) {
    res.status(500).send(error)
  }
});

// deleting tokens from database to logout all users 
app.get("/logoutall", auth, async (req, res) => {
  try {
    console.log(req.user)
    try {
      req.user.tokens = []
    } catch (error) {
      console.log(error)
    }

    res.clearCookie('jwt');
    await req.user.save();

    res.redirect("/login")
  } catch (error) {
    res.status(500).send(error)
  }

});

// rendering add new admin page
app.get("/register", auth, (req, res) => {
  res.render("register.pug")
});

// Posting data of new admin to database
app.post('/register', auth, async (req, res) => {
  try {
    email=req.body.email;
    name=req.body.name;
    phone=req.body.phone;
    if (req.body.password === req.body.confirmPassword) {
      var myData = new Register(req.body);
      console.log(myData)

      const token = await myData.generateAuthToken();

      // res.cookie("jwt", token, {
      //   expires: new Date(Date.now() + 30000),
      //   httpOnly: true
      // })

      await myData.save()
      res.status(201).redirect("/admin1");
    }
    else {
      var err = "Passwords donot match";
      res.status(200).render("register.pug", { 'err': err, 'email':email,'name':name,'phone':phone});
      // res.send("Passwords Donot Match");
    }
  } catch (error) {
      var email=req.body.email;
      var name=req.body.name;
      var phone=req.body.phone;
      res.status(200).render("register.pug", { 'err': "Cannot Add Admin Try Again", 'email':email,'name':name,'phone':phone});
    // res.status(400).send("unable to save to database");
  }
})

//listening on specified Port
app.listen(port, () => {
  console.log(`server is running at port ${port}`);
});
