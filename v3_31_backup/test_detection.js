function detectLanguage(text) {
  if (!text) return 'en';
  
  // French: Check for French-specific patterns first (more specific)
  if (/[àâäéèêëïîôöùûüÿçÀÂÄÉÈÊËÏÎÔÖÙÛÜŸÇ]/.test(text) || 
      /\b(le|la|les|du|des|avec|pour|dans|sur|cette|ces|ceci|bonjour|français|merci|oui|non|où|donc|soit)\b/i.test(text)) {
    return 'fr';
  }
  
  // Spanish: Check for Spanish-specific patterns (after French to avoid conflicts)
  if (/[ñáéíóúüÑÁÉÍÓÚÜ¿¡]/.test(text) || 
      /\b(el|la|los|las|del|y|con|por|para|esta?|esto|hola|cómo|qué|dónde|cuándo|español|habla|sí|gracias)\b/i.test(text)) {
    return 'es';
  }
  
  return 'en';
}

const testCases = [
  'Bonjour, ceci est un test du widget de sélection v',
  'Bonjour, ceci est un test du widget',
  'le système de coaching',
  'ceci est important',
  'Hola, esta es una prueba',
  'Hello, this is a test'
];

testCases.forEach(text => {
  console.log(`"${text}" -> ${detectLanguage(text)}`);
});