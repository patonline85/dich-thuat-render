/**
 * File: /functions/translate.js
 * Xử lý yêu cầu POST đến /translate.
 * Sử dụng Google Vertex AI với xác thực OAuth2 từ Service Account
 * để giải quyết triệt để lỗi giới hạn vị trí.
 */

// --- Helpers for JWT and Base64 ---
function base64url(source) {
  let a = btoa(source);
  a = a.replace(/=/g, '');
  a = a.replace(/\+/g, '-');
  a = a.replace(/\//g, '_');
  return a;
}

async function getAccessToken(serviceAccount) {
  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };

  const now = Math.floor(Date.now() / 1000);
  const claimSet = {
    iss: serviceAccount.client_email,
    sub: serviceAccount.client_email,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600, // Token expires in 1 hour
    scope: 'https://www.googleapis.com/auth/cloud-platform',
  };

  const encodedHeader = base64url(JSON.stringify(header));
  const encodedClaimSet = base64url(JSON.stringify(claimSet));
  const signingInput = `${encodedHeader}.${encodedClaimSet}`;

  // Import the private key
  const keyData = atob(serviceAccount.private_key.split('-----')[2].replace(/\s/g, ''));
  const keyBuffer = new Uint8Array(keyData.length).map((_, i) => keyData.charCodeAt(i));
  
  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    keyBuffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  // Sign the JWT
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    privateKey,
    new TextEncoder().encode(signingInput)
  );

  const encodedSignature = base64url(String.fromCharCode(...new Uint8Array(signature)));
  const jwt = `${signingInput}.${encodedSignature}`;

  // Exchange JWT for an access token
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const tokenData = await tokenResponse.json();
  if (!tokenData.access_token) {
    throw new Error('Could not retrieve access token.');
  }
  return tokenData.access_token;
}


export async function onRequestPost(context) {
  try {
    console.log("Function invoked. Attempting Vertex AI auth...");

    // 1. Lấy và phân tích cú pháp Service Account JSON từ biến môi trường
    const serviceAccountJSON = context.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    if (!serviceAccountJSON) {
      throw new Error("FATAL: GOOGLE_SERVICE_ACCOUNT_JSON environment variable not set.");
    }
    const serviceAccount = JSON.parse(serviceAccountJSON);
    const projectId = serviceAccount.project_id;

    // 2. Lấy Access Token
    const accessToken = await getAccessToken(serviceAccount);
    console.log("Successfully obtained Access Token.");

    // 3. Lấy văn bản cần dịch từ yêu cầu
    const requestBody = await context.request.json();
    const { chineseText } = requestBody;
    if (!chineseText) {
      return new Response(JSON.stringify({ error: 'No Chinese text provided.' }), { status: 400 });
    }
    
    // 4. Tạo prompt
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

    // 5. Gọi API của Google Vertex AI tại khu vực us-central1
    const region = "us-central1";
    const model = "gemini-1.5-flash-001"; // Sử dụng phiên bản cụ thể hơn
    const apiUrl = `https://${region}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${region}/publishers/google/models/${model}:generateContent`;

    console.log(`Calling Vertex AI API at: ${apiUrl}`);
    const vertexResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }] }),
    });

    console.log(`Vertex AI API responded with status: ${vertexResponse.status}`);
    const result = await vertexResponse.json();

    if (!vertexResponse.ok) {
      console.error("Error from Vertex AI API:", JSON.stringify(result, null, 2));
      throw new Error(result.error?.message || 'An error occurred with the Vertex AI service.');
    }

    // 6. Trích xuất và trả về kết quả
    const translatedText = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!translatedText) {
      throw new Error("Could not extract translated text from the API response.");
    }

    return new Response(JSON.stringify({ translation: translatedText.trim() }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error caught in Cloudflare Function:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
