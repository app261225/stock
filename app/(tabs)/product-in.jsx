import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSession } from '../../contexts/AuthContext';
import stockLogService from '../../services/stockLogService';
import useAdvancedSearch from '../../hooks/useAdvancedSearch';

const DEFAULT_PER_PAGE = 10;

export default function ProductInScreen() {
  const { session } = useSession();

  // Data state
  const [allLogs, setAllLogs] = useState([]);
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_PER_PAGE);

  // Search state
  const {
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    noResultsFound,
    hasSearchQuery,
  } = useAdvancedSearch(allLogs, false, null, 300);

  // Load initial data
  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setIsLoadingInitial(true);
    setError(null);
    try {
      const data = await stockLogService.getByType('IN', 500);
      setAllLogs(data);
      setCurrentPage(1);
    } catch (err) {
      console.error('Load logs error:', err);
      setError('Gagal memuat data log');
    } finally {
      setIsLoadingInitial(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await loadLogs();
    } finally {
      setRefreshing(false);
    }
  };

  // Tentukan data yang ditampilkan
  const displayData = hasSearchQuery ? searchResults : allLogs;
  const totalItems = displayData.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  // Get paginated data
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = displayData.slice(startIndex, endIndex);

  // Reset page saat search berubah
  useEffect(() => {
    if (hasSearchQuery) {
      setCurrentPage(1);
    }
  }, [searchQuery, hasSearchQuery]);

  const handleItemsPerPageChange = (newValue) => {
    const value = parseInt(newValue, 10);
    if (value > 0) {
      setItemsPerPage(value);
      setCurrentPage(1);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPage = (pageNumber) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  // Render log item
  const renderLogItem = ({ item }) => {
    const date = new Date(item.created_at);
    const timeString = date.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    });
    const dateString = date.toLocaleDateString('id-ID', {
      month: 'short',
      day: 'numeric',
    });

    return (
      <View style={styles.logItem}>
        <View style={styles.logContent}>
          <View style={styles.logMain}>
            <MaterialCommunityIcons
              name="plus-circle"
              size={20}
              color="#10b981"
              style={styles.logIcon}
            />
            <View style={styles.logTextContainer}>
              <Text style={styles.logProductName}>
                {item.product?.nama_produk}
              </Text>
              <Text style={styles.logDetails}>
                {item.product?.sku} • +{item.quantity} unit
              </Text>
            </View>
          </View>

          <View style={styles.logTime}>
            <Text style={styles.timeText}>{timeString}</Text>
            <Text style={styles.dateText}>{dateString}</Text>
          </View>
        </View>

        {item.notes && (
          <Text style={styles.notesText}>Catatan: {item.notes}</Text>
        )}
      </View>
    );
  };

  // Loading state
  if (isLoadingInitial) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Memuat data...</Text>
        </View>
      </View>
    );
  }

  // Error state
  if (error && !hasSearchQuery) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContent}>
          <MaterialCommunityIcons
            name="alert-circle"
            size={48}
            color="#ef4444"
          />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadLogs}>
            <Text style={styles.retryButtonText}>Coba Lagi</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Log Stock In</Text>
        <Text style={styles.headerSubtitle}>
          Total: {totalItems} transaksi
        </Text>
      </View>

      {/* Search Box */}
      <View style={styles.searchSection}>
        <View style={styles.searchContainer}>
          <MaterialCommunityIcons
            name="magnify"
            size={20}
            color="#9ca3af"
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari SKU, produk, atau user..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9ca3af"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
            >
              <MaterialCommunityIcons name="close" size={20} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>

        {/* Items Per Page Control */}
        <View style={styles.itemsPerPageContainer}>
          <Text style={styles.itemsPerPageLabel}>Per halaman:</Text>
          <TouchableOpacity
            style={styles.itemsPerPageButton}
            onPress={() => {
              // Simplified: toggle between 5, 10, 20
              const options = [5, 10, 20];
              const currentIndex = options.indexOf(itemsPerPage);
              const nextIndex = (currentIndex + 1) % options.length;
              handleItemsPerPageChange(options[nextIndex].toString());
            }}
          >
            <Text style={styles.itemsPerPageButtonText}>{itemsPerPage}</Text>
            <MaterialCommunityIcons
              name="chevron-down"
              size={16}
              color="#2563eb"
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      {hasSearchQuery && isSearching && !searchResults.length ? (
        // Deep search is happening
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.searchingText}>Mencari data...</Text>
        </View>
      ) : hasSearchQuery && noResultsFound ? (
        // No results found
        <View style={styles.centerContent}>
          <MaterialCommunityIcons
            name="magnify-close"
            size={48}
            color="#d1d5db"
          />
          <Text style={styles.noResultsText}>Data tidak ditemukan</Text>
          <Text style={styles.noResultsSubtext}>
            Coba gunakan kata kunci lain
          </Text>
        </View>
      ) : paginatedData.length === 0 ? (
        // No data at all
        <View style={styles.centerContent}>
          <MaterialCommunityIcons
            name="inbox-multiple"
            size={48}
            color="#d1d5db"
          />
          <Text style={styles.noDataText}>Tidak ada data</Text>
          <Text style={styles.noDataSubtext}>
            Belum ada transaksi stock in
          </Text>
        </View>
      ) : (
        // Data list
        <FlatList
          data={paginatedData}
          renderItem={renderLogItem}
          keyExtractor={(item) => item.id}
          scrollEnabled={true}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#2563eb"
            />
          }
        />
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <View style={styles.paginationContainer}>
          <TouchableOpacity
            style={[
              styles.paginationButton,
              currentPage === 1 && styles.paginationButtonDisabled,
            ]}
            onPress={handlePreviousPage}
            disabled={currentPage === 1}
          >
            <MaterialCommunityIcons
              name="chevron-left"
              size={20}
              color={currentPage === 1 ? '#d1d5db' : '#2563eb'}
            />
            <Text
              style={[
                styles.paginationButtonText,
                currentPage === 1 && styles.paginationButtonTextDisabled,
              ]}
            >
              Sebelumnya
            </Text>
          </TouchableOpacity>

          <View style={styles.pageIndicator}>
            <Text style={styles.pageIndicatorText}>
              {currentPage} / {totalPages}
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.paginationButton,
              currentPage === totalPages && styles.paginationButtonDisabled,
            ]}
            onPress={handleNextPage}
            disabled={currentPage === totalPages}
          >
            <Text
              style={[
                styles.paginationButtonText,
                currentPage === totalPages && styles.paginationButtonTextDisabled,
              ]}
            >
              Berikutnya
            </Text>
            <MaterialCommunityIcons
              name="chevron-right"
              size={20}
              color={currentPage === totalPages ? '#d1d5db' : '#2563eb'}
            />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#6b7280',
  },
  searchSection: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    gap: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
  },
  itemsPerPageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemsPerPageLabel: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  itemsPerPageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#eff6ff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    gap: 4,
  },
  itemsPerPageButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563eb',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  logItem: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
    marginBottom: 4,
  },
  logContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logIcon: {
    marginRight: 4,
  },
  logTextContainer: {
    flex: 1,
  },
  logProductName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  logDetails: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  logTime: {
    alignItems: 'flex-end',
  },
  timeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  dateText: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 2,
  },
  notesText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    fontStyle: 'italic',
  },
  paginationContainer: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  paginationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 4,
  },
  paginationButtonDisabled: {
    opacity: 0.5,
  },
  paginationButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563eb',
  },
  paginationButtonTextDisabled: {
    color: '#d1d5db',
  },
  pageIndicator: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#eff6ff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  pageIndicatorText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563eb',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  searchingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  errorText: {
    marginTop: 12,
    fontSize: 14,
    color: '#ef4444',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: '#ef4444',
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  noResultsText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  noResultsSubtext: {
    marginTop: 4,
    fontSize: 13,
    color: '#9ca3af',
  },
  noDataText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  noDataSubtext: {
    marginTop: 4,
    fontSize: 13,
    color: '#9ca3af',
  },
});
