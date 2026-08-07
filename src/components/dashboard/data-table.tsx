import { ReactNode } from "react";

type Column<T> = {
  key: string;
  header: string;
  className?: string;
  render: (row: T) => ReactNode;
};

type DataTableProps<T> = {
  columns: Array<Column<T>>;
  rows: T[];
  emptyText: string;
  minWidthClassName?: string;
};

export function DataTable<T>({ columns, rows, emptyText, minWidthClassName }: DataTableProps<T>) {
  return (
    <div className="overflow-x-auto">
      <table className={`w-full text-left text-sm ${minWidthClassName ?? "min-w-[820px]"}`}>
        <thead className="text-ms-navy-soft">
          <tr>
            {columns.map((column) => (
              <th key={column.key} className={`pb-3 ${column.className ?? ""}`.trim()}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="text-ms-ink/85">
          {rows.length === 0 ? (
            <tr>
              <td className="py-5 text-sm text-ms-ink/70" colSpan={columns.length}>
                {emptyText}
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr key={index} className="border-t border-ms-navy/10">
                {columns.map((column) => (
                  <td key={column.key} className={`py-3 ${column.className ?? ""}`.trim()}>
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
