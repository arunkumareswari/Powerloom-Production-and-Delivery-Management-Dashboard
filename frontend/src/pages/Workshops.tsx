import { useEffect, useState } from 'react';
import { workshopAPI } from '../services/api';
import { Factory, AlertTriangle, Archive } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';

const Workshops = ({ isAdmin }: { isAdmin: boolean }) => {
  const navigate = useNavigate();
  const [workshops, setWorkshops] = useState<any[]>([]);
  const [selectedWorkshop, setSelectedWorkshop] = useState<number | null>(null);
  const [machines, setMachines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showArchive, setShowArchive] = useState(false);
  const [archivedBeams, setArchivedBeams] = useState<any[]>([]);

  useEffect(() => {
    fetchWorkshops();
    fetchArchivedBeams();
  }, []);

  const fetchWorkshops = async () => {
    try {
      const response = await workshopAPI.getAll();
      setWorkshops(response.data.workshops);
      if (response.data.workshops.length > 0) {
        selectWorkshop(response.data.workshops[0].id);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching workshops:', error);
      setLoading(false);
    }
  };

  const fetchArchivedBeams = async () => {
    try {
      const response = await api.get('/beams?status=completed');
      setArchivedBeams(response.data.beams);
    } catch (error) {
      console.error('Error fetching archived beams:', error);
    }
  };

  const selectWorkshop = async (workshopId: number) => {
    setShowArchive(false);
    setSelectedWorkshop(workshopId);
    try {
      const response = await workshopAPI.getMachines(workshopId);
      setMachines(response.data.machines);
    } catch (error) {
      console.error('Error fetching machines:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Toggle */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Workshops</h1>
          <p className="text-gray-600 mt-1">View machines and their current status</p>
        </div>

        {/* Present/Archive Toggle */}
        <div className="flex items-center bg-gray-100 rounded-xl p-1">
          <button
            onClick={() => setShowArchive(false)}
            className={`px-6 py-2 rounded-lg font-semibold transition-all ${!showArchive
              ? 'bg-white text-primary-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
              }`}
          >
            Present
          </button>
          <button
            onClick={() => setShowArchive(true)}
            className={`px-6 py-2 rounded-lg font-semibold transition-all ${showArchive
              ? 'bg-white text-primary-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
              }`}
          >
            <Archive className="w-4 h-4 inline mr-2" />
            Archive
          </button>
        </div>
      </div>

      {/* Workshop Tabs - Only show when in Present mode */}
      {!showArchive && (
        <div className="flex space-x-4 border-b border-gray-200">
          {workshops.map((workshop) => (
            <button
              key={workshop.id}
              onClick={() => selectWorkshop(workshop.id)}
              className={`px-6 py-3 font-semibold transition border-b-2 ${selectedWorkshop === workshop.id
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
            >
              <div className="flex items-center space-x-2">
                <Factory className="w-5 h-5" />
                <span>{workshop.name}</span>
                <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">
                  {workshop.actual_machine_count} machines
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Archived Beams Table */}
      {showArchive ? (
        <div className="bg-white rounded-2xl shadow-soft overflow-hidden">
          {archivedBeams.length === 0 ? (
            <div className="p-12 text-center">
              <Archive className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No Archived Beams</h3>
              <p className="text-gray-500">Completed beams will appear here</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr>
                    <th className="text-left py-4 px-6 font-semibold text-gray-700">Beam Number</th>
                    <th className="text-left py-4 px-6 font-semibold text-gray-700">Workshop</th>
                    <th className="text-left py-4 px-6 font-semibold text-gray-700">Customer</th>
                    <th className="text-left py-4 px-6 font-semibold text-gray-700">Machine</th>
                    <th className="text-left py-4 px-6 font-semibold text-gray-700">Total Meters</th>
                    <th className="text-left py-4 px-6 font-semibold text-gray-700">Start Date</th>
                    <th className="text-left py-4 px-6 font-semibold text-gray-700">End Date</th>
                  </tr>
                </thead>
                <tbody>
                  {archivedBeams.map((beam) => (
                    <tr
                      key={beam.id}
                      onClick={() => navigate(`/beams/${beam.id}`)}
                      className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition"
                    >
                      <td className="py-4 px-6">
                        <span className="font-semibold text-gray-900">{beam.beam_number}</span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-gray-700">{beam.workshop_name}</span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-gray-700">{beam.customer_name}</span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full font-semibold">
                          Machine {beam.machine_number}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-gray-700 font-medium">{beam.total_beam_meters}m</span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-gray-700">{beam.start_date}</span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-gray-700">{beam.end_date || '-'}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Machines Grid - existing code */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" key={selectedWorkshop}>
          {machines.map((machine, index) => {
            const usedPercentage = machine.total_beam_meters
              ? (machine.meters_used / machine.total_beam_meters * 100).toFixed(1)
              : 0;
            const remainingPercentage = 100 - parseFloat(usedPercentage.toString());
            const damageRate = machine.meters_used > 0
              ? ((machine.total_damaged / machine.meters_used) * 100).toFixed(1)
              : 0;
            const hasBeam = machine.beam_id !== null;

            return (
              <div
                key={`machine-${selectedWorkshop}-${machine.id}-${index}`}
                className={`bg-white rounded-2xl p-6 shadow-soft border-2 transition ${hasBeam ? 'border-primary-200 hover:border-primary-300' : 'border-gray-200'
                  }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      Machine {machine.machine_number}
                    </h3>
                    <p className="text-sm text-gray-600">{machine.customer_name}</p>
                    <span className="inline-block mt-2 px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-700">
                      {machine.fabric_type.toUpperCase()}
                    </span>
                  </div>
                  {hasBeam && remainingPercentage < 20 && (
                    <AlertTriangle className="w-6 h-6 text-red-500" />
                  )}
                </div>

                {hasBeam ? (
                  <div className="space-y-4">
                    {/* Beam Info */}
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs text-gray-600 mb-1">Current Beam</p>
                      <p className="font-mono font-semibold text-gray-900">{machine.beam_number}</p>
                    </div>

                    {/* Meter Progress */}
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-600">Meter Usage</span>
                        <span className={`font-semibold ${remainingPercentage < 20 ? 'text-red-600' : 'text-gray-900'}`}>
                          {usedPercentage}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                        <div
                          className={`h-full transition-all ${remainingPercentage < 20 ? 'bg-red-500' : 'bg-primary-500'
                            }`}
                          style={{ width: `${usedPercentage}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">
                        {machine.meters_used?.toFixed(0) || 0} / {machine.total_beam_meters} meters
                      </p>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-green-50 rounded-xl p-3">
                        <p className="text-xs text-gray-600">Remaining</p>
                        <p className="text-lg font-bold text-green-700">
                          {machine.remaining_meters?.toFixed(0) || 0}m
                        </p>
                      </div>
                      <div className="bg-red-50 rounded-xl p-3">
                        <p className="text-xs text-gray-600">Damage Rate</p>
                        <p className="text-lg font-bold text-red-700">{damageRate}%</p>
                      </div>
                    </div>

                    {/* View Details Button */}
                    <Link
                      to={`/beams/${machine.beam_id}`}
                      className="block w-full text-center bg-primary-50 hover:bg-primary-100 text-primary-700 font-semibold py-2 rounded-xl transition"
                    >
                      View Beam Details →
                    </Link>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-400 text-sm">No active beam</p>
                    {isAdmin && (
                      <Link
                        to="/add-beam"
                        className="inline-block mt-3 px-4 py-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition text-sm"
                      >
                        + Start Beam
                      </Link>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Workshops;