const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const cors = require('cors')
const mongoose = require('mongoose')
const schema = mongoose.Schema;
const shortid = require('shortid');

const usernameSchema = new schema({
  username: {type: String, required: true},
  _id: {
    type: String,
    default: shortid.generate
  }
});

const addExercisesSchema = new schema({
  userId: {type: String, required: true},
  description: {type: String, required: true},
  duration: {type: Number, required: true},
  date: {type: String}
})

const usernameModel = mongoose.model('usernameModel', usernameSchema);
const addExercisesModel = mongoose.model('addExercisesModel', addExercisesSchema); 

mongoose.connect(process.env.MLAB_URI, {useNewUrlParser: true} )
  .catch(error => console.error);

mongoose.connection.on('error', err => console.log(err) );

app.use(cors());
 
app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())


app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.post('/api/exercise/new-user', (req, res) => {
  const newUsernameModel = new usernameModel({
    username: req.body.username, 
  });
  
  usernameModel.find({username: req.body.username}, (err, usernameFinding, next) => {
    if (err) next(err);
    else if (!usernameFinding[0]) {
      newUsernameModel.save((err, data) => {
        if (err) res.json({'error saving username:' : err})
      });
      res.json({
        'username' : req.body.username,
        '_id': newUsernameModel._id
      });
    }
    else {
      res.send('username already taken')
    }
  });
});

app.post('/api/exercise/add', (req, res) => {
  const dateToSave = new Date( req.body.date || Date.now() ) 
  const newExerciseModel = new addExercisesModel({
    userId: req.body.userId,
    description: req.body.description,
    duration: req.body.duration,
    date: dateToSave.toDateString()
  });
  newExerciseModel.save((err, data) => {
    if (err) {
      res.json({'error saving exercise details:' : err});
    }
    else {
      res.json({
        _id: req.body.userId,
        description: req.body.description,
        duration: req.body.duration,
        date: req.body.date || dateToSave.toDateString()
      });
    }
  });
});

app.get('/api/exercise/users', (req, res) => {
  usernameModel.find({}, 'username _id ', (err, usernameFinding) => {
    res.json(usernameFinding);
  });
});

app.get('/api/exercise/log', (req, res) => {
  let fromDate = false;
  
  let toDate = false; 
  
  if (req.query.from) {
    fromDate = new Date(req.query.from);
  } 
  if (req.query.to){
    toDate = new Date(req.query.to);
  }
  const userId = req.query.userId;
  
  const returnObj = {};
  
  usernameModel.find({_id: userId }, (err, usernameFinding) => {
    return usernameFinding
  }).then( (usernameFinding) => {
    returnObj._id = usernameFinding[0]._id;
    returnObj.username = usernameFinding[0].username;
  });
  
   addExercisesModel.find({ userId: userId}, '-_id description duration date', (err, exerciseLogFinding) => {
     return exerciseLogFinding
   }).then( (exerciseLogFinding) => {
       const filteredExerciseLogFinding = []; 

       if (!fromDate && !toDate){
         returnObj.count = exerciseLogFinding.length ;
         returnObj.log = exerciseLogFinding;
       }

       else if (fromDate && toDate) {
         for (let obj of exerciseLogFinding) {
           const objDate = new Date(obj.date);
           if (fromDate <= objDate && objDate <= toDate){
             filteredExerciseLogFinding.push(obj);
           };
         };
       returnObj.log = filteredExerciseLogFinding;  
       }

       else if (fromDate && !toDate){
         for (let obj of exerciseLogFinding) {
           const objDate = new Date(obj.date);
           if (fromDate <= objDate){
             filteredExerciseLogFinding.push(obj);
           };
         };
       returnObj.log = filteredExerciseLogFinding;       
       }

       else {
         for (let obj of exerciseLogFinding) {
           const objDate = new Date(obj.date);
           console.log(toDate >= objDate);
           if (toDate >= objDate){
             filteredExerciseLogFinding.push(obj);
           };
         };
       returnObj.log = filteredExerciseLogFinding;    
       }

    res.json(returnObj);
  });
});


// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
