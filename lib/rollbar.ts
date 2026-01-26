import Rollbar from 'rollbar';

const baseConfig = {
  captureUncaught: true,
  captureUnhandledRejections: true,
  environment: process.env.NODE_ENV || 'development',
};

const clientToken = process.env.NEXT_PUBLIC_ROLLBAR_CLIENT_TOKEN;

export const clientConfig = {
  accessToken: clientToken || 'disabled',
  enabled: !!clientToken,
  ...baseConfig,
};

const serverToken = process.env.ROLLBAR_SERVER_TOKEN;

export const serverInstance = new Rollbar({
  accessToken: serverToken || 'disabled',
  enabled: !!serverToken,
  ...baseConfig,
});
