export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const subjects = ['computer_science', 'mathematics', 'psychology', 'history', 'literature', 'physics', 'biology', 'economics'];
    const randomSubject = subjects[Math.floor(Math.random() * subjects.length)];
    
    const response = await fetch(
      `https://openlibrary.org/search.json?subject=${randomSubject}&sort=rating&limit=12`
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
      rating: doc.ratings_average ? Math.round(doc.ratings_average * 10) / 10 : null,
      pageCount: doc.number_of_pages_median,
      publisher: doc.publisher?.[0]
    })) || [];

    res.status(200).json({ books, subject: randomSubject, total: data.numFound });
  } catch (error) {
    console.error('Trending books error:', error);
    res.status(500).json({ error: 'Failed to fetch trending books' });
  }
}