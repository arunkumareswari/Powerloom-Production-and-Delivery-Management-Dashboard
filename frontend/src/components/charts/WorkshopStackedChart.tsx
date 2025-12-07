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
        <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow">
            <div className="mb-6">
                <h3 className="text-xl font-bold text-gray-900">Workshop Production</h3>
                <p className="text-sm text-gray-600 mt-1">Machine-wise production by workshop</p>
            </div>

            <ResponsiveContainer width="100%" height={350}>
                <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }} barGap={8}>
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

            <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="grid grid-cols-3 gap-4">
                    {data.map((workshop, idx) => {
                        const totalProduction = workshop.machines.reduce((sum, m) => sum + m.production, 0);
                        return (
                            <div key={idx} className="text-center">
                                <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">{workshop.workshop_name}</p>
                                <p className="text-lg font-bold text-gray-900 mt-1">
                                    {totalProduction.toLocaleString()}
                                </p>
                                <p className="text-xs text-gray-600 mt-1">
                                    {workshop.machines.length} machine{workshop.machines.length !== 1 ? 's' : ''}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default WorkshopProductionChart;
