const axios = require('axios');

async function testAll() {
  try {
    console.log("1. Registering user...");
    const res = await axios.post('http://localhost:5000/api/auth/register', {
      username: `test_${Date.now()}`,
      email: `test_${Date.now()}@test.com`,
      password: 'password123',
      preferredLanguage: 'bn'
    });
    
    console.log("Register response:", res.status);
    const token = res.data.token;
    
    console.log("2. Fetching chapters...");
    const chapRes = await axios.get('http://localhost:5000/api/chapters');
    console.log("Chapters fetched:", chapRes.data.data.length);
    const firstChapter = chapRes.data.data[0];
    console.log("First chapter:", firstChapter.nameEnglish);
    
    console.log("3. Fetching chapter progress...");
    const progRes = await axios.get(`http://localhost:5000/api/chapters/${firstChapter.chapterNumber}/progress`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("Progress status:", progRes.data.data.status);
    
    console.log("4. Fetching verses for first chapter...");
    const verseRes = await axios.get(`http://localhost:5000/api/verses/${firstChapter.chapterNumber}`);
    console.log("Verses fetched:", verseRes.data.data.length);
    
    console.log("5. Generating practice session...");
    const practiceRes = await axios.post('http://localhost:5000/api/practice/session', {
      chapterNumber: firstChapter.chapterNumber,
      sessionSize: 5
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("Practice session words:", practiceRes.data.data.words.length);
    
    console.log("6. Submitting practice session...");
    const submitRes = await axios.post('http://localhost:5000/api/practice/submit', {
      chapterNumber: firstChapter.chapterNumber,
      results: practiceRes.data.data.words.map(w => ({
        wordArabic: w.arabic,
        isCorrect: true,
        chapterNumber: firstChapter.chapterNumber,
        verseNumber: 1,
        verseKey: `${firstChapter.chapterNumber}:1`
      })),
      duration: 30
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("Submit success:", submitRes.data.success, "XP earned:", submitRes.data.data.xpEarned);
    
    console.log("7. Checking dashboard overview...");
    const dashRes = await axios.get('http://localhost:5000/api/progress/overview', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("Dashboard stats:", dashRes.data.data);
    
    console.log("All backend tests passed!");
  } catch(e) {
    console.error("Test failed:", e.response?.data || e.message);
  }
}
testAll();
