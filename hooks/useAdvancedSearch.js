import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Custom hook untuk advanced search dengan quick search + deep search
 * 
 * Logic:
 * 1. Quick search: cari di data yang sudah dimuat
 * 2. Jika quick search ada hasil: tampilkan langsung
 * 3. Jika quick search tidak ada & deep search belum selesai: tunggu & tampilkan loading
 * 4. Jika quick search tidak ada & deep search selesai: tampilkan "tidak ditemukan"
 * 
 * @param {Array} allData - Semua data yang sudah dimuat
 * @param {boolean} isLoadingMore - Apakah masih loading data lebih banyak
 * @param {Function} searchFn - Fungsi untuk deep search (async)
 * @param {number} debounceMs - Debounce time untuk search input
 * @returns {Object} { searchQuery, setSearchQuery, searchResults, isSearching, noResultsFound }
 */
export const useAdvancedSearch = (
  allData = [],
  isLoadingMore = false,
  searchFn = null,
  debounceMs = 300
) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [quickSearchResults, setQuickSearchResults] = useState([]);
  const [deepSearchResults, setDeepSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [noResultsFound, setNoResultsFound] = useState(false);
  const debounceTimer = useRef(null);

  // Quick search - mencari di data yang sudah dimuat
  const performQuickSearch = useCallback((query) => {
    if (!query.trim()) {
      setQuickSearchResults([]);
      setDeepSearchResults(null);
      setNoResultsFound(false);
      setIsSearching(false);
      return;
    }

    const lowerQuery = query.toLowerCase();
    const results = allData.filter(item => {
      // Cari di SKU, nama produk, atau username
      return (
        (item.product?.sku?.toLowerCase().includes(lowerQuery) ||
          item.product?.nama_produk?.toLowerCase().includes(lowerQuery) ||
          item.user?.username?.toLowerCase().includes(lowerQuery) ||
          item.user?.full_name?.toLowerCase().includes(lowerQuery) ||
          item.notes?.toLowerCase().includes(lowerQuery)) ?? false
      );
    });

    setQuickSearchResults(results);

    // Jika quick search ada hasil, jangan lakukan deep search
    if (results.length > 0) {
      setDeepSearchResults(null);
      setNoResultsFound(false);
      setIsSearching(false);
      return;
    }

    // Quick search tidak ada hasil, lakukan deep search jika tersedia
    if (searchFn && typeof searchFn === 'function') {
      setIsSearching(true);
      setNoResultsFound(false);

      searchFn(query)
        .then((results) => {
          setDeepSearchResults(results || []);
          setNoResultsFound(results?.length === 0);
        })
        .catch((error) => {
          console.error('Deep search error:', error);
          setDeepSearchResults([]);
          setNoResultsFound(true);
        })
        .finally(() => {
          setIsSearching(false);
        });
    } else {
      // Tidak ada deep search function, langsung tampilkan tidak ditemukan
      setNoResultsFound(true);
      setIsSearching(false);
    }
  }, [allData, searchFn]);

  // Debounced search
  const handleSearchChange = useCallback((query) => {
    setSearchQuery(query);

    // Clear previous timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Set new timer
    debounceTimer.current = setTimeout(() => {
      performQuickSearch(query);
    }, debounceMs);
  }, [performQuickSearch, debounceMs]);

  // Cleanup timer
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  // Tentukan hasil yang akan ditampilkan
  let searchResults = [];
  if (searchQuery.trim()) {
    // Ada query: prioritas ke quick search, jika tidak ada cek deep search
    if (quickSearchResults.length > 0) {
      searchResults = quickSearchResults;
    } else if (deepSearchResults !== null) {
      searchResults = deepSearchResults;
    }
  }

  return {
    searchQuery,
    setSearchQuery: handleSearchChange,
    searchResults,
    isSearching,
    noResultsFound,
    hasSearchQuery: searchQuery.trim().length > 0,
  };
};

export default useAdvancedSearch;
