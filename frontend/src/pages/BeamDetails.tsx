import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { beamAPI } from '../services/api';
import { ArrowLeft, Calendar, Package, AlertCircle, DollarSign, XCircle, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import api from '../services/api';
import ConfirmModal from '../components/ConfirmModal';

const BeamDetails = ({ isAdmin }: { isAdmin: boolean }) => {
  const { beamId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [endingBeam, setEndingBeam] = useState(false);

  // Modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => { } });

  useEffect(() => {
    if (beamId) {
      fetchBeamDetails(parseInt(beamId));
    }
  }, [beamId]);

  const fetchBeamDetails = async (id: number) => {
    try {
      const response = await beamAPI.getById(id);
      setData(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching beam details:', error);
      setLoading(false);
    }
  };

  const handleEndBeam = async () => {
    if (!confirm('Are you sure you want to end this beam? This will archive it and it will no longer be visible in the workshops view.')) {
      return;
    }

    setEndingBeam(true);
    try {
      await api.post(`/beams/${beamId}/end`);
      alert('Beam ended successfully! Redirecting to workshops...');
      navigate('/workshops');
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to end beam');
      setEndingBeam(false);
    }
  };

  const handleDeleteBeam = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Beam',
      message: `Are you sure you want to delete beam "${data?.beam?.beam_number}"? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          const isCompleted = data?.beam?.status === 'completed';
          await api.delete(`/beams/${beamId}`);
          navigate(isCompleted ? '/workshops?view=archive' : '/workshops');
        } catch (error: any) {
          alert(error.response?.data?.detail || 'Failed to delete beam');
        }
      }
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Beam not found</p>
      </div>
    );
  }

  const { beam, deliveries, totals } = data;
  const usedPercentage = totals.meter_usage_percentage;
  const remainingPercentage = 100 - usedPercentage;

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center space-x-2 md:space-x-4 min-w-0">
          <Link
            to={beam.status === 'completed' ? '/workshops?view=archive' : '/workshops'}
            className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-lg md:rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4 md:w-5 md:h-5 dark:text-white" />
          </Link>
          <h1 className="text-lg md:text-2xl font-bold text-gray-900 dark:text-white truncate">{beam.beam_number}</h1>
          <span className={`px-2 py-1 text-xs rounded-lg font-semibold flex-shrink-0 ${beam.status === 'active'
            ? 'bg-green-100 text-green-700'
            : 'bg-gray-100 text-gray-700'
            }`}>
            {beam.status.toUpperCase()}
          </span>
        </div>
        {isAdmin && (
          <div className="flex items-center space-x-2 flex-shrink-0">
            <button
              onClick={handleDeleteBeam}
              className="p-1.5 md:p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
              title="Delete Beam"
            >
              <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
            </button>
            {beam.status === 'active' && (
              <button
                onClick={handleEndBeam}
                disabled={endingBeam}
                className="flex items-center space-x-1 px-2 py-1.5 md:px-4 md:py-2 bg-red-500 text-white rounded-lg md:rounded-xl hover:bg-red-600 transition text-sm font-semibold disabled:opacity-50"
              >
                <XCircle className="w-3.5 h-3.5 md:w-4 md:h-4" />
                <span>{endingBeam ? 'Ending...' : 'End Beam'}</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Beam Info Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl md:rounded-2xl p-4 md:p-6 shadow-soft">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Meters</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{beam.total_beam_meters}m</p>
            </div>
            <Package className="w-10 h-10 text-blue-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl md:rounded-2xl p-4 md:p-6 shadow-soft">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Good Pieces</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-2">{totals.total_good}</p>
            </div>
            <Package className="w-10 h-10 text-green-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl md:rounded-2xl p-4 md:p-6 shadow-soft">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Damaged</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-2">{totals.total_damaged}</p>
            </div>
            <AlertCircle className="w-10 h-10 text-red-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl md:rounded-2xl p-4 md:p-6 shadow-soft">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Amount</p>
              <p className="text-2xl font-bold text-primary-600 dark:text-primary-400 mt-2">₹{totals.total_amount.toLocaleString()}</p>
            </div>
            <DollarSign className="w-10 h-10 text-primary-500" />
          </div>
        </div>
      </div>

      {/* Meter Progress */}
      <div className="bg-white dark:bg-gray-800 rounded-xl md:rounded-2xl p-4 md:p-6 shadow-soft">
        <h3 className="text-lg font-semibold mb-3 md:mb-4 text-gray-900 dark:text-white">Meter Usage Progress</h3>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">
              Used: {totals.total_meters_used.toFixed(0)} meters ({usedPercentage.toFixed(1)}%)
            </span>
            <span className={`font-semibold ${remainingPercentage < 20 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
              Remaining: {totals.remaining_meters.toFixed(0)} meters ({remainingPercentage.toFixed(1)}%)
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-6 overflow-hidden">
            <div
              className={`h-full flex items-center justify-center text-xs font-semibold text-white transition-all ${remainingPercentage < 20 ? 'bg-red-500' : 'bg-primary-500'
                }`}
              style={{ width: `${usedPercentage}%` }}
            >
              {usedPercentage > 10 && `${usedPercentage.toFixed(0)}%`}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-3">
              <p className="text-xs text-gray-600 dark:text-gray-400">Meter/Piece</p>
              <p className="text-lg font-bold text-blue-700 dark:text-blue-400">{beam.meters_per_piece}m</p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/30 rounded-xl p-3">
              <p className="text-xs text-gray-600 dark:text-gray-400">Est. Remaining</p>
              <p className="text-lg font-bold text-green-700 dark:text-green-400">{totals.estimated_pieces_remaining} pcs</p>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/30 rounded-xl p-3">
              <p className="text-xs text-gray-600 dark:text-gray-400">Product Type</p>
              <p className="text-lg font-bold text-purple-700 dark:text-purple-400">{beam.fabric_type.toUpperCase()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Deliveries Timeline */}
      <div className="bg-white dark:bg-gray-800 rounded-xl md:rounded-2xl p-4 md:p-6 shadow-soft">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Delivery History</h3>
          {isAdmin && (
            <Link
              to={`/add-delivery?beamId=${beam.id}`}
              className="px-4 py-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition text-sm font-semibold"
            >
              + Add Delivery
            </Link>
          )}
        </div>

        {deliveries.length === 0 ? (
          <div className="text-center py-12 text-gray-400 dark:text-gray-500">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No deliveries yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {deliveries.map((delivery: any, idx: number) => (
              <div
                key={delivery.id}
                className="border border-gray-200 dark:border-gray-700 rounded-xl p-3 md:p-4 hover:border-primary-200 dark:hover:border-primary-700 hover:shadow-md transition"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {format(new Date(delivery.delivery_date), 'dd MMM yyyy')}
                    </span>
                  </div>
                  <span className="px-2 py-1 bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 text-xs rounded-full font-semibold">
                    Delivery #{deliveries.length - idx}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-3">
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Design</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{delivery.design_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Good Pieces</p>
                    <p className="font-semibold text-green-600 dark:text-green-400">{delivery.good_pieces}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Damaged</p>
                    <p className="font-semibold text-red-600 dark:text-red-400">{delivery.damaged_pieces}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Amount</p>
                    <p className="font-semibold text-primary-600 dark:text-primary-400">₹{delivery.total_amount.toLocaleString()}</p>
                  </div>
                </div>

                <div className="mt-3 flex items-center space-x-4 text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    Price: <span className="font-semibold">₹{delivery.price_per_piece}</span>/piece
                  </span>
                  <span className="text-gray-600 dark:text-gray-400">
                    Meters Used: <span className="font-semibold">{delivery.meters_used.toFixed(1)}m</span>
                  </span>
                </div>

                {delivery.notes && (
                  <div className="mt-3 bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                    <p className="text-sm text-gray-700 dark:text-gray-300">📝 {delivery.notes}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Beam Details Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl md:rounded-2xl p-4 md:p-6 shadow-soft">
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Beam Information</h3>
        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
          <div>
            <p className="text-xs text-gray-600 dark:text-gray-400">Start Date</p>
            <p className="font-semibold text-gray-900 dark:text-white">
              {format(new Date(beam.start_date), 'dd MMM yyyy')}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600 dark:text-gray-400">Customer</p>
            <p className="font-semibold text-gray-900 dark:text-white">{beam.customer_name}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 dark:text-gray-400">Workshop</p>
            <p className="font-semibold text-gray-900 dark:text-white">{beam.workshop_name}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 dark:text-gray-400">Machine</p>
            <p className="font-semibold text-gray-900 dark:text-white">Machine {beam.machine_number}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 dark:text-gray-400">Product Type</p>
            <p className="font-semibold text-gray-900 dark:text-white">{beam.fabric_type.toUpperCase()}</p>
          </div>
          {beam.end_date && (
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400">End Date</p>
              <p className="font-semibold text-gray-900 dark:text-white">
                {format(new Date(beam.end_date), 'dd MMM yyyy')}
              </p>
            </div>
          )}
        </div>
        {beam.notes && (
          <div className="mt-4 bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Notes</p>
            <p className="text-gray-900 dark:text-white">{beam.notes}</p>
          </div>
        )}
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

export default BeamDetails;