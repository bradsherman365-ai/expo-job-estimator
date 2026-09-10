import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  FlatList,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  addQuote,
  getQuotesByContact,
  addInvoice,
  getInvoicesByContact,
  getContact,
} from '../db/database';

interface Quote {
  id: string;
  quoteNumber: string;
  date: string;
  total: number;
  status: string;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string;
  total: number;
  amountPaid: number;
  status: string;
}

export const ContactJobsScreen = ({ route, navigation }: any) => {
  const { contactId } = route.params || {};
  
  const [contact, setContact] = useState<any>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [activeTab, setActiveTab] = useState<'quotes' | 'invoices'>('quotes');

  useFocusEffect(
    useCallback(() => {
      if (contactId) {
        loadContactData();
      }
    }, [contactId])
  );

  const loadContactData = () => {
    try {
      const contactData = getContact(contactId);
      setContact(contactData);

      const quoteData = getQuotesByContact(contactId);
      setQuotes(quoteData);

      const invoiceData = getInvoicesByContact(contactId);
      setInvoices(invoiceData);
    } catch (error) {
      console.error('Error loading contact data:', error);
      Alert.alert('Error', 'Failed to load contact data');
    }
  };

  const handleNewQuote = () => {
    try {
      const newQuoteId = addQuote({
        contactId,
        quoteNumber: 'Q' + Date.now().toString().slice(-6),
        jobType: 'Residential',
        date: new Date(),
      });
      navigation.navigate('QuoteDetail', { quoteId: newQuoteId });
    } catch (error) {
      Alert.alert('Error', 'Failed to create quote');
    }
  };

  const handleNewInvoice = () => {
    try {
      const newInvoiceId = addInvoice({
        contactId,
        invoiceNumber: 'INV' + Date.now().toString().slice(-6),
        date: new Date(),
      });
      navigation.navigate('InvoiceDetail', { invoiceId: newInvoiceId });
    } catch (error) {
      Alert.alert('Error', 'Failed to create invoice');
    }
  };

  const handleQuotePress = (quote: Quote) => {
    navigation.navigate('QuoteDetail', { quoteId: quote.id });
  };

  const handleInvoicePress = (invoice: Invoice) => {
    navigation.navigate('InvoiceDetail', { invoiceId: invoice.id });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>{contact?.name || 'Contact'}</Text>
          <Text style={styles.headerSubtitle}>{contact?.type}</Text>
        </View>
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'quotes' && styles.activeTab]}
          onPress={() => setActiveTab('quotes')}
        >
          <Text style={[styles.tabText, activeTab === 'quotes' && styles.activeTabText]}>
            Quotes ({quotes.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'invoices' && styles.activeTab]}
          onPress={() => setActiveTab('invoices')}
        >
          <Text style={[styles.tabText, activeTab === 'invoices' && styles.activeTabText]}>
            Invoices ({invoices.length})
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'quotes' ? (
        <ScrollView style={styles.content}>
          <FlatList
            data={quotes}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.card}
                onPress={() => handleQuotePress(item)}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{item.quoteNumber}</Text>
                  <Text style={styles.cardAmount}>${item.total.toFixed(2)}</Text>
                </View>
                <Text style={styles.cardDate}>{new Date(item.date).toLocaleDateString()}</Text>
                <Text style={[styles.cardStatus, { color: item.status === 'accepted' ? '#34C759' : '#FF9500' }]}>
                  {item.status.toUpperCase()}
                </Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No quotes yet</Text>
              </View>
            }
          />
          <TouchableOpacity style={styles.addButton} onPress={handleNewQuote}>
            <Text style={styles.addButtonText}>+ New Quote</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <ScrollView style={styles.content}>
          <FlatList
            data={invoices}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.card}
                onPress={() => handleInvoicePress(item)}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{item.invoiceNumber}</Text>
                  <Text style={styles.cardAmount}>${item.total.toFixed(2)}</Text>
                </View>
                <Text style={styles.cardDate}>{new Date(item.date).toLocaleDateString()}</Text>
                <View style={styles.cardPaymentStatus}>
                  <Text style={styles.cardPayment}>
                    Paid: ${item.amountPaid.toFixed(2)}
                  </Text>
                  <Text style={[styles.cardStatus, { color: item.amountPaid >= item.total ? '#34C759' : '#FF3B30' }]}>
                    {item.amountPaid >= item.total ? 'PAID' : 'PENDING'}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No invoices yet</Text>
              </View>
            }
          />
          <TouchableOpacity style={styles.addButton} onPress={handleNewInvoice}>
            <Text style={styles.addButtonText}>+ New Invoice</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
    alignItems: 'center',
  },
  activeTab: {
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
  },
  activeTabText: {
    color: '#007AFF',
  },
  content: {
    flex: 1,
    padding: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  cardAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  cardDate: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
  },
  cardPaymentStatus: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  cardPayment: {
    fontSize: 12,
    color: '#666',
  },
  cardStatus: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
  },
  addButton: {
    backgroundColor: '#34C759',
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginVertical: 12,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
