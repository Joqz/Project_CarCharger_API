const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const passport = require('passport');
const app = express();
const db = require('./Connection');
const port = 4000;

var Strategy = require('passport-http').BasicStrategy;

const saltRounds = 4;

app.use(bodyParser.json());
app.use(cors())

passport.use(new Strategy((username, password, cb) => {
  db.query('SELECT id, username, password FROM users WHERE username = ?', [username]).then(dbResults => {

    if(dbResults.length == 0)
    {
      return cb(null, false);
    }

    bcrypt.compare(password, dbResults[0].password).then(bcryptResult => {
      if(bcryptResult == true)
      {
        cb(null, dbResults[0]);
      }
      else
      {
        return cb(null, false);
      }
    })

  }).catch(dbError => cb(err))
}));

app.post('/getchargehistory',
        //passport.authenticate('basic', { session: false }),
        (req, res) => {
          db.query('SELECT chargehistory FROM users WHERE username = (?)', [req.params.username]).then(results => {
            let stringresults = JSON.stringify(results);
            let trimmedresults1 = stringresults.substr(19, stringresults.length);
            let trimmedresults2 = trimmedresults1.substr(0,trimmedresults1.length -3);
            res.json("Here is your charge history:" + trimmedresults2);
          })
        });

app.post('/chargehistory', (req, res) => {
  let chargehistory = req.body.chargehistory.trim() + ", ";

  if((typeof chargehistory === "string") &&
    (chargehistory.length > 4))
  {
    db.query('UPDATE users SET chargehistory = CONCAT(?, chargehistory) WHERE username = (?)', [chargehistory, req.body.username])  
    .then(dbResults => {
        console.log(dbResults);
        res.sendStatus(201);
    })
    .catch(error => res.sendStatus(500));
  }
  else {
    console.log("error");
    res.sendStatus(400);
  }
  })


app.get('/users', (req, res) => {
  db.query('SELECT id, username FROM users').then(results => {
    res.json(results);
  })
})

app.get('/users/:id',
        passport.authenticate('basic', { session: false }),
        (req, res) => {
          db.query('SELECT id, username FROM users WHERE id = ?', [req.params.id]).then(results => {
            res.json(results);
          })
        });

app.post('/users', (req, res) => {
  let username = req.body.username.trim();
  let password = req.body.password.trim();

  if((typeof username === "string") &&
     (username.length > 4) &&
     (typeof password === "string") &&
     (password.length > 6))
  {
    bcrypt.hash(password, saltRounds).then(hash =>
      db.query('INSERT INTO users (username, password) VALUES (?,?)', [username, hash])
    )
    .then(dbResults => {
        console.log(dbResults);
        res.sendStatus(201);
    })
    .catch(error => res.sendStatus(500));
  }
  else {
    console.log("incorrect username or password, both must be strings and username more than 4 long and password more than 6 characters long");
    res.sendStatus(400);
  }
})


/* DB init */
Promise.all(
  [
      db.query(`CREATE TABLE IF NOT EXISTS users(
          id INT AUTO_INCREMENT PRIMARY KEY,
          username VARCHAR(32),
          password VARCHAR(256),
          chargehistory VARCHAR(256)
      )`)
      // Add more table create statements if you need more tables
  ]
).then(() => {
  console.log('database initialized');
  app.listen(port, () => {
      console.log(`Example API listening on http://localhost:${port}\n`);
  });
})
.catch(error => console.log(error));