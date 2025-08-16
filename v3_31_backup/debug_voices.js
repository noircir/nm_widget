// Debug script to test voice loading
// Run this in the console of any page with NativeMimic loaded

console.log('=== NativeMimic Voice Debug ===');

// Check if speechSynthesis is available
console.log('speechSynthesis available:', !!window.speechSynthesis);
console.log('speechSynthesis.getVoices():', speechSynthesis.getVoices().length);

// List first 10 voices
const voices = speechSynthesis.getVoices();
console.log('First 10 system voices:');
voices.slice(0, 10).forEach((voice, i) => {
  console.log(`${i + 1}. ${voice.name} (${voice.lang}) [${voice.voiceURI}]`);
});

// Check NativeMimic instance
console.log('NativeMimic instance exists:', !!window.nativeMimicInstance);
if (window.nativeMimicInstance) {
  console.log('NativeMimic cached voices:', window.nativeMimicInstance.availableVoices.length);
  console.log('NativeMimic first 5 cached voices:', 
    window.nativeMimicInstance.availableVoices.slice(0, 5).map(v => `${v.name} (${v.lang})`)
  );
}

// Check ElevenLabs
console.log('ElevenLabs client exists:', !!window.elevenLabsClient);
if (window.elevenLabsClient) {
  console.log('ElevenLabs initialized:', window.elevenLabsClient.isInitialized);
  console.log('ElevenLabs has API key:', !!window.elevenLabsClient.apiKey);
  console.log('ElevenLabs preset voices:', Object.keys(window.elevenLabsClient.getPresetVoices()));
}

// Check widget dropdown
const voiceSelect = document.getElementById('nativemimic-voice-select');
console.log('Voice dropdown exists:', !!voiceSelect);
if (voiceSelect) {
  console.log('Voice dropdown options count:', voiceSelect.options.length);
  console.log('Voice dropdown options:');
  Array.from(voiceSelect.options).forEach((option, i) => {
    console.log(`${i + 1}. ${option.textContent} [${option.value}] ${option.selected ? '(SELECTED)' : ''}`);
  });
}

console.log('=== End Debug ===');