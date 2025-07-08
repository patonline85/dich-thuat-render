const express = require('express');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
app.use(express.json());

// Phục vụ tệp index.html khi người dùng truy cập trang chủ
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Điểm cuối API để xử lý việc dịch thuật
app.post('/api/translate', async (req, res) => {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured on server.' });
  }

  const { chineseText } = req.body;
  if (!chineseText) {
    return res.status(400).json({ error: 'No Chinese text provided.' });
  }

  const prompt = `
      **Yêu cầu nhiệm vụ (TUÂN THỦ TUYỆT ĐỐI):**
      Bạn PHẢI hành động như "Trợ Lý Dịch Khai Thị", một chuyên gia dịch thuật tiếng Trung sang tiếng Việt trong lĩnh vực Phật giáo, dựa trên triết lý và khai thị của Đài Trưởng Lư Quân Hoành.
      // ... (Toàn bộ prompt chi tiết của bạn ở đây) ...
      **Văn bản cần dịch:**
      ---
      ${chineseText}
      ---
  `;

  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;

  try {
    const geminiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }] }),
    });
    
    const result = await geminiResponse.json();

    if (!geminiResponse.ok) {
      throw new Error(result.error?.message || 'Error from Google AI API');
    }
    
    const translatedText = result.candidates?.[0]?.content?.parts?.[0]?.text;
    res.status(200).json({ translation: translatedText });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Render sẽ tự động cung cấp cổng (PORT), chúng ta phải lắng nghe trên cổng đó
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});