import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import api from '../../services/api';

interface MachineProduction {
    machine_number: string;
    production: number;
}

interface WorkshopMachineData {
    workshop_name: string;
    machines: MachineProduction[];
    [key: string]: any; // For dynamic machine keys
}

interface FilterProps {
    filterType: 'all' | 'month' | 'custom';
    fabricType: string;
    startDate: string;
    endDate: string;
}

const MACHINE_COLORS = [
    '#3b82f6', // Blue
    '#10b981', // Green
    '#a855f7', // Purple
    '#f59e0b', // Amber
    '#ef4444', // Red
    '#06b6d4', // Cyan
];

const WorkshopProductionChart = ({ filterType, fabricType, startDate, endDate }: FilterProps) => {
    const [data, setData] = useState<WorkshopMachineData[]>([]);
    const [machineKeys, setMachineKeys] = useState<string[]>([]);
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

            const response = await api.get(`/analytics/workshop-machine-production?${params.toString()}`);

            console.log('Workshop Machine Data:', response.data);

            // Transform data for Recharts
            const transformedData: WorkshopMachineData[] = [];
            const allMachineKeys = new Set<string>();

            response.data.data.forEach((workshop: any) => {
                const workshopData: WorkshopMachineData = {
                    workshop_name: workshop.workshop_name,
                    machines: workshop.machines
                };

                // Add each machine as a separate key for grouped bars
                workshop.machines.forEach((machine: MachineProduction) => {
                    const machineKey = `machine_${machine.machine_number}`;
                    workshopData[machineKey] = machine.production;
                    allMachineKeys.add(machineKey);
                });

                transformedData.push(workshopData);
            });

            setMachineKeys(Array.from(allMachineKeys).sort());
            setData(transformedData);
        } catch (error) {
            console.error('Failed to fetch workshop machine data:', error);
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
        <div className="bg-white rounded-2xl p-4 shadow-lg hover:shadow-xl transition-shadow h-full">
            <div className="mb-4 flex justify-between items-start">
                <div>
                    <h3 className="text-xl font-bold text-gray-900">Workshop Production</h3>
                    <p className="text-sm text-gray-600 mt-1">Machine-wise production by workshop</p>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    {machineKeys.map((machineKey, index) => (
                        <div key={machineKey} className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: MACHINE_COLORS[index % MACHINE_COLORS.length] }}></span>
                            <span className="text-gray-600">Machine {machineKey.replace('machine_', '')}</span>
                        </div>
                    ))}
                </div>
            </div>

            <ResponsiveContainer width="100%" height={320}>
                <BarChart data={data} margin={{ top: 20, right: 10, left: -10, bottom: 5 }} barGap={4}>
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
                        content={({ payload }) => {
                            if (!payload || payload.length === 0) return null;
                            const total = payload.reduce((sum: number, p: any) => sum + (p.value || 0), 0);
                            return (
                                <div style={{ backgroundColor: 'white', padding: '12px 16px', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}>
                                    <p style={{ fontWeight: 'bold', color: '#374151', fontSize: '14px', marginBottom: '8px' }}>
                                        Total Count: {total}
                                    </p>
                                    {payload.map((p: any, idx: number) => (
                                        <p key={idx} style={{ color: p.color, fontSize: '13px', margin: '4px 0' }}>
                                            {p.name}: {p.value}
                                        </p>
                                    ))}
                                </div>
                            );
                        }}
                    />

                    {/* Dynamic bars based on actual machines */}
                    {machineKeys.map((machineKey, index) => (
                        <Bar
                            key={machineKey}
                            dataKey={machineKey}
                            fill={MACHINE_COLORS[index % MACHINE_COLORS.length]}
                            radius={[8, 8, 0, 0]}
                            name={`Machine ${machineKey.replace('machine_', '')}`}
                        />
                    ))}
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

export default WorkshopProductionChart;
