const SHAMAN_AI_CONFIG = {
    HUGGING_FACE_TOKEN: window.SHAMAN_AI_ENV?.HUGGING_FACE_TOKEN || '',
    MODELS: {
        CHAT: 'microsoft/DialoGPT-medium',
        MATH: 'google/flan-t5-base',
        GENERAL: 'microsoft/DialoGPT-medium'
    },
    API_URLS: {
        HUGGING_FACE: 'https://api-inference.huggingface.co/models/'
    }
};
