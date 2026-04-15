export const theme = {
  primary: '#0066B3',
  primaryDark: '#004f8a',
  primaryLight: '#e8f2fa',
  buttonBg: '#0066B3',
  buttonText: '#ffffff',
  background: '#ffffff',
  surface: '#f8f9fa',
  border: '#dee2e6',
  text: '#212529',
  textMuted: '#6c757d',
  success: '#198754',
  danger: '#dc3545',
  warning: '#ffc107',
  fontFamily: "'Inter', 'Segoe UI', Arial, sans-serif",
  maxWidth: '480px',
  borderRadius: '8px',
  borderRadiusSm: '4px',
};

export const buttonStyle = {
  background: theme.buttonBg,
  color: theme.buttonText,
  border: 'none',
  borderRadius: theme.borderRadiusSm,
  padding: '8px 16px',
  cursor: 'pointer',
  fontFamily: theme.fontFamily,
  fontSize: '14px',
  fontWeight: '500',
};

export const inputStyle = {
  border: `1px solid ${theme.border}`,
  borderRadius: theme.borderRadiusSm,
  padding: '8px 12px',
  fontFamily: theme.fontFamily,
  fontSize: '14px',
  width: '100%',
  boxSizing: 'border-box',
};

export default theme;
