/**
 * Environment Detection Utility
 *
 * Provides environment-aware constants and helpers for dual-environment publishing system.
 * Distinguishes between localhost development and production (Vercel) environments.
 */

/**
 * Detect if running in production (Vercel)
 * Vercel automatically sets VERCEL=1 in production environments
 */
export const IS_PRODUCTION = process.env.VERCEL === '1';

/**
 * Detect if running on localhost
 * Inverse of IS_PRODUCTION
 */
export const IS_LOCALHOST = !IS_PRODUCTION;

/**
 * Vercel deploy hook URL for triggering rebuilds
 * Required for production article publishing
 *
 * Setup instructions:
 * 1. Go to Vercel Dashboard → Project Settings → Git → Deploy Hooks
 * 2. Create hook: "CMS Article Publish" on "main" branch
 * 3. Add URL to VERCEL_DEPLOY_HOOK_URL env var
 */
export const DEPLOY_HOOK_URL = process.env.VERCEL_DEPLOY_HOOK_URL;

/**
 * Check if deploy hook is configured
 * Used to verify production publishing will work
 */
export const isDeployHookConfigured = (): boolean => {
  return !!DEPLOY_HOOK_URL && DEPLOY_HOOK_URL.startsWith('https://');
};

/**
 * Get environment name for logging
 */
export const getEnvironmentName = (): string => {
  if (IS_PRODUCTION) return 'production';
  if (process.env.NODE_ENV === 'development') return 'development';
  return 'unknown';
};

/**
 * Get publishing method based on environment
 */
export const getPublishingMethod = (): 'database' | 'filesystem' => {
  return IS_PRODUCTION ? 'database' : 'filesystem';
};

/**
 * Check if git operations are available
 * Only available in localhost environment
 */
export const isGitAvailable = (): boolean => {
  return IS_LOCALHOST;
};

/**
 * Check if filesystem writes are available
 * Only available in localhost environment (Vercel is read-only)
 */
export const isFilesystemWritable = (): boolean => {
  return IS_LOCALHOST;
};

/**
 * Environment info for debugging
 */
export const getEnvironmentInfo = () => ({
  environment: getEnvironmentName(),
  isProduction: IS_PRODUCTION,
  isLocalhost: IS_LOCALHOST,
  publishingMethod: getPublishingMethod(),
  deployHookConfigured: isDeployHookConfigured(),
  gitAvailable: isGitAvailable(),
  filesystemWritable: isFilesystemWritable(),
});

/**
 * Log environment info (useful for debugging)
 */
export const logEnvironmentInfo = () => {
  const info = getEnvironmentInfo();
  console.log('========================================');
  console.log('Environment Info:');
  console.log('----------------------------------------');
  console.log(`Environment:          ${info.environment}`);
  console.log(`Is Production:        ${info.isProduction}`);
  console.log(`Is Localhost:         ${info.isLocalhost}`);
  console.log(`Publishing Method:    ${info.publishingMethod}`);
  console.log(`Deploy Hook Config:   ${info.deployHookConfigured}`);
  console.log(`Git Available:        ${info.gitAvailable}`);
  console.log(`Filesystem Writable:  ${info.filesystemWritable}`);
  console.log('========================================');
};
