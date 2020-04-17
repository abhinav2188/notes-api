require('dotenv').config();
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');
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
app.use(cors());

// mongoose.connect('mongodb://localhost/NotesDB', {useNewUrlParser: true, useUnifiedTopology: true});
mongoose.connect('mongodb+srv://KeeperAdmin:Admin@keeper@cluster0-levub.mongodb.net/notesDB', {useNewUrlParser: true, useUnifiedTopology: true});
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
    isLoggedIn : Boolean,
    lastLoggedIn : Date,
    notes : [{
        created : Date,
        updated : Date,
        title : String,
        content : String
    }],
});

// let user1 = new User({
//     email: "test@user.com",
//     username : "testUser1",
//     hash : bcrypt.hashSync("test@001",salt),
//     created : new Date(),
//     isLoggedIn : true,
//     lastLoggedIn : new Date(),
//     notes:[]
// });
// user1.save().then( () => console.log("user saved"));

const port = 5000;
app.listen(port,() => {console.log("backend server started at port "+port)});

app.get('/',function(req,res){
    res.send('API Working');
    // if(req.session.user){
    //     res.send('Logged in as '+req.session.user.email);
    // }else{
    //     res.send('not authenticated');
    // }
});

app.get('/users' , function(req,res){
    User.find({},function(err,foundUsers){
        if(err){
            res.status(400).json({msg:"error fetching users"});
        }else{
            res.status(200).json({users : foundUsers})
        }
    })
});

app.get('/user', function(req,res){
    // console.log(req.query.id);
    if(!req.query.id)
    res.status(400).json({msg:"specify user id"});
    else
    User.findById(req.query.id , function(err, foundUser){
        if(err){
            res.status(400).json({msg:"error fetching users"});
        }
        else{
            let user = {
                username : foundUser.username,
                email : foundUser.email,
                created : foundUser.created
            }
            res.status(200).json({user:user});
        }
    })
});

app.post('/register',function(req,res){
    let newUser = new User({
        email: req.body.email,
        username : req.body.username,
        hash : bcrypt.hashSync(req.body.password,salt),
        created : new Date(),
        isLoggedIn : true,
        lastLoggedIn : new Date(),
        notes:[]
    });

    User.findOne({email : req.body.email},function(err,foundUser){
        if(!foundUser){
            newUser.save(function(err){
                if(!err){
                    // req.session.user = newUser;
                    res.status(200).json({msg: 'New user registerd',userId: newUser._id});
                }
            });
        }
        else{
            res.status(400).json({errorMsg : 'email already registered'});
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
            res.status(400).json({errorMsg : 'error logging in'})
        }else{
            if(!foundUser){
                res.status(400).json({errorMsg : 'User not found'})
            }else{
                if(!bcrypt.compareSync(user.password,foundUser.hash))
                res.status(400).json({errorMsg : 'incorrect password'});
                else{
                    foundUser.lastLoggedIn = Date.now();
                    // req.session.user = foundUser;
                    User.updateOne({_id : foundUser._id},{lastLoggedIn : foundUser.lastLoggedIn, isLoggedIn:true});
                    res.status(200).json({msg:'user found',userId:foundUser._id});
                }
            }
        }
    })
});

app.post('/logout',function(req,res){
    User.findByIdAndUpdate(req.body.id, {isLoggedIn : false}, (err) => {
        if(err){
            res.status(400).json({msg:'error logging out'})
        }else{
            res.status(200).json({msg:'user logged out'});
        }
    })
});

app.get('/notes', function(req,res){
    let userId = req.query.id;
    User.findById(userId , function(err,result){
        if(err){
            res.status(400).json({errorMsg:'error fetching notes'});
        }else{
            res.status(200).json({notes: result.notes});
        }
    });
})
app.post('/addnote', function(req,res){
    // console.log('addnote request');
    if(!req.query.id||!req.body.content)
    res.status(400).json({errorMsg : 'note content not present'});
    else{
        let userId = req.query.id;
        // console.log(userId);
        let note = {
            title: req.body.title,
            content : req.body.content,
            created : Date.now(),
            updated : Date.now()
        };
        // console.log(req.body);
        User.findOne({_id: userId}, function(err,foundUser){
            if(err){
                res.status(400).json({errorMsg : 'error in saving note'});
                return;
            }
            if(foundUser){
                foundUser.notes.push(note);
                User.updateOne({_id:userId},{notes : foundUser.notes}, function(err){
                    if(!err)
                    res.status(200).json({msg:'note added'});
                });
            }else{
                res.status(400).json({errorMsg : 'error in saving note'});
            }
        });
    }
});

app.delete('/deleteNote', function(req,res){
    let userId = req.query.userId;
    let noteId = req.query.noteId;
    User.findOne({_id: userId}, function(err,foundUser){
        if(err){
            res.status(400).json({errorMsg : 'error in deleting note'});
        }
        if(foundUser){
            let updatedNotes = foundUser.notes.filter(note => note._id != noteId);
            foundUser.notes = updatedNotes;
            User.updateOne({_id:userId},{notes : foundUser.notes}, function(err){
                if(!err)
                res.status(200).json({msg:'note deleted'});
            });
        }else{
            res.status(400).json({errorMsg : 'error in deleting note'});
        }
    });
});