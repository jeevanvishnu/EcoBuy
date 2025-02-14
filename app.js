import express, { urlencoded } from "express";
const app = express();
import dotEnv from "dotenv";
const Port = process.env.PORT || 3000;
import { fileURLToPath } from "url";
import db from "./config/db.js";
import path from "path";
import userRouter from "./router/userRouter/userRouter.js";
import session from "express-session";
import passport from "./config/passport.js";
import adminRouter from './router/adminRouter/adminRouter.js'

// ENV config
dotEnv.config();
// connect to Database
db();

// setup filename
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Setup Session
app.use(session({
  secret:process.env.SECRECT_KEY,
  resave:false,
  saveUninitialized:true,
  cookie:{
    secure:false,
    httpOnly:true,
    maxAge:72*60*60*1000
  }
}))

// set cache control
app.use((req,res,next)=>{
  res.set('cache-control','no-store')
  next()
})

// view engine setup
app.set('views', path.join(__dirname, 'views')) 
app.set('view engine', 'ejs') 
app.use(express.static(path.join(__dirname, "public")));

app.use("/", userRouter);
app.use('/admin',adminRouter)

// Error handling
app.use((err , req , res, next)=>{
  res.status(500).send({error:err.message})
  next()
})

// passport middleware
app.use(passport.initialize())
app.use(passport.session())

app.listen(Port, () =>
  console.log(`THE PORT HAS BEEN RUNNING ON ${Port}`)
);

export default app;
