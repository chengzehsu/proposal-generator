import React, { useCallback, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import CharacterCount from '@tiptap/extension-character-count'
import { Table } from '@tiptap/extension-table'
import Image from '@tiptap/extension-image'
import {
  Box,
  Paper,
  Toolbar,
  IconButton,
  Divider,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
} from '@mui/material'
import {
  FormatBold,
  FormatItalic,
  FormatUnderlined,
  FormatListBulleted,
  FormatListNumbered,
  FormatQuote,
  Code,
  Undo,
  Redo,
  TableChart as TableIcon,
  Image as ImageIcon,
  AutoAwesome,
  Save,
  Preview,
} from '@mui/icons-material'

interface ProposalEditorProps {
  content?: string
  onChange?: (content: string) => void
  onSave?: (content: string) => void
  onAIGenerate?: (prompt: string) => void
  readonly?: boolean
}

const ProposalEditor: React.FC<ProposalEditorProps> = ({
  content = '',
  onChange,
  onSave,
  onAIGenerate,
  readonly = false,
}) => {
  const [aiDialogOpen, setAiDialogOpen] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [imageDialogOpen, setImageDialogOpen] = useState(false)
  const [imageUrl, setImageUrl] = useState('')
  const [previewMode, setPreviewMode] = useState(false)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: '開始撰寫您的標書內容...',
      }),
      CharacterCount.configure({
        limit: 50000, // 50k 字元限制
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'proposal-table',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'proposal-image',
        },
      }),
    ],
    content,
    editable: !readonly && !previewMode,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      onChange?.(html)
    },
  })

  const handleSave = useCallback(() => {
    if (editor) {
      const html = editor.getHTML()
      onSave?.(html)
    }
  }, [editor, onSave])

  const handleAIGenerate = () => {
    if (aiPrompt.trim()) {
      onAIGenerate?.(aiPrompt)
      setAiDialogOpen(false)
      setAiPrompt('')
    }
  }

  const insertImage = () => {
    if (imageUrl && editor) {
      editor.chain().focus().setImage({ src: imageUrl }).run()
      setImageDialogOpen(false)
      setImageUrl('')
    }
  }

  const addTable = () => {
    if (editor) {
      editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
    }
  }

  if (!editor) {
    return <div>載入編輯器中...</div>
  }

  const characterCount = editor.storage.characterCount.characters()
  const wordCount = editor.storage.characterCount.words()

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 工具列 */}
      {!readonly && (
        <Paper elevation={1}>
          <Toolbar variant="dense" sx={{ minHeight: '48px !important', gap: 1 }}>
            {/* 文字格式 */}
            <Box display="flex" gap={0.5}>
              <IconButton
                size="small"
                onClick={() => editor.chain().focus().toggleBold().run()}
                color={editor.isActive('bold') ? 'primary' : 'default'}
              >
                <FormatBold />
              </IconButton>
              <IconButton
                size="small"
                onClick={() => editor.chain().focus().toggleItalic().run()}
                color={editor.isActive('italic') ? 'primary' : 'default'}
              >
                <FormatItalic />
              </IconButton>
              <IconButton
                size="small"
                onClick={() => editor.chain().focus().toggleStrike().run()}
                color={editor.isActive('strike') ? 'primary' : 'default'}
              >
                <FormatUnderlined />
              </IconButton>
            </Box>

            <Divider orientation="vertical" flexItem />

            {/* 列表 */}
            <Box display="flex" gap={0.5}>
              <IconButton
                size="small"
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                color={editor.isActive('bulletList') ? 'primary' : 'default'}
              >
                <FormatListBulleted />
              </IconButton>
              <IconButton
                size="small"
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                color={editor.isActive('orderedList') ? 'primary' : 'default'}
              >
                <FormatListNumbered />
              </IconButton>
            </Box>

            <Divider orientation="vertical" flexItem />

            {/* 其他格式 */}
            <Box display="flex" gap={0.5}>
              <IconButton
                size="small"
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                color={editor.isActive('blockquote') ? 'primary' : 'default'}
              >
                <FormatQuote />
              </IconButton>
              <IconButton
                size="small"
                onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                color={editor.isActive('codeBlock') ? 'primary' : 'default'}
              >
                <Code />
              </IconButton>
            </Box>

            <Divider orientation="vertical" flexItem />

            {/* 插入功能 */}
            <Box display="flex" gap={0.5}>
              <IconButton size="small" onClick={addTable}>
                <TableIcon />
              </IconButton>
              <IconButton size="small" onClick={() => setImageDialogOpen(true)}>
                <ImageIcon />
              </IconButton>
            </Box>

            <Divider orientation="vertical" flexItem />

            {/* 復原/重做 */}
            <Box display="flex" gap={0.5}>
              <IconButton
                size="small"
                onClick={() => editor.chain().focus().undo().run()}
                disabled={!editor.can().undo()}
              >
                <Undo />
              </IconButton>
              <IconButton
                size="small"
                onClick={() => editor.chain().focus().redo().run()}
                disabled={!editor.can().redo()}
              >
                <Redo />
              </IconButton>
            </Box>

            <Box sx={{ flexGrow: 1 }} />

            {/* AI 生成 */}
            {onAIGenerate && (
              <Button
                size="small"
                startIcon={<AutoAwesome />}
                onClick={() => setAiDialogOpen(true)}
                variant="outlined"
              >
                AI 生成
              </Button>
            )}

            {/* 預覽模式 */}
            <Button
              size="small"
              startIcon={<Preview />}
              onClick={() => setPreviewMode(!previewMode)}
              variant={previewMode ? 'contained' : 'outlined'}
            >
              {previewMode ? '編輯' : '預覽'}
            </Button>

            {/* 儲存 */}
            {onSave && (
              <Button
                size="small"
                startIcon={<Save />}
                onClick={handleSave}
                variant="contained"
              >
                儲存
              </Button>
            )}
          </Toolbar>
        </Paper>
      )}

      {/* 編輯器內容 */}
      <Box
        sx={{
          flexGrow: 1,
          overflow: 'auto',
          p: 2,
          backgroundColor: previewMode ? 'background.paper' : 'grey.50',
        }}
      >
        <Paper
          sx={{
            minHeight: '100%',
            p: 3,
            '& .ProseMirror': {
              outline: 'none',
              minHeight: '500px',
              fontSize: '16px',
              lineHeight: 1.6,
              '& h1': { fontSize: '2rem', fontWeight: 'bold', margin: '1rem 0' },
              '& h2': { fontSize: '1.5rem', fontWeight: 'bold', margin: '0.8rem 0' },
              '& h3': { fontSize: '1.25rem', fontWeight: 'bold', margin: '0.6rem 0' },
              '& p': { margin: '0.5rem 0' },
              '& ul, ol': { paddingLeft: '1.5rem', margin: '0.5rem 0' },
              '& blockquote': {
                borderLeft: '3px solid #ddd',
                paddingLeft: '1rem',
                margin: '1rem 0',
                fontStyle: 'italic',
                color: 'text.secondary',
              },
              '& pre': {
                backgroundColor: '#f5f5f5',
                padding: '1rem',
                borderRadius: '4px',
                overflow: 'auto',
                fontFamily: 'monospace',
              },
              '& table': {
                borderCollapse: 'collapse',
                width: '100%',
                margin: '1rem 0',
              },
              '& th, td': {
                border: '1px solid #ddd',
                padding: '8px',
                textAlign: 'left',
              },
              '& th': {
                backgroundColor: '#f5f5f5',
                fontWeight: 'bold',
              },
              '& .proposal-image': {
                maxWidth: '100%',
                height: 'auto',
                margin: '1rem 0',
              },
            },
          }}
        >
          <EditorContent editor={editor} />
        </Paper>
      </Box>

      {/* 狀態列 */}
      <Paper elevation={1}>
        <Box display="flex" justifyContent="space-between" alignItems="center" p={1}>
          <Box display="flex" gap={2}>
            <Chip
              label={`${wordCount} 字`}
              size="small"
              variant="outlined"
            />
            <Chip
              label={`${characterCount} 字元`}
              size="small"
              variant="outlined"
              color={characterCount > 45000 ? 'warning' : 'default'}
            />
          </Box>
          {previewMode && (
            <Chip
              label="預覽模式"
              size="small"
              color="primary"
            />
          )}
        </Box>
      </Paper>

      {/* AI 生成對話框 */}
      <Dialog open={aiDialogOpen} onClose={() => setAiDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>AI 內容生成</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="請描述您想要生成的內容"
            placeholder="例如：生成一段關於公司技術優勢的介紹，重點強調我們在AI領域的專業能力..."
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAiDialogOpen(false)}>取消</Button>
          <Button
            variant="contained"
            onClick={handleAIGenerate}
            disabled={!aiPrompt.trim()}
            startIcon={<AutoAwesome />}
          >
            生成內容
          </Button>
        </DialogActions>
      </Dialog>

      {/* 插入圖片對話框 */}
      <Dialog open={imageDialogOpen} onClose={() => setImageDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>插入圖片</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="圖片 URL"
            placeholder="https://example.com/image.jpg"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImageDialogOpen(false)}>取消</Button>
          <Button
            variant="contained"
            onClick={insertImage}
            disabled={!imageUrl.trim()}
          >
            插入
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default ProposalEditor