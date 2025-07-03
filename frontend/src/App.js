import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Edit, Trash2, Upload, Download, Plus, X, Search, RefreshCw, Copy } from 'lucide-react';
import './App.css';

const API_BASE_URL = 'http://localhost:5000/api';

function App() {
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    pan_number: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [showPAN, setShowPAN] = useState({});
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadErrors, setUploadErrors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copiedPAN, setCopiedPAN] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/users`);
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchUsers();
    setIsRefreshing(false);
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      phone_number: user.phone_number,
      pan_number: user.pan_number
    });
    setShowForm(true);
  };

  const handleDelete = async (userId) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      setLoading(true);
      try {
        await fetch(`${API_BASE_URL}/users/${userId}`, {
          method: 'DELETE'
        });
        setMessage({ text: 'User deleted successfully.', type: 'success' });
        fetchUsers();
      } catch (error) {
        console.error('Error deleting user:', error);
        setMessage({ text: 'Error deleting user.', type: 'error' });
      } finally {
        setLoading(false);
      }
    }
  };

  const resetForm = () => {
    setEditingUser(null);
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone_number: '',
      pan_number: ''
    });
    setFormErrors({});
    setShowForm(false);
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.first_name) errors.first_name = 'First name is required.';
    if (!formData.last_name) errors.last_name = 'Last name is required.';
    if (!formData.email) {
      errors.email = 'Email is required.';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Email address is invalid.';
    }
    if (!formData.phone_number) {
      errors.phone_number = 'Phone number is required.';
    } else if (!/^\d{10}$/.test(formData.phone_number)) {
      errors.phone_number = 'Phone number must be 10 digits.';
    }
    if (!formData.pan_number) {
      errors.pan_number = 'PAN number is required.';
    } else if (!/[A-Z]{5}[0-9]{4}[A-Z]{1}/.test(formData.pan_number)) {
      errors.pan_number = 'PAN number format is invalid.';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    try {
      const response = editingUser
        ? await fetch(`${API_BASE_URL}/users/${editingUser.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              ...formData,
              id: editingUser.id
            })
          })
        : await fetch(`${API_BASE_URL}/users`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
          });
      const data = await response.json();
      setMessage({ text: editingUser ? 'User updated successfully.' : 'User added successfully.', type: 'success' });
      fetchUsers();
      resetForm();
    } catch (error) {
      console.error('Error saving user:', error);
      setMessage({ text: 'Error saving user.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Download template
  const downloadTemplate = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/users/template`);
      if (!response.ok) throw new Error('Failed to download template.');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = 'user_template.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      setMessage({ text: 'Template downloaded successfully.', type: 'success' });
    } catch (error) {
      console.error('Error downloading template:', error);
      setMessage({ text: 'Error downloading template.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Bulk upload
  const handleBulkUpload = async () => {
    if (!uploadFile) return;
    setLoading(true);
    const formDataObj = new FormData();
    formDataObj.append('file', uploadFile);
    try {
      const response = await fetch(`${API_BASE_URL}/users/bulk-upload`, {
        method: 'POST',
        body: formDataObj
      });
      const data = await response.json();
      if (response.ok) {
        setMessage({ text: 'Users uploaded successfully.', type: 'success' });
        setUploadErrors([]);
        fetchUsers();
      } else {
        // Show detailed errors for each row/field
        if (Array.isArray(data.errors)) {
          setUploadErrors(data.errors.map(err => {
            if (typeof err === 'string') return { row: '-', errors: [err] };
            // Example: { row: 2, errors: ['Missing email', 'Wrong PAN number'] }
            return {
              row: err.row || '-',
              errors: (err.errors || []).map(e => {
                if (/pan/i.test(e)) return 'Wrong PAN number format';
                if (/email/i.test(e)) return 'Invalid or missing email';
                if (/phone/i.test(e)) return 'Invalid or missing phone number';
                if (/first name/i.test(e)) return 'Missing first name';
                if (/last name/i.test(e)) return 'Missing last name';
                return e;
              })
            };
          }));
        } else {
          setUploadErrors([{ row: '-', errors: [data.error || 'Unknown error'] }]);
        }
        setMessage({ text: 'Some rows failed to upload. See errors below.', type: 'error' });
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      setMessage({ text: 'Error uploading file.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Mask PAN for display
  const maskPAN = (pan) => {
    if (!pan) return '';
    return '••••••••••';
  };

  const togglePANVisibility = (id) => {
    setShowPAN(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleCopyPAN = (pan, id) => {
    navigator.clipboard.writeText(pan);
    setCopiedPAN(id);
    setTimeout(() => setCopiedPAN(null), 1500);
  };

  const filteredUsers = users.filter(user => 
    user.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.phone_number.includes(searchTerm)
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-2 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 sm:mb-0">
            User Management System
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              className={`p-2 text-gray-600 hover:text-gray-900 transition-all ${isRefreshing ? 'animate-spin' : ''}`}
              title="Refresh"
              aria-label="Refresh user list"
            >
              <RefreshCw size={20} />
            </button>
          </div>
        </div>
        
        {/* Message Display */}
        {message.text && (
          <div className={`mb-6 p-4 rounded-lg shadow-lg transform transition-all duration-300 fade-in ${
            message.type === 'success' 
              ? 'bg-green-100 text-green-700 border-l-4 border-green-500' 
              : 'bg-red-100 text-red-700 border-l-4 border-red-500'}`}
            role="alert"
            aria-live="polite"
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                {message.type === 'success' ? '✓' : '✕'}
              </div>
              <div className="ml-3">
                <p className="font-medium">{message.text}</p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons and Search */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-4 w-full sm:w-auto">
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all hover:shadow-lg transform hover:-translate-y-0.5 w-full sm:w-auto"
            >
              <Plus size={20} />
              Add User
            </button>
            
            <button
              onClick={downloadTemplate}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-all hover:shadow-lg transform hover:-translate-y-0.5 w-full sm:w-auto"
            >
              <Download size={20} />
              Download Template
            </button>
          </div>
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              aria-label="Search users"
            />
            <Search size={20} className="absolute left-3 top-2.5 text-gray-400" />
          </div>
        </div>

        {/* Bulk Upload Section */}
        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 mb-6 transform transition-all duration-300 hover:shadow-xl">
          <h2 className="text-lg sm:text-xl font-semibold mb-4 text-gray-800">Bulk Upload Users</h2>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="w-full sm:w-auto flex-1">
              <label className="file-input-label">
                <input
                  type="file"
                  accept=".xlsx"
                  onChange={(e) => setUploadFile(e.target.files[0])}
                  className="hidden"
                />
                <div className="flex items-center gap-2 cursor-pointer bg-gray-50 text-gray-700 px-4 py-2 rounded-lg border-2 border-dashed border-gray-300 hover:border-blue-500 hover:bg-blue-50 transition-all">
                  <Upload size={20} />
                  {uploadFile ? uploadFile.name : 'Choose XLSX file'}
                </div>
              </label>
            </div>
            <button
              onClick={handleBulkUpload}
              disabled={loading || !uploadFile}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-lg transform hover:-translate-y-0.5"
            >
              <Upload size={20} />
              {loading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
          {uploadErrors.length > 0 && (
            <div className="mt-4 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
              <h3 className="font-semibold text-red-800 mb-2">Upload Errors:</h3>
              <ul className="space-y-1 max-h-40 overflow-y-auto custom-scrollbar">
                {uploadErrors.map((error, index) => (
                  <li key={index} className="text-red-700 flex items-start gap-2">
                    <span className="text-red-500">•</span>
                    Row {error.row}: {error.errors ? error.errors.join(', ') : error.email}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden transform transition-all duration-300 hover:shadow-xl">
          <div className="px-2 sm:px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-800">
              All Users
              <span className="ml-2 text-sm text-gray-500">({filteredUsers.length})</span>
            </h2>
          </div>
          
          {users.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-gray-400 mb-4">
                <Plus size={48} className="mx-auto mb-2" />
              </div>
              <p className="text-gray-500 mb-4">No users found. Add your first user to get started.</p>
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all"
              >
                <Plus size={20} />
                Add User
              </button>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No users match your search.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 sm:px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Avatar</th>
                    <th className="px-2 sm:px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-2 sm:px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Email</th>
                    <th className="px-2 sm:px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Phone</th>
                    <th className="px-2 sm:px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">PAN Number</th>
                    <th className="px-2 sm:px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Created</th>
                    <th className="px-2 sm:px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-2 sm:px-6 py-4 whitespace-nowrap">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-lg mx-auto">
                          {user.first_name.charAt(0)}{user.last_name.charAt(0)}
                        </div>
                      </td>
                      <td className="px-2 sm:px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">
                          {user.first_name} {user.last_name}
                        </div>
                        <div className="text-gray-500 sm:hidden text-xs">{user.email}</div>
                      </td>
                      <td className="px-2 sm:px-6 py-4 whitespace-nowrap hidden sm:table-cell">
                        <div className="text-gray-900">{user.email}</div>
                      </td>
                      <td className="px-2 sm:px-6 py-4 whitespace-nowrap hidden sm:table-cell">
                        <div className="text-gray-900">{user.phone_number}</div>
                      </td>
                      <td className="px-2 sm:px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-mono">
                            {showPAN[user.id] ? user.pan_number : maskPAN(user.pan_number)}
                          </span>
                          <button
                            onClick={() => togglePANVisibility(user.id)}
                            className="text-gray-500 hover:text-gray-700 transition-colors"
                            aria-label={showPAN[user.id] ? 'Hide PAN' : 'Show PAN'}
                          >
                            {showPAN[user.id] ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                          <button
                            onClick={() => handleCopyPAN(user.pan_number, user.id)}
                            className="text-gray-400 hover:text-blue-600 transition-colors"
                            aria-label="Copy PAN"
                          >
                            <Copy size={16} />
                          </button>
                          {copiedPAN === user.id && (
                            <span className="text-green-600 text-xs ml-1">Copied!</span>
                          )}
                        </div>
                      </td>
                      <td className="px-2 sm:px-6 py-4 whitespace-nowrap hidden lg:table-cell">
                        <div className="text-gray-500">
                          {user.created_at ? new Date(user.created_at).toLocaleDateString() : ''}
                        </div>
                      </td>
                      <td className="px-2 sm:px-6 py-4 whitespace-nowrap">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(user)}
                            className="text-blue-600 hover:text-blue-800 p-1 hover:bg-blue-50 rounded-full transition-all"
                            title="Edit User"
                            aria-label="Edit User"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(user.id)}
                            className="text-red-600 hover:text-red-800 p-1 hover:bg-red-50 rounded-full transition-all"
                            title="Delete User"
                            aria-label="Delete User"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* User Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 fade-in">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md transform transition-all duration-300 scale-in">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold text-gray-800">
                  {editingUser ? 'Edit User' : 'Add New User'}
                </h2>
                <button
                  onClick={resetForm}
                  className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full p-1 transition-all"
                >
                  <X size={24} />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    value={formData.first_name}
                    onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                    className={`w-full p-2 border rounded-lg ${formErrors.first_name ? 'border-red-500' : 'border-gray-300'} focus:border-blue-500 focus:ring-2 focus:ring-blue-200`}
                  />
                  {formErrors.first_name && (
                    <p className="text-red-500 text-sm mt-1">{formErrors.first_name}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                    className={`w-full p-2 border rounded-lg ${formErrors.last_name ? 'border-red-500' : 'border-gray-300'} focus:border-blue-500 focus:ring-2 focus:ring-blue-200`}
                  />
                  {formErrors.last_name && (
                    <p className="text-red-500 text-sm mt-1">{formErrors.last_name}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className={`w-full p-2 border rounded-lg ${formErrors.email ? 'border-red-500' : 'border-gray-300'} focus:border-blue-500 focus:ring-2 focus:ring-blue-200`}
                  />
                  {formErrors.email && (
                    <p className="text-red-500 text-sm mt-1">{formErrors.email}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="text"
                    value={formData.phone_number}
                    onChange={(e) => setFormData({...formData, phone_number: e.target.value})}
                    placeholder="10 digits only"
                    className={`w-full p-2 border rounded-lg ${formErrors.phone_number ? 'border-red-500' : 'border-gray-300'} focus:border-blue-500 focus:ring-2 focus:ring-blue-200`}
                  />
                  {formErrors.phone_number && (
                    <p className="text-red-500 text-sm mt-1">{formErrors.phone_number}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    PAN Number *
                  </label>
                  <div className="relative">
                    <input
                      type={showPAN.form ? "text" : "password"}
                      value={formData.pan_number}
                      onChange={(e) => setFormData({...formData, pan_number: e.target.value.toUpperCase()})}
                      placeholder="ABCDE1234F"
                      className={`w-full p-2 pr-10 border rounded-lg ${formErrors.pan_number ? 'border-red-500' : 'border-gray-300'} focus:border-blue-500 focus:ring-2 focus:ring-blue-200`}
                    />
                    <button
                      type="button"
                      onClick={() => togglePANVisibility('form')}
                      className="absolute right-2 top-2 text-gray-500 hover:text-gray-700"
                    >
                      {showPAN.form ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  {formErrors.pan_number && (
                    <p className="text-red-500 text-sm mt-1">{formErrors.pan_number}</p>
                  )}
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? 'Saving...' : (editingUser ? 'Update User' : 'Create User')}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Loading Overlay */}
        {loading && (
          <div className="fixed inset-0 bg-black bg-opacity-25 backdrop-blur-sm flex items-center justify-center z-40">
            <div className="bg-white rounded-lg p-4 flex items-center gap-3 shadow-xl">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="text-gray-700">Processing...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
