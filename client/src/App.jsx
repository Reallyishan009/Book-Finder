import { useState, useEffect, useRef } from "react";

function App() {
  const [books, setBooks] = useState([]);
  const [trendingBooks, setTrendingBooks] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchType, setSearchType] = useState("general");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("search");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  const searchInputRef = useRef(null);

  // Load trending books and favorites on component mount
  useEffect(() => {
    loadTrendingBooks();
    loadFavorites();
  }, []);

  // Debounced search suggestions
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm.length >= 2) {
        fetchSuggestions(searchTerm);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, searchType]);

  const loadTrendingBooks = async () => {
    try {
      const response = await fetch("/api/books/trending");
      const data = await response.json();
      setTrendingBooks(data.books || []);
    } catch (error) {
      console.error("Error loading trending books:", error);
    }
  };

  const loadFavorites = () => {
    try {
      const savedFavorites = localStorage.getItem("bookFavorites");
      if (savedFavorites) {
        const favs = JSON.parse(savedFavorites);
        setFavorites(favs);
        // Load recommendations based on favorites
        if (favs.length > 0) {
          loadRecommendations(favs);
        }
      }
    } catch (error) {
      console.error("Error loading favorites:", error);
    }
  };

  const loadRecommendations = async (favoriteBooks) => {
    try {
      setRecommendationsLoading(true);
      // Extract subjects from favorite books
      const allSubjects = favoriteBooks
        .flatMap((book) => book.subjects || [])
        .filter((subject) => subject && subject.length > 0);

      if (allSubjects.length === 0) {
        setRecommendations([]);
        return;
      }

      // Get unique subjects
      const uniqueSubjects = [...new Set(allSubjects)].slice(0, 5);

      const response = await fetch(
        `/api/books/recommendations?subjects=${encodeURIComponent(
          uniqueSubjects.join(",")
        )}`
      );
      const data = await response.json();

      // Filter out books that are already in favorites
      const filteredRecommendations =
        data.books?.filter(
          (book) => !favoriteBooks.some((fav) => fav.id === book.id)
        ) || [];

      setRecommendations(filteredRecommendations);
    } catch (error) {
      console.error("Error loading recommendations:", error);
      setRecommendations([]);
    } finally {
      setRecommendationsLoading(false);
    }
  };

  const saveFavorites = (newFavorites) => {
    try {
      localStorage.setItem("bookFavorites", JSON.stringify(newFavorites));
      setFavorites(newFavorites);
      // Update recommendations when favorites change
      if (newFavorites.length > 0) {
        loadRecommendations(newFavorites);
      } else {
        setRecommendations([]);
      }
    } catch (error) {
      console.error("Error saving favorites:", error);
    }
  };

  const addToFavorites = (book) => {
    const isAlreadyFavorite = favorites.some((fav) => fav.id === book.id);
    if (!isAlreadyFavorite) {
      const newFavorites = [
        ...favorites,
        { ...book, dateAdded: new Date().toISOString() },
      ];
      saveFavorites(newFavorites);
    }
  };

  const removeFromFavorites = (bookId) => {
    const newFavorites = favorites.filter((fav) => fav.id !== bookId);
    saveFavorites(newFavorites);
  };

  const isFavorite = (bookId) => {
    return favorites.some((fav) => fav.id === bookId);
  };

  const exportFavorites = () => {
    try {
      const exportData = {
        exportDate: new Date().toISOString(),
        totalBooks: favorites.length,
        books: favorites.map((book) => ({
          title: book.title,
          authors: book.authors,
          publishedDate: book.publishedDate,
          subjects: book.subjects,
          dateAdded: book.dateAdded,
        })),
      };

      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(dataBlob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `book-favorites-${
        new Date().toISOString().split("T")[0]
      }.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting favorites:", error);
    }
  };

  const fetchSuggestions = async (query) => {
    if (!query.trim()) return;

    setSuggestionLoading(true);
    try {
      const response = await fetch(
        `/api/books/search?q=${encodeURIComponent(
          query
        )}&type=${searchType}&limit=5`
      );
      const data = await response.json();

      // Create suggestions based on search type
      let suggestionList = [];
      if (data.books && data.books.length > 0) {
        suggestionList = data.books
          .map((book) => {
            switch (searchType) {
              case "title":
                return book.title;
              case "author":
                return book.authors?.[0] || "Unknown Author";
              case "subject":
                return book.subjects?.[0] || query;
              default:
                return book.title;
            }
          })
          .filter((item, index, arr) => arr.indexOf(item) === index); // Remove duplicates
      }

      setSuggestions(suggestionList.slice(0, 5));
      setShowSuggestions(true);
    } catch (error) {
      console.error("Error fetching suggestions:", error);
      setSuggestions([]);
    } finally {
      setSuggestionLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setSearchTerm(suggestion);
    setShowSuggestions(false);
    // Auto-search when suggestion is clicked
    setTimeout(() => {
      searchBooksWithTerm(suggestion);
    }, 100);
  };

  const handleInputChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleInputFocus = () => {
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleInputBlur = () => {
    // Delay hiding suggestions to allow clicking
    setTimeout(() => {
      setShowSuggestions(false);
    }, 200);
  };

  const searchBooksWithTerm = async (term) => {
    if (!term.trim()) return;

    setLoading(true);
    setShowSuggestions(false);
    try {
      const response = await fetch(
        `/api/books/search?q=${encodeURIComponent(
          term
        )}&type=${searchType}&limit=24`
      );
      const data = await response.json();
      setBooks(data.books || []);
      setActiveTab("results");
    } catch (error) {
      console.error("Error searching books:", error);
    } finally {
      setLoading(false);
    }
  };

  const searchBooks = async (e) => {
    e.preventDefault();
    searchBooksWithTerm(searchTerm);
  };

  const quickSearch = async (query, type = "subject") => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/books/search?q=${encodeURIComponent(query)}&type=${type}&limit=12`
      );
      const data = await response.json();
      setBooks(data.books || []);
      setActiveTab("results");
    } catch (error) {
      console.error("Error in quick search:", error);
    } finally {
      setLoading(false);
    }
  };

  const BookCard = ({ book, showRemove = false }) => (
    <div className="book-card">
      <div className="book-cover">
        {book.thumbnail ? (
          <img src={book.thumbnail} alt={book.title} />
        ) : (
          <div className="no-cover">📚</div>
        )}
      </div>
      <div className="book-info">
        <div className="book-header">
          <h3>{book.title}</h3>
          <div className="book-actions">
            {showRemove ? (
              <button
                className="favorite-btn remove"
                onClick={() => removeFromFavorites(book.id)}
                title="Remove from favorites"
              >
                ❤️
              </button>
            ) : (
              <button
                className={`favorite-btn ${
                  isFavorite(book.id) ? "favorited" : ""
                }`}
                onClick={() =>
                  isFavorite(book.id)
                    ? removeFromFavorites(book.id)
                    : addToFavorites(book)
                }
                title={
                  isFavorite(book.id)
                    ? "Remove from favorites"
                    : "Add to favorites"
                }
              >
                {isFavorite(book.id) ? "❤️" : "🤍"}
              </button>
            )}
          </div>
        </div>
        <p className="authors">{book.authors?.join(", ")}</p>
        {book.publishedDate && (
          <p className="year">Published: {book.publishedDate}</p>
        )}
        {book.rating && <p className="rating">⭐ {book.rating}/5</p>}
        {book.subjects && book.subjects.length > 0 && (
          <div className="subjects">
            {book.subjects.slice(0, 3).map((subject, index) => (
              <span key={index} className="subject-tag">
                {subject}
              </span>
            ))}
          </div>
        )}
        <p className="description">{book.description}</p>
        {book.dateAdded && (
          <p className="date-added">
            Added: {new Date(book.dateAdded).toLocaleDateString()}
          </p>
        )}
      </div>
    </div>
  );

  return (
    <div className="app">
      <header>
        <h1>📖 Book Finder</h1>
        <p>Your academic companion for finding the perfect books</p>
      </header>

      <nav className="tabs">
        <button
          className={activeTab === "search" ? "active" : ""}
          onClick={() => setActiveTab("search")}
        >
          Search
        </button>
        <button
          className={activeTab === "trending" ? "active" : ""}
          onClick={() => setActiveTab("trending")}
        >
          Trending
        </button>
        <button
          className={activeTab === "favorites" ? "active" : ""}
          onClick={() => setActiveTab("favorites")}
        >
          ❤️ My Favorites ({favorites.length})
        </button>
        {recommendations.length > 0 && (
          <button
            className={activeTab === "recommendations" ? "active" : ""}
            onClick={() => setActiveTab("recommendations")}
          >
            🎯 For You ({recommendations.length})
          </button>
        )}
        <button
          className={activeTab === "results" ? "active" : ""}
          onClick={() => setActiveTab("results")}
        >
          Results ({books.length})
        </button>
      </nav>

      <main>
        {activeTab === "search" && (
          <div className="search-section">
            <form onSubmit={searchBooks} className="search-form">
              <div className="search-controls">
                <select
                  value={searchType}
                  onChange={(e) => setSearchType(e.target.value)}
                  className="search-type"
                >
                  <option value="general">General Search</option>
                  <option value="title">By Title</option>
                  <option value="author">By Author</option>
                  <option value="subject">By Subject</option>
                  <option value="isbn">By ISBN</option>
                </select>
                <div className="search-input-container">
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchTerm}
                    onChange={handleInputChange}
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                    placeholder={`Search ${
                      searchType === "general" ? "books" : searchType
                    }...`}
                    className="search-input"
                    autoComplete="off"
                  />
                  {showSuggestions && suggestions.length > 0 && (
                    <div className="suggestions-dropdown">
                      {suggestionLoading && (
                        <div className="suggestion-item loading">
                          Loading suggestions...
                        </div>
                      )}
                      {!suggestionLoading &&
                        suggestions.map((suggestion, index) => (
                          <div
                            key={index}
                            className="suggestion-item"
                            onClick={() => handleSuggestionClick(suggestion)}
                          >
                            <span className="suggestion-icon">🔍</span>
                            {suggestion}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
                <button type="submit" disabled={loading}>
                  {loading ? "Searching..." : "Search"}
                </button>
              </div>
            </form>

            <div className="quick-searches">
              <h3>Quick Searches for Students</h3>
              <div className="quick-buttons">
                <button onClick={() => quickSearch("computer science")}>
                  💻 Computer Science
                </button>
                <button onClick={() => quickSearch("mathematics")}>
                  🔢 Mathematics
                </button>
                <button onClick={() => quickSearch("psychology")}>
                  🧠 Psychology
                </button>
                <button onClick={() => quickSearch("literature")}>
                  📚 Literature
                </button>
                <button onClick={() => quickSearch("history")}>
                  🏛️ History
                </button>
                <button onClick={() => quickSearch("biology")}>
                  🧬 Biology
                </button>
                <button onClick={() => quickSearch("physics")}>
                  ⚛️ Physics
                </button>
                <button onClick={() => quickSearch("economics")}>
                  💰 Economics
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "trending" && (
          <div className="trending-section">
            <h2>📈 Trending Academic Books</h2>
            <button onClick={loadTrendingBooks} className="refresh-btn">
              🔄 Refresh Trending
            </button>
            <div className="books-grid">
              {trendingBooks.map((book) => (
                <BookCard key={book.id} book={book} />
              ))}
            </div>
          </div>
        )}

        {activeTab === "favorites" && (
          <div className="favorites-section">
            <h2>❤️ My Favorite Books</h2>
            {favorites.length === 0 ? (
              <div className="no-favorites">
                <p>You haven't added any favorite books yet.</p>
                <p>
                  Start searching and click the 🤍 icon to add books to your
                  favorites!
                </p>
                <button
                  onClick={() => setActiveTab("search")}
                  className="search-redirect-btn"
                >
                  Start Searching Books
                </button>
              </div>
            ) : (
              <>
                <div className="favorites-stats">
                  <p>
                    You have {favorites.length} favorite book
                    {favorites.length !== 1 ? "s" : ""}
                  </p>
                  <div className="favorites-actions">
                    <button
                      onClick={exportFavorites}
                      className="export-favorites-btn"
                    >
                      📥 Export List
                    </button>
                    <button
                      onClick={() => {
                        if (
                          window.confirm(
                            "Are you sure you want to clear all favorites?"
                          )
                        ) {
                          saveFavorites([]);
                        }
                      }}
                      className="clear-favorites-btn"
                    >
                      Clear All
                    </button>
                  </div>
                </div>
                <div className="books-grid">
                  {favorites
                    .sort(
                      (a, b) => new Date(b.dateAdded) - new Date(a.dateAdded)
                    )
                    .map((book) => (
                      <BookCard key={book.id} book={book} showRemove={true} />
                    ))}
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === "recommendations" && (
          <div className="recommendations-section">
            <h2>🎯 Recommended For You</h2>
            <p className="recommendations-subtitle">
              Based on your favorite books and subjects
            </p>
            {recommendationsLoading ? (
              <div className="loading-message">
                <p>Finding perfect recommendations for you...</p>
              </div>
            ) : recommendations.length === 0 ? (
              <div className="no-recommendations">
                <p>
                  Add some books to your favorites to get personalized
                  recommendations!
                </p>
                <button
                  onClick={() => setActiveTab("search")}
                  className="search-redirect-btn"
                >
                  Start Building Your Library
                </button>
              </div>
            ) : (
              <div className="books-grid">
                {recommendations.map((book) => (
                  <BookCard key={book.id} book={book} />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "results" && (
          <div className="results-section">
            <h2>Search Results</h2>
            {books.length === 0 ? (
              <p className="no-results">
                No books found. Try a different search term.
              </p>
            ) : (
              <div className="books-grid">
                {books.map((book) => (
                  <BookCard key={book.id} book={book} />
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
