import { useEffect, useState } from 'react';
import { workshopAPI } from '../services/api';
import { Factory, AlertTriangle, Archive, ArrowUp, ArrowDown, Trash2 } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import ConfirmModal from '../components/ConfirmModal';
import { formatDisplayDate } from '../utils/dateUtils';

const Workshops = ({ isAdmin }: { isAdmin: boolean }) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [workshops, setWorkshops] = useState<any[]>([]);
  const [selectedWorkshop, setSelectedWorkshop] = useState<string | null>(null);
  const [machines, setMachines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showArchive, setShowArchive] = useState(() => searchParams.get('view') === 'archive');
  const [archivedBeams, setArchivedBeams] = useState<any[]>([]);

  // Filter state
  const [filters, setFilters] = useState({
    customer: '',
    workshop: '',
    machine: '',
    fabric: '',
    startDate: '',
    endDate: ''
  });

  // Sort state
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({
    key: 'start_date',
    direction: 'desc'
  });

  // Modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => { } });

  useEffect(() => {
    fetchWorkshops();
    fetchArchivedBeams();
  }, []);

  // Check URL params for Archive view
  useEffect(() => {
    const viewParam = searchParams.get('view');
    if (viewParam === 'archive') {
      setShowArchive(true);
    } else {
      setShowArchive(false);
    }
  }, [searchParams]);

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

  const selectWorkshop = async (workshopId: string) => {
    setShowArchive(false);
    setSelectedWorkshop(workshopId);
    try {
      const response = await workshopAPI.getMachines(workshopId);  // Use string ID
      setMachines(response.data.machines);
    } catch (error) {
      console.error('Error fetching machines:', error);
    }
  };

  // Get unique values for filter dropdowns
  const uniqueCustomers = [...new Set(archivedBeams.map(b => b.customer_name))].sort();
  const uniqueWorkshops = [...new Set(archivedBeams.map(b => b.workshop_name))].sort();
  const uniqueMachines = [...new Set(archivedBeams.map(b => b.machine_number))].sort((a, b) => a - b);

  // Filter beams
  const filteredBeams = archivedBeams.filter(beam => {
    if (filters.customer && beam.customer_name !== filters.customer) return false;
    if (filters.workshop && beam.workshop_name !== filters.workshop) return false;
    if (filters.machine && beam.machine_number.toString() !== filters.machine) return false;
    if (filters.fabric && beam.fabric_type !== filters.fabric) return false;
    if (filters.startDate && beam.start_date < filters.startDate) return false;
    if (filters.endDate && beam.end_date && beam.end_date > filters.endDate) return false;
    return true;
  });

  // Sort beams
  const sortedBeams = [...filteredBeams].sort((a, b) => {
    let aValue = a[sortConfig.key];
    let bValue = b[sortConfig.key];

    // Handle null/undefined values
    if (aValue === null || aValue === undefined) aValue = '';
    if (bValue === null || bValue === undefined) bValue = '';

    if (aValue < bValue) {
      return sortConfig.direction === 'asc' ? -1 : 1;
    }
    if (aValue > bValue) {
      return sortConfig.direction === 'asc' ? 1 : -1;
    }
    return 0;
  });

  // Handle sort
  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Clear filters
  const clearFilters = () => {
    setFilters({
      customer: '',
      workshop: '',
      machine: '',
      fabric: '',
      startDate: '',
      endDate: ''
    });
  };

  // Handle beam deletion
  const handleDeleteBeam = async (beamId: string, beamNumber: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Beam',
      message: `Are you sure you want to delete beam "${beamNumber}"? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          await api.delete(`/beams/${beamId}`);
          // Refresh machines for current workshop
          if (selectedWorkshop) {
            const response = await workshopAPI.getMachines(selectedWorkshop);
            setMachines(response.data.machines);
          }
        } catch (error) {
          console.error('Error deleting beam:', error);
          alert('Failed to delete beam. Please try again.');
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

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header with Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-3xl font-bold text-gray-900 dark:text-white">Workshops</h1>
          <p className="text-xs text-gray-600 dark:text-gray-400 hidden sm:block">View machines and their status</p>
        </div>

        {/* Present/Archive Toggle */}
        <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
          <button
            onClick={() => {
              setShowArchive(false);
              setSearchParams({});
            }}
            className={`px-4 py-1.5 text-sm rounded-lg font-semibold transition-all ${!showArchive
              ? 'bg-white dark:bg-gray-800 text-primary-600 shadow-sm'
              : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
          >
            Present
          </button>
          <button
            onClick={() => {
              setShowArchive(true);
              setSearchParams({ view: 'archive' });
            }}
            className={`px-4 py-1.5 text-sm rounded-lg font-semibold transition-all flex items-center ${showArchive
              ? 'bg-white dark:bg-gray-800 text-primary-600 shadow-sm'
              : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }`}
          >
            <Archive className="w-3.5 h-3.5 mr-1.5" />
            Archive
          </button>
        </div>
      </div>

      {/* Workshop Tabs - Only show when in Present mode */}
      {!showArchive && (
        <>
          {/* Mobile Dropdown */}
          <div className="md:hidden mb-4">
            <select
              value={selectedWorkshop || ''}
              onChange={(e) => selectWorkshop(e.target.value)}  // Keep as string
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none font-semibold"
            >
              {workshops.map((workshop) => (
                <option key={workshop.id} value={workshop.id}>
                  {workshop.name} ({workshop.actual_machine_count} machines)
                </option>
              ))}
            </select>
          </div>

          {/* Desktop Tabs */}
          <div className="hidden md:flex space-x-4 border-b border-gray-200 dark:border-gray-700">
            {workshops.map((workshop) => (
              <button
                key={workshop.id}
                onClick={() => selectWorkshop(workshop.id)}
                className={`px-6 py-3 font-semibold transition border-b-2 ${selectedWorkshop === workshop.id
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                  }`}
              >
                <div className="flex items-center space-x-2">
                  <Factory className="w-5 h-5" />
                  <span>{workshop.name}</span>
                  <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                    {workshop.actual_machine_count} machines
                  </span>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Archived Beams Table */}
      {showArchive ? (
        <>
          {/* Filter Section */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-soft mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-3">
              {/* Customer Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Customer</label>
                <select
                  value={filters.customer}
                  onChange={(e) => setFilters({ ...filters, customer: e.target.value })}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                >
                  <option value="">All Customers</option>
                  {uniqueCustomers.map(customer => (
                    <option key={customer} value={customer}>{customer}</option>
                  ))}
                </select>
              </div>

              {/* Workshop Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Workshop</label>
                <select
                  value={filters.workshop}
                  onChange={(e) => setFilters({ ...filters, workshop: e.target.value })}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                >
                  <option value="">All Workshops</option>
                  {uniqueWorkshops.map(workshop => (
                    <option key={workshop} value={workshop}>{workshop}</option>
                  ))}
                </select>
              </div>

              {/* Machine Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Machine</label>
                <select
                  value={filters.machine}
                  onChange={(e) => setFilters({ ...filters, machine: e.target.value })}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                >
                  <option value="">All Machines</option>
                  {uniqueMachines.map(machine => (
                    <option key={machine} value={machine.toString()}>Machine {machine}</option>
                  ))}
                </select>
              </div>

              {/* Fabric Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Product</label>
                <select
                  value={filters.fabric}
                  onChange={(e) => setFilters({ ...filters, fabric: e.target.value })}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                >
                  <option value=""> All Product</option>
                  <option value="veshti">Veshti</option>
                  <option value="saree">Saree</option>
                </select>
              </div>

              {/* Start Date Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                />
              </div>

              {/* End Date Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">End Date</label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                />
              </div>
            </div>

            {/* Clear Filters Button */}
            <button
              onClick={clearFilters}
              className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition font-medium"
            >
              Clear Filters
            </button>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-soft overflow-hidden">
            {sortedBeams.length === 0 ? (
              <div className="p-12 text-center">
                <Archive className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">No Archived Beams</h3>
                <p className="text-gray-500 dark:text-gray-400">
                  {archivedBeams.length === 0 ? 'Completed beams will appear here' : 'No beams match the selected filters'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700 border-b-2 border-gray-200 dark:border-gray-600">
                    <tr>
                      <th
                        onClick={() => handleSort('beam_number')}
                        className="text-left py-4 px-6 font-semibold text-gray-700 dark:text-gray-200 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition"
                      >
                        <div className="flex items-center space-x-2">
                          <span>Beam Number</span>
                          {sortConfig.key === 'beam_number' && (
                            sortConfig.direction === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                          )}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSort('workshop_name')}
                        className="text-left py-4 px-6 font-semibold text-gray-700 dark:text-gray-200 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition"
                      >
                        <div className="flex items-center space-x-2">
                          <span>Workshop</span>
                          {sortConfig.key === 'workshop_name' && (
                            sortConfig.direction === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                          )}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSort('customer_name')}
                        className="text-left py-4 px-6 font-semibold text-gray-700 dark:text-gray-200 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition"
                      >
                        <div className="flex items-center space-x-2">
                          <span>Customer</span>
                          {sortConfig.key === 'customer_name' && (
                            sortConfig.direction === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                          )}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSort('machine_number')}
                        className="text-left py-4 px-6 font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 transition"
                      >
                        <div className="flex items-center space-x-2">
                          <span>Machine</span>
                          {sortConfig.key === 'machine_number' && (
                            sortConfig.direction === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                          )}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSort('total_beam_meters')}
                        className="text-left py-4 px-6 font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 transition"
                      >
                        <div className="flex items-center space-x-2">
                          <span>Total Meters</span>
                          {sortConfig.key === 'total_beam_meters' && (
                            sortConfig.direction === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                          )}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSort('start_date')}
                        className="text-left py-4 px-6 font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 transition"
                      >
                        <div className="flex items-center space-x-2">
                          <span>Start Date</span>
                          {sortConfig.key === 'start_date' && (
                            sortConfig.direction === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                          )}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSort('end_date')}
                        className="text-left py-4 px-6 font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 transition"
                      >
                        <div className="flex items-center space-x-2">
                          <span>End Date</span>
                          {sortConfig.key === 'end_date' && (
                            sortConfig.direction === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                          )}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSort('fabric_type')}
                        className="text-left py-4 px-6 font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 transition"
                      >
                        <div className="flex items-center space-x-2">
                          <span>Fabric</span>
                          {sortConfig.key === 'fabric_type' && (
                            sortConfig.direction === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                          )}
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedBeams.map((beam) => (
                      <tr
                        key={beam.id}
                        onClick={() => navigate(`/beams/${beam.id}`)}
                        className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition"
                      >
                        <td className="py-4 px-6">
                          <span className="font-semibold text-gray-900 dark:text-white">{beam.beam_number}</span>
                        </td>
                        <td className="py-4 px-6">
                          <span className="text-gray-700 dark:text-gray-300">{beam.workshop_name}</span>
                        </td>
                        <td className="py-4 px-6">
                          <span className="text-gray-700 dark:text-gray-300">{beam.customer_name}</span>
                        </td>
                        <td className="py-4 px-6">
                          <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-sm rounded-full font-semibold">
                            Machine {beam.machine_number}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <span className="text-gray-700 dark:text-gray-300 font-medium">{beam.total_beam_meters}m</span>
                        </td>
                        <td className="py-4 px-6">
                          <span className="text-gray-700 dark:text-gray-300">{formatDisplayDate(beam.start_date)}</span>
                        </td>
                        <td className="py-4 px-6">
                          <span className="text-gray-700 dark:text-gray-300">{formatDisplayDate(beam.end_date)}</span>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`px-3 py-1 text-sm rounded-full font-semibold ${beam.fabric_type === 'veshti'
                            ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                            : 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300'
                            }`}>
                            {beam.fabric_type?.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
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
            const hasBeam = machine.beam_id && machine.beam_id !== null && machine.beam_id !== '';

            return (
              <div
                key={`machine-${selectedWorkshop}-${machine.id}-${index}`}
                className={`bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-soft border-2 transition ${hasBeam ? 'border-primary-200 dark:border-primary-700 hover:border-primary-300 dark:hover:border-primary-600' : 'border-gray-200 dark:border-gray-700'
                  }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                      Machine {machine.machine_number}
                    </h3>
                    {hasBeam && (
                      <>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{machine.customer_name}</p>
                        <span className="inline-block mt-2 px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                          {machine.fabric_type.toUpperCase()}
                        </span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    {hasBeam && remainingPercentage < 20 && (
                      <AlertTriangle className="w-6 h-6 text-red-500" />
                    )}
                    {isAdmin && hasBeam && (
                      <button
                        onClick={() => handleDeleteBeam(machine.beam_id, machine.beam_number)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Delete Beam"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>

                {hasBeam ? (
                  <div className="space-y-4">
                    {/* Beam Info */}
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-3">
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Current Beam</p>
                      <p className="font-mono font-semibold text-gray-900 dark:text-white">{machine.beam_number}</p>
                    </div>

                    {/* Meter Progress */}
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-600 dark:text-gray-400">Meter Usage</span>
                        <span className={`font-semibold ${remainingPercentage < 20 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                          {usedPercentage}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-4 overflow-hidden">
                        <div
                          className={`h-full transition-all ${remainingPercentage < 20 ? 'bg-red-500' : 'bg-primary-500'
                            }`}
                          style={{ width: `${usedPercentage}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {machine.meters_used?.toFixed(0) || 0} / {machine.total_beam_meters} meters
                      </p>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-green-50 dark:bg-green-900/30 rounded-xl p-3">
                        <p className="text-xs text-gray-600 dark:text-gray-400">Remaining</p>
                        <p className="text-lg font-bold text-green-700 dark:text-green-400">
                          {machine.remaining_meters?.toFixed(0) || 0}m
                        </p>
                      </div>
                      <div className="bg-red-50 dark:bg-red-900/30 rounded-xl p-3">
                        <p className="text-xs text-gray-600 dark:text-gray-400">Damage Rate</p>
                        <p className="text-lg font-bold text-red-700 dark:text-red-400">{damageRate}%</p>
                      </div>
                    </div>

                    {/* View Details Button */}
                    <Link
                      to={`/beams/${machine.beam_id}`}
                      className="block w-full text-center bg-primary-50 dark:bg-primary-900/30 hover:bg-primary-100 dark:hover:bg-primary-900/50 text-primary-700 dark:text-primary-300 font-semibold py-2 rounded-xl transition"
                    >
                      View Beam Details →
                    </Link>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-400 dark:text-gray-500 text-sm mb-3">No active beam</p>
                    {isAdmin && (
                      <Link
                        to="/add-beam"
                        className="inline-block px-6 py-2.5 bg-cyan-500 text-white rounded-xl hover:bg-cyan-600 transition font-medium"
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

export default Workshops;