import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../../services/api';

interface MachineQualityData {
    machine_name: string;
    good_pieces: number;
    damaged_pieces: number;
    total_pieces: number;
}

interface FilterProps {
    filterType: 'all' | 'month' | 'custom';
    fabricType: string;
    startDate: string;
    endDate: string;
}

const QualityChart = ({ filterType, fabricType, startDate, endDate }: FilterProps) => {
    const [data, setData] = useState<MachineQualityData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, [filterType, fabricType, startDate, endDate]);

    const fetchData = async () => {
        try {
            setLoading(true);

            // Build query params
            let params = new URLSearchParams();
            if (fabricType !== 'all') {
                params.append('fabric_type', fabricType);
            }

            const response = await api.get(`/analytics/machine-quality?${params.toString()}`);
            setData(response.data.data);
        } catch (error) {
            console.error('Failed to fetch machine quality data:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="bg-white rounded-2xl p-6 shadow-lg">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
                    <div className="h-80 bg-gray-100 rounded"></div>
                </div>
            </div>
        );
    }

    const totalGood = data.reduce((sum, m) => sum + m.good_pieces, 0);
    const totalDamaged = data.reduce((sum, m) => sum + m.damaged_pieces, 0);
    const qualityRate = totalGood + totalDamaged > 0
        ? ((totalGood / (totalGood + totalDamaged)) * 100).toFixed(1)
        : '0';

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl md:rounded-2xl p-3 md:p-6 shadow-lg hover:shadow-xl transition-shadow">
            <div className="mb-3 md:mb-6 flex justify-between items-start">
                <div>
                    <h3 className="text-base md:text-xl font-bold text-gray-900 dark:text-white">Machine Quality Analysis</h3>
                    <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mt-1">Good vs Damaged pieces</p>
                </div>
                <div className="hidden sm:flex flex-col gap-2 text-sm">
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#41b8d5' }}></span>
                        <span className="text-gray-600 dark:text-gray-300">Good Pieces</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: '#6ce5e8' }}></span>
                        <span className="text-gray-600 dark:text-gray-300">Damaged Pieces</span>
                    </div>
                </div>
            </div>

            <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                    <XAxis
                        dataKey="machine_name"
                        stroke="#9ca3af"
                        tick={{ fontSize: 11, fill: '#6b7280' }}
                        tickLine={false}
                        axisLine={{ stroke: '#e5e7eb' }}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                    />
                    <YAxis
                        stroke="#9ca3af"
                        tick={{ fontSize: 12, fill: '#6b7280' }}
                        tickLine={false}
                        axisLine={{ stroke: '#e5e7eb' }}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: 'rgba(255, 255, 255, 0.98)',
                            border: 'none',
                            borderRadius: '12px',
                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                            padding: '12px 16px'
                        }}
                        cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
                        content={({ payload }) => {
                            if (!payload || payload.length === 0) return null;
                            const goodPieces = Number(payload.find((p: any) => p.dataKey === 'good_pieces')?.value || 0);
                            const damagedPieces = Number(payload.find((p: any) => p.dataKey === 'damaged_pieces')?.value || 0);
                            const total = goodPieces + damagedPieces;
                            return (
                                <div style={{ backgroundColor: 'white', padding: '12px 16px', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}>
                                    <p style={{ fontWeight: 'bold', color: '#374151', fontSize: '14px', marginBottom: '8px' }}>
                                        Total Count: {total}
                                    </p>
                                    <p style={{ color: '#10b981', fontSize: '13px', margin: '4px 0' }}>
                                        Good Pieces: {goodPieces}
                                    </p>
                                    <p style={{ color: '#ef4444', fontSize: '13px', margin: '4px 0' }}>
                                        Damaged Pieces: {damagedPieces}
                                    </p>
                                </div>
                            );
                        }}
                    />

                    {/* Stacked bars - damaged at bottom, good on top */}
                    <Bar
                        dataKey="damaged_pieces"
                        stackId="a"
                        fill="#6ce5e8"
                        radius={[0, 0, 0, 0]}
                        name="Damaged Pieces"
                    />
                    <Bar
                        dataKey="good_pieces"
                        stackId="a"
                        fill="#41b8d5"
                        radius={[8, 8, 0, 0]}
                        name="Good Pieces"
                    />
                </BarChart>
            </ResponsiveContainer>

            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                    <div className="text-center">
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">Total Machines</p>
                        <p className="text-lg md:text-xl font-bold text-gray-900 dark:text-white mt-1">{data.length}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">Good Pieces</p>
                        <p className="text-lg md:text-xl font-bold text-green-600 dark:text-green-400 mt-1">{totalGood.toLocaleString()}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">Damaged</p>
                        <p className="text-lg md:text-xl font-bold text-red-600 dark:text-red-400 mt-1">{totalDamaged.toLocaleString()}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium">Quality Rate</p>
                        <p className="text-lg md:text-xl font-bold text-primary-600 dark:text-primary-400 mt-1">{qualityRate}%</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default QualityChart;
