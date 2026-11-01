'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
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

interface PhotoUrlResponse {
  url: string;
}

interface PhotoUrlErrorResponse {
  error: string;
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

export default function InventoryClient() {
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
  
  // Success/confirmation dialogs
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  
  // Filters
  const [selectedMonth, setSelectedMonth] = useState<number>(-1); // Default to All Months
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [dateBasis, setDateBasis] = useState<'purchase_date' | 'created_at'>('created_at');
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
  const [compressedSize, setCompressedSize] = useState<number | null>(null);

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
            const photoResult: PhotoUrlResponse | PhotoUrlErrorResponse = await photoResponse.json();
            
            if (photoResponse.ok && 'url' in photoResult && typeof photoResult.url === 'string') {
              return { id: item.id, url: photoResult.url };
            }
            return null;
          } catch (error) {
            console.error('Failed to fetch photo URL for item:', item.id, error);
            return null;
          }
        });

      const photoResults = await Promise.all(photoPromises);
      const urlMap: Record<string, string> = {};
      photoResults.forEach(result => {
        if (result) urlMap[result.id] = result.url;
      });
      setPhotoUrls(urlMap);
    } else {
      console.error('Failed to fetch inventory:', result.error);
    }
    setLoading(false);
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      alert('Item name is required');
      return;
    }

    if (!formData.quantity || parseInt(formData.quantity) <= 0) {
      alert('Quantity must be greater than zero');
      return;
    }

    const response = await fetch('/api/inventory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });

    const result = await response.json();

    if (response.ok) {
      setSuccessMessage('Item added successfully!');
      setShowSuccessPopup(true);
      resetForm();
      setShowAddModal(false);
      fetchInventory();
    } else {
      alert(result.error || 'Failed to add item');
    }
  };

  const handleEditItem = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      alert('Item name is required');
      return;
    }

    if (!formData.quantity || parseInt(formData.quantity) <= 0) {
      alert('Quantity must be greater than zero');
      return;
    }

    const response = await fetch(`/api/inventory/${editingItem?.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });

    const result = await response.json();

    if (response.ok) {
      setSuccessMessage('Item updated successfully!');
      setShowSuccessPopup(true);
      resetForm();
      setShowAddModal(false);
      setEditingItem(null);
      fetchInventory();
    } else {
      alert(result.error || 'Failed to update item');
    }
  };

  const handleDeleteItem = async () => {
    if (!itemToDelete) return;

    setDeleting(true);
    const response = await fetch(`/api/inventory/${itemToDelete}`, {
      method: 'DELETE',
    });

    if (response.ok) {
      setSuccessMessage('Item deleted successfully!');
      setShowSuccessPopup(true);
      setShowDeleteConfirm(false);
      setItemToDelete(null);
      fetchInventory();
    } else {
      alert('Failed to delete item');
    }
    setDeleting(false);
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!categoryName.trim()) {
      alert('Category name is required');
      return;
    }

    const response = await fetch('/api/inventory/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: categoryName.trim() }),
    });

    if (response.ok) {
      setSuccessMessage('Category added successfully!');
      setShowSuccessPopup(true);
      setCategoryName('');
      setShowCategoryModal(false);
      fetchCategories();
    } else {
      alert('Failed to add category');
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
    setCompressedSize(null);
  };

  const openEditModal = (item: InventoryItem) => {
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

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Photo size must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setFormData({ ...formData, photo_data: result });
      setCompressedSize(file.size);
    };
    reader.readAsDataURL(file);
  };

  const openPhotoViewer = (photoPath: string) => {
    const url = photoUrls[photoPath];
    if (url) {
      setCurrentPhotoUrl(url);
      setPhotoViewerOpen(true);
    }
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(18);
    doc.text('Xentro Management - Inventory Report', 14, 20);
    
    doc.setFontSize(10);
    doc.text(`Report Period: ${MONTHS[selectedMonth === -1 ? 0 : selectedMonth]} ${selectedYear}`, 14, 28);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 33);
    
    // Summary
    const totalQuantity = inventory.reduce((sum, item) => sum + item.quantity, 0);
    const totalLeft = inventory.reduce((sum, item) => sum + item.left_item, 0);
    const totalValue = inventory.reduce((sum, item) => sum + item.price, 0);
    
    doc.setFontSize(11);
    doc.text(`Total Items: ${inventory.length}`, 14, 42);
    doc.text(`Total Quantity: ${totalQuantity}`, 14, 47);
    doc.text(`Total Remaining: ${totalLeft}`, 14, 52);
    doc.text(`Total Value: BDT ${totalValue.toFixed(2)}`, 14, 57);
    
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
            return item.creator?.full_name || item.creator?.username || 'Unknown';
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
      startY: 65,
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
    <div className="space-y-6 pb-20 md:pb-0">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-md border border-white/30 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Inventory Management</h1>
            <p className="text-gray-600 mt-1 text-sm md:text-base">Track and manage inventory items</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => { resetForm(); setShowAddModal(true); }}
              className="px-3 py-2 md:px-4 md:py-2 bg-yellow-500 hover:bg-yellow-600 text-white font-medium rounded-lg transition-colors text-sm md:text-base"
            >
              Add Item
            </button>
            <button
              onClick={() => setShowCategoryModal(true)}
              className="px-3 py-2 md:px-4 md:py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors text-sm md:text-base"
            >
              Add Category
            </button>
            <button
              onClick={generatePDF}
              className="px-3 py-2 md:px-4 md:py-2 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg transition-colors text-sm md:text-base"
            >
              Generate Report
            </button>
            <button
              onClick={() => setShowColumnModal(true)}
              className="px-3 py-2 md:px-4 md:py-2 bg-gray-500 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors text-sm md:text-base"
            >
              Columns
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-md border border-white/30 p-4 md:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
          <div>
            <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">Month</label>
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
            <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">Year</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
            >
              {[2024, 2025, 2026, 2027, 2028].map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">Date Basis</label>
            <select
              value={dateBasis}
              onChange={(e) => setDateBasis(e.target.value as 'purchase_date' | 'created_at')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
            >
              <option value="created_at">Entry Date</option>
              <option value="purchase_date">Purchase Date</option>
            </select>
          </div>
          <div>
            <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">Category</label>
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
            <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">Receipt</label>
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
            <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-md border border-white/30 p-6">
          <p className="text-sm text-gray-600">Total Items</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{summary.totalRecords}</p>
        </div>
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-md border border-white/30 p-6">
          <p className="text-sm text-gray-600">Total Quantity</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{summary.totalQuantity}</p>
        </div>
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-md border border-white/30 p-6">
          <p className="text-sm text-gray-600">Total Remaining</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{summary.totalLeft}</p>
        </div>
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-md border border-white/30 p-6">
          <p className="text-sm text-gray-600">Total Value</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">BDT {summary.totalValue.toFixed(2)}</p>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-md border border-white/30 p-4 md:p-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                {selectedColumns.map(col => (
                  <th key={col} className="text-left py-3 px-2 md:px-4 text-xs md:text-sm font-semibold text-gray-700">
                    {COLUMN_LABELS[col]}
                  </th>
                ))}
                <th className="text-left py-3 px-2 md:px-4 text-xs md:text-sm font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={selectedColumns.length + 1} className="text-center py-8 text-gray-600">
                    Loading...
                  </td>
                </tr>
              ) : inventory.length === 0 ? (
                <tr>
                  <td colSpan={selectedColumns.length + 1} className="text-center py-8 text-gray-600">
                    No inventory items found
                  </td>
                </tr>
              ) : (
                inventory.map(item => (
                  <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                    {selectedColumns.map(col => (
                      <td key={col} className="py-3 px-2 md:px-4 text-xs md:text-sm text-gray-900">
                        {col === 'photo' && item.photo_path ? (
                          <button
                            onClick={() => openPhotoViewer(item.photo_path!)}
                            className="text-blue-600 hover:text-blue-800 font-medium"
                          >
                            View
                          </button>
                        ) : col === 'photo' ? (
                          <span className="text-gray-400">—</span>
                        ) : col === 'category' ? (
                          item.inventory_categories?.name || '—'
                        ) : col === 'user_entry' ? (
                          item.creator?.full_name || item.creator?.username || 'Unknown'
                        ) : col === 'receipt' ? (
                          item.receipt ? <span className="text-green-600">Yes</span> : <span className="text-red-600">No</span>
                        ) : col === 'price' || col === 'unit_cost' ? (
                          `BDT ${(item[col as keyof InventoryItem] as number)?.toFixed(2) || '0.00'}`
                        ) : (
                          item[col as keyof InventoryItem]?.toString() || '—'
                        )}
                      </td>
                    ))}
                    <td className="py-3 px-2 md:px-4 text-xs md:text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEditModal(item)}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => { setItemToDelete(item.id); setShowDeleteConfirm(true); }}
                          className="text-red-600 hover:text-red-800 font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setShowAddModal(false); setEditingItem(null); resetForm(); }} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {editingItem ? 'Edit Item' : 'Add New Item'}
            </h2>
            <form onSubmit={editingItem ? handleEditItem : handleAddItem} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Item Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Left Item</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.left_item}
                    onChange={(e) => setFormData({ ...formData, left_item: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price (BDT)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit Cost (BDT)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.unit_cost}
                    onChange={(e) => setFormData({ ...formData, unit_cost: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.purchase_date}
                    onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Paid By</label>
                  <input
                    type="text"
                    value={formData.paid_by}
                    onChange={(e) => setFormData({ ...formData, paid_by: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="receipt"
                    checked={formData.receipt}
                    onChange={(e) => setFormData({ ...formData, receipt: e.target.checked })}
                    className="w-4 h-4 text-yellow-500 border-gray-300 rounded focus:ring-yellow-500"
                  />
                  <label htmlFor="receipt" className="text-sm font-medium text-gray-700">Has Receipt</label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Remark</label>
                <textarea
                  value={formData.remark}
                  onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Photo</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                />
                {compressedSize && (
                  <p className="text-xs text-gray-600 mt-1">Photo size: {(compressedSize / 1024).toFixed(2)} KB</p>
                )}
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white font-medium rounded-lg transition-colors"
                >
                  {editingItem ? 'Update Item' : 'Add Item'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); setEditingItem(null); resetForm(); }}
                  className="flex-1 px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setShowCategoryModal(false); setCategoryName(''); }} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Add New Category</h2>
            <form onSubmit={handleAddCategory} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category Name *</label>
                <input
                  type="text"
                  required
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors"
                >
                  Add Category
                </button>
                <button
                  type="button"
                  onClick={() => { setShowCategoryModal(false); setCategoryName(''); }}
                  className="flex-1 px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Column Selection Modal */}
      {showColumnModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowColumnModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Select Columns</h2>
            <div className="space-y-2">
              {Object.entries(COLUMN_LABELS).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedColumns.includes(key)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedColumns([...selectedColumns, key]);
                      } else {
                        setSelectedColumns(selectedColumns.filter(col => col !== key));
                      }
                    }}
                    className="w-4 h-4 text-yellow-500 border-gray-300 rounded focus:ring-yellow-500"
                  />
                  <span className="text-sm text-gray-700">{label}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setShowColumnModal(false)}
                className="flex-1 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white font-medium rounded-lg transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setShowDeleteConfirm(false); setItemToDelete(null); }} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Confirm Delete</h2>
            <p className="text-gray-600 mb-6">Are you sure you want to delete this item? This action cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={handleDeleteItem}
                disabled={deleting}
                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
              <button
                onClick={() => { setShowDeleteConfirm(false); setItemToDelete(null); }}
                className="flex-1 px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Popup */}
      {showSuccessPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowSuccessPopup(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md text-center">
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Success!</h2>
            <p className="text-gray-600 mb-6">{successMessage}</p>
            <button
              onClick={() => setShowSuccessPopup(false)}
              className="px-6 py-2 bg-yellow-500 hover:bg-yellow-600 text-white font-medium rounded-lg transition-colors"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Photo Viewer */}
      {photoViewerOpen && currentPhotoUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => { setPhotoViewerOpen(false); setCurrentPhotoUrl(null); }} />
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={currentPhotoUrl}
              alt="Inventory item"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
            <button
              onClick={() => { setPhotoViewerOpen(false); setCurrentPhotoUrl(null); }}
              className="absolute top-4 right-4 p-2 bg-white rounded-full shadow-lg hover:bg-gray-100"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
