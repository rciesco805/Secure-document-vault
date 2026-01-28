import Rollbar from 'rollbar';

const codeVersion = process.env.VERCEL_GIT_COMMIT_SHA || 
                    process.env.REPL_ID || 
                    'development';

const baseConfig: Rollbar.Configuration = {
  captureUncaught: true,
  captureUnhandledRejections: true,
  environment: process.env.NODE_ENV || 'development',
  codeVersion,
  payload: {
    client: {
      javascript: {
        source_map_enabled: true,
        code_version: codeVersion,
        guess_uncaught_frames: true,
      },
    },
    server: {
      root: 'webpack://bf-fund-dataroom/',
    },
  },
};

const clientToken = process.env.NEXT_PUBLIC_ROLLBAR_CLIENT_TOKEN;

export const clientConfig: Rollbar.Configuration = {
  accessToken: clientToken || 'disabled',
  enabled: !!clientToken,
  ...baseConfig,
  captureIp: 'anonymize',
  verbose: process.env.NODE_ENV === 'development',
};

const serverToken = process.env.ROLLBAR_SERVER_TOKEN;

export const serverInstance = new Rollbar({
  accessToken: serverToken || 'disabled',
  enabled: !!serverToken,
  ...baseConfig,
  verbose: process.env.NODE_ENV === 'development',
});

export function setRollbarUser(user: { id: string; email?: string; username?: string }) {
  serverInstance.configure({
    payload: {
      person: {
        id: user.id,
        email: user.email,
        username: user.username,
      },
    },
  });
}

export function clearRollbarUser() {
  serverInstance.configure({
    payload: {
      person: undefined,
    },
  });
}
