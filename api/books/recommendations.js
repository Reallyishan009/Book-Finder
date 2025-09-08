export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { subjects } = req.query;
    
    if (!subjects) {
      return res.status(400).json({ error: 'Subjects parameter is required' });
    }

    const subjectList = subjects.split(',').map(s => s.trim());
    const randomSubject = subjectList[Math.floor(Math.random() * subjectList.length)];
    
    const response = await fetch(
      `https://openlibrary.org/search.json?subject=${encodeURIComponent(randomSubject)}&sort=rating&limit=8`
    );
    
    const data = await response.json();
    
    const books = data.docs?.map(doc => ({
      id: doc.key,
      title: doc.title,
      authors: doc.author_name || ['Unknown Author'],
      description: doc.first_sentence?.join(' ') || 'No description available',
      thumbnail: doc.cover_i 
        ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
        : null,
      publishedDate: doc.first_publish_year,
      subjects: doc.subject?.slice(0, 3) || [],
      rating: doc.ratings_average ? Math.round(doc.ratings_average * 10) / 10 : null
    })) || [];

    res.status(200).json({ books, basedOnSubject: randomSubject });
  } catch (error) {
    console.error('Recommendations error:', error);
    res.status(500).json({ error: 'Failed to fetch recommendations' });
  }
}