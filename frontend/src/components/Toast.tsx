import { useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';

interface ToastProps {
    message: string;
    type: 'success' | 'error' | 'info';
    isOpen: boolean;
    onClose: () => void;
    duration?: number;
}

const Toast = ({ message, type, isOpen, onClose, duration = 3000 }: ToastProps) => {
    useEffect(() => {
        if (isOpen && duration > 0) {
            const timer = setTimeout(() => {
                onClose();
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [isOpen, duration, onClose]);

    if (!isOpen) return null;

    const styles = {
        success: {
            bg: 'bg-green-50 border-green-200',
            text: 'text-green-800',
            icon: <CheckCircle className="w-5 h-5 text-green-500" />
        },
        error: {
            bg: 'bg-red-50 border-red-200',
            text: 'text-red-800',
            icon: <XCircle className="w-5 h-5 text-red-500" />
        },
        info: {
            bg: 'bg-blue-50 border-blue-200',
            text: 'text-blue-800',
            icon: <AlertCircle className="w-5 h-5 text-blue-500" />
        }
    };

    const style = styles[type];

    return (
        <div className="fixed top-4 right-4 z-50 animate-slideDown">
            <div className={`flex items-center space-x-3 px-4 py-3 rounded-xl border-2 shadow-lg ${style.bg} ${style.text} min-w-[300px] max-w-md`}>
                {style.icon}
                <p className="flex-1 font-medium">{message}</p>
                <button
                    onClick={onClose}
                    className="p-1 hover:bg-black/5 rounded-lg transition"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

export default Toast;
