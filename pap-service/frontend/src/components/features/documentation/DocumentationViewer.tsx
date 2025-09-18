export function DocumentationViewer() {
  return (
    <div className='h-full w-full'>
      <iframe
        src='/index.html'
        className='w-full h-full border-0'
        title='Documentation'
      />
    </div>
  )
}
