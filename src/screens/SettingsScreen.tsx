import React, { useState } from 'react';
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
  Linking,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { useAppStore } from '../store/appStore';
import { createLocalBackup, listBackupFiles, deleteBackupFile, getBackupFileSize } from '../utils/backupManager';

export const SettingsScreen = ({ navigation }: any) => {
  const { companyName, companyLogoPath, taxRate, defaultTerms, setCompanyInfo, setTaxRate, setDefaultTerms } = useAppStore();

  const [editCompanyName, setEditCompanyName] = useState(companyName);
  const [editTaxRate, setEditTaxRate] = useState(taxRate.toString());
  const [editTerms, setEditTerms] = useState(defaultTerms);
  const [backupFiles, setBackupFiles] = useState<string[]>([]);
  const [showBackupSection, setShowBackupSection] = useState(false);

  const handleLoadBackups = async () => {
    try {
      const files = await listBackupFiles();
      setBackupFiles(files);
      setShowBackupSection(true);
    } catch (error) {
      Alert.alert('Error', 'Failed to load backup files');
    }
  };

  const handleCreateBackup = async () => {
    try {
      const backupPath = await createLocalBackup();
      Alert.alert('Success', `Backup created: ${backupPath}`);
      handleLoadBackups();
    } catch (error) {
      Alert.alert('Error', 'Failed to create backup');
    }
  };

  const handleDeleteBackup = (fileName: string) => {
    Alert.alert(
      'Delete Backup',
      `Are you sure you want to delete ${fileName}?`,
      [
        { text: 'Cancel', onPress: () => {}, style: 'cancel' },
        {
          text: 'Delete',
          onPress: async () => {
            try {
              await deleteBackupFile(fileName);
              handleLoadBackups();
              Alert.alert('Success', 'Backup deleted');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete backup');
            }
          },
          style: 'destructive',
        },
      ]
    );
  };

  const handleSelectLogo = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'image/*',
      });

      if (result.assets && result.assets.length > 0) {
        const logoPath = result.assets[0].uri;
        setCompanyInfo(editCompanyName, logoPath);
        Alert.alert('Success', 'Logo updated');
      }
    } catch (error) {
      console.error('Error selecting logo:', error);
    }
  };

  const handleSaveSettings = () => {
    setCompanyInfo(editCompanyName);
    setTaxRate(parseFloat(editTaxRate) || 0);
    setDefaultTerms(editTerms);
    Alert.alert('Success', 'Settings saved');
  };

  const handleOpenDataFolder = async () => {
    try {
      const docDir = FileSystem.documentDirectory;
      if (docDir) {
        Linking.openURL(docDir);
      }
    } catch (error) {
      Alert.alert('Info', 'Data is stored in the app\'s document directory');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Settings</Text>
        </View>

        {/* Company Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Company Information</Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Company Name</Text>
            <TextInput
              style={styles.input}
              value={editCompanyName}
              onChangeText={setEditCompanyName}
              placeholder="Enter company name"
              placeholderTextColor="#ccc"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Company Logo</Text>
            <TouchableOpacity style={styles.logoButton} onPress={handleSelectLogo}>
              <Text style={styles.logoButtonText}>
                {companyLogoPath ? '📷 Change Logo' : '📷 Select Logo'}
              </Text>
            </TouchableOpacity>
            {companyLogoPath && (
              <Text style={styles.logoPath}>Logo selected: {companyLogoPath.split('/').pop()}</Text>
            )}
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Default Tax Rate (%)</Text>
            <TextInput
              style={styles.input}
              value={editTaxRate}
              onChangeText={setEditTaxRate}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor="#ccc"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Default Terms & Conditions</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={editTerms}
              onChangeText={setEditTerms}
              placeholder="Enter default terms (will appear on all quotes/invoices)"
              multiline
              numberOfLines={4}
              placeholderTextColor="#ccc"
            />
          </View>

          <TouchableOpacity style={styles.saveButton} onPress={handleSaveSettings}>
            <Text style={styles.saveButtonText}>Save Settings</Text>
          </TouchableOpacity>
        </View>

        {/* Backup & Restore */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Management</Text>

          <Text style={styles.description}>
            Backup all your data (contacts, quotes, invoices, payments) to a file on your device.
            Use manual backups to preserve your records.
          </Text>

          <TouchableOpacity style={styles.backupButton} onPress={handleCreateBackup}>
            <Text style={styles.backupButtonText}>💾 Create Backup Now</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.listBackupsButton} onPress={handleLoadBackups}>
            <Text style={styles.listBackupsButtonText}>📂 View Backups</Text>
          </TouchableOpacity>

          {showBackupSection && (
            <View style={styles.backupList}>
              <Text style={styles.backupListTitle}>Backup Files ({backupFiles.length})</Text>
              {backupFiles.length > 0 ? (
                <FlatList
                  data={backupFiles}
                  keyExtractor={(item) => item}
                  scrollEnabled={false}
                  renderItem={({ item: fileName }) => (
                    <View style={styles.backupFileItem}>
                      <View style={styles.backupFileInfo}>
                        <Text style={styles.backupFileName}>{fileName}</Text>
                        <Text style={styles.backupFileDate}>
                          {new Date(fileName.replace('backup_', '').replace('.json', '')).toLocaleDateString()}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.deleteBackupButton}
                        onPress={() => handleDeleteBackup(fileName)}
                      >
                        <Text style={styles.deleteBackupButtonText}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                />
              ) : (
                <Text style={styles.noBackupsText}>No backup files found</Text>
              )}
            </View>
          )}
        </View>

        {/* Data & Privacy */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data & Privacy</Text>

          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>Your data is yours</Text>
            <Text style={styles.infoText}>
              All your information (contacts, quotes, invoices) is stored locally on your device using SQLite.
              No data is sent to external servers. You have complete control.
            </Text>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>Offline first</Text>
            <Text style={styles.infoText}>
              This app works completely offline. No internet connection required for daily operations.
              PDF generation, calculations, and all features work without internet.
            </Text>
          </View>

          <TouchableOpacity style={styles.dataFolderButton} onPress={handleOpenDataFolder}>
            <Text style={styles.dataFolderButtonText}>📁 Open Data Folder</Text>
          </TouchableOpacity>
        </View>

        {/* About & Support */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About & Support</Text>

          <View style={styles.aboutItem}>
            <Text style={styles.aboutLabel}>Version:</Text>
            <Text style={styles.aboutValue}>1.0.0</Text>
          </View>

          <View style={styles.aboutItem}>
            <Text style={styles.aboutLabel}>Database:</Text>
            <Text style={styles.aboutValue}>SQLite (Local)</Text>
          </View>

          <View style={styles.aboutItem}>
            <Text style={styles.aboutLabel}>Storage:</Text>
            <Text style={styles.aboutValue}>Device Only</Text>
          </View>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() =>
              Linking.openURL('https://github.com/bradsherman365-ai/expo-job-estimator')
            }
          >
            <Text style={styles.linkButtonText}>🔗 GitHub Repository</Text>
          </TouchableOpacity>

          <View style={styles.footerText}>
            <Text style={styles.footerTextContent}>
              Job Estimator © 2026. Built with React Native & Expo.
            </Text>
          </View>
        </View>

        {/* Feature Checklist */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Features</Text>

          <View style={styles.featureItem}>
            <Text style={styles.featureCheck}>✓</Text>
            <Text style={styles.featureText}>Manage contacts by type</Text>
          </View>

          <View style={styles.featureItem}>
            <Text style={styles.featureCheck}>✓</Text>
            <Text style={styles.featureText}>Create & customize quotes</Text>
          </View>

          <View style={styles.featureItem}>
            <Text style={styles.featureCheck}>✓</Text>
            <Text style={styles.featureText}>Create & track invoices</Text>
          </View>

          <View style={styles.featureItem}>
            <Text style={styles.featureCheck}>✓</Text>
            <Text style={styles.featureText}>Add line items (labor & materials)</Text>
          </View>

          <View style={styles.featureItem}>
            <Text style={styles.featureCheck}>✓</Text>
            <Text style={styles.featureText}>Apply markup percentages</Text>
          </View>

          <View style={styles.featureItem}>
            <Text style={styles.featureCheck}>✓</Text>
            <Text style={styles.featureText}>Generate professional PDFs</Text>
          </View>

          <View style={styles.featureItem}>
            <Text style={styles.featureCheck}>✓</Text>
            <Text style={styles.featureText}>Track payments</Text>
          </View>

          <View style={styles.featureItem}>
            <Text style={styles.featureCheck}>✓</Text>
            <Text style={styles.featureText}>Diary entries & notes</Text>
          </View>

          <View style={styles.featureItem}>
            <Text style={styles.featureCheck}>✓</Text>
            <Text style={styles.featureText}>Manual data backups</Text>
          </View>

          <View style={styles.featureItem}>
            <Text style={styles.featureCheck}>✓</Text>
            <Text style={styles.featureText}>Completely offline</Text>
          </View>
        </View>

        <View style={styles.spacing} />
      </ScrollView>
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
  logoButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  logoButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  logoPath: {
    fontSize: 11,
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
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
  description: {
    fontSize: 13,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  backupButton: {
    backgroundColor: '#FF9500',
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 8,
  },
  backupButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  listBackupsButton: {
    backgroundColor: '#5856D6',
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 16,
  },
  listBackupsButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  backupList: {
    backgroundColor: '#f9f9f9',
    borderRadius: 6,
    padding: 12,
  },
  backupListTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  backupFileItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backupFileInfo: {
    flex: 1,
  },
  backupFileName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  backupFileDate: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  deleteBackupButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FFE5E5',
    borderRadius: 4,
  },
  deleteBackupButtonText: {
    fontSize: 11,
    color: '#FF3B30',
    fontWeight: '600',
  },
  noBackupsText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 12,
  },
  infoBox: {
    backgroundColor: '#F0F8FF',
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
    padding: 12,
    borderRadius: 4,
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
  },
  dataFolderButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 12,
  },
  dataFolderButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  aboutItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  aboutLabel: {
    fontSize: 13,
    color: '#666',
  },
  aboutValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 12,
  },
  linkButton: {
    backgroundColor: '#34C759',
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  linkButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  footerText: {
    marginTop: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  footerTextContent: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  featureCheck: {
    fontSize: 16,
    color: '#34C759',
    fontWeight: 'bold',
  },
  featureText: {
    fontSize: 13,
    color: '#333',
  },
  spacing: {
    height: 32,
  },
});
