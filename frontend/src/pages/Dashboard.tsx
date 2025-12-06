import { useEffect, useState } from 'react';
import { dashboardAPI, beamAPI } from '../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, AlertCircle, Package, DollarSign } from 'lucide-react';
import { Link } from 'react-router-dom';

interface DashboardData {
  active_beams: number;
  total_pieces_this_month: number;
  total_damaged_this_month: number;
  pending_amount_this_month: number;
  workshop_production: any[];
  customer_summary: any[];
}

const Dashboard = ({ isAdmin }: { isAdmin: boolean }) => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [activeBeams, setActiveBeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [overview, beams] = await Promise.all([
        dashboardAPI.getOverview(),
        beamAPI.getAll('active')
      ]);
      setData(overview.data);
      setActiveBeams(beams.data.beams);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (!data) return null;

  const damagePercentage = data.total_pieces_this_month > 0 
    ? (data.total_damaged_this_month / (data.total_pieces_this_month + data.total_damaged_this_month) * 100).toFixed(1)
    : '0';

  const pieData = [
    { name: 'Good Pieces', value: data.total_pieces_this_month, color: '#10b981' },
    { name: 'Damaged', value: data.total_damaged_this_month, color: '#ef4444' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Overview of this month's production</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-soft">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Beams</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{data.active_beams}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-soft">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Good Pieces</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{data.total_pieces_this_month}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-soft">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Damaged Pieces</p>
              <p className="text-3xl font-bold text-red-600 mt-2">{data.total_damaged_this_month}</p>
              <p className="text-xs text-gray-500 mt-1">{damagePercentage}% damage rate</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-soft">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Amount</p>
              <p className="text-3xl font-bold text-primary-600 mt-2">₹{data.pending_amount_this_month.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-primary-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Workshop Production Chart */}
        <div className="bg-white rounded-2xl p-6 shadow-soft">
          <h3 className="text-lg font-semibold mb-4">Workshop-wise Production</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.workshop_production}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="workshop_name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="total_pieces" fill="#0ea5e9" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Damage Pie Chart */}
        <div className="bg-white rounded-2xl p-6 shadow-soft">
          <h3 className="text-lg font-semibold mb-4">Good vs Damaged Pieces</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Customer Summary Table */}
      <div className="bg-white rounded-2xl p-6 shadow-soft">
        <h3 className="text-lg font-semibold mb-4">Customer-wise Summary</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Customer</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Total Pieces</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-700">Total Amount</th>
              </tr>
            </thead>
            <tbody>
              {data.customer_summary.map((customer, idx) => (
                <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">{customer.customer_name}</td>
                  <td className="py-3 px-4 text-right">{customer.total_pieces}</td>
                  <td className="py-3 px-4 text-right font-semibold">₹{customer.total_amount.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Active Beams List */}
      <div className="bg-white rounded-2xl p-6 shadow-soft">
        <h3 className="text-lg font-semibold mb-4">Active Beams</h3>
        <div className="space-y-4">
          {activeBeams.map((beam) => {
            const usedPercentage = (beam.total_meters_used / beam.total_beam_meters * 100).toFixed(1);
            const remainingPercentage = 100 - parseFloat(usedPercentage);
            
            return (
              <Link 
                key={beam.id} 
                to={`/beams/${beam.id}`}
                className="block border border-gray-200 rounded-xl p-4 hover:border-primary-300 hover:shadow-md transition"
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-gray-900">{beam.beam_number}</h4>
                    <p className="text-sm text-gray-600">
                      {beam.workshop_name} - Machine {beam.machine_number} • {beam.customer_name}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">{beam.total_good_pieces}</p>
                    <p className="text-xs text-gray-500">pieces produced</p>
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>{beam.total_meters_used.toFixed(0)} / {beam.total_beam_meters} meters</span>
                    <span className={remainingPercentage < 20 ? 'text-red-600 font-semibold' : ''}>
                      {remainingPercentage.toFixed(0)}% remaining
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all ${
                        remainingPercentage < 20 ? 'bg-red-500' : 'bg-primary-500'
                      }`}
                      style={{ width: `${usedPercentage}%` }}
                    ></div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;