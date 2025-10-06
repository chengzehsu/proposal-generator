import React from 'react'
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  Typography,
} from '@mui/material'
import { DataGrid, GridActionsCellItem, GridColDef } from '@mui/x-data-grid'
import { Add, Delete, Edit, Lock, Public } from '@mui/icons-material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { projectsApi } from '@/services/api'
import toast from 'react-hot-toast'

const ProjectsPage: React.FC = () => {
  const queryClient = useQueryClient()

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects', 'list'],
    queryFn: () => projectsApi.getProjects(),
    select: (data) => data.data || [],
  })

  const deleteMutation = useMutation({
    mutationFn: projectsApi.deleteProject,
    onSuccess: () => {
      toast.success('專案刪除成功！')
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
    onError: () => toast.error('刪除失敗'),
  })

  const columns: GridColDef[] = [
    {
      field: 'project_name',
      headerName: '專案名稱',
      width: 200,
      renderCell: (params) => (
        <Box>
          <Typography variant="body2" fontWeight="medium">
            {params.value}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {params.row.client_name}
          </Typography>
        </Box>
      ),
    },
    {
      field: 'amount',
      headerName: '專案金額',
      width: 120,
      renderCell: (params) => (
        params.value ? `NT$ ${Number(params.value).toLocaleString()}` : '-'
      ),
    },
    {
      field: 'start_date',
      headerName: '開始日期',
      width: 120,
      renderCell: (params) => params.value ?? '-',
    },
    {
      field: 'end_date',
      headerName: '結束日期',
      width: 120,
      renderCell: (params) => params.value ?? '-',
    },
    {
      field: 'is_public',
      headerName: '公開狀態',
      width: 100,
      renderCell: (params) => (
        <Chip
          icon={params.value ? <Public /> : <Lock />}
          label={params.value ? '公開' : '私人'}
          color={params.value ? 'success' : 'default'}
          size="small"
        />
      ),
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: '操作',
      width: 120,
      getActions: (params) => [
        <GridActionsCellItem
          key="edit"
          icon={<Edit />}
          label="編輯"
          onClick={() => console.log('編輯專案', params.row.id)}
        />,
        <GridActionsCellItem
          key="delete"
          icon={<Delete />}
          label="刪除"
          onClick={() => deleteMutation.mutate(params.row.id)}
        />,
      ],
    },
  ]

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" gutterBottom>
            專案實績管理
          </Typography>
          <Typography variant="body2" color="text.secondary">
            管理您的專案實績，用於標書中展示公司能力
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />}>
          新增專案
        </Button>
      </Box>

      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="primary">
                {projects.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                總專案數
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="success.main">
                {projects.filter((p: any) => p.is_public).length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                公開專案
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card>
        <CardContent>
          <DataGrid
            rows={projects}
            columns={columns}
            loading={isLoading}
            pageSizeOptions={[10, 25, 50]}
            initialState={{
              pagination: { paginationModel: { pageSize: 10 } },
            }}
            disableRowSelectionOnClick
            autoHeight
          />
        </CardContent>
      </Card>
    </Box>
  )
}

export default ProjectsPage
