// E-Signature Theme Types
// Defines theming options for signature components

export interface SignatureTheme {
  // Canvas colors
  canvasBackground: string;
  canvasBorder: string;
  
  // Pen options
  penColor: string;
  penWidth: number;
  
  // Typed signature
  signatureFont: string;
  signatureFontSize: number;
  
  // UI elements
  primaryColor: string;
  accentColor: string;
  textColor: string;
  mutedTextColor: string;
  
  // Branding
  companyName?: string;
  logoUrl?: string;
}

export const defaultSignatureTheme: SignatureTheme = {
  canvasBackground: '#1f2937',
  canvasBorder: '#4b5563',
  penColor: '#ffffff',
  penWidth: 2,
  signatureFont: 'Dancing Script, cursive',
  signatureFontSize: 32,
  primaryColor: '#3b82f6',
  accentColor: '#10b981',
  textColor: '#ffffff',
  mutedTextColor: '#9ca3af',
};

export const lightSignatureTheme: SignatureTheme = {
  canvasBackground: '#ffffff',
  canvasBorder: '#d1d5db',
  penColor: '#1e40af',
  penWidth: 2,
  signatureFont: 'Dancing Script, cursive',
  signatureFontSize: 32,
  primaryColor: '#3b82f6',
  accentColor: '#10b981',
  textColor: '#111827',
  mutedTextColor: '#6b7280',
};

// Preset pen colors for user selection
export const penColorOptions = [
  { id: 'black', color: '#000000', label: 'Black' },
  { id: 'blue', color: '#1e40af', label: 'Blue' },
  { id: 'darkblue', color: '#1e3a8a', label: 'Navy' },
  { id: 'white', color: '#ffffff', label: 'White' },
];

// Preset pen widths
export const penWidthOptions = [
  { id: 'thin', width: 1, label: 'Thin' },
  { id: 'normal', width: 2, label: 'Normal' },
  { id: 'medium', width: 3, label: 'Medium' },
  { id: 'thick', width: 4, label: 'Thick' },
];

// Signature font options
export const signatureFontOptions = [
  { id: 'dancing', font: 'Dancing Script, cursive', label: 'Elegant' },
  { id: 'great-vibes', font: 'Great Vibes, cursive', label: 'Formal' },
  { id: 'pacifico', font: 'Pacifico, cursive', label: 'Casual' },
  { id: 'sacramento', font: 'Sacramento, cursive', label: 'Script' },
  { id: 'allura', font: 'Allura, cursive', label: 'Classic' },
];
