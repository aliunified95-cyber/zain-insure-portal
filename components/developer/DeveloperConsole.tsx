
import React, { useState, useEffect } from 'react';
import { Card, CardBody, CardHeader } from '../ui/Card';
import { User, UserRole } from '../../types';
import { getUsers, saveUser, deleteUser, seedDatabaseUsers } from '../../services/mockApi';
import { Users, Plus, Edit, Trash2, X, Save, Shield, Key, Loader2, UserCircle, Database, RefreshCw, Info } from 'lucide-react';

export const DeveloperConsole: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<Partial<User>>({});
    const [saving, setSaving] = useState(false);
    const [seeding, setSeeding] = useState(false);

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        setLoading(true);
        const data = await getUsers();
        setUsers(data);
        setLoading(false);
    };

    const handleCreate = () => {
        setEditingUser({
            username: '',
            fullName: '',
            password: '',
            roles: ['JUNIOR_AGENT']
        });
        setIsModalOpen(true);
    };

    const handleEdit = (user: User) => {
        setEditingUser({ ...user, password: '' }); // Don't show password, keep empty unless changing
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this user?')) {
            await deleteUser(id);
            await loadUsers();
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        
        // Don't send empty password on update if not intended to change
        const userToSave = { ...editingUser };
        if (userToSave.id && !userToSave.password) {
            delete userToSave.password;
        }

        await saveUser(userToSave);
        setIsModalOpen(false);
        setSaving(false);
        await loadUsers();
    };

    const handleSeedUsers = async () => {
        setSeeding(true);
        const success = await seedDatabaseUsers();
        setSeeding(false);
        if (success) {
            alert('Users seeded to Database successfully!');
            loadUsers();
        } else {
            alert('Failed to seed users. Check database connection.');
        }
    };

    const toggleRole = (role: UserRole) => {
        const currentRoles = editingUser.roles || [];
        if (currentRoles.includes(role)) {
            setEditingUser({ ...editingUser, roles: currentRoles.filter(r => r !== role) });
        } else {
            setEditingUser({ ...editingUser, roles: [...currentRoles, role] });
        }
    };

    const roleOptions: UserRole[] = ['JUNIOR_AGENT', 'SUPERVISOR', 'CREDIT_CONTROL', 'DEVELOPER'];

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Developer Console</h2>
                    <p className="text-sm text-gray-500 mt-1">Manage system users, roles, and permissions.</p>
                </div>
                
                <div className="flex gap-2">
                    <button 
                        onClick={handleSeedUsers}
                        disabled={seeding}
                        className="flex items-center px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium border border-slate-200"
                    >
                        {seeding ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Database className="w-4 h-4 mr-2" />}
                        Sync Default Users to Firestore
                    </button>
                    <button 
                        onClick={handleCreate}
                        className="flex items-center px-4 py-2 bg-zain-600 text-white rounded-lg hover:bg-zain-700 transition-colors font-medium"
                    >
                        <Plus className="w-4 h-4 mr-2" /> Add User
                    </button>
                </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                <div className="p-1 bg-blue-100 rounded-full text-blue-600 mt-0.5">
                    <Info className="w-4 h-4" />
                </div>
                <div>
                    <h4 className="text-sm font-bold text-blue-900">User Storage Information</h4>
                    <p className="text-sm text-blue-700 mt-1">
                        Users created here are stored in the <strong>users</strong> collection in Firestore, 
                        managed directly via the application logic.
                    </p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                            <Users className="w-5 h-5 mr-2 text-gray-500" /> User Management
                        </h3>
                        <button onClick={loadUsers} className="text-gray-400 hover:text-zain-600 transition-colors">
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </CardHeader>
                <CardBody className="p-0">
                    {loading ? (
                        <div className="p-8 text-center text-gray-500">
                            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                            Loading users...
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Username</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Roles</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {users.map(user => (
                                        <tr key={user.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <img className="h-10 w-10 rounded-full" src={user.avatar || 'https://i.pravatar.cc/150'} alt="" />
                                                    <div className="ml-4">
                                                        <div className="text-sm font-medium text-gray-900">{user.fullName}</div>
                                                        <div className="text-xs text-gray-500">ID: {user.id}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {user.username}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-wrap gap-1">
                                                    {user.roles.map(role => (
                                                        <span key={role} className={`px-2 py-0.5 rounded text-[10px] font-bold border 
                                                            ${role === 'DEVELOPER' ? 'bg-purple-100 text-purple-800 border-purple-200' : 
                                                              role === 'SUPERVISOR' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                                                              role === 'CREDIT_CONTROL' ? 'bg-red-100 text-red-800 border-red-200' :
                                                              'bg-blue-100 text-blue-800 border-blue-200'}`}>
                                                            {role.replace('_', ' ')}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <button onClick={() => handleEdit(user)} className="text-zain-600 hover:text-zain-900 mr-4">
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleDelete(user.id)} className="text-red-600 hover:text-red-900">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardBody>
            </Card>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
                        <div className="flex justify-between items-center p-6 border-b border-gray-100">
                            <h3 className="text-lg font-bold text-gray-900">
                                {editingUser.id ? 'Edit User' : 'Create User'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                                <div className="relative">
                                    <UserCircle className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
                                    <input 
                                        type="text" 
                                        required 
                                        value={editingUser.fullName}
                                        onChange={e => setEditingUser({...editingUser, fullName: e.target.value})}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-zain-500"
                                        placeholder="John Doe"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                                <div className="relative">
                                    <Shield className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
                                    <input 
                                        type="text" 
                                        required 
                                        value={editingUser.username}
                                        onChange={e => setEditingUser({...editingUser, username: e.target.value})}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-zain-500"
                                        placeholder="j.doe"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Password {editingUser.id && <span className="text-gray-400 font-normal">(Leave blank to keep current)</span>}
                                </label>
                                <div className="relative">
                                    <Key className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
                                    <input 
                                        type="password" 
                                        required={!editingUser.id}
                                        value={editingUser.password}
                                        onChange={e => setEditingUser({...editingUser, password: e.target.value})}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-zain-500"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>
                            
                            <div className="pt-2">
                                <label className="block text-sm font-medium text-gray-700 mb-3">Roles & Permissions</label>
                                <div className="space-y-3 bg-gray-50 p-4 rounded-lg border border-gray-200">
                                    {roleOptions.map(role => (
                                        <label key={role} className="flex items-center gap-3 cursor-pointer group">
                                            <input 
                                                type="checkbox" 
                                                checked={(editingUser.roles || []).includes(role)}
                                                onChange={() => toggleRole(role)}
                                                className="w-4 h-4 text-zain-600 rounded border-gray-300 focus:ring-zain-500"
                                            />
                                            <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">
                                                {role.replace('_', ' ')}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                                <p className="text-xs text-gray-500 mt-2">
                                    Select all roles that apply. Users will inherit permissions from all selected roles.
                                </p>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 font-medium">Cancel</button>
                                <button type="submit" disabled={saving} className="px-6 py-2 bg-zain-600 text-white rounded-lg font-medium flex items-center">
                                    {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />} Save User
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
