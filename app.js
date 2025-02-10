const express = require('express')
const app = express()
require('dotenv').config()
const Port = process.env.PORT || 3000
const db = require('./config/db')
db()
app.listen(Port || 3000,()=>console.log(`THE PORT HAS BEEN RUNNING ON ${Port}`))

module.exports = app