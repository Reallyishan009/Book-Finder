import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5001

// Middleware
app.use(cors())
app.use(express.json())

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Book Finder API is running' })
})

// Book search endpoint using Open Library API
app.get('/api/books/search', async (req, res) => {
  try {
    const { q, type = 'general', limit = 20 } = req.query
    
    if (!q) {
      return res.status(400).json({ error: 'Search query is required' })
    }

    let searchUrl = 'https://openlibrary.org/search.json?'
    
    // Different search types for college student needs
    switch (type) {
      case 'title':
        searchUrl += `title=${encodeURIComponent(q)}`
        break
      case 'author':
        searchUrl += `author=${encodeURIComponent(q)}`
        break
      case 'subject':
        searchUrl += `subject=${encodeURIComponent(q)}`
        break
      case 'isbn':
        searchUrl += `isbn=${encodeURIComponent(q)}`
        break
      default:
        searchUrl += `q=${encodeURIComponent(q)}`
    }
    
    searchUrl += `&limit=${limit}`

    const response = await fetch(searchUrl)
    
    if (!response.ok) {
      throw new Error('Failed to fetch from Open Library API')
    }

    const data = await response.json()
    
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
    })) || []

    res.json({ books, total: data.numFound })
  } catch (error) {
    console.error('Search error:', error)
    res.status(500).json({ error: 'Failed to search books' })
  }
})

// Get trending/popular books for college students
app.get('/api/books/trending', async (req, res) => {
  try {
    const subjects = ['computer_science', 'mathematics', 'psychology', 'history', 'literature', 'physics', 'biology', 'economics']
    const randomSubject = subjects[Math.floor(Math.random() * subjects.length)]
    
    const response = await fetch(
      `https://openlibrary.org/search.json?subject=${randomSubject}&sort=rating&limit=12`
    )
    
    const data = await response.json()
    
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
    })) || []

    res.json({ books, subject: randomSubject, total: data.numFound })
  } catch (error) {
    console.error('Trending books error:', error)
    res.status(500).json({ error: 'Failed to fetch trending books' })
  }
})

// Get book recommendations based on subjects
app.get('/api/books/recommendations', async (req, res) => {
  try {
    const { subjects } = req.query
    
    if (!subjects) {
      return res.status(400).json({ error: 'Subjects parameter is required' })
    }

    const subjectList = subjects.split(',').map(s => s.trim())
    const randomSubject = subjectList[Math.floor(Math.random() * subjectList.length)]
    
    const response = await fetch(
      `https://openlibrary.org/search.json?subject=${encodeURIComponent(randomSubject)}&sort=rating&limit=8`
    )
    
    const data = await response.json()
    
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
    })) || []

    res.json({ books, basedOnSubject: randomSubject })
  } catch (error) {
    console.error('Recommendations error:', error)
    res.status(500).json({ error: 'Failed to fetch recommendations' })
  }
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})