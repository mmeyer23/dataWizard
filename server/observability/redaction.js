export const REDACTED = '[redacted]';

/**
 * Redacts credential-bearing values from text before logs or responses are
 * built. Keep this utility dependency-light so every boundary can use it.
 *
 * @param {unknown} value
 * @returns {string}
 */
export const redactSensitiveText = (value) => {
  if (typeof value !== 'string') return '';

  return value
    .replace(/postgres(?:ql)?:\/\/[^\s'")]+/gi, `postgres://${REDACTED}`)
    .replace(/password=[^&\s'")]+/gi, `password=${REDACTED}`)
    .replace(/OPENAI_API_KEY\s*=\s*[^\s'")]+/gi, `OPENAI_API_KEY=${REDACTED}`)
    .replace(/Bearer\s+[A-Za-z0-9._~+/-]+=*/gi, `Bearer ${REDACTED}`);
};

/**
 * @param {Record<string, unknown>} event
 * @returns {Record<string, unknown>}
 */
export const redactLogEvent = (event) =>
  Object.fromEntries(
    Object.entries(event).map(([key, value]) => [
      key,
      typeof value === 'string' ? redactSensitiveText(value) : value,
    ])
  );
