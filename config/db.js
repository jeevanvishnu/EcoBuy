import Mongoose from "mongoose"
import dotEnv from "dotenv"
dotEnv.config()
// Mongo db url
const URL = process.env.MONGODB_URL

// Connection on mongodb

const connectDb = async () =>{
    try {
       await Mongoose.connect((URL))
       console.log('Mongodb Connection sucessfull')
    } catch (error) {
        console.log(`Mongodb connection failed ${error.message}`)
        process.exit(1)
    }
}

export default  connectDb