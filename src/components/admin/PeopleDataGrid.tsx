'use client';

import { DeleteOutlined, EditOutlined } from '@mui/icons-material';
import { DataGrid, type GridColDef, type GridPaginationModel, type GridRowSelectionModel } from '@mui/x-data-grid';
import { IconButton, Link, Tooltip } from '@mui/material';
import { formatMobileDisplay, telHref } from '@/lib/phone';
import type { DevoteeListItem } from '@/types';

type Props = {
  rows: DevoteeListItem[];
  loading: boolean;
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (model: GridPaginationModel) => void;
  onEdit: (row: DevoteeListItem) => void;
  onDelete: (row: DevoteeListItem) => void;
  selectedIds: number[];
  onSelectionChange: (ids: number[]) => void;
};

export function PeopleDataGrid({ rows, loading, total, page, pageSize, onPageChange, onEdit, onDelete, selectedIds, onSelectionChange }: Props) {
  const columns: GridColDef<DevoteeListItem>[] = [
    { field: 'fullName', headerName: 'Name', flex: 1.2, minWidth: 170 },
    { field: 'mobile', headerName: 'Mobile', minWidth: 140, renderCell: ({ value }) => <Link href={telHref(String(value))}>{formatMobileDisplay(String(value))}</Link> },
    { field: 'cityName', headerName: 'City', minWidth: 120 },
    { field: 'stateName', headerName: 'State', minWidth: 130 },
    { field: 'countryName', headerName: 'Country', minWidth: 125 },
    { field: 'postalCode', headerName: 'PIN', minWidth: 90, valueGetter: (_value, row) => row.postalCode || '—' },
    { field: 'email', headerName: 'Email', flex: 1, minWidth: 180, valueGetter: (_value, row) => row.email || '—' },
    { field: 'address', headerName: 'Address', flex: 1.4, minWidth: 200 },
    {
      field: 'actions', headerName: 'Actions', sortable: false, filterable: false, minWidth: 100, align: 'right', headerAlign: 'right',
      renderCell: ({ row }) => <div className="grid-actions"><Tooltip title="Edit"><IconButton size="small" aria-label={`Edit ${row.fullName}`} onClick={() => onEdit(row)}><EditOutlined fontSize="small" /></IconButton></Tooltip><Tooltip title="Delete"><IconButton color="error" size="small" aria-label={`Delete ${row.fullName}`} onClick={() => onDelete(row)}><DeleteOutlined fontSize="small" /></IconButton></Tooltip></div>,
    },
  ];

  return <DataGrid
    autoHeight
    rows={rows}
    columns={columns}
    loading={loading}
    rowCount={total}
    paginationMode="server"
    paginationModel={{ page: page - 1, pageSize }}
    onPaginationModelChange={onPageChange}
    checkboxSelection
    keepNonExistentRowsSelected
    rowSelectionModel={{ type: 'include', ids: new Set(selectedIds) }}
    onRowSelectionModelChange={(selection: GridRowSelectionModel) => onSelectionChange(Array.from(selection.ids).map(Number))}
    pageSizeOptions={[10, 20, 50]}
    disableRowSelectionOnClick
    getRowHeight={() => 'auto'}
    sx={{ border: 0, fontFamily: 'inherit', '& .MuiDataGrid-columnHeaders': { backgroundColor: '#fbf7f5', color: '#5b1229', fontWeight: 700 }, '& .MuiDataGrid-cell': { py: 1.5, alignItems: 'flex-start', borderColor: '#eee5e0' }, '& .MuiDataGrid-cell:focus': { outline: 'none' }, '& .MuiDataGrid-footerContainer': { borderColor: '#eee5e0' } }}
  />;
}
