import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { deliveryAPI, beamAPI, designAPI } from '../services/api';
import { ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';

const AddDelivery = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preSelectedBeamId = searchParams.get('beamId');

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const [activeBeams, setActiveBeams] = useState<any[]>([]);
  const [selectedBeam, setSelectedBeam] = useState<any>(null);
  const [pricePresets, setPricePresets] = useState<any[]>([]);
  const [useCustomPrice, setUseCustomPrice] = useState(false);

  const [formData, setFormData] = useState({
    beam_id: preSelectedBeamId || '',
    delivery_date: new Date().toISOString().split('T')[0],
    design_name: '',
    price_per_piece: '',
    good_pieces: '',
    damaged_pieces: '0',
    notes: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (preSelectedBeamId && activeBeams.length > 0) {
      const beam = activeBeams.find(b => b.id === parseInt(preSelectedBeamId));
      if (beam) {
        setSelectedBeam(beam);
        setFormData(prev => ({ ...prev, beam_id: preSelectedBeamId }));
      }
    }
  }, [preSelectedBeamId, activeBeams]);

  const fetchData = async () => {
    try {
      const [beamsRes, presetsRes] = await Promise.all([
        beamAPI.getAll('active'),
        designAPI.getPresets(),
      ]);
      setActiveBeams(beamsRes.data.beams);
      setPricePresets(presetsRes.data.presets);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleBeamChange = (beamId: string) => {
    const beam = activeBeams.find(b => b.id === parseInt(beamId));
    setSelectedBeam(beam);
    setFormData({ ...formData, beam_id: beamId });
  };

  const calculateMeters = () => {
    if (!selectedBeam || !formData.good_pieces) return 0;
    const totalPieces = parseInt(formData.good_pieces) + parseInt(formData.damaged_pieces || '0');
    return totalPieces * parseFloat(selectedBeam.meters_per_piece);
  };

  const calculateAmount = () => {
    if (!formData.good_pieces || !formData.price_per_piece) return 0;
    return parseInt(formData.good_pieces) * parseFloat(formData.price_per_piece);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await deliveryAPI.add({
        beam_id: parseInt(formData.beam_id),
        delivery_date: formData.delivery_date,
        design_name: formData.design_name,
        price_per_piece: parseFloat(formData.price_per_piece),
        good_pieces: parseInt(formData.good_pieces),
        damaged_pieces: parseInt(formData.damaged_pieces),
        notes: formData.notes || null,
      });

      setSuccess(true);
      setTimeout(() => {
        navigate(`/beams/${formData.beam_id}`);
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to add delivery');
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Delivery Added Successfully!</h2>
          <p className="text-gray-600">Redirecting to beam details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Add Delivery</h1>
          <p className="text-gray-600 mt-1">Record a new delivery for a beam</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 shadow-soft space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Beam <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.beam_id}
            onChange={(e) => handleBeamChange(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
            required
          >
            <option value="">Choose a beam</option>
            {activeBeams.map((beam) => (
              <option key={beam.id} value={beam.id}>
                {beam.beam_number} - {beam.customer_name} - Machine {beam.machine_number}
                ({beam.remaining_meters.toFixed(0)}m remaining)
              </option>
            ))}
          </select>
        </div>

        {selectedBeam && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-sm text-blue-900 mb-2"><strong>Beam Info:</strong></p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-blue-700">Meters per piece:</span>{' '}
                <strong>{selectedBeam.meters_per_piece}m</strong>
              </div>
              <div>
                <span className="text-blue-700">Remaining:</span>{' '}
                <strong>{selectedBeam.remaining_meters.toFixed(0)}m</strong>
              </div>
              <div>
                <span className="text-blue-700">Fabric:</span>{' '}
                <strong>{selectedBeam.fabric_type.toUpperCase()}</strong>
              </div>
              <div>
                <span className="text-blue-700">Customer:</span>{' '}
                <strong>{selectedBeam.customer_name}</strong>
              </div>
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Delivery Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={formData.delivery_date}
            onChange={(e) => setFormData({ ...formData, delivery_date: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
            required
          />
        </div>


        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Design Preset <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.price_per_piece ? `${formData.design_name}|${formData.price_per_piece}` : ''}
            onChange={(e) => {
              if (e.target.value === 'custom') {
                setUseCustomPrice(true);
                setFormData({ ...formData, design_name: '', price_per_piece: '' });
              } else if (e.target.value) {
                const [label, price] = e.target.value.split('|');
                setUseCustomPrice(false);
                setFormData({ ...formData, design_name: label, price_per_piece: price });
              }
            }}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
            required={!useCustomPrice}
          >
            <option value="">Select a design preset</option>
            {pricePresets.map((preset) => (
              <option key={preset.id} value={`${preset.label}|${preset.price}`}>
                {preset.label}
              </option>
            ))}
            <option value="custom">Custom Design & Price</option>
          </select>

          {useCustomPrice && (
            <div className="mt-4 space-y-4">
              <input
                type="text"
                value={formData.design_name}
                onChange={(e) => setFormData({ ...formData, design_name: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                placeholder="Enter custom design name"
                required
              />
              <input
                type="text"
                inputMode="decimal"
                value={formData.price_per_piece}
                onChange={(e) => setFormData({ ...formData, price_per_piece: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                placeholder="Enter custom price (₹)"
                required
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Good Pieces <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={formData.good_pieces}
              onChange={(e) => {
                const value = e.target.value.replace(/[^0-9]/g, '');
                setFormData({ ...formData, good_pieces: value });
              }}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              placeholder="90"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Damaged Pieces
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={formData.damaged_pieces}
              onChange={(e) => {
                const value = e.target.value.replace(/[^0-9]/g, '');
                setFormData({ ...formData, damaged_pieces: value });
              }}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              placeholder="10"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notes (Optional)
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={3}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none resize-none"
            placeholder="Any additional notes about this delivery..."
          />
        </div>

        {/* Calculation Summary */}
        {formData.good_pieces && formData.price_per_piece && selectedBeam && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-2">
            <p className="text-sm text-green-900 font-semibold mb-3">Delivery Summary:</p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-green-700">Total Pieces:</span>{' '}
                <strong>{parseInt(formData.good_pieces) + parseInt(formData.damaged_pieces || '0')}</strong>
              </div>
              <div>
                <span className="text-green-700">Meters to be Used:</span>{' '}
                <strong>{calculateMeters().toFixed(1)}m</strong>
              </div>
              <div>
                <span className="text-green-700">Payment Amount:</span>{' '}
                <strong className="text-lg text-green-800">₹{calculateAmount().toLocaleString()}</strong>
              </div>
              <div>
                <span className="text-green-700">Remaining After:</span>{' '}
                <strong>{(selectedBeam.remaining_meters - calculateMeters()).toFixed(0)}m</strong>
              </div>
            </div>
          </div>
        )}

        <div className="flex space-x-4 pt-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition font-semibold"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-6 py-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition font-semibold disabled:opacity-50"
          >
            {loading ? 'Adding Delivery...' : 'Add Delivery'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddDelivery;