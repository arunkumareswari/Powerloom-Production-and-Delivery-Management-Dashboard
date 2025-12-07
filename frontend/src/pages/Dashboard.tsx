import { useEffect, useState } from 'react';
import { dashboardAPI } from '../services/api';
import { TrendingUp, AlertCircle, Package, DollarSign } from 'lucide-react';
import ProductionTrendChart from '../components/charts/ProductionTrendChart';
import WorkshopStackedChart from '../components/charts/WorkshopStackedChart';
import QualityChart from '../components/charts/QualityChart';

interface DashboardData {
  active_beams: number;
  total_pieces_this_month: number;
  total_damaged_this_month: number;
  pending_amount_this_month: number;
  workshop_production: any[];
  customer_summary: any[];
}

const Dashboard = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'all' | 'month' | 'custom'>('month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [fabricType, setFabricType] = useState<string>('all');

  useEffect(() => {
    const fetchData = async () => {
      try {
        let params: any = {};
        if (filterType === 'custom' && startDate && endDate) {
          params.start_date = startDate;
          params.end_date = endDate;
        } else if (filterType === 'all') {
          params.start_date = '2000-01-01';
          params.end_date = '2099-12-31';
        }
        // filterType === 'month' uses default (no params)

        // Add fabric filter
        if (fabricType !== 'all') {
          params.fabric_type = fabricType;
        }

        const overview = await dashboardAPI.getOverview(params);
        console.log('Dashboard API Response:', overview.data);
        setData(overview.data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setLoading(false);
      }
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterType, startDate, endDate, fabricType]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Header with Filter */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Overview of production data</p>
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-3">
          {/* Date Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="month">This Month</option>
            <option value="all">All Time</option>
            <option value="custom">Custom Range</option>
          </select>

          {filterType === 'custom' && (
            <>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Start Date"
              />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="End Date"
              />
            </>
          )}

          {/* Fabric Filter */}
          <select
            value={fabricType}
            onChange={(e) => setFabricType(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All Fabrics</option>
            <option value="vesti">Veshti</option>
            <option value="saree">Saree</option>
          </select>
        </div>
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
              <p className="text-3xl font-bold text-primary-600 mt-2">₹{(data.pending_amount_this_month || 0).toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-primary-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Modern Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ProductionTrendChart
          filterType={filterType}
          fabricType={fabricType}
          startDate={startDate}
          endDate={endDate}
        />
        <WorkshopStackedChart
          filterType={filterType}
          fabricType={fabricType}
          startDate={startDate}
          endDate={endDate}
        />
      </div>

      {/* Second Row - Quality Chart (Full Width) */}
      <div className="grid grid-cols-1 gap-6">
        <QualityChart
          filterType={filterType}
          fabricType={fabricType}
          startDate={startDate}
          endDate={endDate}
        />
      </div>
    </div>
  );
};

export default Dashboard;