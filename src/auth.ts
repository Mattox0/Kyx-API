import 'dotenv/config';
import { betterAuth } from "better-auth";
import { Pool } from "pg";
import { expo } from '@better-auth/expo';

export const auth = betterAuth({
  advanced: {
    database: {
      generateId: () => crypto.randomUUID(),
    },
  },
  plugins: [expo()],
  trustedOrigins: ["kyx-dev://", "kyx://", 'kyx-dev://*', 'kyx://*'],
  basePath: '/auth',
  database: new Pool({
    host: process.env.POSTGRES_HOST,
    port: Number(process.env.POSTGRES_PORT),
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD ?? "",
    database: process.env.POSTGRES_DATABASE,
    ssl: process.env.POSTGRES_SSL === "true",
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
          const friendCode = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
          const name = user.name === user.email ? null as unknown as string : user.name;
          return { data: { ...user, name, friendCode } };
        },
      },
    },
  },
  user: {
    deleteUser: {
      enabled: true
    },
    additionalFields: {
      gender: {
        type: "string",
        required: false,
        returned: true,
      },
      avatarOptions: {
        type: "string",
        required: false,
        returned: true,
      },
      friendCode: {
        type: "string",
        required: false,
        returned: true,
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
  },
});