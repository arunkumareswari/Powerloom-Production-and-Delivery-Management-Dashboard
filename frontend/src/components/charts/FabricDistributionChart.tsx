import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import api from '../../services/api';

interface FabricData {
    name: string;
    value: number;
    beams: number;
}

const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const FabricDistributionChart = () => {
    const [data, setData] = useState<FabricData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const response = await api.get('/analytics/fabric-distribution');
            setData(response.data.data);
        } catch (error) {
            console.error('Failed to fetch fabric distribution:', error);
        } finally {
            setLoading(false);
        }
    };

    const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
        const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
        const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);

        return (
            <text
                x={x}
                y={y}
                fill="white"
                textAnchor={x > cx ? 'start' : 'end'}
                dominantBaseline="central"
                className="font-semibold text-sm"
            >
                {`${(percent * 100).toFixed(0)}%`}
            </text>
        );
    };

    if (loading) {
        return (
            <div className="bg-white rounded-2xl p-6 shadow-lg">
                <div className="animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
                    <div className="h-64 bg-gray-100 rounded"></div>
                </div>
            </div>
        );
    }

    const totalPieces = data.reduce((sum, item) => sum + item.value, 0);

    return (
        <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow">
            {/* Header */}
            <div className="mb-6">
                <h3 className="text-xl font-bold text-gray-900">Fabric Distribution</h3>
                <p className="text-sm text-gray-600 mt-1">Production by fabric type</p>
            </div>

            {/* Chart */}
            <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={CustomLabel}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                        animationBegin={0}
                        animationDuration={800}
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip
                        contentStyle={{
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            border: 'none',
                            borderRadius: '12px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                            padding: '12px'
                        }}
                        formatter={(value: number, name: string, props: any) => [
                            `${value.toLocaleString()} pieces (${props.payload.beams} beams)`,
                            name
                        ]}
                    />
                    <Legend
                        verticalAlign="bottom"
                        height={36}
                        iconType="circle"
                    />
                </PieChart>
            </ResponsiveContainer>

            {/* Summary */}
            <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                        <p className="text-sm text-gray-600">Total Pieces</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">
                            {totalPieces.toLocaleString()}
                        </p>
                    </div>
                    <div className="text-center">
                        <p className="text-sm text-gray-600">Fabric Types</p>
                        <p className="text-2xl font-bold text-primary-600 mt-1">
                            {data.length}
                        </p>
                    </div>
                </div>

                {/* Top Fabric */}
                {data.length > 0 && (
                    <div className="mt-4 p-3 bg-primary-50 rounded-lg">
                        <p className="text-xs text-primary-600 font-semibold">TOP FABRIC</p>
                        <p className="text-lg font-bold text-primary-900 mt-1">{data[0].name}</p>
                        <p className="text-sm text-primary-700">
                            {data[0].value.toLocaleString()} pieces • {data[0].beams} beams
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FabricDistributionChart;
