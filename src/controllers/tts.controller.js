const googleTTS = require('google-tts-api');

const handleTTS = async (req, res) => {
  try {
    const { text, lang = 'hi' } = req.body;
    
    if (!text) {
      return res.status(400).json({ success: false, message: 'Text is required' });
    }

    try {
      const chunks = await googleTTS.getAllAudioBase64(text, {
        lang: 'hi', // 'hi' correctly handles Devangari, Hinglish, and English with an Indian accent natively
        slow: false,
        host: 'https://translate.google.com',
        splitPunct: ',.?!;:',
      });

      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Access-Control-Expose-Headers', 'Content-Type');
      
      for (const chunk of chunks) {
         const buffer = Buffer.from(chunk.base64, 'base64');
         res.write(buffer);
      }
      return res.end();
      
    } catch (apiError) {
      console.error('Google TTS API Error:', apiError);
      return res.status(200).json({ success: false, message: 'Google TTS API Failed' });
    }

  } catch (error) {
    console.error('TTS Controller Error:', error);
    res.status(200).json({ success: false, message: 'Internal Server Error' });
  }
};

module.exports = { handleTTS };
