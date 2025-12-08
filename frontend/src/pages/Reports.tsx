import { useState } from 'react';
import { reportAPI } from '../services/api';
import { FileText, Download, Calendar } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
      'Workshop', 'Machine No', 'Beam Number', 'Product Type',
      'Status', 'Customer', 'Start Date', 'End Date', 'Total Meters', 'Total Pieces',
      'Damaged Pieces', 'Total Amount'
    ];

    const csvData = reportData.map(beam => [
      beam.workshop,
      beam.machine_number || 'N/A',
      beam.beam_number,
      beam.fabric_type,
      beam.status === 'completed' || beam.end_date ? 'Completed' : 'Running',
      beam.customer,
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

  const exportToPDF = () => {
    if (reportData.length === 0) return;

    const doc = new jsPDF('landscape');

    // Title
    doc.setFontSize(18);
    doc.setTextColor(40, 40, 40);
    doc.text('Powerloom Production Report', 14, 22);

    // Date range
    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    doc.text(`Period: ${dateRange.start_date} to ${dateRange.end_date}`, 14, 30);

    // Table data
    const tableData = reportData.map(beam => [
      beam.workshop,
      beam.machine_number || 'N/A',
      beam.beam_number,
      beam.fabric_type.toUpperCase(),
      beam.customer,
      beam.start_date,
      beam.end_date || 'Running',
      `${beam.total_beam_meters}m`,
      beam.total_pieces.toString(),
      beam.total_damaged.toString(),
      `Rs.${parseFloat(beam.total_amount).toLocaleString()}`
    ]);

    // Add table
    autoTable(doc, {
      head: [['Workshop', 'Machine', 'Beam No', 'Type', 'Customer', 'Start', 'End', 'Meters', 'Good', 'Damaged', 'Amount']],
      body: tableData,
      startY: 38,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [20, 184, 166], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      foot: [['', '', '', 'TOTAL', '', '', '', '', totals?.totalPieces.toString() || '0', totals?.totalDamaged.toString() || '0', `Rs.${totals?.totalAmount.toLocaleString() || '0'}`]],
      footStyles: { fillColor: [20, 184, 166], textColor: 255, fontStyle: 'bold' },
    });

    // Save
    doc.save(`powerloom_report_${dateRange.start_date}_to_${dateRange.end_date}.pdf`);
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
        <h1 className="text-xl md:text-3xl font-bold text-gray-900 dark:text-white">Reports</h1>
        <p className="text-xs text-gray-600 dark:text-gray-400 hidden sm:block">Generate and export production reports</p>
      </div>

      {/* Date Range Filter */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-soft">
        <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2 text-gray-900 dark:text-white">
          <Calendar className="w-5 h-5" />
          <span>Select Date Range</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Start Date</label>
            <input
              type="date"
              value={dateRange.start_date}
              onChange={(e) => setDateRange({ ...dateRange, start_date: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">End Date</label>
            <input
              type="date"
              value={dateRange.end_date}
              onChange={(e) => setDateRange({ ...dateRange, end_date: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
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
            className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition"
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
            className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition"
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
            className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition"
          >
            Last 3 Months
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {totals && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-soft">
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Beams</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{reportData.length}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-soft">
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Good Pieces</p>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">{totals.totalPieces}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-soft">
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Damaged</p>
            <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-2">{totals.totalDamaged}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {((totals.totalDamaged / (totals.totalPieces + totals.totalDamaged)) * 100).toFixed(1)}% damage rate
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-soft">
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Amount</p>
            <p className="text-3xl font-bold text-primary-600 dark:text-primary-400 mt-2">₹{totals.totalAmount.toLocaleString()}</p>
          </div>
        </div>
      )}

      {/* Report Data Table */}
      {reportData.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-soft">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Beam Details Report</h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={exportToPDF}
                className="flex items-center space-x-2 px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition"
              >
                <Download className="w-4 h-4" />
                <span>Export PDF</span>
              </button>
              <button
                onClick={exportToCSV}
                className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600 transition"
              >
                <Download className="w-4 h-4" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200 dark:border-gray-600">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Workshop</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Machine</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Beam No</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Type</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Status</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Meters</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Good</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Damaged</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Amount</th>
                </tr>
              </thead>
              <tbody>
                {reportData.map((beam, idx) => (
                  <tr key={idx} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="py-3 px-4 text-gray-700 dark:text-gray-300">{beam.workshop}</td>
                    <td className="py-3 px-4 font-semibold text-gray-900 dark:text-white">{beam.machine_number || 'N/A'}</td>
                    <td className="py-3 px-4 font-mono font-semibold text-gray-900 dark:text-white">{beam.beam_number}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs rounded-full font-semibold">
                        {beam.fabric_type.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 text-xs rounded-full font-semibold ${beam.status === 'completed' || beam.end_date
                        ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                        : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300'
                        }`}>
                        {beam.status === 'completed' || beam.end_date ? 'Completed' : 'Running'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-gray-900 dark:text-white">{beam.total_beam_meters}m</td>
                    <td className="py-3 px-4 text-right font-semibold text-green-600 dark:text-green-400">{beam.total_pieces}</td>
                    <td className="py-3 px-4 text-right font-semibold text-red-600 dark:text-red-400">{beam.total_damaged}</td>
                    <td className="py-3 px-4 text-right font-semibold text-primary-600 dark:text-primary-400">
                      ₹{parseFloat(beam.total_amount).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700">
                  <td colSpan={6} className="py-3 px-4 font-bold text-gray-900 dark:text-white">TOTAL</td>
                  <td className="py-3 px-4 text-right font-bold text-green-600 dark:text-green-400">{totals.totalPieces}</td>
                  <td className="py-3 px-4 text-right font-bold text-red-600 dark:text-red-400">{totals.totalDamaged}</td>
                  <td className="py-3 px-4 text-right font-bold text-primary-600 dark:text-primary-400">
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
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 shadow-soft text-center">
          <FileText className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Data Found</h3>
          <p className="text-gray-600 dark:text-gray-400">
            Select a date range and click "Generate Report" to view production data
          </p>
        </div>
      )}
    </div>
  );
};

export default Reports;