import './table.css';

export default function Table({ columns, data, emptyMessage = 'داده‌ای یافت نشد', onRowClick }) {
    if (!data || data.length === 0) {
        return <div className="table-empty">{emptyMessage}</div>;
    }

    return (
        <div className="table-wrapper">
            {/* حالت دسکتاپ: جدول */}
            <table className="responsive-table hide-mobile">
                <thead>
                <tr>
                    {columns.map((col) => (
                        <th key={col.key} style={col.width ? { width: col.width } : {}}>
                            {col.label}
                        </th>
                    ))}
                </tr>
                </thead>
                <tbody>
                {data.map((row, i) => (
                    <tr key={row._id || i} onClick={() => onRowClick?.(row)}>
                        {columns.map((col) => (
                            <td key={col.key}>
                                {col.render ? col.render(row[col.key], row) : row[col.key]}
                            </td>
                        ))}
                    </tr>
                ))}
                </tbody>
            </table>

            {/* حالت موبایل: کارت */}
            <div className="responsive-cards show-mobile">
                {data.map((row, i) => (
                    <div key={row._id || i} className="resp-card" onClick={() => onRowClick?.(row)}>
                        {columns.map((col) => (
                            <div key={col.key} className="resp-card-row">
                                <span className="resp-card-label">{col.label}</span>
                                <span className="resp-card-value">
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </span>
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
}