// @ts-check

const DEFAULT_PORT = 3000;

/**
 * @typedef {object} AppConfig
 * @property {string} openAiApiKey
 * @property {number} port
 */

/**
 * @param {Record<string, string | undefined>} env
 * @returns {AppConfig}
 */
export const loadConfig = (env) => {
  const openAiApiKey = env.OPENAI_API_KEY?.trim();
  if (!openAiApiKey) {
    throw new Error('OPENAI_API_KEY is required.');
  }

  const port = parsePort(env.PORT);

  return Object.freeze({
    openAiApiKey,
    port,
  });
};

/**
 * @param {string | undefined} value
 * @returns {number}
 */
const parsePort = (value) => {
  if (value === undefined || value.trim() === '') return DEFAULT_PORT;

  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535.');
  }

  return port;
};
