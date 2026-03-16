import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  StyleSheet,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useShoppingStore, useAuthStore, useUIStore } from '../../src/store';
import api from '../../src/services/api';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { getTranslation } from '../../src/services/i18n';
import { Colors } from '../../src/config/theme';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { ShoppingIcon } from '../../src/components/CustomIcons';

export default function ShoppingScreen() {
  const user = useAuthStore(s => s.user);
  const lang = user?.settings?.language || 'en';
  const t = (key) => getTranslation(key, lang);

  const { lists, fetchLists, createList, toggleItem, deleteList } = useShoppingStore();
  const [showModal, setShowModal] = useState(false);
  const [newList, setNewList] = useState({ title: 'Shopping List', items: [] });
  const [newItem, setNewItem] = useState({ name: '', quantity: '1', unit: '', cost: '0', notes: '' });
  const [ocrLoading, setOcrLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showOcrGuide, setShowOcrGuide] = useState(false);
  const [pendingOcrType, setPendingOcrType] = useState(null); // 'gallery' or 'camera'
  const [editingIndex, setEditingIndex] = useState(null);

  const setShowTopBar = useUIStore(s => s.setShowTopBar);
  const lastOffset = useRef(0);

  const handleScroll = (event) => {
    const currentOffset = event.nativeEvent.contentOffset.y;
    if (currentOffset <= 0) {
      setShowTopBar(true);
    } else if (currentOffset > lastOffset.current && currentOffset > 60) {
      setShowTopBar(false);
    } else if (currentOffset < lastOffset.current) {
      setShowTopBar(true);
    }
    lastOffset.current = currentOffset;
  };

  useEffect(() => {
    fetchLists();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchLists();
    setRefreshing(false);
  };

  const handleAddItem = () => {
    if (!newItem.name.trim()) {
      Alert.alert('Error', 'Item name required');
      return;
    }
    setNewList((l) => ({
      ...l,
      items: [...l.items, { ...newItem, quantity: parseFloat(newItem.quantity) || 1, cost: parseFloat(newItem.cost) || 0 }],
    }));
    setNewItem({ name: '', quantity: '1', unit: '', cost: '0', notes: '' });
  };

  const handleCreateList = async () => {
    if (!newList.items.length) {
      Alert.alert('Error', 'Add at least one item');
      return;
    }
    const totalCost = newList.items.reduce((sum, i) => sum + i.cost * i.quantity, 0);
    await createList({ ...newList, totalCost });
    setNewList({ title: 'Shopping List', items: [] });
    setShowModal(false);
    Alert.alert('Success', 'Shopping list created!');
  };

  const handleExcelImport = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const file = result.assets[0];

      const base64 = await FileSystem.readAsStringAsync(file.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const res = await api.post('/upload/excel/shopping/base64', { data: base64 });
      setNewList((l) => ({ ...l, items: [...l.items, ...res.data.items] }));
      setShowModal(true);
      Alert.alert('Imported', `${res.data.count} items from Excel`);
    } catch (err) {
      Alert.alert('Error', 'Excel parse failed');
    }
  };

  const openOcrWithGuide = (type) => {
    setPendingOcrType(type);
    setShowOcrGuide(true);
  };

  const proceedWithOcr = () => {
    setShowOcrGuide(false);
    if (pendingOcrType === 'gallery') handleOCR();
    else if (pendingOcrType === 'camera') handleCameraOCR();
  };

  const handleOCR = async () => {
    try {
      const permResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permResult.granted) {
        Alert.alert('Permission Required', 'Please allow photo library access');
        return;
      }
      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.5,
      });
      if (pickerResult.canceled) return;

      setOcrLoading(true);
      const asset = pickerResult.assets[0];
      const base64 = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: 'base64',
      });

      const res = await api.post('/upload/ocr/base64', { data: base64, extension: '.jpg' });
      const items = res.data.items || [];
      setNewList((l) => ({ ...l, items: [...l.items, ...items] }));
      setShowModal(true);
      const missing = items.filter(it => it.quantity === null).length;
      if (missing > 0) {
        Alert.alert('Data Refinement Needed', `Processed ${items.length} items. ${missing} items missing quantities. Please fill them in.`);
      }
    } catch (err) {
      Alert.alert('Error', 'OCR failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setOcrLoading(false);
    }
  };

  const handleCameraOCR = async () => {
    try {
      const permResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permResult.granted) {
        Alert.alert('Permission Required', 'Please allow camera access');
        return;
      }
      const pickerResult = await ImagePicker.launchCameraAsync({
        quality: 0.5,
      });
      if (pickerResult.canceled) return;

      setOcrLoading(true);
      const asset = pickerResult.assets[0];
      const base64 = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: 'base64',
      });

      const res = await api.post('/upload/ocr/base64', { data: base64, extension: '.jpg' });
      const items = res.data.items || [];
      setNewList((l) => ({ ...l, items: [...l.items, ...items] }));
      setShowModal(true);
      const missing = items.filter(it => it.quantity === null).length;
      if (missing > 0) {
        Alert.alert('Data Refinement Needed', `Processed ${items.length} items. ${missing} items missing quantities. Please fill them in.`);
      }
    } catch (err) {
      Alert.alert('Error', 'OCR failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setOcrLoading(false);
    }
  };

  const totalCost = (list) => list.items.reduce((sum, i) => sum + (i.cost || 0) * (i.quantity || 1), 0);

  const handleDeleteList = (id) => {
    Alert.alert('Delete List', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteList(id) },
    ]);
  };

  return (
    <View style={st.container}>
      <ScrollView
        contentContainerStyle={st.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {/* Header */}
        <View style={st.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={st.pageTitle}>{t('shopping')}</Text>
            <Text style={st.pageSub}>{lists.length} {t('stats')}</Text>
          </View>
          <View style={st.btnRow}>
            <Pressable style={st.ghostBtn} onPress={handleExcelImport}>
              <Feather name="file-text" size={16} color={Colors.text2} />
            </Pressable>
            <Pressable style={st.ghostBtn} onPress={() => openOcrWithGuide('gallery')} disabled={ocrLoading}>
              <Feather name="image" size={16} color={ocrLoading ? Colors.text3 : Colors.accent} />
            </Pressable>
            <Pressable style={st.ghostBtn} onPress={() => openOcrWithGuide('camera')} disabled={ocrLoading}>
              <Feather name="camera" size={16} color={ocrLoading ? Colors.text3 : Colors.accent} />
            </Pressable>
            <Pressable style={st.primaryBtn} onPress={() => setShowModal(true)}>
              <Feather name="plus" size={16} color={Colors.white} />
              <Text style={st.primaryBtnText}>{t('new')}</Text>
            </Pressable>
          </View>
        </View>

        {/* Lists */}
        {lists.length === 0 ? (
          <View style={[st.card, { alignItems: 'center', paddingVertical: 48, opacity: 0.5 }]}>
            <ShoppingIcon size={60} color={Colors.text3} />
            <Text style={{ color: Colors.text2, fontWeight: '600', marginTop: 16 }}>No active procurement lists</Text>
          </View>
        ) : (
          lists.map((list) => (
            <View key={list._id} style={st.card}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: '700', fontSize: 16, color: Colors.text }}>{list.title}</Text>
                  <Text style={{ fontSize: 12, color: Colors.text2 }}>
                    {list.items.length} items · ₹{totalCost(list).toFixed(2)} est.
                    {list.source === 'ocr' ? <Feather name="camera" size={10} color={Colors.text2} /> : ''}
                    {list.source === 'excel' ? <Feather name="file-text" size={10} color={Colors.text2} /> : ''}
                  </Text>
                </View>
                <Pressable onPress={() => handleDeleteList(list._id)} style={{ padding: 4 }}>
                  <Feather name="trash-2" size={16} color={Colors.danger} />
                </Pressable>
              </View>

              {list.items.map((item) => (
                <Pressable
                  key={item._id}
                  style={st.shoppingItem}
                  onPress={() => toggleItem(list._id, item._id)}
                >
                  <View style={[st.shoppingCheck, item.checked && st.shoppingCheckDone]}>
                    {item.checked && <Feather name="check" size={10} color={Colors.white} />}
                  </View>
                  <Text
                    style={{
                      flex: 1,
                      fontWeight: '500',
                      color: item.checked ? Colors.text3 : Colors.text,
                      textDecorationLine: item.checked ? 'line-through' : 'none',
                    }}
                    numberOfLines={1}
                  >
                    {item.name}
                  </Text>
                  <Text style={{ fontSize: 12, color: Colors.text2 }}>
                    {item.quantity} {item.unit}
                  </Text>
                  {item.cost > 0 && (
                    <Text style={{ fontSize: 12, color: Colors.low, fontFamily: 'monospace', marginLeft: 8 }}>
                      ₹{(item.cost * item.quantity).toFixed(2)}
                    </Text>
                  )}
                </Pressable>
              ))}

              <View style={st.listFooter}>
                <Text style={{ color: Colors.text2, fontSize: 13 }}>
                  {list.items.filter((i) => i.checked).length}/{list.items.length} done
                </Text>
                <Text style={{ fontWeight: '700', color: Colors.low, fontFamily: 'monospace', fontSize: 13 }}>
                  Total: ₹{totalCost(list).toFixed(2)}
                </Text>
              </View>
            </View>
          ))
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* OCR Loading Indicator */}
      <Modal visible={ocrLoading} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: Colors.card, padding: 32, borderRadius: 24, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(59, 130, 246, 0.3)' }}>
            <ActivityIndicator size="large" color={Colors.accent} />
            <Text style={{ color: Colors.text, fontWeight: '700', marginTop: 20, fontSize: 16 }}>Extracting items...</Text>
            <Text style={{ color: Colors.text3, marginTop: 8, fontSize: 12 }}>Processing handwritten data</Text>
          </View>
        </View>
      </Modal>

      {/* Create List Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={st.modalOverlay}>
          <View style={st.modal}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={st.modalHeader}>
                <Text style={st.modalTitle}>Create Shopping List</Text>
                <Pressable onPress={() => setShowModal(false)} style={st.modalCloseBtn}>
                  <Feather name="x" size={20} color={Colors.text2} />
                </Pressable>
              </View>

              <Text style={st.label}>List Title</Text>
              <TextInput
                style={st.input}
                value={newList.title}
                onChangeText={(v) => setNewList((l) => ({ ...l, title: v }))}
                placeholderTextColor={Colors.text3}
              />

              {/* Add Item Form */}
              <View style={st.addItemBox}>
                <View style={st.row2}>
                  <View style={{ flex: 2 }}>
                    <Text style={st.labelSm}>Item Name</Text>
                    <TextInput
                      style={st.inputSm}
                      value={newItem.name}
                      onChangeText={(v) => setNewItem((f) => ({ ...f, name: v }))}
                      placeholder="e.g. Milk"
                      placeholderTextColor={Colors.text3}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={st.labelSm}>Qty</Text>
                    <TextInput
                      style={st.inputSm}
                      keyboardType="numeric"
                      value={newItem.quantity}
                      onChangeText={(v) => setNewItem((f) => ({ ...f, quantity: v }))}
                    />
                  </View>
                </View>
                <View style={st.row2}>
                  <View style={{ flex: 1 }}>
                    <Text style={st.labelSm}>Unit</Text>
                    <TextInput
                      style={st.inputSm}
                      value={newItem.unit}
                      onChangeText={(v) => setNewItem((f) => ({ ...f, unit: v }))}
                      placeholder="kg, pcs, L..."
                      placeholderTextColor={Colors.text3}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={st.labelSm}>Cost</Text>
                    <TextInput
                      style={st.inputSm}
                      keyboardType="numeric"
                      value={newItem.cost}
                      onChangeText={(v) => setNewItem((f) => ({ ...f, cost: v }))}
                    />
                  </View>
                </View>
                <Pressable 
                  style={[st.ghostBtn, { backgroundColor: editingIndex !== null ? 'rgba(59, 130, 246, 0.1)' : 'transparent' }]} 
                  onPress={() => {
                    if (editingIndex !== null) {
                      const updatedItems = [...newList.items];
                      updatedItems[editingIndex] = { ...newItem, quantity: parseFloat(newItem.quantity) || 0, cost: parseFloat(newItem.cost) || 0 };
                      setNewList(l => ({ ...l, items: updatedItems }));
                      setEditingIndex(null);
                      setNewItem({ name: '', quantity: '1', unit: '', cost: '0', notes: '' });
                    } else {
                      handleAddItem();
                    }
                  }}
                >
                  <Text style={st.ghostBtnText}>{editingIndex !== null ? 'Update Item' : '+ Add Item'}</Text>
                </Pressable>
              </View>

              {/* Items Preview */}
              {newList.items.length > 0 && (
                <View style={{ marginBottom: 16 }}>
                  {newList.items.map((item, i) => (
                    <View key={i} style={[st.previewItem, { alignItems: 'center' }, editingIndex === i && { backgroundColor: 'rgba(59, 130, 246, 0.05)' }]}>
                      <Pressable 
                        style={{ flex: 1 }}
                        onPress={() => {
                          setEditingIndex(i);
                          setNewItem({
                            name: item.name,
                            quantity: item.quantity === null ? '' : item.quantity.toString(),
                            unit: item.unit || '',
                            cost: item.cost ? item.cost.toString() : '0',
                            notes: item.notes || ''
                          });
                        }}
                      >
                        <Text style={{ color: Colors.text, fontSize: 13 }}>
                          {item.name} × {item.quantity === null ? (
                            <Text style={{ color: Colors.high, fontWeight: '800' }}>Enter Qty</Text>
                          ) : (
                            `${item.quantity} ${item.unit}`
                          )}
                        </Text>
                      </Pressable>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <Text style={{ color: Colors.low, fontSize: 13 }}>₹{(item.cost * (item.quantity || 0)).toFixed(2)}</Text>
                        <Pressable onPress={() => {
                          if (editingIndex === i) setEditingIndex(null);
                          setNewList(l => ({ ...l, items: l.items.filter((_, idx) => idx !== i) }));
                        }}>
                          <Feather name="x-circle" size={16} color={Colors.text3} />
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Pressable style={[st.ghostBtnLg, { flex: 1 }]} onPress={() => setShowModal(false)}>
                  <Text style={st.ghostBtnText}>Cancel</Text>
                </Pressable>
                <Pressable style={[st.primaryBtnLg, { flex: 1 }]} onPress={handleCreateList}>
                  <Text style={st.primaryBtnText}>Create List</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
      {/* OCR Guide Modal */}
      <Modal visible={showOcrGuide} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ backgroundColor: Colors.card, width: '100%', borderRadius: 20, padding: 24, borderWidth: 1, borderColor: Colors.accent }}>
            <View style={{ alignItems: 'center', marginBottom: 20 }}>
              <View style={{ backgroundColor: 'rgba(59,130,246,0.1)', padding: 16, borderRadius: 50, marginBottom: 16 }}>
                <Feather name="info" size={32} color={Colors.accent} />
              </View>
              <Text style={{ fontSize: 20, fontWeight: '800', color: Colors.text, textAlign: 'center' }}>Extraction Guide</Text>
            </View>
            
            <View style={{ gap: 16, marginBottom: 24 }}>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: Colors.white, fontWeight: '800', fontSize: 12 }}>1</Text>
                </View>
                <Text style={{ flex: 1, color: Colors.text, fontSize: 14 }}>To extract handwritten lists, please focus <Text style={{ fontWeight: '800', color: Colors.accent }}>only on the written part</Text> of the paper.</Text>
              </View>
              
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: Colors.white, fontWeight: '800', fontSize: 12 }}>2</Text>
                </View>
                <Text style={{ flex: 1, color: Colors.text, fontSize: 14 }}>For receipts or printed invoices, ensure you capture <Text style={{ fontWeight: '800', color: Colors.accent }}>only the printed items</Text> clearly.</Text>
              </View>

              <View style={{ backgroundColor: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 12, borderLeftWidth: 3, borderLeftColor: 'gray' }}>
                <Text style={{ fontSize: 12, color: Colors.text2, fontStyle: 'italic' }}>Note: Mixing printed and handwritten text in one image may lead to merged items. Choose one for best results.</Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Pressable 
                style={[st.ghostBtn, { flex: 1, height: 50, width: 'auto' }]} 
                onPress={() => setShowOcrGuide(false)}
              >
                <Text style={st.ghostBtnText}>Cancel</Text>
              </Pressable>
              <Pressable 
                style={[st.primaryBtn, { flex: 2, height: 50 }]} 
                onPress={proceedWithOcr}
              >
                <Text style={st.primaryBtnText}>Begin Extraction</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: 16, paddingTop: 110 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, paddingHorizontal: 4 },
  pageTitle: { fontSize: 24, fontWeight: '800', color: Colors.text },
  pageSub: { color: Colors.text2, fontSize: 13, marginTop: 2 },
  btnRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  ghostBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center',
    width: 44,
    height: 44,
    borderRadius: 8, 
    borderWidth: 1.5, 
    borderColor: Colors.border,
    backgroundColor: 'rgba(255,255,255,0.03)'
  },
  ghostBtnText: { color: Colors.text2, fontSize: 13, fontWeight: '700' },
  ghostBtnLg: { paddingVertical: 14, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  primaryBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6, 
    backgroundColor: Colors.accent, 
    paddingHorizontal: 14, 
    height: 44,
    borderRadius: 8,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryBtnText: { color: Colors.white, fontSize: 13, fontWeight: '700' },
  primaryBtnLg: { backgroundColor: Colors.accent, paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  shoppingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  shoppingCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.text3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shoppingCheckDone: { backgroundColor: Colors.low, borderColor: Colors.low },
  listFooter: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modal: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: Colors.text },
  label: { fontSize: 13, fontWeight: '600', color: Colors.text2, marginBottom: 6, marginTop: 14 },
  labelSm: { fontSize: 11, fontWeight: '600', color: Colors.text3, marginBottom: 4 },
  input: {
    backgroundColor: Colors.bg2,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 12,
    color: Colors.text,
    fontSize: 15,
  },
  inputSm: {
    backgroundColor: Colors.bg2,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 6,
    padding: 10,
    color: Colors.text,
    fontSize: 14,
  },
  addItemBox: {
    backgroundColor: Colors.bg3,
    borderRadius: 8,
    padding: 12,
    marginVertical: 12,
  },
  row2: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  previewItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
});
