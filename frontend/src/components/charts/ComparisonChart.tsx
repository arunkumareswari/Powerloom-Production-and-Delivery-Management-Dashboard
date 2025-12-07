import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import api from '../../services/api';

interface ComparisonData {
    name: string;
    value: number;
    percentage: number;
}

const COLORS = ['#0ea5e9', '#f0abab', '#e5e7eb'];

const ComparisonChart = () => {
    const [data, setData] = useState<ComparisonData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const response = await api.get('/dashboard/overview');
            const total = response.data.total_pieces_this_month + response.data.total_damaged_this_month;
            const good = response.data.total_pieces_this_month;
            const damaged = response.data.total_damaged_this_month;

            setData([
                {
                    name: 'Good Pieces',
                    value: good,
                    percentage: total > 0 ? Math.round((good / total) * 100) : 0
                },
                {
                    name: 'Damaged',
                    value: damaged,
                    percentage: total > 0 ? Math.round((damaged / total) * 100) : 0
                },
                {
                    name: 'Pending',
                    value: 0,
                    percentage: 0
                }
            ]);
        } catch (error) {
            console.error('Failed to fetch comparison data:', error);
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

    return (
        <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow">
            <div className="mb-6">
                <h3 className="text-xl font-bold text-gray-900">Quality Comparison</h3>
                <p className="text-sm text-gray-600 mt-1">Production quality breakdown</p>
            </div>

            <ResponsiveContainer width="100%" height={350}>
                <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                    <XAxis
                        dataKey="name"
                        stroke="#9ca3af"
                        tick={{ fontSize: 12, fill: '#6b7280' }}
                        tickLine={false}
                        axisLine={{ stroke: '#e5e7eb' }}
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
                        formatter={(value: number, name: string, props: any) => [
                            `${value.toLocaleString()} pieces (${props.payload.percentage}%)`,
                            name
                        ]}
                    />
                    <Bar
                        dataKey="value"
                        radius={[8, 8, 0, 0]}
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index]} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>

            <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                        <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Quality Rate</p>
                        <p className="text-2xl font-bold text-green-600 mt-2">
                            {data[0]?.percentage || 0}%
                        </p>
                    </div>
                    <div className="text-center">
                        <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Damage Rate</p>
                        <p className="text-2xl font-bold text-red-600 mt-2">
                            {data[1]?.percentage || 0}%
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ComparisonChart;
