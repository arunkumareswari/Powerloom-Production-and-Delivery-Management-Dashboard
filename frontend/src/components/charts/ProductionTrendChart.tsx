import { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '../../services/api';

interface TrendData {
    date: string;
    [key: string]: any; // Dynamic workshop keys
}

interface FilterProps {
    filterType: 'all' | 'month' | 'custom';
    fabricType: string;
    startDate: string;
    endDate: string;
}

const WORKSHOP_COLORS = [
    '#3b82f6', // Blue
    '#10b981', // Green
    '#a855f7', // Purple
    '#f59e0b', // Amber
    '#ef4444', // Red
    '#06b6d4', // Cyan
];

const ProductionTrendChart = ({ filterType, fabricType, startDate, endDate }: FilterProps) => {
    const [data, setData] = useState<TrendData[]>([]);
    const [workshopKeys, setWorkshopKeys] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, [filterType, fabricType, startDate, endDate]);

    const fetchData = async () => {
        try {
            setLoading(true);

            // Build query params based on filters
            let params = new URLSearchParams();

            if (filterType === 'custom' && startDate && endDate) {
                const start = new Date(startDate);
                const end = new Date(endDate);
                const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                params.append('days', daysDiff.toString());
            } else if (filterType === 'all') {
                params.append('days', '365');
            } else {
                params.append('days', '30');
            }

            if (fabricType !== 'all') {
                params.append('fabric_type', fabricType);
            }

            const response = await api.get(`/analytics/production-trend?${params.toString()}`);

            console.log('Production Trend Response:', response.data);

            setData(response.data.data);
            setWorkshopKeys(response.data.workshops || []);
        } catch (error) {
            console.error('Failed to fetch production trend:', error);
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
        <div className="bg-white rounded-xl md:rounded-2xl p-3 md:p-4 shadow-lg hover:shadow-xl transition-shadow h-full">
            {/* Header with Legend */}
            <div className="mb-3 md:mb-4 flex justify-between items-start">
                <div>
                    <h3 className="text-base md:text-xl font-bold text-gray-900">Production Trend</h3>
                    <p className="text-xs md:text-sm text-gray-600 mt-1">Workshop-wise production</p>
                </div>
                <div className="hidden sm:flex flex-col gap-1 text-sm">
                    {[...workshopKeys].sort().map((workshop, index) => (
                        <div key={workshop} className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: WORKSHOP_COLORS[workshopKeys.indexOf(workshop) % WORKSHOP_COLORS.length] }}></span>
                            <span className="text-gray-600">{workshop}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Modern Area Chart */}
            <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                        {workshopKeys.map((workshop, index) => (
                            <linearGradient key={workshop} id={`color${index}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={WORKSHOP_COLORS[index % WORKSHOP_COLORS.length]} stopOpacity={0.3} />
                                <stop offset="95%" stopColor={WORKSHOP_COLORS[index % WORKSHOP_COLORS.length]} stopOpacity={0.05} />
                            </linearGradient>
                        ))}
                    </defs>

                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                    <XAxis
                        dataKey="date"
                        stroke="#9ca3af"
                        tick={{ fontSize: 12, fill: '#6b7280' }}
                        tickLine={false}
                        axisLine={{ stroke: '#e5e7eb' }}
                        tickFormatter={(value) => {
                            const date = new Date(value);
                            return `${date.getMonth() + 1}/${date.getDate()}`;
                        }}
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
                        labelStyle={{ fontWeight: 600, marginBottom: '8px', color: '#111827' }}
                        itemStyle={{ padding: '4px 0' }}
                    />

                    {/* Dynamic areas for each workshop */}
                    {workshopKeys.map((workshop, index) => (
                        <Area
                            key={workshop}
                            type="monotone"
                            dataKey={workshop}
                            stroke={WORKSHOP_COLORS[index % WORKSHOP_COLORS.length]}
                            strokeWidth={2.5}
                            fill={`url(#color${index})`}
                            name={workshop}
                        />
                    ))}
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};

export default ProductionTrendChart;
