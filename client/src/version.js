// Stamped by the deploy workflow at build time; local builds show "dev".
export const CLIENT_VERSION = {
    version: process.env.REACT_APP_VERSION || 'dev',
    commit: process.env.REACT_APP_COMMIT || null,
    builtAt: process.env.REACT_APP_BUILT_AT || null,
};
