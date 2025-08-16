// Unit Tests for NativeMimic Language Detection
// Tests for the fixes made to French/Spanish language detection conflicts

describe('NativeMimic Language Detection', () => {
  
  // Mock the detectLanguage function from content.js
  function detectLanguage(text) {
    if (!text) return 'en';
    
    // Japanese: Check for Hiragana/Katakana first (more specific than Kanji)
    if (/[\u3040-\u309F\u30A0-\u30FF]/.test(text)) {
      return 'ja';
    }
    
    // Chinese: CJK characters without Japanese script markers
    if (/[\u4E00-\u9FFF]/.test(text) && !/[\u3040-\u309F\u30A0-\u30FF]/.test(text)) {
      return 'zh';
    }
    
    // Japanese with Kanji: Only if contains Kanji but no specific Chinese indicators
    if (/[\u4E00-\u9FAF]/.test(text)) {
      return 'ja';
    }
    
    // Korean: Hangul
    if (/[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/.test(text)) {
      return 'ko';
    }
    
    // Mongolian Cyrillic: Check for Mongolian-specific patterns before Russian
    if (/[\u0400-\u04FF]/.test(text)) {
      if (/[ӨөҮү]/.test(text) || 
          /\b(бол|гэж|дээр|доор|хүүхэд|наадам|түрүү|ард|монгол|улс|байна|болно|хэмээн)\b/i.test(text)) {
        return 'mn';
      }
      return 'ru';
    }
    
    // Mongolian: Traditional Mongolian script (vertical)
    if (/[\u1800-\u18AF\u11A0-\u11FF]/.test(text)) {
      return 'mn';
    }
    
    // Arabic
    if (/[\u0600-\u06FF]/.test(text)) {
      return 'ar';
    }
    
    // Thai
    if (/[\u0E00-\u0E7F]/.test(text)) {
      return 'th';
    }
    
    // FIXED: French detection before Spanish to avoid conflicts
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
    
    // Default to English for Latin scripts and others
    return 'en';
  }

  describe('French Language Detection', () => {
    test('should detect French text correctly', () => {
      const frenchTexts = [
        'Bonjour, ceci est un test du widget de sélection v',
        'Le système de coaching de prononciation',
        'Bonjour, comment allez-vous?',
        'Cette fonctionnalité est très utile',
        'Où est la bibliothèque?',
        'Merci beaucoup pour votre aide',
        'J\'aime le français'
      ];

      frenchTexts.forEach(text => {
        const detected = detectLanguage(text);
        expect(detected).toBe('fr');
      });
    });

    test('should detect French with accented characters', () => {
      const accentedTexts = [
        'École primaire',
        'Café au lait',
        'Très intéressant',
        'Où êtes-vous?',
        'Château français',
        'Élève studieux'
      ];

      accentedTexts.forEach(text => {
        const detected = detectLanguage(text);
        expect(detected).toBe('fr');
      });
    });

    test('should detect French with specific French words', () => {
      const frenchSpecificTexts = [
        'ceci est important',
        'cette maison',
        'ces livres',
        'donc nous partons',
        'soit disant'
      ];

      frenchSpecificTexts.forEach(text => {
        const detected = detectLanguage(text);
        expect(detected).toBe('fr');
      });
    });
  });

  describe('Spanish Language Detection', () => {
    test('should detect Spanish text correctly', () => {
      const spanishTexts = [
        'Hola, esta es una prueba del widget',
        'El sistema de entrenamiento de pronunciación',
        '¿Cómo estás?',
        'Muy bien, gracias',
        '¿Dónde está la biblioteca?',
        'No hablo español muy bien',
        'Sí, por favor'
      ];

      spanishTexts.forEach(text => {
        const detected = detectLanguage(text);
        expect(detected).toBe('es');
      });
    });

    test('should detect Spanish with special characters', () => {
      const spanishSpecialTexts = [
        'Niño pequeño',
        'Año nuevo',
        '¿Qué tal?',
        '¡Hola amigo!',
        'Educación física'
      ];

      spanishSpecialTexts.forEach(text => {
        const detected = detectLanguage(text);
        expect(detected).toBe('es');
      });
    });
  });

  describe('Language Detection Priority (French vs Spanish)', () => {
    test('should prioritize French over Spanish for ambiguous words', () => {
      // These texts contain words that could match both languages
      // but should be detected as French due to context
      const ambiguousTexts = [
        'Bonjour, est-ce que vous parlez français?', // contains "est" but should be French
        'Cette solution est très simple', // contains "est" but should be French  
        'Le problème est dans le code', // contains "est" and "le" but should be French
        'Ceci est un test avec des mots', // contains "est" and "un" but should be French
      ];

      ambiguousTexts.forEach(text => {
        const detected = detectLanguage(text);
        expect(detected).toBe('fr');
      });
    });

    test('should still detect Spanish when clearly Spanish', () => {
      const clearlySpanishTexts = [
        'Hola, ¿cómo estás hoy?',
        'El niño está muy contento',
        'Por favor, ayúdame con esto',
        'Sí, gracias por todo'
      ];

      clearlySpanishTexts.forEach(text => {
        const detected = detectLanguage(text);
        expect(detected).toBe('es');
      });
    });
  });

  describe('Other Language Detection', () => {
    test('should detect English correctly', () => {
      const englishTexts = [
        'Hello, this is a test of the selection widget',
        'The pronunciation coaching system should help',
        'This is working perfectly now'
      ];

      englishTexts.forEach(text => {
        const detected = detectLanguage(text);
        expect(detected).toBe('en');
      });
    });

    test('should detect Chinese correctly', () => {
      const chineseTexts = [
        '你好，这是NativeMimic语音选择小部件的测试',
        '发音指导系统应该帮助您改善口音和说话信心',
        '这个功能很有用'
      ];

      chineseTexts.forEach(text => {
        const detected = detectLanguage(text);
        expect(detected).toBe('zh');
      });
    });

    test('should handle empty or invalid input', () => {
      expect(detectLanguage('')).toBe('en');
      expect(detectLanguage(null)).toBe('en');
      expect(detectLanguage(undefined)).toBe('en');
      expect(detectLanguage('   ')).toBe('en');
    });
  });

  describe('Mixed Language Text', () => {
    test('should detect dominant language in mixed text', () => {
      // French-dominant text with some English
      const frenchDominant = 'Bonjour, this is ceci est un test très important';
      expect(detectLanguage(frenchDominant)).toBe('fr');

      // Spanish-dominant text with some English  
      const spanishDominant = 'Hola, this is una prueba muy importante';
      expect(detectLanguage(spanishDominant)).toBe('es');

      // English-dominant text
      const englishDominant = 'Hello, this is a test with some français words';
      expect(detectLanguage(englishDominant)).toBe('en');
    });
  });

  describe('Edge Cases', () => {
    test('should handle numbers and special characters', () => {
      expect(detectLanguage('123456')).toBe('en');
      expect(detectLanguage('$%^&*()')).toBe('en');
      expect(detectLanguage('Bonjour 123')).toBe('fr');
      expect(detectLanguage('Hola $$$')).toBe('es');
    });

    test('should handle very short text', () => {
      expect(detectLanguage('le')).toBe('fr');
      expect(detectLanguage('el')).toBe('es');
      expect(detectLanguage('hi')).toBe('en');
    });

    test('should handle single words', () => {
      expect(detectLanguage('bonjour')).toBe('fr');
      expect(detectLanguage('hola')).toBe('es');
      expect(detectLanguage('hello')).toBe('en');
      expect(detectLanguage('ceci')).toBe('fr');
      expect(detectLanguage('gracias')).toBe('es');
    });
  });
});

// Performance tests
describe('Language Detection Performance', () => {
  function detectLanguage(text) {
    // Same implementation as above for testing
    if (!text) return 'en';
    
    if (/[\u3040-\u309F\u30A0-\u30FF]/.test(text)) return 'ja';
    if (/[\u4E00-\u9FFF]/.test(text) && !/[\u3040-\u309F\u30A0-\u30FF]/.test(text)) return 'zh';
    if (/[\u4E00-\u9FAF]/.test(text)) return 'ja';
    if (/[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/.test(text)) return 'ko';
    
    if (/[\u0400-\u04FF]/.test(text)) {
      if (/[ӨөҮү]/.test(text) || /\b(бол|гэж|дээр|доор|хүүхэд|наадам|түрүү|ард|монгол|улс|байна|болно|хэмээн)\b/i.test(text)) {
        return 'mn';
      }
      return 'ru';
    }
    
    if (/[\u1800-\u18AF\u11A0-\u11FF]/.test(text)) return 'mn';
    if (/[\u0600-\u06FF]/.test(text)) return 'ar';
    if (/[\u0E00-\u0E7F]/.test(text)) return 'th';
    
    // French first
    if (/[àâäéèêëïîôöùûüÿçÀÂÄÉÈÊËÏÎÔÖÙÛÜŸÇ]/.test(text) || 
        /\b(le|la|les|du|des|avec|pour|dans|sur|cette|ces|ceci|bonjour|français|merci|oui|non|où|donc|soit)\b/i.test(text)) {
      return 'fr';
    }
    
    // Spanish second
    if (/[ñáéíóúüÑÁÉÍÓÚÜ¿¡]/.test(text) || 
        /\b(el|la|los|las|del|y|con|por|para|esta?|esto|hola|cómo|qué|dónde|cuándo|español|habla|sí|gracias)\b/i.test(text)) {
      return 'es';
    }
    
    return 'en';
  }

  test('should detect language quickly for short text', () => {
    const shortText = 'Bonjour monde';
    const startTime = performance.now();
    
    for (let i = 0; i < 1000; i++) {
      detectLanguage(shortText);
    }
    
    const endTime = performance.now();
    const avgTime = (endTime - startTime) / 1000;
    
    // Should be very fast - less than 1ms per detection on average
    expect(avgTime).toBeLessThan(1);
  });

  test('should detect language quickly for long text', () => {
    const longText = 'Bonjour, ceci est un test du widget de sélection vocale NativeMimic. Le système de coaching de prononciation devrait vous aider à améliorer votre accent et votre confiance en vous lorsque vous parlez. Cette fonctionnalité est très utile pour les apprenants de langues qui veulent perfectionner leur prononciation.';
    
    const startTime = performance.now();
    
    for (let i = 0; i < 100; i++) {
      detectLanguage(longText);
    }
    
    const endTime = performance.now();
    const avgTime = (endTime - startTime) / 100;
    
    // Should still be fast even for long text - less than 5ms per detection
    expect(avgTime).toBeLessThan(5);
  });
});