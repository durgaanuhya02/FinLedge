import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { findOrCreateGoogleUser } from '../modules/auth/auth.service';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/auth/google/callback';

// Only register strategy if credentials are configured
if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_ID !== 'your-google-client-id') {
  passport.use(
    new GoogleStrategy(
      {
        clientID: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        callbackURL: GOOGLE_CALLBACK_URL,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) return done(new Error('No email returned from Google'));

          const user = await findOrCreateGoogleUser({
            googleId: profile.id,
            email,
            name: profile.displayName || email.split('@')[0],
          });
          // Map to Express.User shape
          done(null, { userId: user.id, role: user.role });
        } catch (err) {
          done(err as Error);
        }
      }
    )
  );
} else {
  console.log('[Passport] Google OAuth not configured — set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to enable');
}

export default passport;
