import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { workshopAPI, customerAPI } from '../services/api';
import { ArrowLeft, Plus, Trash2, CheckCircle, XCircle, AlertCircle, Settings2 } from 'lucide-react';
import api from '../services/api';
import ConfirmModal from '../components/ConfirmModal';

const AdminPanel = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('workshops');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');

    // Data states
    const [workshops, setWorkshops] = useState<any[]>([]);
    const [machines, setMachines] = useState<any[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    const [designPresets, setDesignPresets] = useState<any[]>([]);

    // Form states
    const [workshopForm, setWorkshopForm] = useState({
        name: '',
        location: '',
        workshop_type: 'vesti',
    });

    const [machineForm, setMachineForm] = useState({
        workshop_id: '',
        machine_number: '',
        fabric_type: 'vesti',
    });

    const [customerForm, setCustomerForm] = useState({
        name: '',
        phone: '',
        email: '',
        address: '',
    });

    // Modal state
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
    }>({ isOpen: false, title: '', message: '', onConfirm: () => { } });

    const [presetForm, setPresetForm] = useState({
        price: '',
        label: '',
    });

    useEffect(() => {
        fetchAllData();
    }, []);

    const fetchAllData = async () => {
        try {
            const [workshopsRes, machinesRes, customersRes, presetsRes] = await Promise.all([
                workshopAPI.getAll(),
                api.get('/machines/all'),
                customerAPI.getAll(),
                api.get('/design-presets'),
            ]);
            setWorkshops(workshopsRes.data.workshops);
            setMachines(machinesRes.data.machines);
            setCustomers(customersRes.data.customers);
            setDesignPresets(presetsRes.data.presets);
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    };

    // Workshop handlers
    const handleAddWorkshop = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await api.post('/workshops', {
                ...workshopForm,
                machine_count: 0,
            });
            setSuccess('Workshop added successfully!');
            setWorkshopForm({ name: '', location: '', workshop_type: 'vesti' });
            fetchAllData();
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to add workshop');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteWorkshop = async (id: number) => {
        setConfirmModal({
            isOpen: true,
            title: 'Delete Workshop',
            message: 'Are you sure? This will delete all machines in this workshop!',
            onConfirm: async () => {
                try {
                    await api.delete(`/workshops/${id}`);
                    setSuccess('Workshop deleted successfully!');
                    fetchAllData();
                } catch (err: any) {
                    setError(err.response?.data?.detail || 'Failed to delete workshop');
                }
            }
        });
    };

    // Machine handlers
    const handleAddMachine = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await api.post('/machines', {
                workshop_id: parseInt(machineForm.workshop_id),
                machine_number: parseInt(machineForm.machine_number),
                fabric_type: machineForm.fabric_type,
            });
            setSuccess('Machine added successfully!');
            setMachineForm({ workshop_id: '', machine_number: '', fabric_type: 'vesti' });
            fetchAllData();
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to add machine');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteMachine = async (id: number) => {
        setConfirmModal({
            isOpen: true,
            title: 'Delete Machine',
            message: 'Are you sure you want to delete this machine?',
            onConfirm: async () => {
                try {
                    await api.delete(`/machines/${id}`);
                    setSuccess('Machine deleted successfully!');
                    fetchAllData();
                } catch (err: any) {
                    setError(err.response?.data?.detail || 'Failed to delete machine');
                }
            }
        });
    };

    // Customer handlers
    const handleAddCustomer = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await customerAPI.create(customerForm);
            setSuccess('Customer added successfully!');
            setCustomerForm({ name: '', phone: '', email: '', address: '' });
            fetchAllData();
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to add customer');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteCustomer = async (id: number) => {
        setConfirmModal({
            isOpen: true,
            title: 'Delete Customer',
            message: 'Are you sure? This will affect all beams for this customer!',
            onConfirm: async () => {
                try {
                    await api.delete(`/customers/${id}`);
                    setSuccess('Customer deleted successfully!');
                    fetchAllData();
                } catch (err: any) {
                    setError(err.response?.data?.detail || 'Failed to delete customer');
                }
            }
        });
    };

    const handleStatusToggle = async (customerId: number, currentStatus: string) => {
        const newStatus = currentStatus === 'active' ? 'inactive' : 'active';

        try {
            await api.put(`/customers/${customerId}/status`, { status: newStatus });
            setSuccess(`Customer status updated to ${newStatus}!`);
            fetchAllData();
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to update customer status');
        }
    };

    // Design Preset handlers
    const handleAddPreset = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await api.post('/design-presets', {
                price: parseFloat(presetForm.price),
                label: presetForm.label,
            });
            setSuccess('Design preset added successfully!');
            setPresetForm({ price: '', label: '' });
            fetchAllData();
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to add preset');
        } finally {
            setLoading(false);
        }
    };

    const handleDeletePreset = async (id: number) => {
        setConfirmModal({
            isOpen: true,
            title: 'Delete Preset',
            message: 'Are you sure you want to delete this preset?',
            onConfirm: async () => {
                try {
                    await api.delete(`/design-presets/${id}`);
                    setSuccess('Preset deleted successfully!');
                    fetchAllData();
                } catch (err: any) {
                    setError(err.response?.data?.detail || 'Failed to delete preset');
                }
            }
        });
    };

    const tabs = [
        { id: 'workshops', label: 'Workshops', count: workshops.length },
        { id: 'machines', label: 'Machines', count: machines.length },
        { id: 'customers', label: 'Customers', count: customers.length },
        { id: 'presets', label: 'Design Presets', count: designPresets.length },
    ];

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-center space-x-4">
                <button onClick={() => navigate('/dashboard')} className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 transition">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex items-center space-x-3">
                    <Settings2 className="w-8 h-8 text-primary-600" />
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Admin Management Panel</h1>
                        <p className="text-gray-600 mt-1">Manage workshops, machines, customers, and presets</p>
                    </div>
                </div>
            </div>

            {success && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-green-800">{success}</p>
                </div>
            )}

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start space-x-3">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-800">{error}</p>
                </div>
            )}

            <div className="bg-white rounded-2xl shadow-soft overflow-hidden">
                <div className="border-b border-gray-200">
                    <div className="flex space-x-1 p-2">
                        {tabs.map((tab) => (
                            <button key={tab.id} onClick={() => { setActiveTab(tab.id); setSuccess(''); setError(''); }}
                                className={`flex-1 px-6 py-3 rounded-xl font-semibold transition ${activeTab === tab.id ? 'bg-primary-500 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
                                {tab.label} ({tab.count})
                            </button>
                        ))}
                    </div>
                </div>

                <div className="p-6">
                    {activeTab === 'workshops' && (
                        <div className="space-y-6">
                            <form onSubmit={handleAddWorkshop} className="bg-gray-50 rounded-xl p-6 space-y-4">
                                <h3 className="font-semibold text-lg flex items-center space-x-2"><Plus className="w-5 h-5" /><span>Add New Workshop</span></h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <input type="text" placeholder="Workshop Name *" value={workshopForm.name} onChange={(e) => setWorkshopForm({ ...workshopForm, name: e.target.value })} className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none" required />
                                    <input type="text" placeholder="Location" value={workshopForm.location} onChange={(e) => setWorkshopForm({ ...workshopForm, location: e.target.value })} className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none" />
                                    <select value={workshopForm.workshop_type} onChange={(e) => setWorkshopForm({ ...workshopForm, workshop_type: e.target.value })} className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none md:col-span-2">
                                        <option value="vesti">Vesti</option>
                                        <option value="saree">Saree</option>
                                        <option value="mixed">Mixed</option>
                                    </select>
                                </div>
                                <button type="submit" disabled={loading} className="w-full px-6 py-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition font-semibold disabled:opacity-50">{loading ? 'Adding...' : 'Add Workshop'}</button>
                            </form>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead><tr className="border-b-2 border-gray-200"><th className="text-left py-3 px-4 font-semibold">Name</th><th className="text-left py-3 px-4 font-semibold">Location</th><th className="text-left py-3 px-4 font-semibold">Type</th><th className="text-left py-3 px-4 font-semibold">Machines</th><th className="text-center py-3 px-4 font-semibold">Actions</th></tr></thead>
                                    <tbody>
                                        {workshops.map((workshop) => (
                                            <tr key={workshop.id} className="border-b border-gray-100 hover:bg-gray-50">
                                                <td className="py-3 px-4 font-semibold">{workshop.name}</td>
                                                <td className="py-3 px-4">{workshop.location}</td>
                                                <td className="py-3 px-4"><span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-semibold uppercase">{workshop.workshop_type}</span></td>
                                                <td className="py-3 px-4">{workshop.actual_machine_count || 0}</td>
                                                <td className="py-3 px-4 text-center"><button onClick={() => handleDeleteWorkshop(workshop.id)} className="inline-flex items-center space-x-1 px-3 py-1 text-red-600 hover:bg-red-50 rounded-lg transition"><Trash2 className="w-4 h-4" /><span className="text-sm">Delete</span></button></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'machines' && (
                        <div className="space-y-6">
                            <form onSubmit={handleAddMachine} className="bg-gray-50 rounded-xl p-6 space-y-4">
                                <h3 className="font-semibold text-lg flex items-center space-x-2"><Plus className="w-5 h-5" /><span>Add New Machine</span></h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <select value={machineForm.workshop_id} onChange={(e) => setMachineForm({ ...machineForm, workshop_id: e.target.value })} className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none" required>
                                        <option value="">Select Workshop *</option>
                                        {workshops.map((workshop) => (<option key={workshop.id} value={workshop.id}>{workshop.name}</option>))}
                                    </select>
                                    <input type="number" placeholder="Machine Number *" value={machineForm.machine_number} onChange={(e) => setMachineForm({ ...machineForm, machine_number: e.target.value })} className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none" required />
                                    <select value={machineForm.fabric_type} onChange={(e) => setMachineForm({ ...machineForm, fabric_type: e.target.value })} className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none">
                                        <option value="vesti">Vesti</option>
                                        <option value="saree">Saree</option>
                                    </select>
                                </div>
                                <button type="submit" disabled={loading} className="w-full px-6 py-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition font-semibold disabled:opacity-50">{loading ? 'Adding...' : 'Add Machine'}</button>
                            </form>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead><tr className="border-b-2 border-gray-200"><th className="text-left py-3 px-4 font-semibold">Workshop</th><th className="text-left py-3 px-4 font-semibold">Machine #</th><th className="text-left py-3 px-4 font-semibold">Fabric Type</th><th className="text-center py-3 px-4 font-semibold">Actions</th></tr></thead>
                                    <tbody>
                                        {machines.map((machine) => (
                                            <tr key={machine.id} className="border-b border-gray-100 hover:bg-gray-50">
                                                <td className="py-3 px-4">{machine.workshop_name}</td>
                                                <td className="py-3 px-4 font-semibold">Machine {machine.machine_number}</td>
                                                <td className="py-3 px-4"><span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-semibold uppercase">{machine.fabric_type}</span></td>
                                                <td className="py-3 px-4 text-center"><button onClick={() => handleDeleteMachine(machine.id)} className="inline-flex items-center space-x-1 px-3 py-1 text-red-600 hover:bg-red-50 rounded-lg transition"><Trash2 className="w-4 h-4" /><span className="text-sm">Delete</span></button></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'customers' && (
                        <div className="space-y-6">
                            <form onSubmit={handleAddCustomer} className="bg-gray-50 rounded-xl p-6 space-y-4">
                                <h3 className="font-semibold text-lg flex items-center space-x-2"><Plus className="w-5 h-5" /><span>Add New Customer</span></h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <input type="text" placeholder="Customer Name *" value={customerForm.name} onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })} className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none" required />
                                    <input type="tel" placeholder="Phone" value={customerForm.phone} onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })} className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none" />
                                    <input type="email" placeholder="Email" value={customerForm.email} onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })} className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none" />
                                    <input type="text" placeholder="Address" value={customerForm.address} onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })} className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none" />
                                </div>
                                <button type="submit" disabled={loading} className="w-full px-6 py-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition font-semibold disabled:opacity-50">{loading ? 'Adding...' : 'Add Customer'}</button>
                            </form>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead><tr className="border-b-2 border-gray-200"><th className="text-left py-3 px-4 font-semibold">Name</th><th className="text-left py-3 px-4 font-semibold">Phone</th><th className="text-left py-3 px-4 font-semibold">Email</th><th className="text-left py-3 px-4 font-semibold">Status</th><th className="text-center py-3 px-4 font-semibold">Actions</th></tr></thead>
                                    <tbody>
                                        {customers.map((customer) => (
                                            <tr key={customer.id} className="border-b border-gray-100 hover:bg-gray-50">
                                                <td className="py-3 px-4 font-semibold">{customer.name}</td>
                                                <td className="py-3 px-4">{customer.phone || '-'}</td>
                                                <td className="py-3 px-4">{customer.email || '-'}</td>
                                                <td className="py-3 px-4">
                                                    <button
                                                        onClick={() => handleStatusToggle(customer.id, customer.status)}
                                                        className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-sm font-semibold transition-all hover:shadow-md ${customer.status === 'active'
                                                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                            }`}
                                                    >
                                                        {customer.status === 'active' ? (
                                                            <>
                                                                <CheckCircle className="w-4 h-4" />
                                                                <span>Active</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <XCircle className="w-4 h-4" />
                                                                <span>Inactive</span>
                                                            </>
                                                        )}
                                                    </button>
                                                </td>
                                                <td className="py-3 px-4 text-center"><button onClick={() => handleDeleteCustomer(customer.id)} className="inline-flex items-center space-x-1 px-3 py-1 text-red-600 hover:bg-red-50 rounded-lg transition"><Trash2 className="w-4 h-4" /><span className="text-sm">Delete</span></button></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'presets' && (
                        <div className="space-y-6">
                            <form onSubmit={handleAddPreset} className="bg-gray-50 rounded-xl p-6 space-y-4">
                                <h3 className="font-semibold text-lg flex items-center space-x-2"><Plus className="w-5 h-5" /><span>Add New Design Preset</span></h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <input type="text" placeholder="Label (e.g., Vest-1)" value={presetForm.label} onChange={(e) => setPresetForm({ ...presetForm, label: e.target.value })} className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none" required />
                                    <input type="text" inputMode="decimal" placeholder="Price (₹) *" value={presetForm.price} onChange={(e) => setPresetForm({ ...presetForm, price: e.target.value })} className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none" required />
                                </div>
                                <button type="submit" disabled={loading} className="w-full px-6 py-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition font-semibold disabled:opacity-50">{loading ? 'Adding...' : 'Add Preset'}</button>
                            </form>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead><tr className="border-b-2 border-gray-200"><th className="text-left py-3 px-4 font-semibold">Label</th><th className="text-left py-3 px-4 font-semibold">Price</th><th className="text-center py-3 px-4 font-semibold">Actions</th></tr></thead>
                                    <tbody>
                                        {designPresets.map((preset) => (
                                            <tr key={preset.id} className="border-b border-gray-100 hover:bg-gray-50">
                                                <td className="py-3 px-4 font-semibold">{preset.label}</td>
                                                <td className="py-3 px-4">₹{preset.price}</td>
                                                <td className="py-3 px-4 text-center"><button onClick={() => handleDeletePreset(preset.id)} className="inline-flex items-center space-x-1 px-3 py-1 text-red-600 hover:bg-red-50 rounded-lg transition"><Trash2 className="w-4 h-4" /><span className="text-sm">Delete</span></button></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Confirm Modal */}
            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                confirmText="Delete"
                type="danger"
            />
        </div>
    );
};

export default AdminPanel;
