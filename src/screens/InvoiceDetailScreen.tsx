import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Alert,
  FlatList,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  addPayment,
  getPaymentsByInvoice,
  getInvoice,
  updateInvoice,
  getInvoiceItems,
  addInvoiceItem,
  updateInvoiceItem,
  deleteInvoiceItem,
  getContact,
} from '../db/database';
import { generateInvoicePDF, sharePDF } from '../utils/pdfGenerator';
import { useAppStore } from '../store/appStore';

const UNIT_TYPES = ['sq. ft.', 'ea.', 'hrs', 'lin. ft.', 'lbs', 'gal'];

interface InvoiceItem {
  id: string;
  description: string;
  itemType: string;
  quantity: number;
  unitType: string;
  unitCost: number;
  markupPercentage: number;
  markupAmount: number;
  totalPrice: number;
  showUnitPrice: boolean;
  showMarkup: boolean;
  displayOrder: number;
}

interface Payment {
  id: string;
  amount: number;
  paymentMethod?: string;
  paymentDate: string;
  notes?: string;
}

export const InvoiceDetailScreen = ({ route, navigation }: any) => {
  const { invoiceId } = route.params || {};
  const { companyName, companyLogoPath } = useAppStore();

  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [terms, setTerms] = useState('');
  const [scopeOfWork, setScopeOfWork] = useState('');
  const [taxRate, setTaxRate] = useState('0');
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [contact, setContact] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(!invoiceId);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    paymentMethod: 'Check',
    paymentDate: new Date().toISOString().split('T')[0],
    notes: '',
  });

  useFocusEffect(
    useCallback(() => {
      if (invoiceId) {
        loadInvoice();
      } else {
        const num = 'INV' + Date.now().toString().slice(-6);
        setInvoiceNumber(num);
      }
    }, [invoiceId])
  );

  const loadInvoice = () => {
    try {
      const invoice = getInvoice(invoiceId);
      if (invoice) {
        setInvoiceNumber(invoice.invoiceNumber);
        setDate(new Date(invoice.date).toISOString().split('T')[0]);
        setDueDate(invoice.dueDate ? new Date(invoice.dueDate).toISOString().split('T')[0] : '');
        setTerms(invoice.terms || '');
        setScopeOfWork(invoice.scopeOfWork || '');
        setTaxRate(invoice.taxRate?.toString() || '0');

        const contactData = getContact(invoice.contactId);
        setContact(contactData);

        const invoiceItems = getInvoiceItems(invoiceId);
        setItems(invoiceItems);

        const invoicePayments = getPaymentsByInvoice(invoiceId);
        setPayments(invoicePayments);
      }
    } catch (error) {
      console.error('Error loading invoice:', error);
      Alert.alert('Error', 'Failed to load invoice');
    }
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
    const taxAmount = subtotal * (parseFloat(taxRate) || 0) / 100;
    const total = subtotal + taxAmount;
    const amountPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const balance = Math.max(0, total - amountPaid);
    return { subtotal, taxAmount, total, amountPaid, balance };
  };

  const handleAddPayment = () => {
    if (!paymentForm.amount.trim()) {
      Alert.alert('Validation', 'Please enter a payment amount');
      return;
    }

    try {
      const newPaymentId = addPayment({
        invoiceId: invoiceId || '',
        amount: parseFloat(paymentForm.amount),
        paymentMethod: paymentForm.paymentMethod,
        paymentDate: new Date(paymentForm.paymentDate),
        notes: paymentForm.notes,
      });

      const newPayment: Payment = {
        id: newPaymentId,
        amount: parseFloat(paymentForm.amount),
        paymentMethod: paymentForm.paymentMethod,
        paymentDate: paymentForm.paymentDate,
        notes: paymentForm.notes,
      };

      setPayments([...payments, newPayment]);
      setPaymentForm({
        amount: '',
        paymentMethod: 'Check',
        paymentDate: new Date().toISOString().split('T')[0],
        notes: '',
      });
      setShowPaymentModal(false);
      Alert.alert('Success', 'Payment recorded');
    } catch (error) {
      console.error('Error adding payment:', error);
      Alert.alert('Error', 'Failed to record payment');
    }
  };

  const handleGeneratePDF = async () => {
    try {
      const pdfPath = await generateInvoicePDF(invoiceId, {
        companyName,
        companyLogoPath,
      });
      Alert.alert('Success', 'PDF generated', [
        {
          text: 'Share',
          onPress: () => sharePDF(pdfPath),
        },
        { text: 'OK', onPress: () => {} },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to generate PDF');
    }
  };

  const { subtotal, taxAmount, total, amountPaid, balance } = calculateTotals();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Invoice {invoiceNumber}</Text>
          {contact && <Text style={styles.contactName}>{contact.name}</Text>}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Invoice Information</Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Invoice Number</Text>
            <TextInput
              style={styles.input}
              value={invoiceNumber}
              onChangeText={setInvoiceNumber}
              editable={isEditing}
              placeholderTextColor="#ccc"
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Date</Text>
              <TextInput
                style={styles.input}
                value={date}
                onChangeText={setDate}
                editable={isEditing}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#ccc"
              />
            </View>
            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={styles.label}>Due Date</Text>
              <TextInput
                style={styles.input}
                value={dueDate}
                onChangeText={setDueDate}
                editable={isEditing}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#ccc"
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Tax Rate (%)</Text>
            <TextInput
              style={styles.input}
              value={taxRate}
              onChangeText={setTaxRate}
              editable={isEditing}
              keyboardType="decimal-pad"
              placeholderTextColor="#ccc"
            />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.itemsHeader}>
            <Text style={styles.sectionTitle}>Line Items</Text>
          </View>

          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <View style={styles.itemCard}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemDescription}>{item.description}</Text>
                </View>
                <View style={styles.itemDetails}>
                  <View style={styles.itemDetail}>
                    <Text style={styles.itemLabel}>Qty:</Text>
                    <Text style={styles.itemValue}>{item.quantity}</Text>
                  </View>
                  <View style={styles.itemDetail}>
                    <Text style={styles.itemLabel}>Unit:</Text>
                    <Text style={styles.itemValue}>{item.unitType}</Text>
                  </View>
                  {item.showUnitPrice && (
                    <View style={styles.itemDetail}>
                      <Text style={styles.itemLabel}>Price:</Text>
                      <Text style={styles.itemValue}>${item.unitCost.toFixed(2)}</Text>
                    </View>
                  )}
                  <View style={styles.itemDetail}>
                    <Text style={styles.itemLabel}>Total:</Text>
                    <Text style={styles.itemValue}>${item.totalPrice.toFixed(2)}</Text>
                  </View>
                </View>
              </View>
            )}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Totals</Text>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Subtotal:</Text>
            <Text style={styles.totalsValue}>${subtotal.toFixed(2)}</Text>
          </View>
          {parseFloat(taxRate) > 0 && (
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Tax ({taxRate}%):</Text>
              <Text style={styles.totalsValue}>${taxAmount.toFixed(2)}</Text>
            </View>
          )}
          <View style={[styles.totalsRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>TOTAL:</Text>
            <Text style={styles.totalValue}>${total.toFixed(2)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.itemsHeader}>
            <Text style={styles.sectionTitle}>Payments</Text>
            <TouchableOpacity style={styles.addPaymentButton} onPress={() => setShowPaymentModal(true)}>
              <Text style={styles.addPaymentButtonText}>+ Record</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={payments}
            keyExtractor={(payment) => payment.id}
            scrollEnabled={false}
            renderItem={({ item: payment }) => (
              <View style={styles.paymentCard}>
                <View style={styles.paymentRow}>
                  <Text style={styles.paymentDate}>{payment.paymentDate}</Text>
                  <Text style={styles.paymentAmount}>${payment.amount.toFixed(2)}</Text>
                </View>
                {payment.paymentMethod && (
                  <Text style={styles.paymentMethod}>{payment.paymentMethod}</Text>
                )}
              </View>
            )}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No payments recorded</Text>
            }
          />

          <View style={styles.balanceSummary}>
            <View style={styles.balanceRow}>
              <Text style={styles.balanceLabel}>Amount Paid:</Text>
              <Text style={styles.balanceValue}>${amountPaid.toFixed(2)}</Text>
            </View>
            <View style={[styles.balanceRow, styles.balanceFinal]}>
              <Text style={styles.balanceLabel}>Balance Due:</Text>
              <Text style={[styles.balanceValue, { color: balance > 0 ? '#FF3B30' : '#34C759' }]}>
                ${balance.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Scope of Work</Text>
          <View style={styles.formGroup}>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={scopeOfWork}
              onChangeText={setScopeOfWork}
              editable={isEditing}
              multiline
              numberOfLines={3}
              placeholderTextColor="#ccc"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Terms</Text>
          <View style={styles.formGroup}>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={terms}
              onChangeText={setTerms}
              editable={isEditing}
              multiline
              numberOfLines={3}
              placeholderTextColor="#ccc"
            />
          </View>
        </View>

        <View style={styles.buttonGroup}>
          {isEditing ? (
            <TouchableOpacity style={styles.saveButton} onPress={() => setIsEditing(false)}>
              <Text style={styles.saveButtonText}>Done Editing</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity style={styles.pdfButton} onPress={handleGeneratePDF}>
                <Text style={styles.pdfButtonText}>Generate PDF</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.editButton} onPress={() => setIsEditing(true)}>
                <Text style={styles.editButtonText}>Edit</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>

      {/* Payment Modal */}
      {showPaymentModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Record Payment</Text>
              <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
                <Text style={styles.modalCloseButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Amount *</Text>
                <TextInput
                  style={styles.input}
                  value={paymentForm.amount}
                  onChangeText={(text) => setPaymentForm({ ...paymentForm, amount: text })}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor="#ccc"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Payment Method</Text>
                <TextInput
                  style={styles.input}
                  value={paymentForm.paymentMethod}
                  onChangeText={(text) => setPaymentForm({ ...paymentForm, paymentMethod: text })}
                  placeholder="Check, Cash, etc."
                  placeholderTextColor="#ccc"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Date</Text>
                <TextInput
                  style={styles.input}
                  value={paymentForm.paymentDate}
                  onChangeText={(text) => setPaymentForm({ ...paymentForm, paymentDate: text })}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#ccc"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Notes</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={paymentForm.notes}
                  onChangeText={(text) => setPaymentForm({ ...paymentForm, notes: text })}
                  multiline
                  numberOfLines={2}
                  placeholderTextColor="#ccc"
                />
              </View>
            </ScrollView>

            <View style={styles.modalButtonGroup}>
              <TouchableOpacity style={styles.saveButton} onPress={handleAddPayment}>
                <Text style={styles.saveButtonText}>Record Payment</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setShowPaymentModal(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  contactName: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 12,
  },
  formGroup: {
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: '#fff',
    color: '#333',
  },
  textArea: {
    textAlignVertical: 'top',
    paddingTop: 10,
  },
  itemsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addPaymentButton: {
    backgroundColor: '#34C759',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addPaymentButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  itemCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 6,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  itemHeader: {
    marginBottom: 8,
  },
  itemDescription: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  itemDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  itemDetail: {
    flexDirection: 'row',
    gap: 4,
  },
  itemLabel: {
    fontSize: 11,
    color: '#666',
  },
  itemValue: {
    fontSize: 11,
    fontWeight: '600',
    color: '#333',
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  totalRow: {
    borderBottomWidth: 0,
    paddingVertical: 12,
  },
  totalsLabel: {
    fontSize: 13,
    color: '#666',
  },
  totalsValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
  },
  totalValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  paymentCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 6,
    padding: 12,
    marginBottom: 12,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  paymentDate: {
    fontSize: 12,
    color: '#666',
  },
  paymentAmount: {
    fontSize: 13,
    fontWeight: '600',
    color: '#34C759',
  },
  paymentMethod: {
    fontSize: 11,
    color: '#999',
  },
  emptyText: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 12,
  },
  balanceSummary: {
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
    padding: 12,
    marginTop: 12,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  balanceFinal: {
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    paddingTop: 12,
    marginTop: 4,
  },
  balanceLabel: {
    fontSize: 13,
    color: '#333',
  },
  balanceValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#333',
  },
  buttonGroup: {
    padding: 16,
    gap: 8,
  },
  saveButton: {
    backgroundColor: '#34C759',
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  pdfButton: {
    backgroundColor: '#FF9500',
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  pdfButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  editButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  editButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalCloseButton: {
    fontSize: 24,
    color: '#999',
  },
  modalScroll: {
    padding: 16,
  },
  modalButtonGroup: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
});
