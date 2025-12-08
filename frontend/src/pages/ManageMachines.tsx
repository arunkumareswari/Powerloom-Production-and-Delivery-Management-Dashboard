import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { workshopAPI } from '../services/api';
import { ArrowLeft, Plus, Trash2, CheckCircle, AlertCircle } from 'lucide-react';
import api from '../services/api';

const ManageMachines = () => {
  const navigate = useNavigate();
  const [workshops, setWorkshops] = useState<any[]>([]);
  const [machines, setMachines] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    workshop_id: '',
    machine_number: '',
    fabric_type: 'vesti',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const workshopsRes = await workshopAPI.getAll();
      setWorkshops(workshopsRes.data.workshops);
      fetchAllMachines();
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const fetchAllMachines = async () => {
    try {
      const response = await api.get('/api/machines/all');
      setMachines(response.data.machines);
    } catch (error) {
      console.error('Error fetching machines:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await api.post('/api/machines', {
        workshop_id: parseInt(formData.workshop_id),
        machine_number: parseInt(formData.machine_number),
        fabric_type: formData.fabric_type,
      });

      setSuccess('Machine added successfully!');
      setFormData({
        workshop_id: '',
        machine_number: '',
        fabric_type: 'vesti',
      });
      fetchAllMachines();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to add machine');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (machineId: number) => {
    if (!confirm('Are you sure you want to delete this machine?')) return;

    try {
      await api.delete(`/api/machines/${machineId}`);
      setSuccess('Machine deleted successfully!');
      fetchAllMachines();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete machine');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate('/settings')}
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl md:text-3xl font-bold text-gray-900">Manage Machines</h1>
          <p className="text-xs text-gray-600 hidden sm:block">Add new machines or manage existing ones</p>
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

      {/* Add Machine Form */}
      <div className="bg-white rounded-2xl p-6 shadow-soft">
        <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
          <Plus className="w-5 h-5" />
          <span>Add New Machine</span>
        </h3>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Workshop <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.workshop_id}
                onChange={(e) => setFormData({ ...formData, workshop_id: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                required
              >
                <option value="">Select Workshop</option>
                {workshops.map((workshop) => (
                  <option key={workshop.id} value={workshop.id}>
                    {workshop.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Machine Number <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={formData.machine_number}
                onChange={(e) => setFormData({ ...formData, machine_number: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                placeholder="e.g., 4"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Machine number within the workshop</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product Type <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.fabric_type}
                onChange={(e) => setFormData({ ...formData, fabric_type: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                required
              >
                <option value="vesti">Veshti</option>
                <option value="saree">Saree</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full px-6 py-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition font-semibold disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>{loading ? 'Adding Machine...' : 'Add Machine'}</span>
          </button>
        </form>
      </div>

      {/* Existing Machines List */}
      <div className="bg-white rounded-2xl p-6 shadow-soft">
        <h3 className="text-lg font-semibold mb-4">Existing Machines ({machines.length})</h3>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Workshop</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Machine #</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Product Type</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {machines.map((machine) => (
                <tr key={machine.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">{machine.workshop_name}</td>
                  <td className="py-3 px-4 font-semibold">Machine {machine.machine_number}</td>
                  <td className="py-3 px-4">
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-semibold uppercase">
                      {machine.fabric_type}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-3 py-1 text-xs rounded-full font-semibold ${machine.is_active
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-700'
                      }`}>
                      {machine.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => handleDelete(machine.id)}
                      className="inline-flex items-center space-x-1 px-3 py-1 text-red-600 hover:bg-red-50 rounded-lg transition"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="text-sm">Delete</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Helper Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h4 className="font-semibold text-blue-900 mb-2">ℹ️ Important Notes:</h4>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>Machine numbers should be unique within each workshop</li>
          <li>Product Type (Veshti/Saree) is fixed per machine</li>
          <li>Deleting a machine will fail if it has active beams</li>
        </ul>
      </div>
    </div>
  );
};

export default ManageMachines;