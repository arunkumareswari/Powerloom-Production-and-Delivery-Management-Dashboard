import { useState, useEffect } from 'react';
import { reportAPI, workshopAPI } from '../services/api';
import { FileText, Download, Calendar } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatDisplayDate } from '../utils/dateUtils';

const Reports = ({ isAdmin }: { isAdmin: boolean }) => {
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState<'beam' | 'delivery'>('beam');
  const [reportData, setReportData] = useState<any[]>([]);
  const [deliveryData, setDeliveryData] = useState<any[]>([]);
  const [workshops, setWorkshops] = useState<any[]>([]);
  const [selectedWorkshop, setSelectedWorkshop] = useState<string>('');
  const [selectedProductType, setSelectedProductType] = useState<string>('');

  // Helper function for local date formatting (fixes timezone issues)
  const formatLocalDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const today = new Date();
  const [dateRange, setDateRange] = useState({
    start_date: formatLocalDate(new Date(today.getFullYear(), today.getMonth(), 1)),
    end_date: formatLocalDate(today),
  });

  useEffect(() => {
    fetchWorkshops();
  }, []);

  const fetchWorkshops = async () => {
    try {
      const response = await workshopAPI.getAll();
      setWorkshops(response.data.workshops);
    } catch (error) {
      console.error('Error fetching workshops:', error);
    }
  };

  const fetchReport = async () => {
    setLoading(true);
    try {
      if (reportType === 'beam') {
        const response = await reportAPI.getBeamReport(dateRange.start_date, dateRange.end_date);
        setReportData(response.data.beams);
        setDeliveryData([]);
      } else {
        const response = await reportAPI.getDeliveryReport(dateRange.start_date, dateRange.end_date);
        setDeliveryData(response.data.deliveries);
        setReportData([]);
      }
    } catch (error) {
      console.error('Error fetching report:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter data by selected workshop and product type
  const filteredData = reportData.filter(beam => {
    if (selectedWorkshop && beam.workshop !== selectedWorkshop) return false;
    if (selectedProductType && beam.fabric_type !== selectedProductType) return false;
    return true;
  });

  const filteredDeliveryData = deliveryData.filter(d => {
    if (selectedWorkshop && d.workshop !== selectedWorkshop) return false;
    if (selectedProductType && d.fabric_type !== selectedProductType) return false;
    return true;
  });

  const exportToCSV = () => {
    if (filteredData.length === 0) return;

    const headers = [
      'Workshop', 'Machine No', 'Beam Number', 'Product Type',
      'Status', 'Customer', 'Start Date', 'End Date', 'Total Meters', 'Total Pieces',
      'Damaged Pieces', 'Total Amount'
    ];

    const csvData = filteredData.map(beam => [
      beam.workshop,
      beam.machine_number || 'N/A',
      beam.beam_number,
      beam.fabric_type,
      beam.status === 'completed' || beam.end_date ? 'Completed' : 'Running',
      beam.customer,
      formatDisplayDate(beam.start_date),
      beam.end_date ? formatDisplayDate(beam.end_date) : 'Active',
      beam.total_beam_meters,
      beam.total_good,
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
    if (filteredData.length === 0) return;

    const doc = new jsPDF('landscape');

    // Title
    doc.setFontSize(18);
    doc.setTextColor(40, 40, 40);
    const title = selectedWorkshop
      ? `Powerloom Production Report - ${selectedWorkshop}`
      : 'Powerloom Production Report';
    doc.text(title, 14, 22);

    // Date range
    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    doc.text(`Period: ${formatDisplayDate(dateRange.start_date)} to ${formatDisplayDate(dateRange.end_date)}`, 14, 30);

    // Table data
    const tableData = filteredData.map(beam => [
      beam.workshop,
      beam.machine_number || 'N/A',
      beam.beam_number,
      beam.fabric_type.toUpperCase(),
      beam.customer,
      formatDisplayDate(beam.start_date),
      beam.end_date ? formatDisplayDate(beam.end_date) : 'Running',
      `${beam.total_beam_meters}m`,
      beam.total_good.toString(),
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
    return filteredData.reduce((acc, beam) => ({
      totalPieces: acc.totalPieces + (beam.total_good || 0),
      totalDamaged: acc.totalDamaged + beam.total_damaged,
      totalAmount: acc.totalAmount + parseFloat(beam.total_amount),
    }), { totalPieces: 0, totalDamaged: 0, totalAmount: 0 });
  };

  const totals = filteredData.length > 0 ? calculateTotals() : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl md:text-3xl font-bold text-gray-900 dark:text-white">Reports</h1>
          <p className="text-xs text-gray-600 dark:text-gray-400 hidden sm:block">Generate and export production reports</p>
        </div>
        <div className="flex space-x-1 sm:space-x-2 ml-auto">
          <button
            onClick={() => setReportType('beam')}
            className={`px-2 py-1.5 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-base font-semibold transition ${reportType === 'beam'
              ? 'bg-primary-500 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
          >
            <span className="hidden sm:inline">Beam Report</span>
            <span className="sm:hidden">Beam</span>
          </button>
          <button
            onClick={() => setReportType('delivery')}
            className={`px-2 py-1.5 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-base font-semibold transition ${reportType === 'delivery'
              ? 'bg-primary-500 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
          >
            <span className="hidden sm:inline">Delivery Report</span>
            <span className="sm:hidden">Delivery</span>
          </button>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-soft">
        <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2 text-gray-900 dark:text-white">
          <Calendar className="w-5 h-5" />
          <span>Select Date Range</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Workshop</label>
            <select
              value={selectedWorkshop}
              onChange={(e) => setSelectedWorkshop(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
            >
              <option value="">All Workshops</option>
              {workshops.map((w) => (
                <option key={w.id} value={w.name}>{w.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Product Type</label>
            <select
              value={selectedProductType}
              onChange={(e) => setSelectedProductType(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
            >
              <option value="">All Products</option>
              <option value="veshti">Veshti</option>
              <option value="saree">Saree</option>
            </select>
          </div>
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
                start_date: formatLocalDate(new Date(today.getFullYear(), today.getMonth(), 1)),
                end_date: formatLocalDate(today)
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
              const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
              setDateRange({
                start_date: formatLocalDate(lastMonth),
                end_date: formatLocalDate(lastMonthEnd)
              });
            }}
            className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition"
          >
            Last Month
          </button>
          <button
            onClick={() => {
              const today = new Date();
              const threeMonthsAgo = new Date(today.getTime() - (90 * 24 * 60 * 60 * 1000));
              setDateRange({
                start_date: formatLocalDate(threeMonthsAgo),
                end_date: formatLocalDate(today)
              });
            }}
            className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition"
          >
            Last 3 Months
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {reportType === 'beam' && totals && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-soft">
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Beams</p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{filteredData.length}</p>
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
      {reportType === 'beam' && filteredData.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-soft">
          <div className="flex items-center justify-between gap-2 mb-6">
            <h3 className="text-sm sm:text-lg font-semibold text-gray-900 dark:text-white whitespace-nowrap">Beam Details Report</h3>
            <div className="flex items-center space-x-1.5 sm:space-x-2">
              {isAdmin && (
                <>
                  <button
                    onClick={exportToPDF}
                    className="flex items-center space-x-1.5 px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-base bg-red-500 text-white rounded-lg sm:rounded-xl hover:bg-red-600 transition"
                  >
                    <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">Export PDF</span>
                    <span className="sm:hidden">PDF</span>
                  </button>
                  <button
                    onClick={exportToCSV}
                    className="flex items-center space-x-1.5 px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-base bg-green-500 text-white rounded-lg sm:rounded-xl hover:bg-green-600 transition"
                  >
                    <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">Export CSV</span>
                    <span className="sm:hidden">CSV</span>
                  </button>
                </>
              )}
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
                {filteredData.map((beam, idx) => (
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
                    <td className="py-3 px-4 text-right font-semibold text-green-600 dark:text-green-400">{beam.total_good}</td>
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

      {/* Delivery Report Table */}
      {reportType === 'delivery' && filteredDeliveryData.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-soft">
          <div className="flex items-center justify-between gap-2 mb-6">
            <h3 className="text-sm sm:text-lg font-semibold text-gray-900 dark:text-white whitespace-nowrap">Delivery Details Report</h3>
            <div className="flex items-center space-x-1.5 sm:space-x-2">
              {isAdmin && (
                <>
                  <button
                    onClick={() => {
                      if (filteredDeliveryData.length === 0) return;
                      const doc = new jsPDF('landscape');
                      doc.setFontSize(18);
                      doc.setTextColor(40, 40, 40);
                      const title = selectedWorkshop
                        ? `Delivery Report - ${selectedWorkshop}`
                        : 'Delivery Report';
                      doc.text(title, 14, 22);
                      doc.setFontSize(11);
                      doc.setTextColor(100, 100, 100);
                      doc.text(`Period: ${formatDisplayDate(dateRange.start_date)} to ${formatDisplayDate(dateRange.end_date)}`, 14, 30);

                      // Sort by date (desc) and workshop for grouping
                      const sortedData = [...filteredDeliveryData].sort((a, b) => {
                        if (a.delivery_date !== b.delivery_date) {
                          return b.delivery_date.localeCompare(a.delivery_date);
                        }
                        return a.workshop.localeCompare(b.workshop);
                      });

                      // Group data by date + workshop
                      const groups: { [key: string]: { items: any[], totalGood: number, totalDamaged: number, totalMeters: number, totalAmount: number } } = {};
                      sortedData.forEach(d => {
                        const key = `${d.delivery_date}|${d.workshop}`;
                        if (!groups[key]) {
                          groups[key] = { items: [], totalGood: 0, totalDamaged: 0, totalMeters: 0, totalAmount: 0 };
                        }
                        groups[key].items.push(d);
                        groups[key].totalGood += d.good_pieces;
                        groups[key].totalDamaged += d.damaged_pieces;
                        groups[key].totalMeters += d.meters_used;
                        groups[key].totalAmount += d.total_amount;
                      });

                      // Build table rows with subtotals
                      const tableBody: any[] = [];
                      Object.keys(groups).forEach((key, groupIdx) => {
                        const group = groups[key];
                        const [date, workshop] = key.split('|');

                        // Add separator for groups after first
                        if (groupIdx > 0) {
                          tableBody.push([{ content: '', colSpan: 9, styles: { fillColor: [255, 255, 255], minCellHeight: 2 } }]);
                        }

                        // Add items in group (white background)
                        group.items.forEach(d => {
                          tableBody.push([
                            { content: formatDisplayDate(date), styles: { fillColor: [255, 255, 255] } },
                            { content: d.machine_number || 'N/A', styles: { fillColor: [255, 255, 255] } },
                            { content: workshop, styles: { fillColor: [255, 255, 255] } },
                            { content: d.customer, styles: { fillColor: [255, 255, 255] } },
                            { content: d.design_name || '-', styles: { fillColor: [255, 255, 255] } },
                            { content: d.good_pieces.toString(), styles: { fillColor: [255, 255, 255] } },
                            { content: d.damaged_pieces.toString(), styles: { fillColor: [255, 255, 255] } },
                            { content: `${d.meters_used}m`, styles: { fillColor: [255, 255, 255] } },
                            { content: `Rs.${d.total_amount.toLocaleString()}`, styles: { fillColor: [255, 255, 255] } }
                          ]);
                        });

                        // Add group subtotal row (light blue)
                        tableBody.push([
                          { content: `${formatDisplayDate(date)} - ${workshop} Total`, colSpan: 5, styles: { fontStyle: 'bold', fillColor: [230, 245, 255] } },
                          { content: group.totalGood.toString(), styles: { fontStyle: 'bold', fillColor: [230, 245, 255] } },
                          { content: group.totalDamaged.toString(), styles: { fontStyle: 'bold', fillColor: [230, 245, 255] } },
                          { content: `${group.totalMeters}m`, styles: { fontStyle: 'bold', fillColor: [230, 245, 255] } },
                          { content: `Rs.${group.totalAmount.toLocaleString()}`, styles: { fontStyle: 'bold', fillColor: [230, 245, 255] } }
                        ]);
                      });

                      autoTable(doc, {
                        head: [['Date', 'Machine', 'Workshop', 'Customer', 'Design', 'Good', 'Damaged', 'Meters', 'Amount']],
                        body: tableBody,
                        startY: 38,
                        styles: { fontSize: 8, cellPadding: 1 },
                        headStyles: { fillColor: [20, 184, 166], textColor: 255 },
                        margin: { left: 10, right: 10 },
                        tableWidth: 'auto',
                      });
                      doc.save(`delivery_report_${dateRange.start_date}_to_${dateRange.end_date}.pdf`);
                    }}
                    className="flex items-center space-x-1.5 px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-base bg-red-500 text-white rounded-lg sm:rounded-xl hover:bg-red-600 transition"
                  >
                    <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">Export PDF</span>
                    <span className="sm:hidden">PDF</span>
                  </button>
                  <button
                    onClick={() => {
                      if (filteredDeliveryData.length === 0) return;

                      const headers = ['Date', 'Machine', 'Workshop', 'Customer', 'Design', 'Good', 'Damaged', 'Meters', 'Amount'];
                      const csvData = filteredDeliveryData.map(d => [
                        d.delivery_date,
                        d.machine_number || 'N/A',
                        d.workshop,
                        d.customer,
                        d.design_name || '-',
                        d.good_pieces,
                        d.damaged_pieces,
                        d.meters_used,
                        d.total_amount
                      ]);

                      const csvContent = [headers, ...csvData].map(row => row.join(',')).join('\n');
                      const blob = new Blob([csvContent], { type: 'text/csv' });
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `delivery_report_${dateRange.start_date}_to_${dateRange.end_date}.csv`;
                      a.click();
                      window.URL.revokeObjectURL(url);
                    }}
                    className="flex items-center space-x-1.5 px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-base bg-green-500 text-white rounded-lg sm:rounded-xl hover:bg-green-600 transition"
                  >
                    <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">Export CSV</span>
                    <span className="sm:hidden">CSV</span>
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200 dark:border-gray-600">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Date</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Machine</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Workshop</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Customer</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Design</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Good</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Damaged</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Meters</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Amount</th>
                </tr>
              </thead>
              <tbody>
                {filteredDeliveryData.map((d, idx) => (
                  <tr key={idx} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="py-3 px-4 text-gray-700 dark:text-gray-300">{formatDisplayDate(d.delivery_date)}</td>
                    <td className="py-3 px-4 font-semibold text-gray-900 dark:text-white">{d.machine_number || 'N/A'}</td>
                    <td className="py-3 px-4 text-gray-700 dark:text-gray-300">{d.workshop}</td>
                    <td className="py-3 px-4 text-gray-700 dark:text-gray-300">{d.customer}</td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{d.design_name || '-'}</td>
                    <td className="py-3 px-4 text-right font-semibold text-green-600 dark:text-green-400">{d.good_pieces}</td>
                    <td className="py-3 px-4 text-right font-semibold text-red-600 dark:text-red-400">{d.damaged_pieces}</td>
                    <td className="py-3 px-4 text-right text-gray-900 dark:text-white">{d.meters_used}m</td>
                    <td className="py-3 px-4 text-right font-semibold text-primary-600 dark:text-primary-400">
                      ₹{d.total_amount.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && reportData.length === 0 && deliveryData.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-12 shadow-soft text-center">
          <FileText className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Data Found</h3>
          <p className="text-gray-600 dark:text-gray-400">
            Select a date range and click "Generate Report" to view {reportType} data
          </p>
        </div>
      )}
    </div>
  );
};

export default Reports;