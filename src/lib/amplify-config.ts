// Amplify configuration utilities
export const isAmplifyConfigured = (): boolean => {
  return typeof window !== 'undefined' && (window as any).__amplify_outputs__;
};

export const getAmplifyConfig = () => {
  if (isAmplifyConfigured()) {
    return (window as any).__amplify_outputs__;
  }
  return null;
};

export const isDevelopmentMode = (): boolean => {
  return !isAmplifyConfigured();
};