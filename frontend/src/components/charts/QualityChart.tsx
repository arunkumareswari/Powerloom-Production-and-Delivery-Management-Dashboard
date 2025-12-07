import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
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
        <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow">
            <div className="mb-6">
                <h3 className="text-xl font-bold text-gray-900">Machine Quality Analysis</h3>
                <p className="text-sm text-gray-600 mt-1">Good vs Damaged pieces by machine</p>
            </div>

            <ResponsiveContainer width="100%" height={350}>
                <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
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
                    />
                    <Legend
                        wrapperStyle={{ paddingTop: '20px' }}
                        iconType="circle"
                        iconSize={10}
                    />

                    {/* Stacked bars - good at bottom, damaged on top */}
                    <Bar
                        dataKey="good_pieces"
                        stackId="a"
                        fill="#10b981"
                        radius={[0, 0, 0, 0]}
                        name="Good Pieces"
                    />
                    <Bar
                        dataKey="damaged_pieces"
                        stackId="a"
                        fill="#ef4444"
                        radius={[8, 8, 0, 0]}
                        name="Damaged Pieces"
                    />
                </BarChart>
            </ResponsiveContainer>

            <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="grid grid-cols-4 gap-4">
                    <div className="text-center">
                        <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Total Machines</p>
                        <p className="text-2xl font-bold text-gray-900 mt-2">{data.length}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Good Pieces</p>
                        <p className="text-2xl font-bold text-green-600 mt-2">{totalGood.toLocaleString()}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Damaged</p>
                        <p className="text-2xl font-bold text-red-600 mt-2">{totalDamaged.toLocaleString()}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Quality Rate</p>
                        <p className="text-2xl font-bold text-primary-600 mt-2">{qualityRate}%</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default QualityChart;
