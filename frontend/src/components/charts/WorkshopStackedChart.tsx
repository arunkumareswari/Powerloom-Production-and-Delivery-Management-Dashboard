import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import api from '../../services/api';

interface MachineProduction {
    machine_number: string;
    production: number;
}

interface WorkshopData {
    workshop_name: string;
    machines: MachineProduction[];
}

interface FilterProps {
    filterType: 'all' | 'month' | 'custom';
    fabricType: string;
    startDate: string;
    endDate: string;
}

// Colors for machines
const MACHINE_COLORS = [
    '#3b82f6', // Blue
    '#10b981', // Green
    '#a855f7', // Purple
    '#f59e0b', // Amber
    '#ef4444', // Red
    '#06b6d4', // Cyan
    '#ec4899', // Pink
    '#84cc16', // Lime
];

const getMachineColor = (machineNumber: string | number) => {
    const num = parseInt(String(machineNumber).replace(/\D/g, '')) || 0;
    return MACHINE_COLORS[(num - 1) % MACHINE_COLORS.length];
};

const WorkshopProductionChart = ({ filterType, fabricType, startDate, endDate }: FilterProps) => {
    const [workshops, setWorkshops] = useState<WorkshopData[]>([]);
    const [allMachines, setAllMachines] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [maxProduction, setMaxProduction] = useState(0);

    useEffect(() => {
        fetchData();
    }, [filterType, fabricType, startDate, endDate]);

    const fetchData = async () => {
        try {
            setLoading(true);

            let params = new URLSearchParams();
            if (fabricType !== 'all') {
                params.append('fabric_type', fabricType);
            }

            const response = await api.get(`/analytics/workshop-machine-production?${params.toString()}`);

            // Sort workshops naturally (Workshop 1, 2, 3...)
            const sortedWorkshops = [...response.data.data].sort((a: any, b: any) => {
                const numA = parseInt(a.workshop_name.replace(/\D/g, '')) || 0;
                const numB = parseInt(b.workshop_name.replace(/\D/g, '')) || 0;
                return numA - numB;
            });

            // Process each workshop
            const processedWorkshops: WorkshopData[] = [];
            const machineSet = new Set<string>();
            let maxProd = 0;

            sortedWorkshops.forEach((workshop: any) => {
                // Sort machines within workshop
                const sortedMachines = [...workshop.machines].sort((a: any, b: any) => {
                    const numA = parseInt(String(a.machine_number).replace(/\D/g, '')) || 0;
                    const numB = parseInt(String(b.machine_number).replace(/\D/g, '')) || 0;
                    return numA - numB;
                });

                sortedMachines.forEach((m: any) => {
                    machineSet.add(String(m.machine_number));
                    if (m.production > maxProd) maxProd = m.production;
                });

                processedWorkshops.push({
                    workshop_name: workshop.workshop_name,
                    machines: sortedMachines.map((m: any) => ({
                        machine_number: String(m.machine_number),
                        production: m.production
                    }))
                });
            });

            // Sort machine numbers for legend
            const sortedMachines = Array.from(machineSet).sort((a, b) => {
                return (parseInt(a) || 0) - (parseInt(b) || 0);
            });

            setMaxProduction(maxProd);
            setAllMachines(sortedMachines);
            setWorkshops(processedWorkshops);
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
        <div className="bg-white dark:bg-gray-800 rounded-xl md:rounded-2xl p-3 md:p-4 shadow-lg hover:shadow-xl transition-shadow h-full">
            {/* Header with Legend */}
            <div className="mb-3 md:mb-4 flex justify-between items-start">
                <div>
                    <h3 className="text-base md:text-xl font-bold text-gray-900 dark:text-white">Workshop Production</h3>
                    <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mt-1">Active beam machines only</p>
                </div>
                {/* Machine color legend */}
                <div className="hidden sm:grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-1 text-sm">
                    {allMachines.map((machine) => (
                        <div key={machine} className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: getMachineColor(machine) }}></span>
                            <span className="text-gray-600 dark:text-gray-300">Machine {machine}</span>
                        </div>
                    ))}
                </div>
            </div>

            {workshops.length === 0 ? (
                <div className="flex items-center justify-center h-[250px] text-gray-500 dark:text-gray-400">
                    <p>No active beams found</p>
                </div>
            ) : (
                <div className="flex items-end justify-around gap-2" style={{ height: 250 }}>
                    {workshops.map((workshop) => (
                        <div key={workshop.workshop_name} className="flex flex-col items-center" style={{ flex: workshop.machines.length }}>
                            {/* Mini bar chart for this workshop */}
                            <ResponsiveContainer width="100%" height={200}>
                                <BarChart
                                    data={workshop.machines.map(m => ({ ...m, name: `M${m.machine_number}` }))}
                                    margin={{ top: 10, right: 5, left: 5, bottom: 0 }}
                                >
                                    <YAxis
                                        domain={[0, maxProduction || 'auto']}
                                        hide
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'rgba(255, 255, 255, 0.98)',
                                            border: 'none',
                                            borderRadius: '12px',
                                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                                            padding: '12px 16px'
                                        }}
                                        content={({ payload }) => {
                                            if (!payload || payload.length === 0) return null;
                                            const item = payload[0]?.payload;
                                            return (
                                                <div style={{ backgroundColor: 'white', padding: '12px 16px', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}>
                                                    <p style={{ fontWeight: 'bold', color: '#374151', fontSize: '14px', marginBottom: '4px' }}>
                                                        {workshop.workshop_name}
                                                    </p>
                                                    <p style={{ color: getMachineColor(item.machine_number), fontSize: '13px', marginBottom: '4px' }}>
                                                        Machine {item.machine_number}
                                                    </p>
                                                    <p style={{ color: '#374151', fontSize: '14px', fontWeight: 600 }}>
                                                        Production: {item.production}
                                                    </p>
                                                </div>
                                            );
                                        }}
                                    />
                                    <Bar dataKey="production" radius={[4, 4, 0, 0]}>
                                        {workshop.machines.map((machine, index) => (
                                            <Cell key={index} fill={getMachineColor(machine.machine_number)} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                            {/* Workshop label */}
                            <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 mt-1 text-center">
                                {workshop.workshop_name}
                            </p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default WorkshopProductionChart;
