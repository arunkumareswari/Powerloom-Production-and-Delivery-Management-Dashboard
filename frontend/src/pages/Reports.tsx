import { useState } from 'react';
import { reportAPI } from '../services/api';
import { FileText, Download, Calendar } from 'lucide-react';
import { format } from 'date-fns';

const Reports = () => {
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState({
    start_date: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
  });

  const fetchReport = async () => {
    setLoading(true);
    try {
      const response = await reportAPI.getBeamReport(dateRange.start_date, dateRange.end_date);
      setReportData(response.data.beams);
    } catch (error) {
      console.error('Error fetching report:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (reportData.length === 0) return;

    const headers = [
      'Beam Number', 'Workshop', 'Customer', 'Product Type',
      'Start Date', 'End Date', 'Total Meters', 'Total Pieces',
      'Damaged Pieces', 'Total Amount'
    ];

    const csvData = reportData.map(beam => [
      beam.beam_number,
      beam.workshop,
      beam.customer,
      beam.fabric_type,
      beam.start_date,
      beam.end_date || 'Active',
      beam.total_beam_meters,
      beam.total_pieces,
      beam.total_damaged,
      beam.total_amount
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `powerloom_report_${dateRange.start_date}_to_${dateRange.end_date}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const calculateTotals = () => {
    return reportData.reduce((acc, beam) => ({
      totalPieces: acc.totalPieces + beam.total_pieces,
      totalDamaged: acc.totalDamaged + beam.total_damaged,
      totalAmount: acc.totalAmount + parseFloat(beam.total_amount),
    }), { totalPieces: 0, totalDamaged: 0, totalAmount: 0 });
  };

  const totals = reportData.length > 0 ? calculateTotals() : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
        <p className="text-gray-600 mt-1">Generate and export production reports</p>
      </div>

      {/* Date Range Filter */}
      <div className="bg-white rounded-2xl p-6 shadow-soft">
        <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
          <Calendar className="w-5 h-5" />
          <span>Select Date Range</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
            <input
              type="date"
              value={dateRange.start_date}
              onChange={(e) => setDateRange({ ...dateRange, start_date: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
            <input
              type="date"
              value={dateRange.end_date}
              onChange={(e) => setDateRange({ ...dateRange, end_date: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={fetchReport}
              disabled={loading}
              className="w-full px-6 py-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition font-semibold disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              <FileText className="w-5 h-5" />
              <span>{loading ? 'Loading...' : 'Generate Report'}</span>
            </button>
          </div>
        </div>

        {/* Quick Filters */}
        <div className="flex space-x-3 mt-4">
          <button
            onClick={() => {
              const today = new Date();
              setDateRange({
                start_date: new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0],
                end_date: today.toISOString().split('T')[0]
              });
            }}
            className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition"
          >
            This Month
          </button>
          <button
            onClick={() => {
              const today = new Date();
              const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
              setDateRange({
                start_date: lastMonth.toISOString().split('T')[0],
                end_date: new Date(today.getFullYear(), today.getMonth(), 0).toISOString().split('T')[0]
              });
            }}
            className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition"
          >
            Last Month
          </button>
          <button
            onClick={() => {
              const today = new Date();
              const threeMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 3, 1);
              setDateRange({
                start_date: threeMonthsAgo.toISOString().split('T')[0],
                end_date: today.toISOString().split('T')[0]
              });
            }}
            className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition"
          >
            Last 3 Months
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {totals && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-soft">
            <p className="text-sm text-gray-600">Total Beams</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{reportData.length}</p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-soft">
            <p className="text-sm text-gray-600">Total Good Pieces</p>
            <p className="text-3xl font-bold text-green-600 mt-2">{totals.totalPieces}</p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-soft">
            <p className="text-sm text-gray-600">Total Damaged</p>
            <p className="text-3xl font-bold text-red-600 mt-2">{totals.totalDamaged}</p>
            <p className="text-xs text-gray-500 mt-1">
              {((totals.totalDamaged / (totals.totalPieces + totals.totalDamaged)) * 100).toFixed(1)}% damage rate
            </p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-soft">
            <p className="text-sm text-gray-600">Total Amount</p>
            <p className="text-3xl font-bold text-primary-600 mt-2">₹{totals.totalAmount.toLocaleString()}</p>
          </div>
        </div>
      )}

      {/* Report Data Table */}
      {reportData.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-soft">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold">Beam Details Report</h3>
            <button
              onClick={exportToCSV}
              className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600 transition"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Machine No</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Beam Number</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Workshop</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Customer</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Product Type</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Total Meters</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Good Pieces</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Damaged</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Amount</th>
                </tr>
              </thead>
              <tbody>
                {reportData.map((beam, idx) => (
                  <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-semibold">{beam.machine_number || 'N/A'}</td>
                    <td className="py-3 px-4 font-mono font-semibold">{beam.beam_number}</td>
                    <td className="py-3 px-4">{beam.workshop}</td>
                    <td className="py-3 px-4">{beam.customer}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-semibold">
                        {beam.fabric_type.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 text-xs rounded-full font-semibold ${beam.status === 'completed' || beam.end_date
                        ? 'bg-green-100 text-green-700'
                        : 'bg-yellow-100 text-yellow-700'
                        }`}>
                        {beam.status === 'completed' || beam.end_date ? 'Completed' : 'Running'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">{beam.total_beam_meters}m</td>
                    <td className="py-3 px-4 text-right font-semibold text-green-600">{beam.total_pieces}</td>
                    <td className="py-3 px-4 text-right font-semibold text-red-600">{beam.total_damaged}</td>
                    <td className="py-3 px-4 text-right font-semibold text-primary-600">
                      ₹{parseFloat(beam.total_amount).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-300 bg-gray-50">
                  <td colSpan={7} className="py-3 px-4 font-bold text-gray-900">TOTAL</td>
                  <td className="py-3 px-4 text-right font-bold text-green-600">{totals.totalPieces}</td>
                  <td className="py-3 px-4 text-right font-bold text-red-600">{totals.totalDamaged}</td>
                  <td className="py-3 px-4 text-right font-bold text-primary-600">
                    ₹{totals.totalAmount.toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && reportData.length === 0 && (
        <div className="bg-white rounded-2xl p-12 shadow-soft text-center">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Data Found</h3>
          <p className="text-gray-600">
            Select a date range and click "Generate Report" to view production data
          </p>
        </div>
      )}
    </div>
  );
};

export default Reports;