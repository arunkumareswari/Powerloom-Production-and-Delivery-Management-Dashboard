import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { beamAPI, workshopAPI, customerAPI } from '../services/api';
import { ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';

const AddBeam = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const [workshops, setWorkshops] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [machines, setMachines] = useState<any[]>([]);
  const [selectedWorkshop, setSelectedWorkshop] = useState('');

  const [formData, setFormData] = useState({
    beam_number: '',
    customer_id: '',
    machine_id: '',
    total_beam_meters: '',
    meters_per_piece: '',
    start_date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    fetchWorkshops();
    fetchCustomers();
  }, []);

  const fetchWorkshops = async () => {
    try {
      const response = await workshopAPI.getAll();
      setWorkshops(response.data.workshops);
    } catch (error) {
      console.error('Error fetching workshops:', error);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await customerAPI.getAll();
      setCustomers(response.data.customers);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const handleWorkshopChange = async (workshopId: string) => {
    setSelectedWorkshop(workshopId);
    setFormData({ ...formData, machine_id: '' });

    if (workshopId) {
      try {
        const response = await workshopAPI.getMachines(parseInt(workshopId));
        setMachines(response.data.machines);
      } catch (error) {
        console.error('Error fetching machines:', error);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await beamAPI.startBeam({
        ...formData,
        customer_id: parseInt(formData.customer_id),
        machine_id: parseInt(formData.machine_id),
        total_beam_meters: parseFloat(formData.total_beam_meters),
        meters_per_piece: parseFloat(formData.meters_per_piece),
      });

      setSuccess(true);
      setTimeout(() => {
        navigate('/workshops');
      }, 2000);
    } catch (err: any) {
      let errorMessage = 'Failed to start beam';

      if (err.response?.data?.detail) {
        const detail = err.response.data.detail;

        // Check for duplicate beam number error
        if (detail.includes('Duplicate entry') && detail.includes('beam_number')) {
          errorMessage = `Beam number "${formData.beam_number}" already exists. Please use a different beam number.`;
        } else {
          errorMessage = detail;
        }
      }

      setError(errorMessage);
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Beam Started Successfully!</h2>
          <p className="text-gray-600">Redirecting to workshops...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center space-x-4 mb-6">
        <button
          onClick={() => navigate('/workshops')}
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Start New Beam</h1>
          <p className="text-gray-600 mt-1">Enter beam details to begin production</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start space-x-3 mb-6">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Main Beam Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-8 shadow-soft">
        {/* Grid Layout - 3 columns on desktop, 1 on mobile */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          {/* Beam Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Beam Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.beam_number}
              onChange={(e) => setFormData({ ...formData, beam_number: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              placeholder="WB12345"
              required
            />
            <p className="text-xs text-gray-500 mt-1">Warp beam number</p>
          </div>

          {/* Customer */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Customer <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.customer_id}
              onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              required
            >
              <option value="">Select Customer</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">Customer for this beam</p>
          </div>

          {/* Workshop */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Workshop <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedWorkshop}
              onChange={(e) => handleWorkshopChange(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              required
            >
              <option value="">Select Workshop</option>
              {workshops.map((workshop) => (
                <option key={workshop.id} value={workshop.id}>
                  {workshop.name} ({workshop.workshop_type})
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">Production workshop</p>
          </div>

          {/* Machine */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Machine <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.machine_id}
              onChange={(e) => setFormData({ ...formData, machine_id: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              required
              disabled={!selectedWorkshop}
            >
              <option value="">Select Machine</option>
              {machines.map((machine) => (
                <option key={machine.id} value={machine.id}>
                  Machine {machine.machine_number} - {machine.fabric_type}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">{!selectedWorkshop ? 'Select workshop first' : 'Machine for production'}</p>
          </div>

          {/* Total Beam Meters */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Total Beam Meters <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={formData.total_beam_meters}
              onChange={(e) => {
                const value = e.target.value.replace(/[^0-9.]/g, '');
                if (value.split('.').length <= 2) {
                  setFormData({ ...formData, total_beam_meters: value });
                }
              }}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              placeholder="1000"
              required
            />
            <p className="text-xs text-gray-500 mt-1">Total meters in warp beam</p>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Meters per Piece <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={formData.meters_per_piece}
              onChange={(e) => {
                const value = e.target.value.replace(/[^0-9.]/g, '');
                if (value.split('.').length <= 2) {
                  setFormData({ ...formData, meters_per_piece: value });
                }
              }}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              placeholder="4 (vesti) or 6 (saree)"
              required
            />
            <p className="text-xs text-gray-500 mt-1">Meters per piece</p>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.start_date}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              required
            />
            <p className="text-xs text-gray-500 mt-1">Beam start date</p>
          </div>
        </div>

        {/* Estimated Output */}
        {formData.total_beam_meters && formData.meters_per_piece && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-sm text-blue-900">
              <strong>Estimated Output:</strong> Approximately{' '}
              <span className="text-xl font-bold">
                {Math.floor(parseFloat(formData.total_beam_meters) / parseFloat(formData.meters_per_piece))}
              </span>{' '}
              pieces
            </p>
          </div>
        )}

        <div className="flex space-x-4 pt-4">
          <button
            type="button"
            onClick={() => navigate('/workshops')}
            className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition font-semibold"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-6 py-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition font-semibold disabled:opacity-50"
          >
            {loading ? 'Starting Beam...' : 'Start Beam'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddBeam;