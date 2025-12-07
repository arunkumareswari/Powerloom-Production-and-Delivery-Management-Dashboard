import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '../../services/api';

interface WorkshopData {
    workshop_name: string;
    good_pieces: number;
    damaged_pieces: number;
    total_pieces: number;
}

const WorkshopComparisonChart = () => {
    const [data, setData] = useState<WorkshopData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const response = await api.get('/dashboard/overview');
            // Transform workshop_production data
            const workshopData = response.data.workshop_production.map((w: any) => ({
                workshop_name: w.workshop_name,
                good_pieces: w.good_pieces || 0,
                damaged_pieces: w.damaged_pieces || 0,
                total_pieces: w.total_pieces || 0
            }));
            setData(workshopData);
        } catch (error) {
            console.error('Failed to fetch workshop data:', error);
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
            {/* Header */}
            <div className="mb-6">
                <h3 className="text-xl font-bold text-gray-900">Workshop Comparison</h3>
                <p className="text-sm text-gray-600 mt-1">Good vs Damaged pieces by workshop</p>
            </div>

            {/* Stacked Bar Chart */}
            <ResponsiveContainer width="100%" height={350}>
                <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                    <XAxis
                        dataKey="workshop_name"
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
                    />
                    <Legend
                        wrapperStyle={{ paddingTop: '20px' }}
                        iconType="circle"
                        iconSize={10}
                    />
                    <Bar
                        dataKey="good_pieces"
                        stackId="a"
                        fill="#0ea5e9"
                        radius={[0, 0, 0, 0]}
                        name="Good Pieces"
                    />
                    <Bar
                        dataKey="damaged_pieces"
                        stackId="a"
                        fill="#f0abab"
                        radius={[8, 8, 0, 0]}
                        name="Damaged Pieces"
                    />
                </BarChart>
            </ResponsiveContainer>

            {/* Summary */}
            <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                        <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Total Workshops</p>
                        <p className="text-2xl font-bold text-gray-900 mt-2">{data.length}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Total Production</p>
                        <p className="text-2xl font-bold text-primary-600 mt-2">
                            {data.reduce((sum, w) => sum + w.total_pieces, 0).toLocaleString()}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WorkshopComparisonChart;
