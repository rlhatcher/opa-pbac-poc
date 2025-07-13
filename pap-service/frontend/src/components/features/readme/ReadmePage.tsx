import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card'
import { ScrollArea } from '../../ui/scroll-area'
import { LoadingState } from '../../shared/LoadingState'
import { Button } from '../../ui/button'
import { FileText, ChevronRight, Home, Book, Code } from 'lucide-react'
import MDEditor from '@uiw/react-md-editor'
import SwaggerUI from 'swagger-ui-react'
import 'swagger-ui-react/swagger-ui.css'

interface NavItem {
  title: string
  file?: string
  children?: NavItem[]
}

interface DocsIndex {
  nav: NavItem[]
}

export function ReadmePage() {
  const [currentContent, setCurrentContent] = useState<string>('')
  const [currentFile, setCurrentFile] = useState<string>('README.md')
  const [docsIndex, setDocsIndex] = useState<DocsIndex | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isOpenApiSpec, setIsOpenApiSpec] = useState(false)
  const [embeddedSpecs, setEmbeddedSpecs] = useState<{ [key: string]: string }>(
    {}
  )

  useEffect(() => {
    const loadDocsIndex = async () => {
      try {
        const response = await fetch('/docs/index.json')
        if (response.ok) {
          const index = await response.json()
          setDocsIndex(index)
        }
      } catch (err) {
        console.warn('Could not load docs index:', err)
      }
    }

    loadDocsIndex()
  }, [])

  const processMarkdownWithSpecs = async (content: string) => {
    // Find all swagger-ui tags
    const swaggerTagRegex = /<swagger-ui\s+src="([^"]+)"\s*\/>/g
    const matches = [...content.matchAll(swaggerTagRegex)]

    if (matches.length === 0) {
      return content
    }

    // Load all referenced specs
    const specs: { [key: string]: string } = {}
    for (const match of matches) {
      const specFile = match[1]
      try {
        const specPath = currentFile.includes('/')
          ? `/docs/api/${specFile}`
          : `/docs/api/${specFile}`
        const response = await fetch(specPath)
        if (response.ok) {
          specs[specFile] = await response.text()
        }
      } catch (err) {
        console.warn(`Failed to load spec: ${specFile}`, err)
      }
    }

    setEmbeddedSpecs(specs)
    return content
  }

  useEffect(() => {
    const fetchContent = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Check if this is an OpenAPI spec
        const isSpec =
          currentFile.endsWith('.yaml') || currentFile.endsWith('.yml')
        setIsOpenApiSpec(isSpec)

        const filePath = currentFile.startsWith('docs/')
          ? `/${currentFile}`
          : `/${currentFile}`
        const response = await fetch(filePath)

        if (!response.ok) {
          throw new Error(`File not found: ${currentFile}`)
        }

        const content = await response.text()

        // Process markdown content for embedded specs
        if (!isSpec) {
          const processedContent = await processMarkdownWithSpecs(content)
          setCurrentContent(processedContent)
        } else {
          setCurrentContent(content)
        }
      } catch (err) {
        console.error('Error fetching content:', err)
        setError(
          err instanceof Error ? err.message : `Failed to load ${currentFile}`
        )
      } finally {
        setIsLoading(false)
      }
    }

    fetchContent()
  }, [currentFile])

  const renderMarkdownWithSpecs = (content: string) => {
    // Split content by swagger-ui tags
    const swaggerTagRegex = /<swagger-ui\s+src="([^"]+)"\s*\/>/g
    const parts = content.split(swaggerTagRegex)

    const elements = []
    for (let i = 0; i < parts.length; i++) {
      if (i % 2 === 0) {
        // This is markdown content
        if (parts[i].trim()) {
          elements.push(
            <MDEditor.Markdown
              key={`md-${i}`}
              source={parts[i]}
              style={{
                backgroundColor: 'transparent',
                color: 'inherit'
              }}
            />
          )
        }
      } else {
        // This is a spec filename
        const specFile = parts[i]
        const specContent = embeddedSpecs[specFile]
        if (specContent) {
          elements.push(
            <div key={`spec-${i}`} className='my-8'>
              <SwaggerUI
                spec={specContent}
                docExpansion='list'
                defaultModelsExpandDepth={1}
                defaultModelExpandDepth={1}
              />
            </div>
          )
        }
      }
    }

    return elements
  }

  const renderNavItem = (item: NavItem, level: number = 0) => {
    const hasChildren = item.children && item.children.length > 0
    const isActive = item.file === currentFile

    return (
      <div key={item.title} className={`ml-${level * 4}`}>
        {item.file ? (
          <Button
            variant={isActive ? 'default' : 'ghost'}
            size='sm'
            className='w-full justify-start text-left h-auto py-2 px-3 mb-1'
            onClick={() => setCurrentFile(item.file!)}
          >
            <FileText className='h-4 w-4 mr-2 flex-shrink-0' />
            <span className='truncate'>{item.title}</span>
          </Button>
        ) : (
          <div className='flex items-center py-2 px-3 text-sm font-medium text-muted-foreground'>
            <Book className='h-4 w-4 mr-2' />
            {item.title}
          </div>
        )}
        {hasChildren && (
          <div className='ml-4'>
            {item.children!.map((child) => renderNavItem(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  if (isLoading) {
    return <LoadingState message='Loading README...' />
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center space-x-2 text-destructive'>
            <FileText className='h-5 w-5' />
            <span>Error Loading README</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className='text-muted-foreground'>{error}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className='h-full flex gap-4'>
      {/* Navigation Sidebar */}
      {docsIndex && (
        <div className='w-80 flex-shrink-0 p-4'>
          <div className='flex items-center space-x-2 mb-4'>
            <Book className='h-5 w-5 text-primary' />
            <span className='font-semibold'>Documentation</span>
          </div>
          <div className='space-y-1'>
            <Button
              variant={currentFile === 'README.md' ? 'default' : 'ghost'}
              size='sm'
              className='w-full justify-start text-left h-auto py-2 px-3 mb-2'
              onClick={() => setCurrentFile('README.md')}
            >
              <Home className='h-4 w-4 mr-2' />
              Project README
            </Button>
            {docsIndex.nav.map((item) => renderNavItem(item))}
          </div>
        </div>
      )}

      {/* Content Area */}
      <div className='flex-1 overflow-auto'>
        {isOpenApiSpec ? (
          <SwaggerUI
            spec={currentContent}
            docExpansion='list'
            defaultModelsExpandDepth={2}
            defaultModelExpandDepth={2}
          />
        ) : (
          <div className='p-6'>
            {Object.keys(embeddedSpecs).length > 0 ? (
              renderMarkdownWithSpecs(currentContent)
            ) : (
              <MDEditor.Markdown
                source={currentContent}
                style={{
                  backgroundColor: 'transparent',
                  color: 'inherit'
                }}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
