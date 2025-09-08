export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { q, type = 'general', limit = 20 } = req.query;
    
    if (!q) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    let searchUrl = 'https://openlibrary.org/search.json?';
    
    switch (type) {
      case 'title':
        searchUrl += `title=${encodeURIComponent(q)}`;
        break;
      case 'author':
        searchUrl += `author=${encodeURIComponent(q)}`;
        break;
      case 'subject':
        searchUrl += `subject=${encodeURIComponent(q)}`;
        break;
      case 'isbn':
        searchUrl += `isbn=${encodeURIComponent(q)}`;
        break;
      default:
        searchUrl += `q=${encodeURIComponent(q)}`;
    }
    
    searchUrl += `&limit=${limit}`;

    const response = await fetch(searchUrl);
    
    if (!response.ok) {
      throw new Error('Failed to fetch from Open Library API');
    }

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
      pageCount: doc.number_of_pages_median,
      subjects: doc.subject?.slice(0, 5) || [],
      isbn: doc.isbn?.[0],
      language: doc.language?.[0] || 'en',
      publisher: doc.publisher?.[0],
      rating: doc.ratings_average ? Math.round(doc.ratings_average * 10) / 10 : null
    })) || [];

    res.status(200).json({ books, total: data.numFound });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Failed to search books' });
  }
}