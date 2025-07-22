import { DataGrid } from '@mui/x-data-grid';
import { Typography } from '@mui/material';

const rows = [
  { id: 1, name: 'Carbon Report A', emission: 123 },
  { id: 2, name: 'Carbon Report B', emission: 456 },
];

const columns = [
  { field: 'name', headerName: 'Report Name', flex: 1 },
  { field: 'emission', headerName: 'Emissions (kgCO2e)', flex: 1 },
];

export default function Reports() {
  return (
    <div style={{ height: 300 }}>
      <Typography variant="h4" gutterBottom>
        Reports
      </Typography>
      <DataGrid rows={rows} columns={columns} autoHeight />
    </div>
  );
}
