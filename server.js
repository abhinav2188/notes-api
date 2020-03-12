const express = require('express');
const app = express();
const bodyParser = require('body-parser');

app.use(bodyParser.urlencoded({extended:true}));

const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost/NotesDB', {useNewUrlParser: true, useUnifiedTopology: true});
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  console.log('database connection established');
});

const User = mongoose.model('user',{
    username : String,
    password : String
});

let defaultUser = new User({
    username : 'abhi',
    password : 'note123'
});



//defaultUser.save().then(()=>console.log("default user saved"));

const port = 5000;
app.listen(port,() => {console.log("backend server started at port "+port)});

app.get('/',function(req,res){
    res.send("Notes APP Backend");
});

app.post('/register',function(req,res){
    let newUser = new User({
        username : req.body.username,
        password : req.body.password
    });
    console.log(req.body.username);

    User.find({username : newUser.username}).then( ()=> res.status(200).json({error : 'user already exists', user: newUser}), 
    () => {
        newUser.save().then( () => res.status(200).json({msg: 'new user saved',user: newUser}));
    });

})