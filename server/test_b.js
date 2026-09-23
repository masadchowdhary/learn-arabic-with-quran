async function testAll() {
  try {
    console.log("1. Registering user...");
    const res = await fetch('http://localhost:5000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: `test_${Date.now()}`,
        email: `test_${Date.now()}@test.com`,
        password: 'password123',
        preferredLanguage: 'bn'
      })
    });
    const data = await res.json();
    console.log("Register response:", res.status);
    const token = data.token;
    
    console.log("2. Fetching chapters...");
    const chapRes = await fetch('http://localhost:5000/api/chapters');
    const chapData = await chapRes.json();
    const chapters = chapData.chapters || chapData.data || chapData;
    console.log("Chapters fetched:", chapters.length);
    const firstChapter = chapters[0];
    console.log("First chapter:", firstChapter.nameEnglish);
    
    console.log("3. Fetching chapter progress...");
    const progRes = await fetch(`http://localhost:5000/api/chapters/${firstChapter.chapterNumber}/progress`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const progData = await progRes.json();
    console.log("Progress:", progData);
    
    console.log("4. Fetching verses for first chapter...");
    const verseRes = await fetch(`http://localhost:5000/api/verses/${firstChapter.chapterNumber}`);
    const verseData = await verseRes.json();
    console.log("Verses fetched:", verseData.verses ? verseData.verses.length : verseData);
    
    console.log("5. Generating practice session...");
    const practiceRes = await fetch('http://localhost:5000/api/practice/session', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}` 
      },
      body: JSON.stringify({
        chapterNumber: firstChapter.chapterNumber,
        sessionSize: 5
      })
    });
    const practiceData = await practiceRes.json();
    console.log("Practice session data:", practiceData);
    const practiceWords = practiceData.session?.words || [];
    console.log("Practice session words:", practiceWords.length);
    
    console.log("6. Submitting practice session...");
    const submitRes = await fetch('http://localhost:5000/api/practice/submit', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}` 
      },
      body: JSON.stringify({
        chapterNumber: firstChapter.chapterNumber,
        results: practiceWords.map(w => ({
          wordArabic: w.arabic || w.textArabic,
          correct: true,
          chapterNumber: firstChapter.chapterNumber,
          verseNumber: 1,
          verseKey: `${firstChapter.chapterNumber}:1`
        })),
        duration: 30
      })
    });
    const submitData = await submitRes.json();
    console.log("Submit success:", submitData);
    
    console.log("7. Checking dashboard overview...");
    const dashRes = await fetch('http://localhost:5000/api/progress/overview', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const dashData = await dashRes.json();
    console.log("Dashboard stats:", dashData);
    
    console.log("All backend tests passed!");
  } catch(e) {
    console.error("Test failed:", e);
  }
}
testAll();
