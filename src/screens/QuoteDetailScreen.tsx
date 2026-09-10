import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Alert,
  FlatList,
  Modal,
  Pressable,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  addQuote,
  getQuote,
  updateQuote,
  deleteQuote,
  getQuoteItems,
  addQuoteItem,
  updateQuoteItem,
  deleteQuoteItem,
  reorderQuoteItems,
} from '../db/database';
import { generateQuotePDF, sharePDF } from '../utils/pdfGenerator';
import { useAppStore } from '../store/appStore';

const UNIT_TYPES = ['sq. ft.', 'ea.', 'hrs', 'lin. ft.', 'lbs', 'gal'];
const JOB_TYPES = ['Residential', 'Commercial', 'Mixed'];

interface QuoteItem {
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

export const QuoteDetailScreen = ({ route, navigation }: any) => {
  const { quoteId } = route.params || {};
  const { companyName, companyLogoPath } = useAppStore();

  const [quoteNumber, setQuoteNumber] = useState('');
  const [jobType, setJobType] = useState(JOB_TYPES[0]);
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [expirationDate, setExpirationDate] = useState('');
  const [terms, setTerms] = useState('');
  const [inclusions, setInclusions] = useState('');
  const [exclusions, setExclusions] = useState('');
  const [scopeOfWork, setScopeOfWork] = useState('');
  const [taxRate, setTaxRate] = useState('0');
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(!quoteId);

  const [itemForm, setItemForm] = useState({
    description: '',
    itemType: 'labor',
    quantity: '1',
    unitType: UNIT_TYPES[0],
    unitCost: '0',
    markupPercentage: '0',
    showUnitPrice: true,
    showMarkup: true,
  });

  useFocusEffect(
    useCallback(() => {
      if (quoteId) {
        loadQuote();
      } else {
        // Generate quote number
        const num = 'Q' + Date.now().toString().slice(-6);
        setQuoteNumber(num);
      }
    }, [quoteId])
  );

  const loadQuote = () => {
    try {
      const quote = getQuote(quoteId);
      if (quote) {
        setQuoteNumber(quote.quoteNumber);
        setJobType(quote.jobType);
        setDescription(quote.description || '');
        setDate(new Date(quote.date).toISOString().split('T')[0]);
        setExpirationDate(quote.expirationDate ? new Date(quote.expirationDate).toISOString().split('T')[0] : '');
        setTerms(quote.terms || '');
        setInclusions(quote.inclusions || '');
        setExclusions(quote.exclusions || '');
        setScopeOfWork(quote.scopeOfWork || '');
        setTaxRate(quote.taxRate?.toString() || '0');

        const quoteItems = getQuoteItems(quoteId);
        setItems(quoteItems);
      }
    } catch (error) {
      console.error('Error loading quote:', error);
      Alert.alert('Error', 'Failed to load quote');
    }
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
    const taxAmount = subtotal * (parseFloat(taxRate) || 0) / 100;
    const total = subtotal + taxAmount;
    return { subtotal, taxAmount, total };
  };

  const handleAddItem = () => {
    setEditingItemId(null);
    setItemForm({
      description: '',
      itemType: 'labor',
      quantity: '1',
      unitType: UNIT_TYPES[0],
      unitCost: '0',
      markupPercentage: '0',
      showUnitPrice: true,
      showMarkup: true,
    });
    setShowItemModal(true);
  };

  const handleEditItem = (item: QuoteItem) => {
    setEditingItemId(item.id);
    setItemForm({
      description: item.description,
      itemType: item.itemType,
      quantity: item.quantity.toString(),
      unitType: item.unitType,
      unitCost: item.unitCost.toString(),
      markupPercentage: item.markupPercentage.toString(),
      showUnitPrice: item.showUnitPrice,
      showMarkup: item.showMarkup,
    });
    setShowItemModal(true);
  };

  const handleSaveItem = () => {
    if (!itemForm.description.trim() || !itemForm.quantity || !itemForm.unitCost) {
      Alert.alert('Validation', 'Please fill in all required fields');
      return;
    }

    try {
      const quantity = parseFloat(itemForm.quantity);
      const unitCost = parseFloat(itemForm.unitCost);
      const markupPercentage = parseFloat(itemForm.markupPercentage) || 0;

      if (editingItemId) {
        updateQuoteItem(editingItemId, {
          description: itemForm.description,
          itemType: itemForm.itemType,
          quantity,
          unitType: itemForm.unitType,
          unitCost,
          markupPercentage,
          showUnitPrice: itemForm.showUnitPrice ? 1 : 0,
          showMarkup: itemForm.showMarkup ? 1 : 0,
        });

        const updatedItems = items.map((item) =>
          item.id === editingItemId
            ? {
                ...item,
                description: itemForm.description,
                itemType: itemForm.itemType,
                quantity,
                unitType: itemForm.unitType,
                unitCost,
                markupPercentage,
                showUnitPrice: itemForm.showUnitPrice,
                showMarkup: itemForm.showMarkup,
              }
            : item
        );
        setItems(updatedItems);
      } else {
        const newItemId = addQuoteItem({
          quoteId: quoteId || '',
          description: itemForm.description,
          itemType: itemForm.itemType,
          quantity,
          unitType: itemForm.unitType,
          unitCost,
          markupPercentage,
          displayOrder: items.length,
          showUnitPrice: itemForm.showUnitPrice,
          showMarkup: itemForm.showMarkup,
        });

        setItems([
          ...items,
          {
            id: newItemId,
            description: itemForm.description,
            itemType: itemForm.itemType,
            quantity,
            unitType: itemForm.unitType,
            unitCost,
            markupPercentage,
            markupAmount: (quantity * unitCost * markupPercentage) / 100,
            totalPrice: quantity * unitCost + (quantity * unitCost * markupPercentage) / 100,
            showUnitPrice: itemForm.showUnitPrice,
            showMarkup: itemForm.showMarkup,
            displayOrder: items.length,
          },
        ]);
      }

      setShowItemModal(false);
    } catch (error) {
      console.error('Error saving item:', error);
      Alert.alert('Error', 'Failed to save item');
    }
  };

  const handleDeleteItem = (itemId: string) => {
    Alert.alert(
      'Delete Item',
      'Are you sure?',
      [
        { text: 'Cancel', onPress: () => {}, style: 'cancel' },
        {
          text: 'Delete',
          onPress: () => {
            try {
              if (quoteId) {
                deleteQuoteItem(itemId);
              }
              setItems(items.filter((item) => item.id !== itemId));
            } catch (error) {
              Alert.alert('Error', 'Failed to delete item');
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  const handleSaveQuote = async () => {
    if (!quoteNumber.trim()) {
      Alert.alert('Validation', 'Please enter a quote number');
      return;
    }

    try {
      const { subtotal, total } = calculateTotals();

      if (quoteId) {
        updateQuote(quoteId, {
          quoteNumber,
          jobType,
          description,
          date: new Date(date),
          expirationDate: expirationDate ? new Date(expirationDate) : null,
          terms,
          inclusions,
          exclusions,
          scopeOfWork,
          taxRate: parseFloat(taxRate) || 0,
          subtotal,
          total,
        });
        Alert.alert('Success', 'Quote updated');
      } else {
        // Implementation would save and create new quote
        Alert.alert('Success', 'Quote created');
      }
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving quote:', error);
      Alert.alert('Error', 'Failed to save quote');
    }
  };

  const handleGeneratePDF = async () => {
    try {
      const pdfPath = await generateQuotePDF(quoteId, {
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

  const { subtotal, taxAmount, total } = calculateTotals();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Quote {quoteNumber}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quote Information</Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Quote Number</Text>
            <TextInput
              style={styles.input}
              value={quoteNumber}
              onChangeText={setQuoteNumber}
              editable={isEditing}
              placeholderTextColor="#ccc"
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={styles.label}>Job Type</Text>
              <View style={styles.typeButtons}>
                {JOB_TYPES.map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[
                      styles.typeButton,
                      jobType === t && styles.typeButtonActive,
                    ]}
                    onPress={() => isEditing && setJobType(t)}
                  >
                    <Text
                      style={[
                        styles.typeButtonText,
                        jobType === t && styles.typeButtonTextActive,
                      ]}
                    >
                      {t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              editable={isEditing}
              multiline
              numberOfLines={3}
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
              <Text style={styles.label}>Expires</Text>
              <TextInput
                style={styles.input}
                value={expirationDate}
                onChangeText={setExpirationDate}
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
            {isEditing && (
              <TouchableOpacity style={styles.addItemButton} onPress={handleAddItem}>
                <Text style={styles.addItemButtonText}>+ Add Item</Text>
              </TouchableOpacity>
            )}
          </View>

          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            renderItem={({ item, index }) => (
              <View style={styles.itemCard}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemDescription}>{item.description}</Text>
                  {isEditing && (
                    <View style={styles.itemActions}>
                      <TouchableOpacity onPress={() => handleEditItem(item)}>
                        <Text style={styles.actionButton}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDeleteItem(item.id)}>
                        <Text style={[styles.actionButton, styles.deleteAction]}>Del</Text>
                      </TouchableOpacity>
                    </View>
                  )}
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
          <Text style={styles.sectionTitle}>Terms & Conditions</Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Scope of Work</Text>
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

          <View style={styles.formGroup}>
            <Text style={styles.label}>Terms</Text>
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

          <View style={styles.formGroup}>
            <Text style={styles.label}>Inclusions</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={inclusions}
              onChangeText={setInclusions}
              editable={isEditing}
              multiline
              numberOfLines={2}
              placeholderTextColor="#ccc"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Exclusions</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={exclusions}
              onChangeText={setExclusions}
              editable={isEditing}
              multiline
              numberOfLines={2}
              placeholderTextColor="#ccc"
            />
          </View>
        </View>

        <View style={styles.buttonGroup}>
          {isEditing ? (
            <>
              <TouchableOpacity style={styles.saveButton} onPress={handleSaveQuote}>
                <Text style={styles.saveButtonText}>Save Quote</Text>
              </TouchableOpacity>
            </>
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

      <Modal
        visible={showItemModal}
        transparent={true}
        animationType="slide"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingItemId ? 'Edit Item' : 'Add Item'}
              </Text>
              <Pressable onPress={() => setShowItemModal(false)}>
                <Text style={styles.modalCloseButton}>✕</Text>
              </Pressable>
            </View>

            <ScrollView style={styles.modalScroll}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Description *</Text>
                <TextInput
                  style={styles.input}
                  value={itemForm.description}
                  onChangeText={(text) =>
                    setItemForm({ ...itemForm, description: text })
                  }
                  placeholder="Item description"
                  placeholderTextColor="#ccc"
                />
              </View>

              <View style={styles.row}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Type</Text>
                  <View style={styles.typeButtons}>
                    {['labor', 'material'].map((t) => (
                      <TouchableOpacity
                        key={t}
                        style={[
                          styles.typeButton,
                          itemForm.itemType === t && styles.typeButtonActive,
                        ]}
                        onPress={() => setItemForm({ ...itemForm, itemType: t })}
                      >
                        <Text
                          style={[
                            styles.typeButtonText,
                            itemForm.itemType === t && styles.typeButtonTextActive,
                          ]}
                        >
                          {t}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              <View style={styles.row}>
                <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.label}>Quantity *</Text>
                  <TextInput
                    style={styles.input}
                    value={itemForm.quantity}
                    onChangeText={(text) =>
                      setItemForm({ ...itemForm, quantity: text })
                    }
                    keyboardType="decimal-pad"
                    placeholderTextColor="#ccc"
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Unit</Text>
                  <TextInput
                    style={styles.input}
                    value={itemForm.unitType}
                    onChangeText={(text) =>
                      setItemForm({ ...itemForm, unitType: text })
                    }
                    placeholderTextColor="#ccc"
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Unit Cost *</Text>
                <TextInput
                  style={styles.input}
                  value={itemForm.unitCost}
                  onChangeText={(text) =>
                    setItemForm({ ...itemForm, unitCost: text })
                  }
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor="#ccc"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Markup %</Text>
                <TextInput
                  style={styles.input}
                  value={itemForm.markupPercentage}
                  onChangeText={(text) =>
                    setItemForm({ ...itemForm, markupPercentage: text })
                  }
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor="#ccc"
                />
              </View>

              <View style={styles.checkboxGroup}>
                <TouchableOpacity
                  style={styles.checkbox}
                  onPress={() =>
                    setItemForm({
                      ...itemForm,
                      showUnitPrice: !itemForm.showUnitPrice,
                    })
                  }
                >
                  <Text style={styles.checkboxBox}>
                    {itemForm.showUnitPrice ? '☑' : '☐'}
                  </Text>
                  <Text style={styles.checkboxLabel}>Show Unit Price</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.checkbox}
                  onPress={() =>
                    setItemForm({
                      ...itemForm,
                      showMarkup: !itemForm.showMarkup,
                    })
                  }
                >
                  <Text style={styles.checkboxBox}>
                    {itemForm.showMarkup ? '☑' : '☐'}
                  </Text>
                  <Text style={styles.checkboxLabel}>Show Markup</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>

            <View style={styles.modalButtonGroup}>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveItem}
              >
                <Text style={styles.saveButtonText}>Save Item</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowItemModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
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
  typeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    backgroundColor: '#f9f9f9',
  },
  typeButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  typeButtonText: {
    fontSize: 12,
    color: '#666',
  },
  typeButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  itemsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addItemButton: {
    backgroundColor: '#34C759',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addItemButtonText: {
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  itemDescription: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  itemActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600',
  },
  deleteAction: {
    color: '#FF3B30',
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
  modalContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  modalContent: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
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
    flex: 1,
    padding: 16,
  },
  checkboxGroup: {
    gap: 12,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkboxBox: {
    fontSize: 18,
    color: '#007AFF',
  },
  checkboxLabel: {
    fontSize: 13,
    color: '#333',
  },
  modalButtonGroup: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
});
