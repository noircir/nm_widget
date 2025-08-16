# [VOICE COACH] NativeMimic: Complete AI-Driven Pronunciation Coaching Architecture

## System Overview

Transform NativeMimic into a comprehensive pronunciation coaching platform using open-source tools + premium APIs for maximum accuracy and cost efficiency.

## Complete Pipeline Architecture

```
1. Text Selection (Browser Extension)
   ↓
2. Native Reference Generation (ElevenLabs TTS)
   ↓
3. User Recording (Browser MediaRecorder)
   ↓
4. Multi-Layer Analysis Pipeline:
   ├── MFA: Phoneme-level forced alignment
   ├── Praat: Prosody analysis (pitch, stress, rhythm)
   ├── openSMILE: Acoustic feature extraction
   └── Custom ML: Error classification
   ↓
5. GPT-4 Enhanced Coaching (Actionable feedback)
   ↓
6. Progress Tracking & Personalized Practice
```

## Phase 1: Native Reference System (Week 1-2)

### ElevenLabs Integration
```python
class NativeReferenceGenerator:
    def __init__(self, api_key):
        self.client = ElevenLabs(api_key=api_key)
    
    async def generate_reference(self, text, language='en-US', accent='native'):
        """Generate native pronunciation reference"""
        
        # Select appropriate voice for language/accent
        voice_config = self.get_voice_config(language, accent)
        
        reference_audio = await self.client.generate(
            text=text,
            voice=voice_config['voice_id'],
            model="eleven_multilingual_v2",
            voice_settings={
                "stability": 0.75,
                "similarity_boost": 0.85,
                "style": 0.0,
                "use_speaker_boost": True
            },
            pronunciation_dictionary_locators=[
                voice_config['pronunciation_dict']
            ]
        )
        
        return {
            'audio_url': reference_audio.url,
            'phoneme_timestamps': self.extract_phonemes(reference_audio),
            'expected_prosody': self.analyze_reference_prosody(reference_audio)
        }
```

### Cost Analysis
- **ElevenLabs**: $0.30 per 1000 characters
- **Average sentence**: 50 characters = $0.015 per reference
- **Monthly cost**: 1000 references = $15/month

## Phase 2: Advanced Audio Analysis Pipeline (Week 3-6)

### Multi-Tool Integration
```python
class PronunciationAnalyzer:
    def __init__(self):
        self.mfa = MontrealForcedAligner()
        self.praat = PraatAnalyzer()
        self.opensmile = OpenSmileExtractor()
        
    async def analyze_pronunciation(self, user_audio, reference_audio, text):
        """Complete pronunciation analysis pipeline"""
        
        # 1. Phoneme-level alignment (MFA)
        alignment = await self.mfa.align(user_audio, text)
        
        # 2. Prosody analysis (Praat)
        prosody = await self.praat.analyze_prosody(user_audio)
        
        # 3. Acoustic features (openSMILE)
        features = await self.opensmile.extract_features(user_audio)
        
        # 4. Compare with reference
        comparison = self.compare_with_reference(
            alignment, prosody, features, reference_audio
        )
        
        return {
            'phoneme_accuracy': comparison['phoneme_scores'],
            'prosody_match': comparison['prosody_scores'],
            'acoustic_quality': comparison['acoustic_scores'],
            'detected_errors': comparison['error_classification'],
            'improvement_areas': comparison['focus_areas']
        }
```

### MFA (Montreal Forced Aligner) Setup
```bash
# Install MFA with language models
conda install -c conda-forge montreal-forced-aligner
mfa model download acoustic english_us_arpa
mfa model download g2p english_us_arpa

# Align audio with phonemes
mfa align input_dir lexicon.txt acoustic_model.zip output_dir
```

### Praat Integration
```python
class PraatAnalyzer:
    def analyze_prosody(self, audio_file):
        """Extract prosodic features using Praat"""
        
        praat_script = '''
        form Prosody Analysis
            sentence input_file
        endform
        
        # Load audio
        Read from file: input_file$
        
        # Pitch analysis
        To Pitch: 0.0, 75, 400
        pitch_mean = Get mean: 0, 0, "Hertz"
        pitch_std = Get standard deviation: 0, 0, "Hertz"
        
        # Intensity analysis  
        select Sound
        To Intensity: 100, 0, "yes"
        intensity_mean = Get mean: 0, 0, "energy"
        
        # Output results
        writeInfoLine: pitch_mean, " ", pitch_std, " ", intensity_mean
        '''
        
        result = parselmouth.praat.run_script(praat_script, audio_file)
        
        return {
            'pitch_mean': result[0],
            'pitch_variation': result[1], 
            'intensity_mean': result[2],
            'rhythm_patterns': self.analyze_rhythm(audio_file),
            'stress_locations': self.detect_stress(audio_file)
        }
```

### openSMILE Feature Extraction
```python
class OpenSmileExtractor:
    def __init__(self):
        self.smile = opensmile.Smile(
            feature_set=opensmile.FeatureSet.eGeMAPSv02,
            feature_level=opensmile.FeatureLevel.Functionals,
        )
    
    def extract_features(self, audio_file):
        """Extract comprehensive acoustic features"""
        
        features = self.smile.process_file(audio_file)
        
        return {
            'spectral_centroid': features['spectralCentroid_sma3nz_amean'].values[0],
            'mfcc_features': self.extract_mfcc(features),
            'voice_quality': self.assess_voice_quality(features),
            'fluency_markers': self.detect_disfluencies(features),
            'emotional_tone': self.classify_emotion(features)
        }
```

## Phase 3: Error Classification & ML Enhancement (Week 7-8)

### Custom Error Detection Model
```python
class PronunciationErrorClassifier:
    def __init__(self):
        self.phoneme_substitution_model = self.load_model('phoneme_errors.pkl')
        self.prosody_classifier = self.load_model('prosody_errors.pkl')
        
    def classify_errors(self, analysis_results):
        """Classify specific pronunciation errors"""
        
        errors = []
        
        # Phoneme substitution detection
        for phoneme in analysis_results['phoneme_accuracy']:
            if phoneme['accuracy'] < 0.7:
                error_type = self.phoneme_substitution_model.predict([
                    phoneme['expected'], 
                    phoneme['actual'],
                    phoneme['context']
                ])
                
                errors.append({
                    'type': 'phoneme_substitution',
                    'location': phoneme['timestamp'],
                    'expected': phoneme['expected'],
                    'actual': phoneme['actual'],
                    'severity': phoneme['accuracy'],
                    'classification': error_type
                })
        
        # Prosody error detection
        prosody_errors = self.detect_prosody_errors(analysis_results['prosody_match'])
        errors.extend(prosody_errors)
        
        return errors

    def detect_prosody_errors(self, prosody_data):
        """Detect stress, rhythm, and intonation errors"""
        
        errors = []
        
        # Stress pattern errors
        if prosody_data['stress_match'] < 0.6:
            errors.append({
                'type': 'stress_pattern',
                'description': 'Incorrect word stress placement',
                'location': prosody_data['stress_locations'],
                'suggestion': 'Focus on stressing the correct syllable'
            })
        
        # Intonation errors
        if prosody_data['intonation_match'] < 0.5:
            errors.append({
                'type': 'intonation',
                'description': 'Flat or incorrect intonation pattern',
                'location': prosody_data['pitch_contour'],
                'suggestion': 'Practice rising/falling intonation'
            })
            
        return errors
```

## Phase 4: GPT-4 Enhanced Coaching (Week 9-10)

### Intelligent Feedback Generation
```python
class AICoachingEngine:
    def __init__(self, openai_client):
        self.openai = openai_client
        
    async def generate_coaching_feedback(self, analysis_results, user_profile):
        """Generate personalized, actionable pronunciation coaching"""
        
        prompt = self.build_coaching_prompt(analysis_results, user_profile)
        
        response = await self.openai.chat.completions.create(
            model="gpt-4-turbo-preview",
            messages=[
                {"role": "system", "content": self.get_coaching_system_prompt()},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=500
        )
        
        coaching = json.loads(response.choices[0].message.content)
        
        return {
            'overall_feedback': coaching['summary'],
            'specific_tips': coaching['actionable_tips'],
            'practice_exercises': coaching['recommended_practice'],
            'progress_notes': coaching['progress_assessment'],
            'next_steps': coaching['next_session_focus']
        }
    
    def build_coaching_prompt(self, analysis, user_profile):
        """Build comprehensive coaching prompt"""
        
        return f"""
        Pronunciation Analysis for {user_profile['native_language']} → {user_profile['target_language']} learner:
        
        TEXT PRACTICED: "{analysis['original_text']}"
        
        PHONEME ANALYSIS:
        - Overall phoneme accuracy: {analysis['phoneme_accuracy']['overall']}%
        - Specific errors: {json.dumps(analysis['detected_errors'])}
        
        PROSODY ANALYSIS:
        - Stress accuracy: {analysis['prosody_match']['stress_accuracy']}%
        - Intonation match: {analysis['prosody_match']['intonation_match']}%
        - Rhythm consistency: {analysis['prosody_match']['rhythm_score']}%
        
        ACOUSTIC QUALITY:
        - Voice clarity: {analysis['acoustic_quality']['clarity_score']}
        - Fluency: {analysis['acoustic_quality']['fluency_score']}
        
        USER CONTEXT:
        - Learning level: {user_profile['level']}
        - Previous common errors: {user_profile['error_history']}
        - Practice goals: {user_profile['goals']}
        
        Generate coaching response in JSON format:
        {{
            "summary": "Brief encouraging overview (50 words)",
            "actionable_tips": ["3 specific tips for immediate improvement"],
            "recommended_practice": ["2-3 targeted exercises"],
            "progress_assessment": "How they're improving vs previous attempts",
            "next_session_focus": "What to practice next"
        }}
        """
    
    def get_coaching_system_prompt(self):
        return """
        You are an expert pronunciation coach specializing in helping language learners improve their accent and fluency. 
        
        Your coaching style:
        - Encouraging and supportive
        - Specific and actionable advice
        - Focus on muscle movement and tongue positioning
        - Break complex sounds into simple steps
        - Provide immediate practice exercises
        - Track progress patterns
        
        Always explain WHY a correction works and HOW to physically achieve it.
        """
```

## Phase 5: Progress Tracking & Personalization (Week 11-12)

### Advanced Progress Analytics
```python
class ProgressTracker:
    def __init__(self, supabase_client):
        self.db = supabase_client
        
    async def track_progress(self, user_id, session_results):
        """Comprehensive progress tracking"""
        
        # Store detailed session data
        await self.db.table('pronunciation_sessions').insert({
            'user_id': user_id,
            'text_practiced': session_results['text'],
            'phoneme_scores': session_results['phoneme_accuracy'],
            'prosody_scores': session_results['prosody_match'],
            'error_patterns': session_results['detected_errors'],
            'coaching_feedback': session_results['coaching'],
            'practice_duration': session_results['duration'],
            'improvement_areas': session_results['focus_areas']
        })
        
        # Update user progress metrics
        progress = await self.calculate_progress_metrics(user_id)
        
        await self.db.table('user_progress').upsert({
            'user_id': user_id,
            'overall_accuracy': progress['accuracy_trend'],
            'phoneme_mastery': progress['phoneme_progress'],
            'prosody_improvement': progress['prosody_trends'],
            'consistency_score': progress['consistency'],
            'most_improved_areas': progress['improvements'],
            'focus_areas': progress['challenges'],
            'updated_at': 'now()'
        })
        
        return progress
    
    async def generate_personalized_practice(self, user_id):
        """Generate personalized practice recommendations"""
        
        # Get user's error patterns
        error_history = await self.db.table('pronunciation_sessions')\
            .select('error_patterns')\
            .eq('user_id', user_id)\
            .order('created_at', desc=True)\
            .limit(10)
        
        # Analyze patterns
        common_errors = self.analyze_error_patterns(error_history)
        
        # Generate targeted practice
        practice_plan = {
            'phoneme_drills': self.create_phoneme_exercises(common_errors['phonemes']),
            'prosody_practice': self.create_prosody_exercises(common_errors['prosody']),
            'minimal_pairs': self.generate_minimal_pairs(common_errors['confusions']),
            'sentence_practice': self.select_practice_sentences(common_errors['contexts'])
        }
        
        return practice_plan
```

## Complete System Integration

### Browser Extension Updates
```javascript
// Enhanced recording flow with multi-analysis
class NativeMimicPronunciationCoach {
    async recordPronunciationPractice(selectedText) {
        // 1. Generate native reference
        const reference = await this.generateNativeReference(selectedText);
        
        // 2. Play reference for user
        await this.playReference(reference.audio_url);
        
        // 3. Record user attempt
        const userRecording = await this.recordUserAttempt();
        
        // 4. Send for comprehensive analysis
        const analysis = await this.analyzeRecording({
            userAudio: userRecording,
            referenceAudio: reference.audio_url,
            text: selectedText,
            userId: this.userId
        });
        
        // 5. Display coaching feedback
        this.displayCoachingResults(analysis);
        
        // 6. Update progress tracking
        await this.updateProgress(analysis);
    }
    
    async analyzeRecording(data) {
        const response = await fetch('/api/pronunciation-analysis', {
            method: 'POST',
            body: this.createFormData(data)
        });
        
        return await response.json();
    }
    
    displayCoachingResults(analysis) {
        const modal = this.createAnalysisModal({
            overallScore: analysis.overall_score,
            phonemeDetails: analysis.phoneme_breakdown,
            prosodyFeedback: analysis.prosody_analysis,
            coachingTips: analysis.coaching.specific_tips,
            practiceExercises: analysis.coaching.recommended_practice,
            progressUpdate: analysis.progress_comparison
        });
        
        document.body.appendChild(modal);
    }
}
```

## Cost Analysis

### Monthly Operational Costs
- **ElevenLabs TTS**: $15/month (1000 references)
- **OpenAI GPT-4**: $60/month (2000 coaching sessions)
- **Server Infrastructure**: $100/month (CPU-intensive analysis)
- **Storage & Database**: $25/month (Supabase Pro)
- **Total**: $200/month base cost

### Per-User Economics
- **Cost per analysis**: $0.10 (all services combined)
- **Pricing**: $9.99/month
- **Usage limit**: 100 analyses/month per user
- **Gross margin**: 90%+

## Competitive Advantages

### vs Current Solutions
- ✅ **True phoneme-level analysis** (not just transcription)
- ✅ **Native reference generation** with accent control
- ✅ **Prosody coaching** (stress, rhythm, intonation)
- ✅ **Personalized AI feedback** with physical instruction
- ✅ **100+ languages** supported
- ✅ **Open-source foundation** (no vendor lock-in)

### Technical Superiority
- ✅ **Multi-modal analysis** (phonemes + prosody + acoustics)
- ✅ **ML-powered error classification** 
- ✅ **Progressive difficulty adaptation**
- ✅ **Real-time feedback** capability
- ✅ **Comprehensive progress tracking**

## Implementation Timeline

- **Weeks 1-2**: ElevenLabs + Native reference system
- **Weeks 3-6**: MFA + Praat + openSMILE integration
- **Weeks 7-8**: ML error classification system
- **Weeks 9-10**: GPT-4 coaching engine
- **Weeks 11-12**: Progress tracking + personalization
- **Week 13-14**: Testing + optimization
- **Week 15-16**: Production deployment

## Result

This architecture transforms NativeMimic from a basic voice recorder into a **world-class AI pronunciation coach** that rivals or exceeds commercial language learning platforms, while maintaining cost efficiency through open-source tools and strategic API usage.
