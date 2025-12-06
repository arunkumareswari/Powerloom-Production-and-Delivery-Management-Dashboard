import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Archive, Calendar, Package, User, Building2 } from 'lucide-react';
import api from '../services/api';

const ArchivedBeams = () => {
    const navigate = useNavigate();
    const [beams, setBeams] = useState<any[]>([]);
    const [workshops, setWorkshops] = useState<any[]>([]);
    const [selectedWorkshop, setSelectedWorkshop] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchWorkshops();
        fetchArchivedBeams();
    }, []);

    const fetchWorkshops = async () => {
        try {
            const response = await api.get('/workshops');
            setWorkshops(response.data.workshops);
            if (response.data.workshops.length > 0) {
                setSelectedWorkshop(response.data.workshops[0].id);
            }
        } catch (error) {
            console.error('Error fetching workshops:', error);
        }
    };

    const fetchArchivedBeams = async () => {
        try {
            const response = await api.get('/beams?status=completed');
            setBeams(response.data.beams);
        } catch (error) {
            console.error('Error fetching archived beams:', error);
        } finally {
            setLoading(false);
        }
    };

    const getBeamsForWorkshop = (workshopId: number) => {
        return beams.filter(beam => beam.workshop_id === workshopId);
    };

    if (loading) {
        return <div className="flex items-center justify-center h-64"><div className="text-lg text-gray-600">Loading archived beams...</div></div>;
    }

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-center space-x-3">
                <Archive className="w-8 h-8 text-gray-600" />
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Archived Beams</h1>
                    <p className="text-gray-600 mt-1">View all completed beams by workshop</p>
                </div>
            </div>

            {/* Workshop Tabs */}
            <div className="flex space-x-2 border-b-2 border-gray-200">
                {workshops.map((workshop) => {
                    const workshopBeams = getBeamsForWorkshop(workshop.id);
                    return (
                        <button
                            key={workshop.id}
                            onClick={() => setSelectedWorkshop(workshop.id)}
                            className={`px-6 py-3 font-semibold transition-all ${selectedWorkshop === workshop.id
                                    ? 'text-primary-600 border-b-4 border-primary-500 -mb-0.5'
                                    : 'text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            <Building2 className="w-4 h-4 inline mr-2" />
                            {workshop.name}
                            <span className="ml-2 text-sm bg-gray-100 px-2 py-1 rounded-full">
                                {workshopBeams.length} beams
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Archived Beams for Selected Workshop */}
            {selectedWorkshop && (
                <div className="bg-white rounded-2xl shadow-soft overflow-hidden">
                    {getBeamsForWorkshop(selectedWorkshop).length === 0 ? (
                        <div className="p-12 text-center">
                            <Archive className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Archived Beams</h3>
                            <p className="text-gray-500">No completed beams in this workshop</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b-2 border-gray-200">
                                    <tr>
                                        <th className="text-left py-4 px-6 font-semibold text-gray-700">Beam Number</th>
                                        <th className="text-left py-4 px-6 font-semibold text-gray-700">Customer</th>
                                        <th className="text-left py-4 px-6 font-semibold text-gray-700">Machine</th>
                                        <th className="text-left py-4 px-6 font-semibold text-gray-700">Total Meters</th>
                                        <th className="text-left py-4 px-6 font-semibold text-gray-700">Start Date</th>
                                        <th className="text-left py-4 px-6 font-semibold text-gray-700">End Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {getBeamsForWorkshop(selectedWorkshop).map((beam) => (
                                        <tr
                                            key={beam.id}
                                            onClick={() => navigate(`/beams/${beam.id}`)}
                                            className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition"
                                        >
                                            <td className="py-4 px-6">
                                                <div className="flex items-center space-x-2">
                                                    <Package className="w-4 h-4 text-gray-400" />
                                                    <span className="font-semibold text-gray-900">{beam.beam_number}</span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <div className="flex items-center space-x-2">
                                                    <User className="w-4 h-4 text-gray-400" />
                                                    <span className="text-gray-700">{beam.customer_name}</span>
                                                </div>
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
                                                <div className="flex items-center space-x-2">
                                                    <Calendar className="w-4 h-4 text-gray-400" />
                                                    <span className="text-gray-700">{beam.start_date}</span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <div className="flex items-center space-x-2">
                                                    <Calendar className="w-4 h-4 text-gray-400" />
                                                    <span className="text-gray-700">{beam.end_date || '-'}</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ArchivedBeams;
