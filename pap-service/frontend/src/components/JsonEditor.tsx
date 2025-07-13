import { useState, useEffect } from 'react'
import JsonView from '@uiw/react-json-view'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Save, RefreshCw, Eye, Edit } from 'lucide-react'

interface JsonEditorProps {
  title: string
  data: any
  onSave?: (data: any) => Promise<void> | void
  onRefresh?: () => Promise<void> | void
  readOnly?: boolean
  description?: string
}

export function JsonEditor({
  title,
  data,
  onSave,
  onRefresh,
  readOnly = false,
  description
}: JsonEditorProps) {
  const [editMode, setEditMode] = useState(false)
  const [editedData, setEditedData] = useState(data)
  const [hasChanges, setHasChanges] = useState(false)

  // Update editedData when data prop changes
  useEffect(() => {
    setEditedData(data)
    setHasChanges(false) // Reset changes flag when data updates
  }, [data])

  const handleEdit = (edit: any) => {
    setEditedData(edit.updated_src)
    setHasChanges(JSON.stringify(edit.updated_src) !== JSON.stringify(data))
  }

  const handleSave = async () => {
    if (onSave && hasChanges) {
      try {
        await onSave(editedData)
        setHasChanges(false)
      } catch (error) {
        console.error('Failed to save data:', error)
      }
    }
  }

  const handleRefresh = async () => {
    if (onRefresh) {
      try {
        await onRefresh()
        setEditedData(data)
        setHasChanges(false)
      } catch (error) {
        console.error('Failed to refresh data:', error)
      }
    }
  }

  const toggleEditMode = () => {
    setEditMode(!editMode)
    if (editMode) {
      // Reset changes when exiting edit mode
      setEditedData(data)
      setHasChanges(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className='flex items-center justify-between'>
          <div>
            <CardTitle className='flex items-center space-x-2'>
              <span>{title}</span>
              {readOnly && (
                <Badge variant='outline' className='text-xs'>
                  Read Only
                </Badge>
              )}
              {hasChanges && (
                <Badge
                  variant='default'
                  className='text-xs bg-orange-600 text-white'
                >
                  Modified
                </Badge>
              )}
            </CardTitle>
            {description && (
              <p className='text-sm text-muted-foreground mt-1'>
                {description}
              </p>
            )}
          </div>
          <div className='flex items-center space-x-2'>
            {!readOnly && (
              <Button
                variant='outline'
                size='sm'
                onClick={toggleEditMode}
                className='flex items-center space-x-1'
              >
                {editMode ? (
                  <Eye className='h-4 w-4' />
                ) : (
                  <Edit className='h-4 w-4' />
                )}
                <span>{editMode ? 'View' : 'Edit'}</span>
              </Button>
            )}
            {onRefresh && (
              <Button
                variant='outline'
                size='sm'
                onClick={handleRefresh}
                className='flex items-center space-x-1'
              >
                <RefreshCw className='h-4 w-4' />
                <span>Refresh</span>
              </Button>
            )}
            {!readOnly && hasChanges && (
              <Button
                variant='default'
                size='sm'
                onClick={handleSave}
                className='flex items-center space-x-1 bg-green-600 hover:bg-green-700'
              >
                <Save className='h-4 w-4' />
                <span>Save</span>
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className='border rounded-lg overflow-hidden'>
          <JsonView
            value={editMode ? editedData : data}
            style={{
              backgroundColor: 'transparent',
              fontSize: '14px',
              fontFamily:
                'ui-monospace, SFMono-Regular, "SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
            }}
            displayDataTypes={false}
            displayObjectSize={true}
            enableClipboard={true}
            editable={editMode && !readOnly}
            onEdit={handleEdit}
            collapsed={2}
          />
        </div>
        {editMode && !readOnly && (
          <div className='mt-4 p-3 bg-muted rounded-lg'>
            <p className='text-sm text-muted-foreground'>
              <strong>Edit Mode:</strong> Click on values to edit them. Changes
              will be highlighted and can be saved using the Save button.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
