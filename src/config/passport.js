import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/User.js';

passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: process.env.GOOGLE_CALLBACK_URL,
        },
        async (accessToken, refreshToken, profile, done) => {
            const { id, displayName, emails } = profile;

            if (!emails || emails.length === 0) {
                return done(new Error('No email associated with this Google account'), null);
            }

            const email = emails[0].value;

            try {
                // Check if user already exists
                let user = await User.findOne({
                    $or: [{ googleId: id }, { email: email }]
                });

                if (user) {
                    // Update googleId if not present (user registered with email before)
                    if (!user.googleId) {
                        user.googleId = id;
                        // Avoid password validation issue even if it's there
                        await User.updateOne({ _id: user._id }, { $set: { googleId: id } });
                    }
                    return done(null, user);
                }

                // If not, create new user
                user = await User.create({
                    name: displayName,
                    email: email,
                    googleId: id,
                    password: Math.random().toString(36).slice(-10), // Dummy password to bypass validation
                });

                return done(null, user);
            } catch (err) {
                return done(err, null);
            }
        }
    )
);

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});

export default passport;
