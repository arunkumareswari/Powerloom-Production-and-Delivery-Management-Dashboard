// Date formatting utilities

/**
 * Format date string from yyyy-mm-dd to dd-mm-yyyy for display
 */
export const formatDisplayDate = (dateString: string | null | undefined): string => {
    if (!dateString) return '-';

    // Handle ISO date strings or yyyy-mm-dd format
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    return `${day}-${month}-${year}`;
};

/**
 * Format date for API calls (yyyy-mm-dd format required by backend)
 */
export const formatAPIDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Format date for display in input fields (showing dd-mm-yyyy format)
 */
export const formatInputDisplayDate = (dateString: string): string => {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    return `${day}-${month}-${year}`;
};
