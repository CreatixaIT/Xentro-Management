'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Category {
  id: string;
  name: string;
}

interface InventoryItem {
  id: string;
  name: string;
  category_id: string | null;
  size: string | null;
  quantity: number;
  original_quantity: number;
  left_item: number;
  price: number;
  unit_cost: number;
  purchase_date: string;
  receipt: boolean;
  paid_by: string | null;
  remark: string | null;
  photo_path: string | null;
  created_at: string;
  created_by: string;
  updated_by: string | null;
  inventory_categories: Category | null;
  creator: { username: string; full_name: string } | null;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DEFAULT_COLUMNS = [
  'photo', 'name', 'category', 'size', 'quantity', 'left_item', 'price', 'unit_cost', 
  'purchase_date', 'receipt', 'paid_by', 'user_entry', 'remark'
];

const COLUMN_LABELS: Record<string, string> = {
  photo: 'Photo',
  name: 'Item Name',
  category: 'Category',
  size: 'Size',
  quantity: 'Quantity',
  left_item: 'Left Item',
  price: 'Price (BDT)',
  unit_cost: 'Unit Cost (BDT)',
  purchase_date: 'Purchase Date',
  receipt: 'Receipt',
  paid_by: 'Paid By',
  user_entry: 'User Entry',
  remark: 'Remark',
};

export default function InventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showColumnModal, setShowColumnModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [selectedColumns, setSelectedColumns] = useState<string[]>(DEFAULT_COLUMNS);
  const [photoViewerOpen, setPhotoViewerOpen] = useState(false);
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState<string | null>(null);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  
  // Filters
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [dateBasis, setDateBasis] = useState<'purchase_date' | 'created_at'>('purchase_date');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedReceipt, setSelectedReceipt] = useState<string>('all');
  const [selectedPaidBy, setSelectedPaidBy] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Sorting
  const [sortBy, setSortBy] = useState('purchase_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    category_id: '',
    size: '',
    quantity: '',
    price: '',
    purchase_date: new Date().toISOString().split('T')[0],
    left_item: '',
    receipt: false,
    paid_by: '',
    unit_cost: '',
    remark: '',
    photo_data: '',
    photo_path: '',
  });

  const [categoryName, setCategoryName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchCategories();
    fetchInventory();
  }, [selectedMonth, selectedYear, dateBasis, selectedCategory, selectedReceipt, selectedPaidBy, searchQuery, sortBy, sortOrder]);

  const fetchCategories = async () => {
    const response = await fetch('/api/inventory/categories');
    const result = await response.json();
    if (response.ok && result.categories) {
      setCategories(result.categories);
    }
  };

  const fetchInventory = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.append('month', selectedMonth.toString());
    params.append('year', selectedYear.toString());
    params.append('dateBasis', dateBasis);
    if (selectedCategory !== 'all') params.append('category', selectedCategory);
    if (selectedReceipt !== 'all') params.append('receipt', selectedReceipt);
    if (selectedPaidBy !== 'all') params.append('paidBy', selectedPaidBy);
    if (searchQuery) params.append('search', searchQuery);
    params.append('sortBy', sortBy);
    params.append('sortOrder', sortOrder);

    const response = await fetch(`/api/inventory?${params.toString()}`);
    const result = await response.json();

    if (response.ok && result.inventory) {
      setInventory(result.inventory);
      
      // Fetch signed URLs for photos
      const photoPromises = result.inventory
        .filter((item: InventoryItem) => item.photo_path)
        .map(async (item: InventoryItem) => {
          try {
            const photoResponse = await fetch(`/api/inventory/photo-url?path=${encodeURIComponent(item.photo_path!)}`);
            const photoResult = await photoResponse.json();
            if (photoResponse.ok && photoResult.url) {
              return { id: item.id, url: photoResult.url };
            }
            return null;
          } catch (error) {
            console.error('Failed to fetch photo URL:', error);
            return null;
          }
        });
      
      const photoResults = await Promise.all(photoPromises);
      const urlMap: Record<string, string> = {};
      photoResults.forEach(result => {
        if (result) {
          urlMap[result.id] = result.url;
        }
      });
      setPhotoUrls(urlMap);
    } else {
      setInventory([]);
    }
    setLoading(false);
  };

  const handleAddCategory = async () => {
    if (!categoryName.trim()) return;
    
    setSaving(true);
    const response = await fetch('/api/inventory/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: categoryName }),
    });

    const result = await response.json();

    if (!response.ok) {
      alert(`Error: ${result.error || 'Failed to create category'}`);
      setSaving(false);
      return;
    }

    setCategoryName('');
    setShowCategoryModal(false);
    fetchCategories();
    setSaving(false);
  };

  const handleSaveItem = async () => {
    setSaving(true);
    
    const itemData = {
      name: formData.name,
      category_id: formData.category_id || null,
      size: formData.size || null,
      quantity: parseInt(formData.quantity),
      price: parseFloat(formData.price) || 0,
      purchase_date: formData.purchase_date,
      receipt: formData.receipt,
      paid_by: formData.paid_by || null,
      unit_cost: parseFloat(formData.unit_cost) || (parseInt(formData.quantity) > 0 ? parseFloat(formData.price) / parseInt(formData.quantity) : 0),
      remark: formData.remark || null,
      left_item: formData.left_item ? parseInt(formData.left_item) : parseInt(formData.quantity),
      photo_data: formData.photo_data || null,
      photo_path: formData.photo_path || null,
    };

    if (editingItem) {
      const response = await fetch(`/api/inventory/${editingItem.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(itemData),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        alert(`Error: ${result.error || 'Failed to update item'}`);
        setSaving(false);
        return;
      }
      
      setShowAddModal(false);
      setEditingItem(null);
      resetForm();
      fetchInventory();
    } else {
      // For new items, include original_quantity
      const newItemData = {
        ...itemData,
        original_quantity: parseInt(formData.quantity),
      };
      
      const response = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItemData),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        alert(`Error: ${result.error || 'Failed to create item'}`);
        setSaving(false);
        return;
      }
      
      setShowAddModal(false);
      resetForm();
      fetchInventory();
    }
    
    setSaving(false);
  };

  const handleEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      category_id: item.category_id || '',
      size: item.size || '',
      quantity: item.quantity.toString(),
      price: item.price.toString(),
      purchase_date: item.purchase_date,
      left_item: item.left_item.toString(),
      receipt: item.receipt,
      paid_by: item.paid_by || '',
      unit_cost: item.unit_cost.toString(),
      remark: item.remark || '',
      photo_data: '',
      photo_path: item.photo_path || '',
    });
    setShowAddModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    
    const response = await fetch(`/api/inventory/${id}`, {
      method: 'DELETE',
    });

    if (response.ok) {
      fetchInventory();
    } else {
      const result = await response.json();
      alert(`Error: ${result.error || 'Failed to delete item'}`);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category_id: '',
      size: '',
      quantity: '',
      price: '',
      purchase_date: new Date().toISOString().split('T')[0],
      left_item: '',
      receipt: false,
      paid_by: '',
      unit_cost: '',
      remark: '',
      photo_data: '',
      photo_path: '',
    });
    setEditingItem(null);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, photo_data: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const openPhotoViewer = async (photoPath: string) => {
    if (!photoPath) return;
    
    const response = await fetch(`/api/inventory/photo-url?path=${encodeURIComponent(photoPath)}`);
    const result = await response.json();
    
    if (response.ok && result.url) {
      setCurrentPhotoUrl(result.url);
      setPhotoViewerOpen(true);
    } else {
      alert('Failed to load photo');
    }
  };

  const closePhotoViewer = () => {
    setPhotoViewerOpen(false);
    setCurrentPhotoUrl(null);
  };

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && photoViewerOpen) {
        closePhotoViewer();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [photoViewerOpen]);

  const generatePDF = () => {
    if (selectedColumns.length === 0) {
      alert('Please select at least one column to generate the report');
      return;
    }

    const doc = new jsPDF('l', 'mm', 'a4');
    
    // Title
    doc.setFontSize(18);
    doc.text('Xentro Management - Inventory Report', 14, 15);
    
    // Date and filters
    doc.setFontSize(10);
    const dateText = `Generated: ${new Date().toLocaleDateString()}`;
    const periodText = selectedMonth !== -1 
      ? `Period: ${MONTHS[selectedMonth]} ${selectedYear}`
      : selectedYear !== -1 
      ? `Period: ${selectedYear}`
      : 'Period: All Dates';
    const dateBasisText = `Date Basis: ${dateBasis === 'purchase_date' ? 'Purchase Date' : 'Entry Date'}`;
    
    doc.text(dateText, 14, 22);
    doc.text(periodText, 14, 27);
    doc.text(dateBasisText, 14, 32);
    
    // Summary
    const totalRecords = inventory.length;
    const totalQuantity = inventory.reduce((sum, item) => sum + item.quantity, 0);
    const totalLeft = inventory.reduce((sum, item) => sum + item.left_item, 0);
    const totalValue = inventory.reduce((sum, item) => sum + item.price, 0);
    
    doc.text(`Total Records: ${totalRecords}`, 14, 37);
    doc.text(`Total Quantity: ${totalQuantity}`, 14, 42);
    doc.text(`Total Remaining: ${totalLeft}`, 14, 47);
    doc.text(`Total Value: BDT ${totalValue.toFixed(2)}`, 14, 52);
    
    // Table - only selected columns
    const headers = selectedColumns.map(col => COLUMN_LABELS[col]);
    const rows = inventory.map(item => 
      selectedColumns.map(col => {
        switch (col) {
          case 'photo':
            return item.photo_path ? 'Yes' : '—';
          case 'category':
            return item.inventory_categories?.name || '—';
          case 'user_entry':
            return item.creator?.username || '—';
          case 'receipt':
            return item.receipt ? 'Yes' : 'No';
          case 'price':
          case 'unit_cost':
            return `BDT ${(item[col as keyof InventoryItem] as number)?.toFixed(2) || '0.00'}`;
          default:
            return item[col as keyof InventoryItem]?.toString() || '—';
        }
      })
    );
    
    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: 60,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [227, 28, 37] },
    });
    
    doc.save(`xentro-inventory-${selectedYear}-${selectedMonth + 1}.pdf`);
  };

  const summary = {
    totalRecords: inventory.length,
    totalQuantity: inventory.reduce((sum, item) => sum + item.quantity, 0),
    totalLeft: inventory.reduce((sum, item) => sum + item.left_item, 0),
    totalValue: inventory.reduce((sum, item) => sum + item.price, 0),
  };

  return (
    <AppLayout>
      <div className="space-y-6 pb-20 md:pb-0">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-md border border-white/30 p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
              <p className="text-gray-600 mt-1">Track and manage inventory items</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => { resetForm(); setShowAddModal(true); }}
                className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white font-medium rounded-lg transition-colors"
              >
                Add Item
              </button>
              <button
                onClick={() => setShowCategoryModal(true)}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors"
              >
                Add Category
              </button>
              <button
                onClick={generatePDF}
                className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg transition-colors"
              >
                Generate Report
              </button>
              <button
                onClick={() => setShowColumnModal(true)}
                className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
              >
                Columns
              </button>
            </div>
          </div>
          
          {/* Filters */}
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              >
                <option value={-1}>All Months</option>
                {MONTHS.map((m, i) => (
                  <option key={i} value={i}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              >
                <option value={-1}>All Years</option>
                {[2024, 2025, 2026, 2027].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date Basis</label>
              <select
                value={dateBasis}
                onChange={(e) => setDateBasis(e.target.value as 'purchase_date' | 'created_at')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              >
                <option value="purchase_date">Purchase Date</option>
                <option value="created_at">Entry Date</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              >
                <option value="all">All Categories</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Receipt</label>
              <select
                value={selectedReceipt}
                onChange={(e) => setSelectedReceipt(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              >
                <option value="all">All</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-md border border-white/30 p-4">
            <p className="text-gray-600 text-sm">Total Records</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{summary.totalRecords}</p>
          </div>
          <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-md border border-white/30 p-4">
            <p className="text-gray-600 text-sm">Total Quantity</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{summary.totalQuantity}</p>
          </div>
          <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-md border border-white/30 p-4">
            <p className="text-gray-600 text-sm">Total Remaining</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{summary.totalLeft}</p>
          </div>
          <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-md border border-white/30 p-4">
            <p className="text-gray-600 text-sm">Total Value</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">BDT {summary.totalValue.toFixed(2)}</p>
          </div>
        </div>

        {/* Inventory List */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-md border border-white/30 p-6">
          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-600">Loading...</p>
            </div>
          ) : inventory.length === 0 ? (
            <div className="text-center py-12">
              <span className="text-4xl">📦</span>
              <p className="text-gray-600 mt-4">No inventory items found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    {selectedColumns.map(col => (
                      <th
                        key={col}
                        onClick={() => {
                          if (sortBy === col) {
                            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                          } else {
                            setSortBy(col);
                            setSortOrder('asc');
                          }
                        }}
                        className="px-4 py-3 text-left text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-50"
                      >
                        {COLUMN_LABELS[col]}
                        {sortBy === col && (sortOrder === 'asc' ? ' ↑' : ' ↓')}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.map(item => (
                    <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                      {selectedColumns.map(col => (
                        <td key={col} className="px-4 py-3 text-sm text-gray-700">
                          {col === 'photo' && item.photo_path && (
                            <button
                              onClick={() => item.photo_path && openPhotoViewer(item.photo_path)}
                              className="cursor-pointer"
                            >
                              <img
                                src={photoUrls[item.id] || ''}
                                alt="Product"
                                className="w-12 h-12 object-cover rounded-lg"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            </button>
                          )}
                          {col === 'photo' && !item.photo_path && (
                            <span className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">—</span>
                          )}
                          {col === 'category' && item.inventory_categories?.name}
                          {col === 'user_entry' && item.creator?.username}
                          {col === 'receipt' && (item.receipt ? 'Yes' : 'No')}
                          {col === 'price' && `BDT ${item.price.toFixed(2)}`}
                          {col === 'unit_cost' && `BDT ${item.unit_cost.toFixed(2)}`}
                          {col !== 'photo' && col !== 'category' && col !== 'user_entry' && col !== 'receipt' && col !== 'price' && col !== 'unit_cost' && item[col as keyof InventoryItem]?.toString()}
                        </td>
                      ))}
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleEdit(item)}
                          className="text-blue-600 hover:text-blue-800 mr-2"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Add/Edit Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                {editingItem ? 'Edit Item' : 'Add New Item'}
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Item Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <select
                      value={formData.category_id}
                      onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                    >
                      <option value="">Select Category</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Size</label>
                    <input
                      type="text"
                      value={formData.size}
                      onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
                    <input
                      type="number"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                      required
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Left Item</label>
                    <input
                      type="number"
                      value={formData.left_item}
                      onChange={(e) => setFormData({ ...formData, left_item: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                      min="0"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Price (BDT)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Unit Cost (BDT)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.unit_cost}
                      onChange={(e) => setFormData({ ...formData, unit_cost: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Date *</label>
                    <input
                      type="date"
                      value={formData.purchase_date}
                      onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Receipt</label>
                    <select
                      value={formData.receipt.toString()}
                      onChange={(e) => setFormData({ ...formData, receipt: e.target.value === 'true' })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                    >
                      <option value="false">No</option>
                      <option value="true">Yes</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Paid By</label>
                  <input
                    type="text"
                    value={formData.paid_by}
                    onChange={(e) => setFormData({ ...formData, paid_by: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Remark</label>
                  <textarea
                    value={formData.remark}
                    onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                    rows={3}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Photo</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                  />
                  {formData.photo_data && (
                    <img src={formData.photo_data} alt="Preview" className="mt-2 w-32 h-32 object-cover rounded-lg" />
                  )}
                  {editingItem && editingItem.photo_path && !formData.photo_data && (
                    <div className="mt-2">
                      <span className="text-sm text-gray-600">Current photo: </span>
                      <img 
                        src={photoUrls[editingItem.id] || ''} 
                        alt="Current" 
                        className="mt-1 w-32 h-32 object-cover rounded-lg"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex justify-end gap-4 mt-6">
                <button
                  onClick={() => { setShowAddModal(false); resetForm(); }}
                  className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-900 font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveItem}
                  disabled={saving}
                  className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Category Modal */}
        {showCategoryModal && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Add Category</h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category Name *</label>
                <input
                  type="text"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                  required
                />
              </div>
              
              <div className="flex justify-end gap-4 mt-6">
                <button
                  onClick={() => { setShowCategoryModal(false); setCategoryName(''); }}
                  className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-900 font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddCategory}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {saving ? 'Adding...' : 'Add Category'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Column Selection Modal */}
        {showColumnModal && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Select Columns</h2>
              
              <div className="space-y-2">
                {Object.entries(COLUMN_LABELS).map(([key, label]) => (
                  <label key={key} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={selectedColumns.includes(key)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedColumns([...selectedColumns, key]);
                        } else {
                          setSelectedColumns(selectedColumns.filter(c => c !== key));
                        }
                      }}
                      className="rounded text-yellow-500 focus:ring-yellow-500"
                    />
                    <span className="text-sm text-gray-700">{label}</span>
                  </label>
                ))}
              </div>
              
              <div className="flex justify-between mt-6">
                <button
                  onClick={() => setSelectedColumns(DEFAULT_COLUMNS)}
                  className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-900 font-medium rounded-lg transition-colors"
                >
                  Reset
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowColumnModal(false)}
                    className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-900 font-medium rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setShowColumnModal(false)}
                    className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white font-medium rounded-lg transition-colors"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Photo Viewer Modal */}
        {photoViewerOpen && (
          <div 
            className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4"
            onClick={closePhotoViewer}
          >
            <div 
              className="relative max-w-4xl max-h-[90vh] p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={closePhotoViewer}
                className="absolute top-2 right-2 w-10 h-10 bg-white rounded-full flex items-center justify-center text-gray-900 text-xl font-bold hover:bg-gray-200 transition-colors"
                aria-label="Close photo viewer"
              >
                ×
              </button>
              {currentPhotoUrl && (
                <img
                  src={currentPhotoUrl}
                  alt="Product photo"
                  className="max-w-full max-h-[85vh] object-contain rounded-lg"
                />
              )}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
