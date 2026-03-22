import 'dotenv/config';
import { betterAuth } from "better-auth";
import { Pool } from "pg";
import { expo } from '@better-auth/expo';
import { SignJWT, importPKCS8 } from 'jose';

async function generateAppleClientSecret() {
  const privateKey = await importPKCS8(
    (process.env.APPLE_PRIVATE_KEY as string).replace(/\\n/g, '\n'),
    'ES256',
  );
  return new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: process.env.APPLE_KEY_ID as string })
    .setIssuedAt()
    .setIssuer(process.env.APPLE_TEAM_ID as string)
    .setAudience('https://appleid.apple.com')
    .setSubject(process.env.APPLE_CLIENT_ID as string)
    .setExpirationTime('180d')
    .sign(privateKey);
}

export const auth = betterAuth({
  advanced: {
    database: {
      generateId: () => crypto.randomUUID(),
    },
  },
  plugins: [expo()],
  trustedOrigins: [
    'kyx-dev://',
    'kyx://',
    'kyx-dev://*',
    'kyx://*',
    'https://appleid.apple.com',
    'https://app-kyx.fr',
  ],
  basePath: '/auth',
  database: new Pool({
    host: process.env.POSTGRES_HOST,
    port: Number(process.env.POSTGRES_PORT),
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD ?? '',
    database: process.env.POSTGRES_DATABASE,
    ssl: process.env.POSTGRES_SSL === 'true',
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const name =
            user.name === user.email ? (null as unknown as string) : user.name;
          return { data: { ...user, name } };
        },
      },
    },
  },
  user: {
    deleteUser: {
      enabled: true,
    },
    additionalFields: {
      gender: {
        type: 'string',
        required: false,
        returned: true,
      },
      avatarOptions: {
        type: 'string',
        required: false,
        returned: true,
      },
      coins: {
        type: 'number',
        required: false,
        returned: true,
        input: true,
        defaultValue: 0,
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 365,
    updateAge: 60 * 60 * 24 * 7,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      redirectURI: `${process.env.BETTER_AUTH_URL}/auth/callback/google`,
    },
    apple: {
      clientId: process.env.APPLE_CLIENT_ID as string,
      clientSecret: await generateAppleClientSecret(),
      appBundleIdentifier: process.env.APPLE_APP_BUNDLE_IDENTIFIER as string,
    },
  },
});