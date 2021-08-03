const express = require('express')
const handlebars = require('express-handlebars')
const bodyParser = require('body-parser')
const flash = require('connect-flash')
const session = require('express-session')
const methodOverride = require('method-override')
const cors = require('cors')
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config()
}

const helpers = require('./_helpers')
require('./models')
require('./utils/handlebars-helper')
const passport = require('./config/passport')

const app = express()
const port = process.env.PORT || 3000

app.use(cors())

app.engine(
  'handlebars',
  handlebars({
    defaultLayout: 'main',
    helpers: require('./config/handlebars-helpers')
  })
)
app.set('view engine', 'handlebars')
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())
app.use(session({ secret: 'secret', resave: false, saveUninitialized: false }))
app.use(passport.initialize())
app.use(passport.session())
app.use(flash())
app.use(methodOverride('_method'))
app.use('/upload', express.static(__dirname + '/upload'))
app.use(express.static('public'))
app.use(function (req, res, next) {
  if (!req.session.views) {
    req.session.views = {}
  }
  next()
})

app.use((req, res, next) => {
  res.locals.successMsg = req.flash('successMsg')
  res.locals.errorMsg = req.flash('errorMsg')
  res.locals.warningMsg = req.flash('warningMsg')
  res.locals.errors = req.flash('errors')
  res.locals.userInput = req.flash('userInput')
  res.locals.user = helpers.getUser(req)
  next()
})

app.listen(port, () => {
  console.log(`App is listening at http://localhost:${port}`)
})

require('./routes')(app)

module.exports = app
