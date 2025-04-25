import passport from 'passport'
import dotEnv from 'dotenv'
import User from '../models/userSchema.js'
dotEnv.config()
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';


passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECERT,
    callbackURL: 'https://ecobuy-pz4m.onrender.com/auth/google/callback'
},
    async function (accessToken, refreshToken, profile, done) {
        try {
            let user = await User.findOne({ googleId: profile.id })
            if (user) {
                return done(null, user)

            } else {
                user = new User({
                    name: profile.displayName,
                    email: profile.emails && profile.emails.length > 0 ? profile.emails[0].value : null,
                    googleId: profile.id
                })
                await user.save()
                return done(null, user)
            }


        } catch (error) {

            return done(error, null)
        }
    }

))

passport.serializeUser((user, done) => {
    done(null, user.id)
})

passport.deserializeUser((id, done) => {
    User.findById(id)
        .then((user) => {
            done(null, user)
        })
        .catch((error) => {
            done(error, null)
        })
})

export default passport


