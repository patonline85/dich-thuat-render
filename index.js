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
      Nhiệm vụ của bạn là phải dịch văn bản tiếng Trung giản thể sau đây sang tiếng Việt. Hãy tuân thủ nghiêm ngặt các quy tắc và sử dụng tri thức nền tảng dưới đây để đảm bảo bản dịch có chất lượng cao nhất, đúng văn phong và thuật ngữ của Pháp Môn Tâm Linh.
      **Quy tắc dịch thuật (BẮT BUỘC VÀ KHÔNG THAY ĐỔI):**
      1. **Giữ nguyên bố cục:** Giữ nguyên cách trình bày dòng, đoạn của văn bản gốc.
      2. **Dịch sát nghĩa:** Chỉ dịch sát nghĩa từng câu, không diễn đạt lại theo ý hiểu cá nhân.
      3. **Thuật ngữ chuyên môn:** Nếu gặp thuật ngữ khó, hãy phiên âm Hán-Việt và giải thích ngắn gọn ở cuối bản dịch (nếu cần).
      **Từ điển chuyên môn (SỬ DỤNG CHÍNH XÁC TUYỆT ĐỐI):**
      - 礼佛大忏悔文 : Lễ Phật Đại Sám Hối Văn - 女听众 : Nữ Thính Giả - 台长答 : Đài Trưởng đáp - 小房子 : Ngôi Nhà Nhỏ - 冰山地狱 : Địa Ngục Núi Băng - 男聽眾 : Nam Thính Giả - 圖騰 : Đồ Đằng - 靈性 : Vong Linh - 聽眾 : Thính Giả - 好好修 : Cứ chăm chỉ tu hành - 誓願 : thệ nguyện - 一門精進 : Nhất Môn Tinh Tấn - 大悲神咒 : Chú Đại Bi - 諸佛國者 : các cõi Phật - 众生 : chúng sinh - 卢军宏 : Lư Quân Hoành - 要经者 : Người cần Kinh - 师兄 : Sư Huynh
      **Tri thức nền tảng (BẮT BUỘC SỬ DỤNG LÀM CƠ SỞ DỊCH):**
      - Mọi vấn đề trong cuộc sống (sự nghiệp, sức khỏe, hôn nhân, bệnh tật như tự kỷ) đều liên quan đến nghiệp chướng (业障) và vong linh (灵性).
      - Giải pháp chính là "Tam Đại Pháp Bảo": Niệm Kinh (念经), Hứa Nguyện (许愿), và Phóng Sanh (放生).
      - "Ngôi Nhà Nhỏ" (小房子) là một tổ hợp kinh văn đặc biệt dùng để trả nợ nghiệp, siêu độ vong linh, người cần kinh (要经者) và thai nhi bị phá bỏ. Đây là phương pháp cốt lõi.
      - Các kinh văn thường dùng: Chú Đại Bi (大悲咒) để tăng năng lượng, Tâm Kinh (心经) để khai mở trí tuệ, Lễ Phật Đại Sám Hối Văn (礼佛大忏悔文) để sám hối nghiệp chướng, Chú Chuẩn Đề (准提神咒) để cầu nguyện sự nghiệp, học hành, và Giải Kết Chú (解结咒) để hóa giải oán kết.
      - Giấc mơ (梦境) là một hình thức khai thị, thường báo hiệu về nghiệp chướng, vong linh cần siêu độ, hoặc những điềm báo cần hóa giải bằng cách niệm kinh, niệm Ngôi Nhà Nhỏ.
      - Các vấn đề của trẻ nhỏ thường liên quan đến nghiệp chướng của cha mẹ, đặc biệt là nghiệp phá thai.
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
