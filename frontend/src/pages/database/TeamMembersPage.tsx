import React, { useState } from 'react'
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  TextField,
  Typography,
} from '@mui/material'
import { DataGrid, GridActionsCellItem, GridColDef } from '@mui/x-data-grid'
import {
  Add,
  Delete,
  Edit,
  Person,
  Star,
  StarBorder,
} from '@mui/icons-material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { teamApi } from '@/services/api'
import toast from 'react-hot-toast'

const TeamMembersPage: React.FC = () => {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingMember, setEditingMember] = useState<any>(null)
  const queryClient = useQueryClient()

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['team', 'members'],
    queryFn: () => teamApi.getMembers(),
    select: (data) => data.data || [],
  })

  const form = useForm({
    defaultValues: {
      name: '',
      title: '',
      department: '',
      education: '',
      experience: '',
      expertise: '',
      photo_url: '',
      is_key_member: false,
    },
  })

  const createMutation = useMutation({
    mutationFn: teamApi.createMember,
    onSuccess: () => {
      toast.success('團隊成員新增成功！')
      setDialogOpen(false)
      form.reset()
      queryClient.invalidateQueries({ queryKey: ['team', 'members'] })
    },
    onError: () => toast.error('新增失敗'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => teamApi.updateMember(id, data),
    onSuccess: () => {
      toast.success('更新成功！')
      setDialogOpen(false)
      setEditingMember(null)
      form.reset()
      queryClient.invalidateQueries({ queryKey: ['team', 'members'] })
    },
    onError: () => toast.error('更新失敗'),
  })

  const deleteMutation = useMutation({
    mutationFn: teamApi.deleteMember,
    onSuccess: () => {
      toast.success('刪除成功！')
      queryClient.invalidateQueries({ queryKey: ['team', 'members'] })
    },
    onError: () => toast.error('刪除失敗'),
  })

  const handleAdd = () => {
    setEditingMember(null)
    form.reset()
    setDialogOpen(true)
  }

  const handleEdit = (member: any) => {
    setEditingMember(member)
    form.reset(member)
    setDialogOpen(true)
  }

  const handleSave = (data: any) => {
    if (editingMember) {
      updateMutation.mutate({ id: editingMember.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const columns: GridColDef[] = [
    {
      field: 'name',
      headerName: '姓名',
      width: 150,
      renderCell: (params) => (
        <Box display="flex" alignItems="center" gap={1}>
          <Avatar sx={{ width: 32, height: 32 }}>
            <Person />
          </Avatar>
          {params.value}
        </Box>
      ),
    },
    { field: 'title', headerName: '職位', width: 150 },
    { field: 'department', headerName: '部門', width: 120 },
    {
      field: 'is_key_member',
      headerName: '核心成員',
      width: 100,
      renderCell: (params) => (
        <IconButton size="small" color={params.value ? 'primary' : 'default'}>
          {params.value ? <Star /> : <StarBorder />}
        </IconButton>
      ),
    },
    { field: 'expertise', headerName: '專長', width: 200 },
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
          onClick={() => handleEdit(params.row)}
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
            團隊成員管理
          </Typography>
          <Typography variant="body2" color="text.secondary">
            管理您的團隊成員資訊，用於標書中的團隊介紹
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={handleAdd}>
          新增成員
        </Button>
      </Box>

      <Card>
        <CardContent>
          <DataGrid
            rows={members}
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

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingMember ? '編輯團隊成員' : '新增團隊成員'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="姓名"
                {...form.register('name')}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="職位"
                {...form.register('title')}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="部門"
                {...form.register('department')}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="學歷"
                {...form.register('education')}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="工作經驗"
                multiline
                rows={3}
                {...form.register('experience')}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="專業技能"
                multiline
                rows={2}
                {...form.register('expertise')}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>取消</Button>
          <Button
            variant="contained"
            onClick={form.handleSubmit(handleSave)}
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            {editingMember ? '更新' : '新增'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default TeamMembersPage
