/**
 * Business Name Generator - Web Interface Version
 * Simplified version of the TypeScript component for browser use
 */

class BusinessNameGenerator {
    constructor(config, apiKeys = { domains: {}, trademarks: {} }) {
        this.config = {
            industry: config.industry || '',
            businessType: config.businessType || 'Multi-Venture',
            targetMarket: config.targetMarket || 'Both',
            keywords: config.keywords || [],
            avoidWords: config.avoidWords || [],
            maxLength: config.maxLength || 12,
            brandPersonality: config.brandPersonality || [],
            preferredTLDs: config.preferredTLDs || ['.com', '.ai'],
            budgetRange: config.budgetRange || 'standard',
            international: config.international !== false,
            requireSocialHandles: config.requireSocialHandles || false
        };
        
        this.apiKeys = apiKeys;
        this.cache = new Map();
    }

    // Advanced linguistic patterns based on naming research
    static NAMING_PATTERNS = {
        brandable: {
            prefixes: [
                'aero', 'apex', 'arc', 'atlas', 'axio', 'bio', 'core', 'cyber', 'digi', 'eco', 
                'evo', 'flex', 'flux', 'geo', 'helix', 'hyper', 'icon', 'kilo', 'lumi', 'mega', 
                'meta', 'nano', 'neo', 'nova', 'omni', 'peak', 'pixel', 'prime', 'proto', 'pura',
                'quantum', 'retro', 'sigma', 'sonic', 'spec', 'sync', 'tech', 'terra', 'ultra', 
                'vega', 'vertex', 'vibe', 'vox', 'wave', 'xen', 'zen', 'zeta'
            ],
            suffixes: [
                'ly', 'fy', 'zy', 'io', 'ai', 'ox', 'ex', 'ix', 'ax', 'ux', 'ara', 'era', 
                'ira', 'ora', 'ura', 'ent', 'ant', 'ist', 'ics', 'ify', 'ize', 'ate', 'ive',
                'ous', 'ing', 'ed', 'er', 'est', 'ish', 'ful', 'less', 'ness', 'ship', 'ward'
            ],
            roots: [
                'accord', 'apex', 'axiom', 'beacon', 'bridge', 'catalyst', 'compass', 'craft',
                'delta', 'echo', 'ember', 'flux', 'forge', 'frame', 'genesis', 'grid', 'helix',
                'icon', 'jovial', 'kinetic', 'lucid', 'matrix', 'nexus', 'orbit', 'prism',
                'quasar', 'radius', 'spark', 'stellar', 'summit', 'titan', 'unity', 'vector',
                'vertex', 'vortex', 'zenith', 'zone', 'beam', 'blade', 'bolt', 'branch', 'build',
                'cast', 'core', 'edge', 'flow', 'form', 'gear', 'grid', 'link', 'mesh', 'node',
                'path', 'rail', 'rise', 'root', 'seed', 'shift', 'span', 'tier', 'turn', 'vault'
            ]
        },
        compound: {
            techTerms: [
                'data', 'cloud', 'smart', 'auto', 'sync', 'flow', 'link', 'net', 'web', 'app',
                'code', 'byte', 'bit', 'core', 'hub', 'lab', 'sys', 'pixel', 'digital', 'cyber',
                'binary', 'logic', 'neural', 'quantum', 'virtual', 'nano', 'micro', 'macro'
            ],
            businessTerms: [
                'pro', 'plus', 'max', 'prime', 'elite', 'expert', 'master', 'super', 'ultra',
                'mega', 'micro', 'mini', 'rapid', 'instant', 'swift', 'smart', 'wise', 'sharp',
                'bright', 'clear', 'pure', 'true', 'real', 'best', 'top', 'high', 'peak'
            ],
            physicalTerms: [
                'wood', 'steel', 'iron', 'stone', 'brick', 'timber', 'beam', 'frame', 'build',
                'craft', 'forge', 'mill', 'shop', 'works', 'yard', 'bench', 'tool', 'gear',
                'joint', 'grain', 'plank', 'board', 'panel', 'block', 'solid', 'strong', 'firm'
            ],
            actionTerms: [
                'build', 'create', 'make', 'craft', 'forge', 'spark', 'launch', 'boost', 'drive',
                'power', 'fuel', 'grow', 'scale', 'optimize', 'enhance', 'improve', 'advance',
                'elevate', 'transform', 'evolve', 'develop', 'design', 'plan', 'shape', 'form'
            ]
        },
        abstract: {
            concepts: [
                'atlas', 'compass', 'meridian', 'zenith', 'vertex', 'prism', 'catalyst', 'nexus',
                'vortex', 'matrix', 'spectrum', 'paradigm', 'synthesis', 'kinetic', 'dynamic',
                'essence', 'element', 'foundation', 'cornerstone', 'keystone', 'milestone',
                'threshold', 'horizon', 'frontier', 'pinnacle', 'summit', 'apex', 'peak'
            ],
            emotions: [
                'harmony', 'clarity', 'serenity', 'vitality', 'energy', 'passion', 'vision',
                'wisdom', 'insight', 'brilliance', 'excellence', 'mastery', 'precision',
                'elegance', 'sophistication', 'refinement', 'innovation', 'creativity'
            ]
        }
    };

    async generateNames(count = 40) {
        const startTime = performance.now();
        const candidates = [];

        try {
            // Generate names across categories
            const rawNames = this.generateRawNames(count);
            
            // Analyze each name
            for (const nameData of rawNames) {
                const candidate = this.analyzeNameCandidate(nameData);
                candidates.push(candidate);
            }

            // Sort by overall score
            candidates.sort((a, b) => b.overallScore - a.overallScore);

            const processingTime = performance.now() - startTime;
            const metrics = this.calculateMetrics(candidates, processingTime);

            return {
                candidates: candidates.slice(0, count),
                metrics,
                recommendations: this.generateRecommendations(candidates)
            };

        } catch (error) {
            throw new Error(`Name generation failed: ${error.message}`);
        }
    }

    generateRawNames(count) {
        const names = [];
        const perCategory = Math.ceil(count / 4);

        // Generate brandable names (coined terms)
        names.push(...this.generateBrandableNames(perCategory));
        
        // Generate abstract/evocative names
        names.push(...this.generateAbstractNames(perCategory));
        
        // Generate compound names
        names.push(...this.generateCompoundNames(perCategory));
        
        // Generate descriptive names
        names.push(...this.generateDescriptiveNames(perCategory));

        return this.filterAndDeduplicateNames(names);
    }

    generateBrandableNames(count) {
        const names = [];
        const patterns = BusinessNameGenerator.NAMING_PATTERNS.brandable;

        for (let i = 0; i < count; i++) {
            const strategies = [
                // Prefix + Root combinations
                () => this.randomChoice(patterns.prefixes) + this.randomChoice(patterns.roots),
                // Root + Suffix combinations
                () => this.randomChoice(patterns.roots) + this.randomChoice(patterns.suffixes),
                // Prefix + Suffix combinations
                () => this.randomChoice(patterns.prefixes) + this.randomChoice(patterns.suffixes),
                // Modified root words
                () => this.randomChoice(patterns.roots) + 'ly',
                () => this.randomChoice(patterns.roots) + 'ix',
                () => this.randomChoice(patterns.roots) + 'ex',
                // Blended combinations
                () => {
                    const root1 = this.randomChoice(patterns.roots);
                    const root2 = this.randomChoice(patterns.roots);
                    return root1.slice(0, 3) + root2.slice(-3);
                },
                // Industry-specific combinations
                () => {
                    const keyword = this.randomChoice(this.config.keywords);
                    const suffix = this.randomChoice(patterns.suffixes);
                    return keyword + suffix;
                }
            ];

            const strategy = this.randomChoice(strategies);
            const name = this.capitalize(strategy());

            if (this.isValidName(name)) {
                names.push({ name, category: 'brandable' });
            }
        }

        return names;
    }

    generateAbstractNames(count) {
        const names = [];
        const patterns = BusinessNameGenerator.NAMING_PATTERNS.abstract;

        for (let i = 0; i < count; i++) {
            const strategies = [
                // Direct abstract concepts
                () => this.randomChoice(patterns.concepts),
                // Emotional concepts
                () => this.randomChoice(patterns.emotions),
                // Modified concepts
                () => this.randomChoice(patterns.concepts) + 'ly',
                () => this.randomChoice(patterns.concepts) + 'ix',
                // Blended concepts
                () => {
                    const concept1 = this.randomChoice(patterns.concepts);
                    const concept2 = this.randomChoice(patterns.concepts);
                    return concept1.slice(0, 4) + concept2.slice(-4);
                },
                // Industry-influenced abstracts
                () => {
                    const base = this.randomChoice(patterns.concepts);
                    if (this.config.keywords.length > 0) {
                        const keyword = this.randomChoice(this.config.keywords);
                        return base + keyword.slice(-2);
                    }
                    return base;
                }
            ];

            const strategy = this.randomChoice(strategies);
            const name = this.capitalize(strategy());

            if (this.isValidName(name)) {
                names.push({ name, category: 'abstract' });
            }
        }

        return names;
    }

    generateCompoundNames(count) {
        const names = [];
        const patterns = BusinessNameGenerator.NAMING_PATTERNS.compound;

        for (let i = 0; i < count; i++) {
            const strategies = [
                // Tech + Business
                () => this.randomChoice(patterns.techTerms) + this.randomChoice(patterns.businessTerms),
                // Physical + Tech
                () => this.randomChoice(patterns.physicalTerms) + this.randomChoice(patterns.techTerms),
                // Action + Business
                () => this.randomChoice(patterns.actionTerms) + this.randomChoice(patterns.businessTerms),
                // Business + Physical
                () => this.randomChoice(patterns.businessTerms) + this.randomChoice(patterns.physicalTerms),
                // Keyword combinations
                () => {
                    if (this.config.keywords.length >= 2) {
                        const kw1 = this.randomChoice(this.config.keywords);
                        const kw2 = this.randomChoice(this.config.keywords);
                        return kw1 + kw2;
                    }
                    return this.randomChoice(patterns.actionTerms) + this.randomChoice(patterns.businessTerms);
                },
                // Creative mashups
                () => {
                    const word1 = this.randomChoice([...patterns.techTerms, ...patterns.physicalTerms]);
                    const word2 = this.randomChoice([...patterns.businessTerms, ...patterns.actionTerms]);
                    return word1.slice(0, 4) + word2.slice(-4);
                }
            ];

            const strategy = this.randomChoice(strategies);
            const name = this.capitalize(strategy());

            if (this.isValidName(name)) {
                names.push({ name, category: 'compound' });
            }
        }

        return names;
    }

    generateDescriptiveNames(count) {
        const names = [];
        const suffixes = ['Hub', 'Pro', 'Labs', 'Works', 'Solutions', 'Systems', 'Tools', 'Suite', 'Platform', 'Engine', 'Studio', 'Factory', 'Forge', 'Shop', 'Co', 'Inc', 'Group', 'Corp'];
        const keywords = [...this.config.keywords, 'build', 'craft', 'create', 'smart', 'digital'];

        for (let i = 0; i < count; i++) {
            const strategies = [
                // Keyword + Suffix
                () => this.randomChoice(keywords) + this.randomChoice(suffixes),
                // Modified keyword + Suffix
                () => this.capitalize(this.randomChoice(keywords)) + this.randomChoice(suffixes),
                // Shortened keyword + Suffix
                () => this.randomChoice(keywords).slice(0, 4) + this.randomChoice(suffixes),
                // Prefix + Keyword
                () => 'Smart' + this.capitalize(this.randomChoice(keywords)),
                () => 'Digital' + this.capitalize(this.randomChoice(keywords)),
                () => 'Pro' + this.capitalize(this.randomChoice(keywords)),
                // Industry-specific patterns
                () => this.randomChoice(keywords) + 'Flow',
                () => this.randomChoice(keywords) + 'Stream',
                () => this.randomChoice(keywords) + 'Core',
                () => this.randomChoice(keywords) + 'Base'
            ];

            const strategy = this.randomChoice(strategies);
            const name = strategy();

            if (this.isValidName(name)) {
                names.push({ name, category: 'descriptive' });
            }
        }

        return names;
    }

    analyzeNameCandidate(nameData) {
        const brandStrength = this.analyzeBrandStrength(nameData.name);
        const overallScore = this.calculateOverallScore(brandStrength);
        const recommendationLevel = this.getRecommendationLevel(overallScore);

        return {
            name: nameData.name,
            category: nameData.category,
            brandStrength,
            overallScore,
            recommendationLevel,
            // Placeholder for future features
            domainAvailability: { name: nameData.name, availability: {}, checkedAt: Date.now() },
            trademarkStatus: { searchTerm: nameData.name, conflicts: [], riskLevel: 'low' },
            socialMediaAvailability: { handles: {}, checkedAt: Date.now() },
            internationalAnalysis: { languages: {}, overallRisk: 'low' },
            estimatedCost: { initialCost: 12, currency: 'USD', costCategory: 'standard' }
        };
    }

    analyzeBrandStrength(name) {
        const memorability = this.calculateMemorability(name);
        const pronounceability = this.calculatePronounceability(name);
        const spellability = this.calculateSpellability(name);
        const distinctiveness = this.calculateDistinctiveness(name);
        const brandability = this.calculateBrandability(name);
        const scalability = this.calculateScalability(name);
        const digitalFriendliness = this.calculateDigitalFriendliness(name);

        const overallStrength = Math.round(
            (memorability + pronounceability + spellability + distinctiveness + brandability + scalability + digitalFriendliness) / 7
        );

        const strengths = [];
        const weaknesses = [];

        if (memorability >= 80) strengths.push('Highly memorable');
        else if (memorability < 60) weaknesses.push('Low memorability');

        if (pronounceability >= 80) strengths.push('Easy to pronounce');
        else if (pronounceability < 60) weaknesses.push('Difficult pronunciation');

        if (distinctiveness >= 80) strengths.push('Highly distinctive');
        else if (distinctiveness < 60) weaknesses.push('Not distinctive enough');

        if (scalability >= 80) strengths.push('Highly scalable');
        if (digitalFriendliness >= 80) strengths.push('Digital-friendly');

        return {
            memorability,
            pronounceability,
            spellability,
            distinctiveness,
            brandability,
            scalability,
            digitalFriendliness,
            overallStrength,
            strengths,
            weaknesses,
            recommendations: []
        };
    }

    calculateMemorability(name) {
        let score = 70; // Base score
        
        // Length optimization (6-8 chars is optimal)
        if (name.length >= 6 && name.length <= 8) score += 15;
        else if (name.length >= 4 && name.length <= 10) score += 10;
        else if (name.length < 4 || name.length > 12) score -= 10;
        
        // Rhythm and flow
        const vowels = (name.match(/[aeiou]/gi) || []).length;
        const consonants = name.length - vowels;
        const vowelRatio = vowels / name.length;
        if (vowelRatio >= 0.3 && vowelRatio <= 0.5) score += 10;
        
        // Uniqueness of ending
        const ending = name.slice(-2).toLowerCase();
        if (['ly', 'ex', 'ix', 'ax', 'ox'].includes(ending)) score += 8;
        
        // Avoid common patterns that reduce memorability
        if (name.toLowerCase().includes('tech') || name.toLowerCase().includes('soft')) score -= 5;
        
        return Math.max(0, Math.min(100, score));
    }

    calculatePronounceability(name) {
        let score = 75; // Base score
        
        // Consonant clusters (bad for pronunciation)
        const consonantClusters = (name.match(/[bcdfghjklmnpqrstvwxyz]{3,}/gi) || []).length;
        score -= consonantClusters * 15;
        
        // Silent letters or unusual combinations
        if (name.includes('ght') || name.includes('ph') || name.includes('th')) score -= 5;
        if (name.includes('x') && name.length < 6) score -= 5;
        
        // Easy vowel patterns
        const hasEasyVowels = /[aeiou]/gi.test(name);
        if (!hasEasyVowels) score -= 20;
        
        // Common syllable patterns
        const syllableCount = this.estimateSyllables(name);
        if (syllableCount <= 3) score += 10;
        else if (syllableCount > 4) score -= 10;
        
        return Math.max(0, Math.min(100, score));
    }

    calculateSpellability(name) {
        let score = 80; // Base score
        
        // Phonetic spelling
        const hasUnusualSpelling = /[qxz]/gi.test(name);
        if (hasUnusualSpelling) score -= 10;
        
        // Double letters (can be confusing)
        const doubleLetters = (name.match(/(.)\1/g) || []).length;
        score -= doubleLetters * 5;
        
        // Common word patterns
        const hasCommonPatterns = /ing|tion|ness|ful|less/gi.test(name);
        if (hasCommonPatterns) score += 5;
        
        // Length impact on spelling
        if (name.length > 10) score -= 5;
        
        return Math.max(0, Math.min(100, score));
    }

    calculateDistinctiveness(name) {
        let score = 70; // Base score
        
        // Avoid common business terms
        const commonTerms = ['tech', 'soft', 'corp', 'inc', 'company', 'solutions', 'systems'];
        const hasCommonTerm = commonTerms.some(term => name.toLowerCase().includes(term));
        if (hasCommonTerm) score -= 15;
        
        // Unique character combinations
        const uniqueEndings = ['ix', 'ex', 'ax', 'ox', 'ux', 'yz', 'yx'];
        const hasUniqueEnding = uniqueEndings.some(ending => name.toLowerCase().endsWith(ending));
        if (hasUniqueEnding) score += 15;
        
        // Original word creation
        const isLikelyCoined = !this.isCommonWord(name);
        if (isLikelyCoined) score += 10;
        
        return Math.max(0, Math.min(100, score));
    }

    calculateBrandability(name) {
        let score = 75; // Base score
        
        // Visual appeal
        const hasStrongVisualPattern = /^[A-Z][a-z]+[A-Z]?/.test(name);
        if (hasStrongVisualPattern) score += 5;
        
        // Trademark potential
        const isLikelyTrademarable = name.length >= 4 && !this.isCommonWord(name);
        if (isLikelyTrademarable) score += 10;
        
        // Domain potential
        const isDomainFriendly = !/[^a-zA-Z0-9]/.test(name);
        if (isDomainFriendly) score += 5;
        
        // Emotional connection potential
        const hasEmotionalAppeal = this.hasEmotionalResonance(name);
        if (hasEmotionalAppeal) score += 10;
        
        return Math.max(0, Math.min(100, score));
    }

    calculateScalability(name) {
        let score = 75; // Base score
        
        // Industry neutrality
        const isIndustryNeutral = !this.isIndustrySpecific(name);
        if (isIndustryNeutral) score += 15;
        
        // Abstract enough for multiple uses
        const isAbstract = this.config.keywords.every(keyword => 
            !name.toLowerCase().includes(keyword.toLowerCase())
        );
        if (isAbstract) score += 10;
        
        // International scalability
        const isInternationalFriendly = this.isInternationallyFriendly(name);
        if (isInternationalFriendly) score += 10;
        
        return Math.max(0, Math.min(100, score));
    }

    calculateDigitalFriendliness(name) {
        let score = 80; // Base score
        
        // URL friendliness
        const isUrlFriendly = /^[a-zA-Z][a-zA-Z0-9]*$/.test(name);
        if (isUrlFriendly) score += 10;
        
        // Social media handle potential
        const isSocialFriendly = name.length >= 4 && name.length <= 15;
        if (isSocialFriendly) score += 5;
        
        // Search engine optimization
        const isSeoFriendly = name.length >= 5 && !name.includes('_') && !name.includes('-');
        if (isSeoFriendly) score += 5;
        
        return Math.max(0, Math.min(100, score));
    }

    // Helper methods
    estimateSyllables(word) {
        return word.toLowerCase().match(/[aeiouy]+/g)?.length || 1;
    }

    isCommonWord(word) {
        // Simple check - in a real implementation, you'd check against a dictionary
        const commonWords = ['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'man', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use'];
        return commonWords.includes(word.toLowerCase());
    }

    hasEmotionalResonance(name) {
        const emotionalTriggers = ['zen', 'peak', 'star', 'bright', 'spark', 'flow', 'rise', 'grow', 'shine', 'wave'];
        return emotionalTriggers.some(trigger => name.toLowerCase().includes(trigger));
    }

    isIndustrySpecific(name) {
        const industryTerms = ['tech', 'soft', 'data', 'cyber', 'digital', 'web', 'app', 'wood', 'steel', 'build', 'construct'];
        return industryTerms.some(term => name.toLowerCase().includes(term));
    }

    isInternationallyFriendly(name) {
        // Avoid complex consonant clusters and cultural-specific terms
        const hasComplexClusters = /[bcdfghjklmnpqrstvwxyz]{3,}/gi.test(name);
        const hasCulturalTerms = /american|euro|asia|west|east/gi.test(name);
        return !hasComplexClusters && !hasCulturalTerms;
    }

    calculateOverallScore(brandStrength) {
        return brandStrength.overallStrength;
    }

    getRecommendationLevel(score) {
        if (score >= 90) return 'excellent';
        if (score >= 75) return 'high';
        if (score >= 60) return 'medium';
        return 'low';
    }

    calculateMetrics(candidates, processingTime) {
        return {
            totalGenerated: candidates.length,
            categoriesUsed: ['brandable', 'abstract', 'compound', 'descriptive'],
            averageScore: candidates.reduce((sum, c) => sum + c.overallScore, 0) / candidates.length,
            topScore: Math.max(...candidates.map(c => c.overallScore)),
            processingTime,
            apiCallsUsed: 0,
            estimatedCost: 0
        };
    }

    generateRecommendations(candidates) {
        const recs = [];
        const topCandidates = candidates.slice(0, 10);
        
        const avgScore = topCandidates.reduce((sum, c) => sum + c.overallScore, 0) / topCandidates.length;
        if (avgScore > 80) {
            recs.push('Excellent name quality - proceed with domain checking');
        } else if (avgScore > 70) {
            recs.push('Good name quality - consider generating more options');
        } else {
            recs.push('Consider refining criteria for higher quality names');
        }
        
        const categories = [...new Set(topCandidates.map(c => c.category))];
        if (categories.length < 3) {
            recs.push('Consider exploring more naming categories for variety');
        }
        
        return recs;
    }

    filterAndDeduplicateNames(names) {
        const seen = new Set();
        return names.filter(({ name }) => {
            const lower = name.toLowerCase();
            if (seen.has(lower)) return false;
            seen.add(lower);
            return this.isValidName(name);
        });
    }

    isValidName(name) {
        if (name.length < 3 || name.length > this.config.maxLength) return false;
        if (this.config.avoidWords.some(avoid => name.toLowerCase().includes(avoid.toLowerCase()))) return false;
        return /^[a-zA-Z][a-zA-Z0-9]*$/.test(name);
    }

    randomChoice(array) {
        return array[Math.floor(Math.random() * array.length)];
    }

    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }
}