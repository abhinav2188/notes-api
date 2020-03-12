require('dotenv').config();
const express = require('express');
const app = express();
const bodyParser = require('body-parser');

app.use(bodyParser.urlencoded({extended:true}));

const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const expressSession = require('express-session');
const bcrypt = require('bcryptjs');
var salt = bcrypt.genSaltSync(10);

app.use(cookieParser());
app.use(expressSession({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: true
}));

mongoose.connect('mongodb://localhost/NotesDB', {useNewUrlParser: true, useUnifiedTopology: true});
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  console.log('database connection established');
});

const User = mongoose.model('user',{
    email : String,
    username : String,
    hash : String,
    created : Date,
    lastLoggedIn : Date,
});

const port = 5000;
app.listen(port,() => {console.log("backend server started at port "+port)});

app.get('/',function(req,res){
    if(req.session.user){
        res.send('Logged in as '+req.session.user.email);
    }else{
        res.send('not authenticated');
    }
});

app.post('/register',function(req,res){
    let newUser = new User({
        email: req.body.email,
        username : req.body.username,
        hash : bcrypt.hashSync(req.body.password,salt),
        created : new Date(),
        lastLoggedIn : new Date()
    });

    User.findOne({email : req.body.email},function(err,foundUser){
        if(!foundUser){
            newUser.save(function(err){
                if(!err){
                    req.session.user = newUser;
                    res.status(200).json({msg: 'new user saved',user: newUser});
                }
            });
        }
        else{
            res.status(200).json({error : 'email already registered', user: foundUser});
        }
    });
});

app.post('/login', function(req,res){
    let user = {
        email: req.body.email,
        password : req.body.password
    };
    User.findOne({email : user.email} , function(err,foundUser){
        if(err){
            res.status(401).json({error : 'error logging in'})
        }else{
            if(!foundUser){
                res.status(400).json({error : 'User not found'})
            }else{
                if(!bcrypt.compareSync(user.password,foundUser.hash))
                res.status(400).json({error : 'incorrect password'});
                else{
                    foundUser.lastLoggedIn = Date.now();
                    req.session.user = foundUser;
                    User.updateOne({_id : foundUser._id},{lastLoggedIn : foundUser.lastLoggedIn}, (err,updated) => {
                        if(!err)
                        console.log('user loggedin time updated');
                        else
                        res.send(err);
                    });
                    res.status(200).json({msg:'user found',user:foundUser});
                }
            }
        }
    })
});